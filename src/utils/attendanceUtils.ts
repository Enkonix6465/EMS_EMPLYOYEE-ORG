import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Parse time like "11:20:28 AM" → Date object
const parseTimeToDate = (timeStr: string): Date => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes, seconds] = time.split(":").map(Number);

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return new Date(1970, 0, 1, hours, minutes, seconds);
};

// Total worked time in seconds
const calculateTotalSeconds = (
  sessions: { login: string; logout: string }[],
  includeCurrent = false
): number => {
  let totalSec = 0;

  for (let { login, logout } of sessions) {
    if (!login || (!logout && !includeCurrent)) continue;

    try {
      const loginDate = parseTimeToDate(login);
      const logoutDate = logout
        ? parseTimeToDate(logout)
        : parseTimeToDate(new Date().toLocaleTimeString());

      let diff = (logoutDate.getTime() - loginDate.getTime()) / 1000;
      if (diff < 0) diff += 86400;

      totalSec += diff;
    } catch (err) {
      console.error("⛔ Time parse error", err);
    }
  }

  return totalSec;
};

// Format seconds to "Xh Ym Zs"
const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs}h ${mins}m ${secs}s`;
};

// Determine status by total seconds
const getDayStatus = (seconds: number): "Present" | "Half Day" | "Absent" => {
  const hours = seconds / 3600;
  if (hours >= 8) return "Present"; // 8+ hours = 1 full day present
  if (hours >= 4) return "Half Day"; // 4+ hours = 0.5 day present
  return "Absent";
};

// Check if it's a new month and reset calculations if needed
export const checkAndResetMonthlyData = async (userId: string): Promise<boolean> => {
  const currentDate = new Date();
  const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format
  
  // Check if summary exists for current month
  const summaryRef = doc(db, "attendanceSummary", `${userId}_${currentMonth}`);
  const summarySnap = await getDoc(summaryRef);
  
  if (!summarySnap.exists()) {
    console.log(`🔄 New month detected: ${currentMonth}. Initializing fresh calculations.`);
    await generateMonthlySummary(userId, currentMonth);
    return true;
  }
  
  return false;
};

// Calculate attendance status for a specific day based on working hours
export const calculateDayAttendance = (totalHours: string): {
  status: "Present" | "Half Day" | "Absent";
  presentValue: number; // 1 for full day, 0.5 for half day, 0 for absent
} => {
  // Parse hours from format like "10h 47m 47s"
  const hourMatch = totalHours.match(/(\d+)h/);
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  
  if (hours >= 8) {
    return { status: "Present", presentValue: 1 };
  } else if (hours >= 4) {
    return { status: "Half Day", presentValue: 0.5 };
  } else {
    return { status: "Absent", presentValue: 0 };
  }
};

// ✅ Main Function to Generate Monthly Summary (Enhanced with automatic calculations)
export const generateMonthlySummary = async (
  userId: string,
  yearMonth: string
) => {
  console.log(
    `⚙️ Generating fresh monthly summary for: ${userId}, month: ${yearMonth}`
  );

  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  let presentDays = 0,
    halfDays = 0,
    absentDays = 0,
    totalSeconds = 0;
  
  const countedDates: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${yearMonth}-${String(d).padStart(2, "0")}`;
    const ref = doc(db, "attendance", `${userId}_${date}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      continue;
    }

    const data = snap.data();
    const sessions = data.sessions || [];

    const daySeconds = calculateTotalSeconds(sessions);
    const status = getDayStatus(daySeconds);

    if (status === "Present") presentDays++;
    else if (status === "Half Day") halfDays += 0.5; // Count half days as 0.5
    else absentDays++;

    totalSeconds += daySeconds;
    countedDates.push(date);
  }

  const totalWorkingDays = presentDays + halfDays + absentDays;
  const leavesTaken = Math.min(absentDays, 1); // 1 allowed leave
  const extraLeaves = Math.max(0, absentDays - 1);
  const carryForwardLeaves = absentDays === 0 ? 2 : 0;

  const totalHours = formatTime(totalSeconds);
  const totalmonthHours = formatTime(totalSeconds); // For compatibility

  const summary = {
    userId,
    month: yearMonth,
    presentDays: Math.floor(presentDays), // Ensure integer for full days
    halfDays: halfDays % 1 === 0 ? halfDays : Math.floor(halfDays * 2), // Convert 0.5 to 1 half day
    absentDays,
    leavesTaken,
    extraLeaves,
    carryForwardLeaves,
    totalWorkingDays,
    totalHours,
    totalmonthHours,
    countedDates,
    lastUpdated: new Date().toISOString(),
    autoCalculated: true // Flag to indicate this was automatically calculated
  };

  console.log("📤 Writing fresh monthly summary to Firestore:", summary);

  await setDoc(doc(db, "attendanceSummary", `${userId}_${yearMonth}`), summary);
  return summary;
};
