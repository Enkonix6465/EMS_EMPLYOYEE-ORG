import React, { useEffect, useState, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// --- TYPE DEFINITIONS ---
interface DayDetails {
  status: "present" | "absent" | "leave" | "holiday" | "weekend" | "cancelledLeave";
  hours?: string;
  sessions?: { login: string; logout: string }[];
  leaveReason?: string;
  holidayReason?: string;
}

type AttendanceMap = {
  [date: string]: DayDetails;
};

// --- UTILITY FUNCTIONS ---
const getDaysInMonth = (year: number, month: number): string[] => {
  const date = new Date(Date.UTC(year, month, 1));
  const days: string[] = [];
  while (date.getUTCMonth() === month) {
    days.push(date.toISOString().split("T")[0]);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
};

// --- MAIN COMPONENT ---
const CalendarAttendancePage = () => {
  const [value, setValue] = useState(new Date());
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const db = getFirestore();
  const auth = getAuth();

  // --- EFFECTS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Handle logged out state, maybe redirect or show message
        console.log("No authenticated user.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (userId) {
      fetchMonthlyData(value);
    }
  }, [userId, value]);

  // --- DATA FETCHING ---
  const fetchMonthlyData = async (selectedDate: Date) => {
    if (!userId) return;
    setLoading(true);

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const days = getDaysInMonth(year, month);
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const updatedMap: AttendanceMap = {};

    // 1. Fetch holidays and working days
    const calendarQuery = query(
      collection(db, "calendarDays"),
      where("date", ">=", `${monthStr}-01`),
      where("date", "<=", `${monthStr}-31`)
    );
    const calendarSnap = await getDocs(calendarQuery);
    const holidays: { [date: string]: string } = {};
    const workingDays: { [date: string]: string } = {};
    calendarSnap.forEach((doc) => {
      const data = doc.data();
      if (data.type === "holiday") {
        holidays[data.date] = data.reason || "Public Holiday";
      } else if (data.type === "working") {
        workingDays[data.date] = data.reason || "Working Day";
      }
    });

    // 2. Fetch approved leaves and cancelled leaves
    const leavesQuery = query(
      collection(db, "leaveManage"),
      where("userId", "==", userId),
      where("status", "==", "accepted")
    );
    const leavesSnap = await getDocs(leavesQuery);
    const leaves: { [date: string]: string } = {};
    const cancelledLeaves: { [date: string]: string } = {};
    
    leavesSnap.forEach((doc) => {
      const data = doc.data();
      if (data.date.startsWith(monthStr)) {
        if (data.cancelledByUser === true) {
          cancelledLeaves[data.date] = data.reason || "Cancelled Leave";
        } else {
        leaves[data.date] = data.reason || "Leave";
        }
      }
    });
    console.log("[DEBUG] Fetched leaves:", leaves);
    console.log("[DEBUG] Fetched cancelled leaves:", cancelledLeaves);

    // 3. Fetch attendance and build map
    await Promise.all(
      days.map(async (day) => {
        const dayOfWeek = new Date(day + "T00:00:00Z").getUTCDay();
        if (holidays[day]) {
          updatedMap[day] = { status: "holiday", holidayReason: holidays[day] };
        } else if (leaves[day]) {
          updatedMap[day] = { status: "leave", leaveReason: leaves[day] };
        } else if (cancelledLeaves[day]) {
          updatedMap[day] = { status: "cancelledLeave", leaveReason: cancelledLeaves[day] };
        } else if (workingDays[day]) {
          // Admin-set working day, even if weekend
          const docRef = doc(db, "attendance", `${userId}_${day}`);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            updatedMap[day] = {
              status: "present",
              hours: data.totalHours || "0h 0m",
              sessions: data.sessions || [],
            };
          } else {
            updatedMap[day] = { status: "present" };
          }
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
          updatedMap[day] = { status: "weekend" };
        } else {
          const docRef = doc(db, "attendance", `${userId}_${day}`);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            updatedMap[day] = {
              status: "present",
              hours: data.totalHours || "0h 0m",
              sessions: data.sessions || [],
            };
          } else {
            updatedMap[day] = { status: "absent" };
          }
        }
      })
    );

    setAttendanceMap(updatedMap);
    setLoading(false);
  };

  // --- CALENDAR RENDERING LOGIC ---
  const getTooltipText = (date: Date): string => {
    const dateStr = date.toISOString().split("T")[0];
    const dayData = attendanceMap[dateStr];
    if (!dayData) return dateStr;

    let tooltip = `${dateStr} - ${dayData.status.toUpperCase()}`;
    switch (dayData.status) {
      case "present":
        tooltip += `\nHours: ${dayData.hours || "N/A"}`;
        (dayData.sessions || []).forEach((s, i) => {
          tooltip += `\nSession ${i + 1}: ${s.login} - ${
            s.logout || "Not logged out"
          }`;
        });
        break;
      case "leave":
        tooltip += `\nReason: ${dayData.leaveReason || "N/A"}`;
        break;
      case "holiday":
        tooltip += `\n${dayData.holidayReason || "Public Holiday"}`;
        break;
      case "cancelledLeave":
        tooltip += `\nReason: ${dayData.leaveReason || "Cancelled Leave"}`;
        break;
    }
    return tooltip;
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return "";
    const dateStr = date.toISOString().split("T")[0];
    const dayData = attendanceMap[dateStr];
    let baseClass = "react-calendar__tile transition-colors duration-200 text-gray-900 dark:text-white";

    if (!dayData) return baseClass;

    switch (dayData.status) {
      case "present":
        return `${baseClass} bg-green-200 dark:bg-green-800 hover:bg-green-300 dark:hover:bg-green-700 text-green-900 dark:text-white`;
      case "absent":
        return `${baseClass} bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700 text-red-900 dark:text-white`;
      case "leave":
        return `${baseClass} bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-blue-700 text-blue-900 dark:text-white`;
      case "cancelledLeave":
        return `${baseClass} bg-orange-200 dark:bg-orange-800 hover:bg-orange-300 dark:hover:bg-orange-700 text-orange-900 dark:text-white`;
      case "holiday":
        return `${baseClass} bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700 text-purple-900 dark:text-white`;
      case "weekend":
        return `${baseClass} bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white`;
      default:
        return baseClass;
    }
  };

  // --- DERIVED STATE & STATS ---
  const stats = useMemo(() => {
    const entries = Object.entries(attendanceMap);
    if (entries.length === 0)
      return { present: 0, absent: 0, leave: 0, cancelledLeave: 0, streak: 0, totalHours: "0h 0m" };

    const result = {
      present: 0,
      absent: 0,
      leave: 0,
      cancelledLeave: 0,
      totalSeconds: 0,
    };

    entries.forEach(([, details]) => {
      if (details.status === "present") result.present++;
      else if (details.status === "absent") result.absent++;
      else if (details.status === "leave") result.leave++;
      else if (details.status === "cancelledLeave") result.cancelledLeave++;

      if (details.status === "present" && details.hours) {
        const hMatch = details.hours.match(/(\d+)h/);
        const mMatch = details.hours.match(/(\d+)m/);
        const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
        const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
        result.totalSeconds += hours * 3600 + minutes * 60;
      }
    });

    let currentStreak = 0;
    const sortedDates = Object.keys(attendanceMap).sort();
    for (const dateStr of sortedDates) {
      const details = attendanceMap[dateStr];
      if (new Date(dateStr) > new Date()) continue;

      if (details.status === "present") {
        currentStreak++;
      } else if (details.status !== "weekend" && details.status !== "holiday") {
        currentStreak = 0;
      }
    }
    
    const totalHours = Math.floor(result.totalSeconds / 3600);
    const totalMinutes = Math.floor((result.totalSeconds % 3600) / 60);

    return {
      present: result.present,
      absent: result.absent,
      leave: result.leave,
      cancelledLeave: result.cancelledLeave,
      streak: currentStreak,
      totalHours: `${totalHours}h ${totalMinutes}m`,
    };
  }, [attendanceMap]);

  if (!userId && !loading) {
    return (
      <div className="text-center py-10">
        Please log in to view your attendance.
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-lg">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-blue-800 dark:text-blue-300">
        Attendance Hub
      </h2>

      {loading ? (
        <div className="text-center text-gray-500 py-20">
          Loading attendance data...
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <Calendar
              onChange={(value) => setValue(value as Date)}
              value={value}
              tileClassName={tileClassName}
              formatDay={(_, date) => date.getDate().toString()}
              className="w-full border-none"
            />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="font-bold text-lg mb-3 text-gray-700 dark:text-gray-200">
                Monthly Stats
              </h3>
              <div className="space-y-2 text-sm">
                <p>✅ Present: <strong>{stats.present} days</strong></p>
                <p>❌ Absent: <strong>{stats.absent} days</strong></p>
                <p>✈️ Leave: <strong>{stats.leave} days</strong></p>
                <p>🚫 Cancelled Leave: <strong>{stats.cancelledLeave} days</strong></p>
                <p>⏰ Total Hours: <strong>{stats.totalHours}</strong></p>
                <p>🔥 Current Streak: <strong>{stats.streak} days</strong></p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="font-bold text-lg mb-3 text-gray-700 dark:text-gray-200">
                Legend
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-200 rounded-full"></span>Present</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-200 rounded-full"></span>Absent</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-200 rounded-full"></span>Leave</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-purple-200 rounded-full"></span>Holiday</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-200 rounded-full"></span>Weekend</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-200 rounded-full"></span>Cancelled Leave</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarAttendancePage;
