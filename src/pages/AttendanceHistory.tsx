import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { MapPin, Sparkles, ChevronDown, ChevronUp, Loader2, CalendarDays, User, Briefcase, Award, ArrowUpRight, ArrowDownLeft, Clock, Gift, Brain, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { 
  predictAttendancePatterns,
  generateSmartNotifications,
  AIInsight,
  AIPrediction
} from "../utils/aiUtils";
import {
  checkAndResetMonthlyData,
  calculateDayAttendance,
  generateMonthlySummary
} from "../utils/attendanceUtils";

// Helper for reverse geocoding (OpenStreetMap Nominatim)
const addressCache: Record<string, string> = {};
async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (addressCache[key]) return addressCache[key];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`
    );
    const data = await res.json();
    const address = data.display_name || key;
    addressCache[key] = address;
    return address;
  } catch {
    addressCache[key] = key;
    return key;
  }
}

export default function AttendanceHistory() {
  const [userId, setUserId] = useState<string | null>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [addressLoading, setAddressLoading] = useState<Record<string, boolean>>({});
  const [allSummaries, setAllSummaries] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  
  // AI Features State
  const [attendancePrediction, setAttendancePrediction] = useState<AIPrediction | null>(null);
  const [attendanceInsights, setAttendanceInsights] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  // Fetch attendance and summary with automatic calculation
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          // Check if it's a new month and reset calculations if needed
          await checkAndResetMonthlyData(user.uid);

          const q = query(
            collection(db, "attendance"),
            where("userId", "==", user.uid)
          );
          const snapshot = await getDocs(q);
          let allData = snapshot.docs.map((doc) => doc.data());

          const today = new Date().toISOString().slice(0, 10);
          const todayDocId = `${user.uid}_${today}`;
          const todayDocRef = doc(db, "attendance", todayDocId);
          const todayDocSnap = await getDoc(todayDocRef);

          if (todayDocSnap.exists()) {
            const todayData = todayDocSnap.data();
            const alreadyExists = allData.some(
              (item) => item.date === todayData.date
            );
            if (!alreadyExists) {
              allData.push(todayData);
            }
          }

          const sorted = allData.sort((a, b) => b.date.localeCompare(a.date));
          setAttendanceList(sorted);

          const currentMonth = new Date().toISOString().slice(0, 7);
          
          // Generate/update monthly summary with automatic calculations
          const autoSummary = await generateMonthlySummary(user.uid, currentMonth);
          
          // Set the automatically calculated summary
          setSummary({
            ...autoSummary,
            // Ensure compatibility with existing UI expectations
            defaultCarryForward: 1,
            totalWorkingDays: autoSummary.presentDays + autoSummary.halfDays + autoSummary.absentDays
          });
          
          console.log('📊 Using automatic attendance calculation based on working hours:', {
            presentDays: autoSummary.presentDays,
            halfDays: autoSummary.halfDays,
            absentDays: autoSummary.absentDays,
            totalHours: autoSummary.totalHours
          });
        } catch (err) {
          setError("Failed to load data.");
        } finally {
          setLoading(false);
        }
      } else {
        setError("User not logged in.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch addresses for all sessions
  useEffect(() => {
    async function fetchAddresses() {
      const newAttendanceList = [...attendanceList];
      let changed = false;
      const newAddressLoading: Record<string, boolean> = {};

      for (const att of newAttendanceList) {
        for (const [i, s] of att.sessions.entries()) {
          // Login location
          if (
            s.loginLocation &&
            s.loginLocation.lat &&
            s.loginLocation.lng &&
            (!s.loginLocation.address || s.loginLocation.address === "Unknown location")
          ) {
            const key = `${att.date}-login-${i}`;
            newAddressLoading[key] = true;
            s.loginLocation.address = await getAddressFromCoords(
              s.loginLocation.lat,
              s.loginLocation.lng
            );
            changed = true;
            newAddressLoading[key] = false;
          }
          // Logout location
          if (
            s.logoutLocation &&
            s.logoutLocation.lat &&
            s.logoutLocation.lng &&
            (!s.logoutLocation.address || s.logoutLocation.address === "Unknown location")
          ) {
            const key = `${att.date}-logout-${i}`;
            newAddressLoading[key] = true;
            s.logoutLocation.address = await getAddressFromCoords(
              s.logoutLocation.lat,
              s.logoutLocation.lng
            );
            changed = true;
            newAddressLoading[key] = false;
          }
        }
      }
      setAddressLoading((prev) => ({ ...prev, ...newAddressLoading }));
      if (changed) setAttendanceList(newAttendanceList);
    }
    if (attendanceList.length > 0) fetchAddresses();
    // eslint-disable-next-line
  }, [attendanceList]);

  // AI Suggestions
  useEffect(() => {
    if (!summary) return;
    const suggestions: string[] = [];
    const { presentDays = 0, totalWorkingDays = 0, leavesTaken = 0, extraLeaves = 0 } = summary;
    const attendancePct = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0;
    if (attendancePct < 80) {
      suggestions.push("⚠ Your attendance is below 80%. Try to be more regular to avoid HR warnings.");
    } else if (attendancePct >= 95) {
      suggestions.push("🌟 Excellent attendance! Keep it up for rewards.");
    }
    if (leavesTaken > 5) {
      suggestions.push("You have taken more than 5 leaves. Plan leaves in advance to avoid disruptions.");
    }
    if (extraLeaves > 0) {
      suggestions.push(`You have ${extraLeaves} extra leave(s). Try to reduce unplanned absences.`);
    }
    if (suggestions.length === 0) {
      suggestions.push("🎉 Great job! Your attendance is optimal this month.");
    }
    setAiSuggestions(suggestions);
  }, [summary]);

  // Fetch all summaries for the user
  useEffect(() => {
    if (!userId) return;
    async function fetchAllSummaries() {
      const q = query(collection(db, "attendanceSummary"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const arr = snap.docs.map(doc => doc.data());
      arr.sort((a, b) => b.month.localeCompare(a.month));
      setAllSummaries(arr);
      if (arr.length > 0 && !selectedMonth) setSelectedMonth(arr[0].month);
    }
    fetchAllSummaries();
    // eslint-disable-next-line
  }, [userId]);

  const selectedSummary = allSummaries.find(s => s.month === selectedMonth);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 dark:from-gray-900 dark:to-gray-950">
        <Loader2 className="animate-spin w-12 h-12 text-blue-500 mb-4" />
        <div className="text-lg text-blue-700 dark:text-blue-200 font-semibold">Loading your attendance history...</div>
      </div>
    );
  if (error)
    return <div className="text-center text-red-600 py-20">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:from-gray-900 dark:to-gray-950 py-8 px-2">
      {/* AI Suggestions */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-blue-100 to-yellow-100 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow p-4 flex items-center gap-3">
          <Sparkles className="text-yellow-500" size={28} />
          <div>
            <div className="font-bold text-blue-700 dark:text-yellow-300 mb-1">AI Insights</div>
            <ul className="list-disc ml-5 text-gray-700 dark:text-gray-200 text-sm">
              {aiSuggestions.map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 dark:text-white">📅 Attendance History</h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          👤 {summary?.name}
        </p>

        {/* Modern Card List */}
        <div className="flex flex-col gap-6">
          {attendanceList.map((att, idx) => {
            const isExpanded = expanded[att.date] ?? idx === 0;
            const [h = 0] = att.totalHours?.split("h").map((v: any) => parseInt(v)) || [0];
                const isUnderworked = h < 9;
                return (
              <div
                key={att.date}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      {att.date}
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${isUnderworked ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"}`}>
                        {att.totalHours || "0h 0m"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-300 hover:underline text-sm"
                    onClick={() => setExpanded((prev) => ({ ...prev, [att.date]: !isExpanded }))}
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    {isExpanded ? "Hide Sessions" : "Show Sessions"}
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-4 flex flex-col gap-4">
                        {att.sessions.map((s: any, i: number) => (
                      <div
                            key={i}
                        className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:gap-8 gap-2"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-green-600 dark:text-green-400 font-semibold">🟢 Login:</span>
                            <span className="font-mono">{s.login || "—"}</span>
                          </div>
                          {s.loginLocation && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 ml-5">
                              <MapPin size={14} className="inline" />
                              {s.isOfficeLogin === true ? (
                                <span>Novel Office, Marthahalli, Bangalore</span>
                              ) : s.loginLocation.address && s.loginLocation.address !== "Unknown location" ? (
                                s.loginLocation.address
                              ) : (
                                <span className="flex items-center gap-1 text-blue-400">
                                  <Loader2 className="animate-spin w-3 h-3" />
                                  {s.loginLocation.lat && s.loginLocation.lng ? 'Fetching address...' : 'Location not available'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-red-600 dark:text-red-400 font-semibold">🔴 Logout:</span>
                            <span className="font-mono">{s.logout || "⏳"}</span>
                              </div>
                          {s.logout && s.logoutLocation && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 ml-5">
                              <MapPin size={14} className="inline" />
                              {s.isOfficeLogin === true ? (
                                <span>Novel Office, Marthahalli, Bangalore</span>
                              ) : s.logoutLocation.address && s.logoutLocation.address !== "Unknown location" ? (
                                s.logoutLocation.address
                              ) : (
                                <span className="flex items-center gap-1 text-blue-400">
                                  <Loader2 className="animate-spin w-3 h-3" />
                                  {s.logoutLocation.lat && s.logoutLocation.lng ? 'Fetching address...' : 'Location not available'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                              </div>
                            )}
              </div>
                );
              })}
        </div>
        </div>

        {/* Summary Table */}
      <div className="max-w-3xl mx-auto mt-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
            <Award className="w-7 h-7 text-yellow-500" />
            Monthly Attendance Summary
          </h2>
          {allSummaries.length > 1 && (
            <select
              className="p-2 rounded border bg-white dark:bg-gray-900 dark:text-white"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              {allSummaries.map((s: any) => (
                <option key={s.month} value={s.month}>
                  {s.month}
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedSummary ? (
          <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
              <div>
                <div className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5" /> {selectedSummary.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-300">{selectedSummary.email}</div>
                <div className="text-sm text-gray-500 dark:text-gray-300">{selectedSummary.department}</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-800 px-3 py-1 rounded-full text-blue-700 dark:text-blue-200 text-sm">
                  <CalendarDays className="w-4 h-4" /> {selectedSummary.month}
                </div>
                <div className="flex items-center gap-1 bg-green-100 dark:bg-green-800 px-3 py-1 rounded-full text-green-700 dark:text-green-200 text-sm">
                  <Briefcase className="w-4 h-4" /> {selectedSummary.totalWorkingDays} Working Days
                </div>
                <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-800 px-3 py-1 rounded-full text-yellow-700 dark:text-yellow-200 text-sm">
                  <Gift className="w-4 h-4" /> {selectedSummary.carryForwardLeaves} Carry Forward
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Present</span>
                <span className="text-2xl font-bold text-green-900 dark:text-white">{selectedSummary.presentDays}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Half Days</span>
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{selectedSummary.halfDays}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Absent</span>
                <span className="text-2xl font-bold text-red-900 dark:text-white">{selectedSummary.absentDays}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Leaves Taken</span>
                <span className="text-2xl font-bold text-blue-900 dark:text-white">{selectedSummary.leavesTaken}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Extra Leaves</span>
                <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">{selectedSummary.extraLeaves}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Hours</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedSummary.totalmonthHours}</span>
              </div>

            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-300 py-8">
            No summary data found for this month.
          </div>
        )}
        </div>

        {/* Charts */}
      <div className="max-w-5xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
            <h2 className="text-center font-semibold text-gray-700 dark:text-gray-200 mb-2">
              📊 Leave vs Presence
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Present", value: summary?.presentDays || 0 },
                    { name: "Leaves Taken", value: summary?.leavesTaken || 0 },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label
                >
                  <Cell fill="#4ade80" />
                  <Cell fill="#f87171" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
            <h2 className="text-center font-semibold text-gray-700 dark:text-gray-200 mb-2">
              📅 Daily Work Hours
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={attendanceList.map((att) => {
                  const [h = 0, m = 0] = att.totalHours
                    ?.split(/[hm ]+/)
                    .filter(Boolean)
                    .map((s: string) => parseInt(s)) || [0, 0];
                  return { date: att.date, hours: h + m / 60 };
                })}
                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#3b82f6" name="Hours Worked" />
              </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}