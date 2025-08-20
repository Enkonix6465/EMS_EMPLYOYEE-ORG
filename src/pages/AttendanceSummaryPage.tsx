import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { CalendarDays, User, Briefcase, Award, Clock, Gift, TrendingUp, Calendar } from "lucide-react";

export default function AttendanceSummaryPage() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [allSummaries, setAllSummaries] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        await fetchAttendanceSummary(authUser.uid);
      }
    });
    return () => unsub();
  }, []);

  const fetchAttendanceSummary = async (userId: string) => {
    try {
      setLoading(true);
      
      // Get current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      setSelectedMonth(currentMonth);
      
      // Fetch attendance summary for current month
      const summaryRef = doc(db, "attendanceSummary", `${userId}_${currentMonth}`);
      const summarySnap = await getDoc(summaryRef);
      
      if (summarySnap.exists()) {
        const summaryData = summarySnap.data();
        

        
        // Calculate attendance statistics
        const allDates = Object.keys(summaryData.dailyHours || {});
        let presentDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let totalHours = 0;
        
        for (const date of allDates) {
          const hoursStr = summaryData.dailyHours[date];
          const [h, m, s] = hoursStr.split(/[hms ]+/).filter(Boolean).map(Number);
          const totalHrs = h + m / 60 + s / 3600;
          totalHours += totalHrs;
          
          // New attendance conditions:
          // Full day: 8 hours 24 minutes and above (8.4 hours)
          // Half day: 4 hours 12 minutes to 8 hours 23 minutes 59 seconds (4.2 to 8.399 hours)
          // Absent: Less than 4 hours 11 minutes 59 seconds (less than 4.2 hours)
          
          if (totalHrs >= 8.4) {
            presentDays++;
          } else if (totalHrs >= 4.2) {
            halfDays++;
          } else {
            // Absent day - check if it's an approved leave
            try {
              // Check leave status for this date
              const leaveRef = doc(db, "leaveManage", `${userId}_${date}`);
              const leaveSnap = await getDoc(leaveRef);
              
              if (leaveSnap.exists()) {
                const leaveData = leaveSnap.data();
                if (leaveData.status === "accepted") {
                  // Admin approved leave - count as paid leave (don't increment absentDays)
                } else if (leaveData.status === "cancelled" || leaveData.status === "rejected") {
                  // Cancelled or rejected leave - count as working day
                  presentDays++;
                } else {
                  // Pending or other status - count as absent
                  absentDays++;
                }
              } else {
                // No leave record - count as absent
                absentDays++;
              }
            } catch (error) {
              console.error("Error checking leave status:", error);
              // Fallback to absent if error
              absentDays++;
            }
          }
        }
        
        // Calculate leave statistics
        const DEFAULT_WORKING_DAYS = 23;
        const DEFAULT_ENTITLED_LEAVE = 1;
        const MAX_CARRY_FORWARD = 2;
        let entitledLeave = DEFAULT_ENTITLED_LEAVE;
        let carryForward = summaryData.carryForwardLeaves || 1; // Default CF = 1 from unused previous month
        let usedLeaves = 0;
        let extraLeaves = 0;
        
        // Process absent days and check leave status
        for (const date of allDates) {
          const hoursStr = summaryData.dailyHours[date];
          const [h, m, s] = hoursStr.split(/[hms ]+/).filter(Boolean).map(Number);
          const totalHrs = h + m / 60 + s / 3600;
          
          if (totalHrs < 4.2) {
            // Absent day - check leave status
            try {
              const leaveRef = doc(db, "leaveManage", `${userId}_${date}`);
              const leaveSnap = await getDoc(leaveRef);
              
              if (leaveSnap.exists()) {
                const leaveData = leaveSnap.data();
                if (leaveData.cancelledByUser === true) {
                  presentDays++;
                } else if (leaveData.status === "accepted" && leaveData.cancelledByUser !== true) {
                  if (carryForward > 0) {
                    carryForward -= 1;
                  } else if (entitledLeave > 0) {
                    entitledLeave -= 1;
                    usedLeaves += 1;
                  } else {
                    extraLeaves += 1;
                  }
                } else if (leaveData.status === "cancelled" || leaveData.status === "rejected") {
                  presentDays++;
                } else {
                  // Pending or other status - count as LOP
                  if (carryForward > 0) {
                    carryForward -= 1;
                  } else if (entitledLeave > 0) {
                    entitledLeave -= 1;
                    usedLeaves += 1;
                  } else {
                    extraLeaves += 1;
                  }
                }
              } else {
                // No leave record - count as LOP
                if (carryForward > 0) {
                  carryForward -= 1;
                } else if (entitledLeave > 0) {
                  entitledLeave -= 1;
                  usedLeaves += 1;
                } else {
                  extraLeaves += 1;
                }
              }
            } catch (error) {
              console.error("Error checking leave status:", error);
              // Fallback to LOP if error
              if (carryForward > 0) {
                carryForward -= 1;
              } else if (entitledLeave > 0) {
                entitledLeave -= 1;
                usedLeaves += 1;
              } else {
                extraLeaves += 1;
              }
            }
          }
        }
        
        // Calculate final CF for next month
        let finalCF = 0;
        if (entitledLeave > 0) {
          // Unused entitled leave carries forward
          finalCF = Math.min(MAX_CARRY_FORWARD, entitledLeave);
        } else {
          // If entitled leave was used, CF remains from current month
          finalCF = carryForward;
        }
        
        const totalWorkingDays = Math.max(0, DEFAULT_WORKING_DAYS - (usedLeaves + extraLeaves));
        const attendancePercentage = summaryData.totalWorkingDays > 0 ? (presentDays / summaryData.totalWorkingDays) * 100 : 0;
        
        setSummary({
          ...summaryData,
          presentDays,
          halfDays,
          absentDays,
          leavesTaken: usedLeaves,
          extraLeaves,
          carryForwardLeaves: finalCF,
          totalWorkingDays,
          totalHours: Math.round(totalHours * 100) / 100,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        });
      }
      
      // Fetch all summaries for the user
      const q = query(collection(db, "attendanceSummary"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const arr = snap.docs.map(doc => doc.data());
      arr.sort((a, b) => b.month.localeCompare(a.month));
      setAllSummaries(arr);
      
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading attendance summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No attendance data found for this month.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">Attendance Summary</h1>
          <p className="text-muted">Your monthly attendance overview</p>
        </div>

        {/* Month Selector */}
        {allSummaries.length > 1 && (
          <div className="mb-6">
            <label className="form-label">Select Month</label>
            <select
              className="input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {allSummaries.map((s: any) => (
                <option key={s.month} value={s.month}>
                  {s.month}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="stats-card stats-card-primary">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.presentDays}
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-100">
                  Present Days
                </div>
              </div>
            </div>
          </div>

          <div className="stats-card stats-card-warning">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {summary.totalHours}h
                </div>
                <div className="text-sm text-amber-800 dark:text-amber-100">
                  Total Hours
                </div>
              </div>
            </div>
          </div>

          <div className="stats-card stats-card-danger">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              <div>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {summary.carryForwardLeaves}
                </div>
                <div className="text-sm text-rose-800 dark:text-rose-100">
                  Carry Forward
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="card">
          <div className="card-header">
            <h3 className="heading-3 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-500" />
              Detailed Statistics
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {summary.presentDays}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Present Days</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {summary.halfDays}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Half Days</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {summary.absentDays}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Absent Days</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.leavesTaken}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Leaves Taken</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {summary.extraLeaves}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Extra Leaves</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {summary.totalWorkingDays}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Working Days</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                  {summary.attendancePercentage}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
              </div>
              

            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="card mt-8">
          <div className="card-header">
            <h3 className="heading-3 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-500" />
              Performance Insights
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {summary.attendancePercentage >= 90 && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-2xl">🌟</span>
                  <div>
                    <div className="font-semibold text-green-700 dark:text-green-300">Excellent Attendance!</div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      You're maintaining a {summary.attendancePercentage}% attendance rate. Keep up the great work!
                    </div>
                  </div>
                </div>
              )}
              
              {summary.attendancePercentage >= 80 && summary.attendancePercentage < 90 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-2xl">👍</span>
                  <div>
                    <div className="font-semibold text-blue-700 dark:text-blue-300">Good Attendance</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Your attendance rate is {summary.attendancePercentage}%. You're doing well!
                    </div>
                  </div>
                </div>
              )}
              
              {summary.attendancePercentage < 80 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-semibold text-amber-700 dark:text-amber-300">Attendance Needs Improvement</div>
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      Your attendance rate is {summary.attendancePercentage}%. Try to be more regular.
                    </div>
                  </div>
                </div>
              )}
              
              {summary.extraLeaves > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className="font-semibold text-red-700 dark:text-red-300">Extra Leaves Taken</div>
                    <div className="text-sm text-red-600 dark:text-red-400">
                      You have taken {summary.extraLeaves} extra leave(s). Plan your leaves better next time.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
