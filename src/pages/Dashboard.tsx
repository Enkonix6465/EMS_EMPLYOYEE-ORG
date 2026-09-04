import React, { useEffect, useRef, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  serverTimestamp,
  Timestamp,
  query,
  limit,
  onSnapshot,
  where,
} from "firebase/firestore";
import { PartyPopper, Brain, TrendingUp, AlertTriangle, Lightbulb, Target, Zap } from "lucide-react"; // Make sure to install lucide-react if not present
import type { Dispatch, SetStateAction } from "react";
import { UserCircle, LogOut, CalendarDays, Users, Award, Clock, Briefcase, MessageCircle } from "lucide-react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import './DashboardModern.css';
import { db } from "../lib/firebase";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import HighlightsBar from '../components/HighlightsBar';
import { useHighlights } from '../hooks/useHighlights';
import CareerInsights from '../components/CareerInsights';
import { 
  generateDashboardInsights, 
  generateSmartNotifications, 
  calculateProductivityScore,
  generatePersonalizedRecommendations,
  predictAttendancePatterns,
  analyzeWorkload,
  analyzeEmployeeWellness,
  predictPerformance,
  AIInsight,
  SmartSuggestion,
  AIPrediction
} from '../utils/aiUtils';
import {
  checkAndResetMonthlyData,
  calculateDayAttendance,
  generateMonthlySummary
} from '../utils/attendanceUtils';
import {
  WorkloadAnalysisWidget,
  EmployeeWellnessWidget,
  PerformancePredictionWidget,
  LearningPathWidget
} from '../components/AIAdvancedFeatures';
import AIChatbot from '../components/AIChatbot';

// --- THEME COLORS ---
// Main accent: blue (#2563eb), secondary: teal (#14b8a6), highlight: gold (#fbbf24)
// Use these for backgrounds, buttons, stats, and highlights.
// --- Shared server-time sync (sync once, tick locally) ---
// Instead of hitting timeapi.io on every render/interval tick, we sync once,
// remember the offset between server time and this device's clock, and then
// compute "current server time" locally from Date.now() + that offset.
// Only re-hits the network if the cached offset is missing or older than 60s.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Asia/Kolkata is fixed UTC+5:30, no DST

let timeSyncOffsetMs: number = 0; // serverEpochMs - Date.now(); 0 = "use local device time"
let lastSyncAtMs = 0;
const TIME_RESYNC_INTERVAL_MS = 60000; // re-sync at most once a minute

const pad2 = (n: number) => String(n).padStart(2, "0");

// Converts an epoch ms value into the Asia/Kolkata wall-clock date/time strings,
// in the same "YYYY-MM-DD" / "HH:MM:SS" shape the old code produced.
const epochToKolkataParts = (epochMs: number): { date: string; time: string } => {
  const t = new Date(epochMs + IST_OFFSET_MS);
  const date = `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
  const time = `${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}:${pad2(t.getUTCSeconds())}`;
  return { date, time };
};

// The actual network fetch. Never throws — on any failure (including an
// intentional timeout abort) it just keeps the previous offset (or 0) and
// backs off until the next resync window, so a down/slow API is never
// retried more than once every TIME_RESYNC_INTERVAL_MS.
const syncServerTime = async (): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata",
      { signal: controller.signal }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const iso: string = data.dateTime;
    const serverEpochMs = new Date(`${iso}Z`).getTime() - IST_OFFSET_MS;
    timeSyncOffsetMs = serverEpochMs - Date.now();
  } catch (error: any) {
    if (error?.name !== "AbortError") {
      console.error("Failed to sync server time, falling back to local time:", error);
    }
    // Otherwise: silent. Either way, keep the last known offset (or 0)
    // rather than throwing.
  } finally {
    clearTimeout(timeoutId);
    lastSyncAtMs = Date.now(); // back off regardless of success/failure
  }
};

// Always resolves to a valid { date, time } pair, never throws. Only hits
// the network when the cached offset is missing or older than 60s —
// otherwise it's a pure local computation from Date.now() + the last offset.
const getServerDateTime = async (): Promise<{ date: string; time: string }> => {
  if (Date.now() - lastSyncAtMs > TIME_RESYNC_INTERVAL_MS) {
    await syncServerTime();
  }
  return epochToKolkataParts(Date.now() + timeSyncOffsetMs);
};

const getCurrentDate = async (): Promise<string> => {
  const { date } = await getServerDateTime();
  console.log("📅 Server Date:", date);
  return date;
};

const convertTo24HourFormat = (time12h: string): string => {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes, seconds] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
};

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const parseTimeToDate = (timeStr: string): Date => {
  if (!timeStr) return new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
  try {
    let [hours, minutes, seconds = "0"] = timeStr.split(":");
    return new Date(Date.UTC(
      1970, 0, 1,
      Number(hours) || 0,
      Number(minutes) || 0,
      Number(seconds) || 0
    ));
  } catch {
    return new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
  }
};
const calculateTotalHours = (
  sessions: { login: string; logout: string }[],
  includeCurrent = false,
  serverTime?: string // Pass server time if available
): string => {
  let totalSec = 0;
  const MAX_SESSION_SEC = 12 * 3600; // 12 hours

  for (let { login, logout } of sessions) {
    if (!login || (!logout && !includeCurrent)) continue;

    try {
      const loginDate = parseTimeToDate(login);
      let logoutDate;
      if (logout) {
        logoutDate = parseTimeToDate(logout);
      } else if (includeCurrent && serverTime) {
        logoutDate = parseTimeToDate(serverTime);
      } else {
        continue;
      }

      let diff = (logoutDate.getTime() - loginDate.getTime()) / 1000;
      if (diff < 0) diff += 86400; // handle day rollover

      // Clamp to 12 hours max per session
      diff = Math.min(diff, MAX_SESSION_SEC);

      totalSec += diff;
    } catch (err) {
      console.error("Time parse error", err);
    }
  }

  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = Math.floor(totalSec % 60);
  return `${hrs}h ${mins}m ${secs}s`;
};

// GPS Location tracking with OpenStreetMap Nominatim
const getAddressFromCoords = async (
  lat: number,
  lon: number
): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    const data = await res.json();
    const fullAddress =
      data.display_name ||
      `${data.address.road || ""}, ${
        data.address.city ||
        data.address.town ||
        data.address.village ||
        ""
      }, ${data.address.state || ""}, ${data.address.country || ""}`;
    return fullAddress.trim() || `Lat: ${lat.toFixed(6)}, Lng: ${lon.toFixed(6)}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return `Lat: ${lat.toFixed(6)}, Lng: ${lon.toFixed(6)}`;
  }
};

// GPS Location tracking function with better error handling
const getCurrentLocation = async (): Promise<{ lat: number; lng: number; address: string } | null> => {
  return new Promise((resolve) => {
    // Add timeout for geolocation
    const timeoutId = setTimeout(() => {
      console.error("Geolocation timeout");
      resolve(null);
    }, 15000); // 15 second timeout

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(timeoutId);
        const latVal = pos.coords.latitude.toFixed(6);
        const lngVal = pos.coords.longitude.toFixed(6);
        try {
          const address = await getAddressFromCoords(parseFloat(latVal), parseFloat(lngVal));
          resolve({
            lat: parseFloat(latVal),
            lng: parseFloat(lngVal),
            address
          });
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
resolve({
            lat: parseFloat(latVal),
            lng: parseFloat(lngVal),
            address: `Lat: ${latVal}, Lng: ${lngVal}`
          });
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error("Geolocation error:", error);
        // Provide more specific error messages
        let errorMessage = "Location access denied";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please check your GPS.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        console.error(errorMessage);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
};

// ✅ ADD HERE - Improved location permission check
const checkLocationPermission = async (): Promise<boolean> => {
  try {
    const status = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return status.state === "granted" || status.state === "prompt";
  } catch (error) {
    console.error("Permission check failed", error);
    return false;
  }
};

// Add a function to request location permission
const requestLocationPermission = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 5000 }
    );
  });
};

// Move these functions outside EmployeeSelfProfile
const getMonthDays_Calendar = (year: number, month: number) => {
  const days: string[] = [];
  const date = new Date(Date.UTC(year, month, 1));
  while (date.getUTCMonth() === month) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
};

const isAdmin_Calendar = (profile: any) => profile?.role === "admin";

function CalendarCreative({
  year,
  month,
  calendarDays,
  onToggleDay,
  loading,
  adminMode,
  onMonthChange,
  recommendedHolidays = [],
  monthlyBirthdays = {},
}: {
  year: number;
  month: number;
  calendarDays: Record<string, { type: string; reason?: string }>;
  onToggleDay?: (date: string, currentType: string | undefined) => void;
  loading: boolean;
  adminMode: boolean;
  onMonthChange?: (year: number, month: number) => void;
  recommendedHolidays?: string[];
  monthlyBirthdays?: Record<string, { name: string; photo: string }[]>;
}) {
  const days = getMonthDays_Calendar(year, month);
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const weeks: Array<Array<string>> = [[]];
  for (let i = 0; i < firstDay; i++) weeks[0].push("");
  days.forEach((d, i) => {
    if (weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  });
  while (weeks[weeks.length - 1].length < 7) weeks[weeks.length - 1].push("");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mt-8 w-full max-w-xl mx-auto perspective-container">
      <div className="flex justify-between items-center mb-2">
        <button
          className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          onClick={() => onMonthChange && onMonthChange(year, month - 1)}
          disabled={loading}
        >
          ◀
        </button>
        <h2 className="text-lg font-bold text-center text-blue-700 dark:text-blue-300">
        📅 {year}-{String(month + 1).padStart(2, "0")}
      </h2>
        <button
          className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          onClick={() => onMonthChange && onMonthChange(year, month + 1)}
          disabled={loading}
        >
          ▶
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-center mb-1">
        {"SMTWTFS".split("").map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((date, di) => {
            if (!date) return <div key={di} />;
            const info = calendarDays[date];
            const birthdayInfo = monthlyBirthdays[date];
            const isWeekend =
              new Date(date).getUTCDay() === 0 ||
              new Date(date).getUTCDay() === 6;
            let bg = "";
            let text = "";
            let title = "";
            let extraClasses = "";

            if (birthdayInfo) {
              bg =
                "bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 text-white";
              text = "🎂 Birthday";
              title =
                birthdayInfo.map((e) => e.name).join(", ") + "'s Birthday";
              extraClasses = "three-d-card";
            } else if (info?.type === "holiday") {
              bg = "bg-red-200 dark:bg-red-700";
              text = "Holiday";
              title = info.reason || text;
            } else if (info?.type === "working") {
              bg = "bg-green-200 dark:bg-green-700";
              text = "Working";
              title = text;
            } else if (isWeekend) {
              bg = "bg-gray-200 dark:bg-gray-700";
              text = "Weekend";
              title = text;
            }

            if (recommendedHolidays.includes(date)) {
              bg += " ring-2 ring-yellow-400";
              text = "Recommended Holiday";
              title = text;
            }
            if (date === today) bg += " ring-2 ring-blue-500";
            return (
              <button
                key={di}
                className={`rounded p-1 h-20 flex flex-col items-center justify-center ${bg} ${
                  adminMode ? "hover:ring-2 hover:ring-blue-400" : ""
                } ${extraClasses}`}
                title={title}
                disabled={!adminMode || loading}
                onClick={() =>
                  adminMode && onToggleDay && onToggleDay(date, info?.type)
                }
              >
                <span className="font-bold text-base">
                  {Number(date.slice(-2))}
                </span>
                <span className="text-xs">{text}</span>
                {birthdayInfo && (
                  <span className="text-[10px] text-center w-full px-1 truncate">
                    {birthdayInfo.map((e) => e.name).join(", ")}
                  </span>
                )}
                {!birthdayInfo && info?.reason && (
                  <span className="text-[10px] text-gray-600 dark:text-gray-300">
                    {info.reason}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
      {recommendedHolidays.length > 0 && (
        <div className="mt-4 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-yellow-800 dark:text-yellow-200 text-xs">
          <b>Recommended Holidays:</b> {recommendedHolidays.join(", ")}
        </div>
      )}
    </div>
  );
}

// Utility: Recommend holidays based on weekends, not already marked as holiday, and carry forward leaves
const getRecommendedHolidays = (
  year: number,
  month: number,
  calendarDays: Record<string, { type: string; reason?: string }>,
  carryForward: number
): string[] => {
  const days = getMonthDays_Calendar(year, month);
  const recommendations: string[] = [];
  // Recommend long weekends and use of carry forward
  for (let i = 0; i < days.length; i++) {
    const date = days[i];
    const dayOfWeek = new Date(date).getUTCDay();
    // Recommend if Friday or Monday and not already a holiday
    if (
      (dayOfWeek === 1 || dayOfWeek === 5) &&
      (!calendarDays[date] || calendarDays[date].type !== "holiday")
    ) {
      // Check if adjacent to a weekend or holiday
      const prev = days[i - 1];
      const next = days[i + 1];
      const isAdjacentToHolidayOrWeekend = (d: string | undefined) => {
        if (!d) return false;
        const info = calendarDays[d];
        const dow = new Date(d).getUTCDay();
        return (
          (info && info.type === "holiday") || dow === 0 || dow === 6
        );
      };
      if (isAdjacentToHolidayOrWeekend(prev) || isAdjacentToHolidayOrWeekend(next)) {
        recommendations.push(date);
      }
    }
  }
  // If user has carry forward, recommend using them before expiry
  if (carryForward > 0) {
    for (let i = 0; i < days.length; i++) {
      const date = days[i];
      if (!calendarDays[date] && recommendations.length < carryForward) {
        recommendations.push(date);
      }
    }
  }
  return Array.from(new Set(recommendations));
};

// Fetch public holidays from date.nager.at (India)
const fetchCorporateHolidays = async (year: number) => {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
  if (!res.ok) throw new Error("Failed to fetch holidays");
  const data = await res.json();
  return data.map((h: any) => ({
    date: h.date,
    type: "holiday",
    reason: h.localName,
  }));
};

// Move these handlers outside EmployeeSelfProfile
const handleMonthChangeCreative = (
  setCalendarYearCreative: Dispatch<SetStateAction<number>>,
  setCalendarMonthCreative: Dispatch<SetStateAction<number>>
) => (year: number, month: number) => {
  let newYear = year;
  let newMonth = month;
  if (newMonth < 0) {
    newYear -= 1;
    newMonth = 11;
  } else if (newMonth > 11) {
    newYear += 1;
    newMonth = 0;
  }
  setCalendarYearCreative(newYear);
  setCalendarMonthCreative(newMonth);
};

const handleToggleDayCreative = (
  profile: any,
  calendarDaysCreative: Record<string, { type: string; reason?: string }>,
  setCalendarLoadingCreative: Dispatch<SetStateAction<boolean>>,
  setCalendarDaysCreative: Dispatch<SetStateAction<Record<string, { type: string; reason?: string }>>>,
  db: any
) => async (date: string, currentType: string | undefined) => {
  if (!isAdmin_Calendar(profile)) return;
  let newType = currentType === "holiday" ? "working" : "holiday";
  let reason = prompt(`Set reason for ${newType} on ${date}:`, calendarDaysCreative[date]?.reason || "");
  if (reason === null) return;
  setCalendarLoadingCreative(true);
  const ref = doc(db, "calendarDays", date);
  await setDoc(ref, { date, type: newType, reason });
  setCalendarDaysCreative((prev: Record<string, { type: string; reason?: string }>) => ({ ...prev, [date]: { type: newType, reason } }));
  setCalendarLoadingCreative(false);
};

const handleImportCorporateHolidaysCreative = (
  profile: any,
  setCalendarLoadingCreative: Dispatch<SetStateAction<boolean>>,
  calendarYearCreative: number,
  db: any,
  setCalendarRefreshCreative: Dispatch<SetStateAction<number>>
) => async () => {
  if (!isAdmin_Calendar(profile)) return;
  setCalendarLoadingCreative(true);
  try {
    const holidays = await fetchCorporateHolidays(calendarYearCreative);
    for (const h of holidays) {
      const ref = doc(db, "calendarDays", h.date);
      await setDoc(ref, h, { merge: true });
    }
    alert("Corporate holidays imported!");
    setCalendarRefreshCreative((r: number) => r + 1);
  } catch (err) {
    alert("Failed to import holidays");
  }
  setCalendarLoadingCreative(false);
};

// Helper: Get start and end of current week (Monday-Sunday)
function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [monday, sunday];
}

// Helper: Check if a date string (YYYY-MM-DD) is in this week
function isDateInWeek(dateStr: string, weekStart: Date, weekEnd: Date): boolean {
  const d: Date = new Date(dateStr);
  return d >= weekStart && d <= weekEnd;
}

// Dummy motivational quotes
const motivationalQuotes = [
  "Success is not the key to happiness. Happiness is the key to success.",
  "The only way to do great work is to love what you do.",
  "Don't watch the clock; do what it does. Keep going.",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
];

// Weather widget (OpenWeatherMap, Mumbai as example)
const WEATHER_API_KEY = "demo"; // Replace with your OpenWeatherMap API key
const OFFICE_CITY = "Mumbai";

function useWeather(city: string) {
  const [weather, setWeather] = useState<any>(null);
  useEffect(() => {
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`)
      .then(res => res.json())
      .then(data => setWeather(data))
      .catch(() => setWeather(null));
  }, [city]);
  return weather;
}

// Attendance streak calculation
function getAttendanceStreak(sessions: { login: string; logout: string }[], currentDate: string): number {
  // For demo: streak = number of consecutive days with a login (not counting today if absent)
  let streak = 0;
  let date = new Date(currentDate);
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (s.login) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getTodayQuote() {
  const day = new Date().getDate();
  return motivationalQuotes[day % motivationalQuotes.length];
}

// Live greeting component
function LiveGreeting({ name = '' }) {
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    function getGreeting() {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    }
    setGreeting(getGreeting());
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);
  return (
    <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">
      {greeting}, {name}!
    </h1>
  );
}

// Live date/time component
function LiveDateTime() {
  const [now, setNow] = useState<{date: string, time: string} | null>(null);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let cancelled = false;

    const tick = async () => {
      const dt = await getServerDateTime(); // never throws; hits the network only ~once/60s
      if (!cancelled) setNow(dt);
    };

    tick();
    interval = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return (
    <span className="text-white/80 text-sm font-mono tracking-widest">
      {now ? `${new Date(now.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })} ${now.time}` : 'Loading...'}
    </span>
  );
}

function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! I'm your assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (open && chatEndRef.current) {
      (chatEndRef.current as any).scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  function handleSend() {
    if (!input.trim()) return;
    const userMsg = { sender: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setTimeout(() => {
      // Simple rule-based bot
      let reply = "Sorry, I didn't understand that. Please try asking something else.";
      if (/hello|hi|hey/i.test(userMsg.text)) reply = "Hello! How can I assist you today?";
      else if (/help|support|assist/i.test(userMsg.text)) reply = "Sure! You can ask about attendance, holidays, events, or any feature in this dashboard.";
      else if (/holiday|leave/i.test(userMsg.text)) reply = "You can view holidays and apply for leave using the calendar and quick links above.";
      else if (/event/i.test(userMsg.text)) reply = "Upcoming events are shown in the calendar and highlights section.";
      setMessages((msgs) => [...msgs, { sender: "bot", text: reply }]);
    }, 700);
  }

  return (
    <div>
      {/* Floating button */}
      <button
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-4 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chatbot"
      >
        <MessageCircle className="w-7 h-7" />
      </button>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-blue-200 dark:border-gray-700 flex flex-col animate-fade-in-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 dark:border-gray-800 bg-blue-600 dark:bg-blue-800 rounded-t-xl">
            <span className="text-white font-bold">AI Assistant</span>
            <button onClick={() => setOpen(false)} className="text-white hover:text-blue-200 text-xl font-bold">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: 320 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`px-3 py-2 rounded-lg shadow text-sm max-w-[80%] ${msg.sender === "user" ? "bg-blue-100 dark:bg-blue-700 text-blue-900 dark:text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-blue-100 dark:border-gray-800 bg-blue-50 dark:bg-gray-800 rounded-b-xl flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg border border-blue-200 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-900 dark:text-white"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              autoFocus
            />
            <button
              onClick={handleSend}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
            >
              Send
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(.39,.575,.565,1) both;
        }
      `}</style>
    </div>
  );
}

// Helper for calendar events
function getCalendarEvents(
  calendarDays: Record<string, { type: string; reason?: string }>,
  year: number,
  month: number
) {
  const days = [];
  const date = new Date(Date.UTC(year, month, 1));
  while (date.getUTCMonth() === month) {
    const iso = date.toISOString().slice(0, 10);
    const info = calendarDays[iso];
    let title = '';
    let color = '';
    if (info?.type === 'holiday') {
      title = info.reason || 'Holiday';
      color = '#fbbf24'; // yellow
    } else if (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
      title = 'Weekend';
      color = '#f87171'; // red
    } else {
      title = 'Working Day';
      color = '#34d399'; // green
    }
    days.push({
      title,
      start: iso,
      allDay: true,
      color,
      display: 'background',
      extendedProps: { type: info?.type || (date.getUTCDay() === 0 || date.getUTCDay() === 6 ? 'weekend' : 'working') }
    });
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

function useHolidays(year: number) {
  const [holidays, setHolidays] = useState<any[]>([]);
  useEffect(() => {
    async function fetchHolidays() {
      const qSnap = await getDocs(collection(db, "calendarDays"));
      const data: any[] = [];
      qSnap.forEach(doc => {
        const d = doc.data();
        if (d.type === "holiday" && d.date.startsWith(`${year}-`)) {
          data.push(d);
        }
      });
      setHolidays(data);
    }
    fetchHolidays();
  }, [year]);
  return holidays;
}

// --- ONLINE USERS HOOK ---

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  useEffect(() => {
    const q = query(collection(db, "activeUsers"), where("status", "==", "online"));
    const unsub = onSnapshot(q, (snapshot) => {
      const names = snapshot.docs
        .map((d) => d.data().name)
        .filter((name): name is string => Boolean(name));
      setOnlineUsers(names);
    });
    return () => unsub();
  }, []);
  return onlineUsers;
}
export default function EmployeeSelfProfile() {
  // All hooks at the very top, before any logic or return
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [editable, setEditable] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [loginTime, setLoginTime] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [badge, setBadge] = useState("");
  const [specialAlerts, setSpecialAlerts] = useState<string[]>([]);
  const [calendarDaysCreative, setCalendarDaysCreative] = useState<Record<string, { type: string; reason?: string }>>({});
  const [calendarLoadingCreative, setCalendarLoadingCreative] = useState(false);
  const [calendarMonthCreative, setCalendarMonthCreative] = useState<number>(new Date().getUTCMonth());
  const [calendarYearCreative, setCalendarYearCreative] = useState<number>(new Date().getUTCFullYear());
  const [calendarRefreshCreative, setCalendarRefreshCreative] = useState(0);
  const [recommendedHolidaysCreative, setRecommendedHolidaysCreative] = useState<string[]>([]);
  const [carryForwardCreative, setCarryForwardCreative] = useState(0);
  const [monthlyBirthdaysCreative, setMonthlyBirthdaysCreative] = useState<Record<string, { name: string; photo: string }[]>>({});
  const [sessions, setSessions] = useState<{ login: string; logout: string }[]>([]); // <-- NEW
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]); // <-- NEW
  const [weekBirthdays, setWeekBirthdays] = useState<any[]>([]);
  const [weekAnniversaries, setWeekAnniversaries] = useState<any[]>([]);
  const auth = getAuth();
  const db = getFirestore();
  const didLogout = useRef(false);
  const weather = useWeather(OFFICE_CITY);
  const todayQuote = getTodayQuote();
  const holidays = useHolidays(calendarYearCreative);
  const year = new Date().getFullYear();
  const { events, loading: eventsLoading } = useCalendarEvents(year);
  console.log('DEBUG: Fetched events from useCalendarEvents:', events);
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalLogins = Array.isArray(sessions) ? sessions.filter(s => s.login && s.login !== "" && s.login.length >= 5).length : 0;
  const { highlights, loading: highlightsLoading } = useHighlights();
  const todaysBirthdays = highlights.filter(h => h.type === 'birthday' && h.date === todayStr);
  const onlineUsers = useOnlineUsers();
  // Add state for attendance summary
  const [attendanceSummary, setAttendanceSummary] = useState<{ presentDays: number; leavesTaken: number } | null>(null);
  const [showShiftPopup, setShowShiftPopup] = useState(false);
  const [shiftCountdown, setShiftCountdown] = useState<number | null>(null);
  const [shiftTimerId, setShiftTimerId] = useState<NodeJS.Timeout | null>(null);
  const [monthTotalHours, setMonthTotalHours] = useState<string>("0h 0m 0s");
  const [shiftDurationSec, setShiftDurationSec] = useState<number | null>(null);
  
  // AI Features State
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [productivityScore, setProductivityScore] = useState<number>(0);
  const [smartRecommendations, setSmartRecommendations] = useState<SmartSuggestion[]>([]);
  const [attendancePrediction, setAttendancePrediction] = useState<AIPrediction | null>(null);
  const [smartNotifications, setSmartNotifications] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  
  // Advanced AI Features State
  const [workloadAnalysis, setWorkloadAnalysis] = useState<any>(null);
  const [wellnessInsights, setWellnessInsights] = useState<AIInsight[]>([]);
  const [performancePrediction, setPerformancePrediction] = useState<AIPrediction | null>(null);
  const [learningSuggestions, setLearningSuggestions] = useState<SmartSuggestion[]>([]);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // AI Data Fetching
  const fetchAIData = async (userId: string) => {
    try {
      setAiLoading(true);
      
      // Fetch all AI insights and data in parallel
      const [
        insights,
        score,
        recommendations,
        prediction,
        notifications,
        workload,
        wellness,
        performance,
        learning
      ] = await Promise.all([
        generateDashboardInsights(userId),
        calculateProductivityScore(userId),
        generatePersonalizedRecommendations(userId),
        predictAttendancePatterns(userId),
        generateSmartNotifications(userId),
        analyzeWorkload(userId),
        analyzeEmployeeWellness(userId),
        predictPerformance(userId),
        generatePersonalizedRecommendations(userId) // Using this for learning suggestions
      ]);
      
      setAiInsights(insights);
      setProductivityScore(score);
      setSmartRecommendations(recommendations);
      setAttendancePrediction(prediction);
      setSmartNotifications(notifications);
      setWorkloadAnalysis(workload);
      setWellnessInsights(wellness);
      setPerformancePrediction(performance);
      setLearningSuggestions(learning);
      
    } catch (error) {
      console.error('Error fetching AI data:', error);
      // Set default values if AI data fails
      setAiInsights([]);
      setProductivityScore(75);
      setSmartRecommendations([]);
      setAttendancePrediction(null);
      setSmartNotifications([]);
      setWorkloadAnalysis(null);
      setWellnessInsights([]);
      setPerformancePrediction(null);
      setLearningSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  // Toast notification function
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // Auto hide after 5 seconds
  };

  useEffect(() => {
    const fetchDate = async () => {
      try {
        const date = await getCurrentDate();
        console.log("📅 Server Date:", date);
        setCurrentDate(date);
      } catch (error) {
        console.error("Failed to fetch date:", error);
        setCurrentDate("Error fetching date");
      }
    };

    fetchDate();
  }, []);

  // Shift duration in seconds (9 hours)
  const SHIFT_DURATION_SEC = 9 * 3600;
  const SHIFT_WARNING_SEC = 5 * 60;

  // Helper to fetch shift duration for today (in seconds)
  const fetchShiftDuration = async (userId: string, date: string): Promise<number | null> => {
    // Try geoAssignments first, then shiftAssignments
    let assignmentSnap = await getDoc(doc(db, "geoAssignments", userId, "dates", date));
    if (!assignmentSnap.exists()) {
      assignmentSnap = await getDoc(doc(db, "shiftAssignments", userId, "dates", date));
    }
    if (assignmentSnap.exists()) {
      const data = assignmentSnap.data();
      if (data.shiftDuration) return data.shiftDuration * 3600;
    }
    // No shift assignment found
    return null;
  };

  const setupAttendance = async (userId: string, name: string) => {
    try {
      const { date, time } = await getServerDateTime();
      
      // Check if it's a new month and reset calculations if needed
      await checkAndResetMonthlyData(userId);
      
      // Fetch shift duration for today
      const duration = await fetchShiftDuration(userId, date);
      setShiftDurationSec(duration);
      
      // Try both collections for assignment
      let assignmentSnap = await getDoc(doc(db, "geoAssignments", userId, "dates", date));
      if (!assignmentSnap.exists()) {
        assignmentSnap = await getDoc(doc(db, "shiftAssignments", userId, "dates", date));
      }
      if (!assignmentSnap.exists()) {
    }
    if (!assignmentSnap.exists()) {
        showToast("❌ Shift/location assignment not found for today. Please contact admin.", "error");
      return;
    }

    const assignment = assignmentSnap.data();
    const { lat, lng, workFromHome } = assignment;

      // Check location permission first
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        const granted = await requestLocationPermission();
        if (!granted) {
          showToast("⚠️ Location access is required for attendance tracking. Please enable location access in your browser settings.", "warning");
          // Continue without location for now
        }
      }

      // Get GPS location for login with retry mechanism
      let locationData = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      showToast("Getting your location...", "info");
      
      while (!locationData && retryCount < maxRetries) {
        locationData = await getCurrentLocation();
        if (!locationData && retryCount < maxRetries - 1) {
          console.log(`Retrying geolocation for login... (${retryCount + 1}/${maxRetries})`);
          showToast(`Retrying location... (${retryCount + 1}/${maxRetries})`, "info");
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
        retryCount++;
      }

    let currentLat = 0;
    let currentLng = 0;
    let address = "Unknown";
    
    if (locationData) {
      currentLat = parseFloat(locationData.lat);
      currentLng = parseFloat(locationData.lng);
      address = locationData.address;
        showToast("Location obtained successfully", "success");
      } else {
        console.warn("Could not get location after retries, proceeding with default values");
        showToast("⚠️ Could not get location. Proceeding with attendance setup.", "warning");
        // Show a warning but don't block the login
        if (retryCount >= maxRetries) {
          console.warn("Location unavailable after all retries");
        }
    }

    const alreadyChecked = sessionStorage.getItem("locationChecked");

    if (!workFromHome) {
      const getPublicIP = async (): Promise<string | null> => {
        try {
          const res = await fetch("https://api64.ipify.org?format=json");
          if (!res.ok) throw new Error("Failed to fetch IP");
          const data = await res.json();
          return data.ip;
        } catch (error) {
          console.error("Failed to fetch public IP:", error);
          return null;
        }
      };

      const userIP = await getPublicIP();
      console.log("🌐 Public IP:", userIP);

      const officeRef = doc(db, "officeNetwork", "allowedIPs");
      const officeSnap = await getDoc(officeRef);
      const allowedIPs = officeSnap.exists() ? officeSnap.data().ips || [] : [];

      if (!userIP || !allowedIPs.includes(userIP)) {
          showToast(`❌ You are not connected to an allowed office Wi-Fi.\nYour IP: ${userIP}`, "error");
        await signOut(auth);
        window.location.href = "/login";
        return;
      }

        if (alreadyChecked !== date && locationData) {
        const distance = haversineDistance(currentLat, currentLng, lat, lng);
        if (distance > 3.5) {
            showToast(`❌ Too far from assigned location.\nDistance: ${(distance * 1000).toFixed(2)} meters`, "error");
          await signOut(auth);
          window.location.href = "/login";
          return;
        }

        sessionStorage.setItem("locationChecked", date);
      }
    }

    const attendanceRef = doc(db, "attendance", `${userId}_${date}`);
    const snap = await getDoc(attendanceRef);

    // Determine if user is working from home or office
    const isWorkFromHome = workFromHome === true;
    
    // Get user's IP address
    let userIP = "";
    try {
      const ipResponse = await fetch("https://api64.ipify.org?format=json");
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
      }
    } catch (error) {
      console.error("Failed to fetch IP address:", error);
    }

    // Check if IP is in office network
    let isOfficeIP = false;
    if (userIP) {
      const officeRef = doc(db, "officeNetwork", "allowedIPs");
      const officeSnap = await getDoc(officeRef);
      const allowedIPs = officeSnap.exists() ? officeSnap.data().ips || [] : [];
      isOfficeIP = allowedIPs.includes(userIP);
    }

    const newSession = {
      login: time,
      login_time: time, // server time
      logout: "",
      logout_time: "",
      loginIP: userIP,
      isOfficeLogin: isOfficeIP,
      loginLocation: isOfficeIP
        ? {
            lat: 0,
            lng: 0,
            address: "Novel Office"
          }
        : {
            lat: currentLat,
            lng: currentLng,
            address: address || "Location not available"
          },
    };

    if (!snap.exists()) {
      await setDoc(attendanceRef, {
        userId,
        name,
        date,
        sessions: [newSession],
        totalHours: "",
      });
      setLoginTime(time);
        showToast("✅ Attendance logged successfully!", "success");
    } else {
      const data = snap.data();
      const sessions = data.sessions || [];
      if (sessions.length > 0) setLoginTime(sessions[0].login);
      setTotalHours(data.totalHours || "0h 0m 0s");

        if (!sessions[sessions.length - 1]?.logout) {
          showToast("You are already logged in", "info");
          return;
        }

      sessions.push(newSession);
      await updateDoc(attendanceRef, { sessions });
        showToast("✅ New session started!", "success");
    }
      
    // Start shift timer only if duration is available
    if (duration !== null) {
      startShiftTimer(time, duration);
        showToast(`Shift timer started (${Math.floor(duration / 3600)} hours)`, "info");
      }
    } catch (error) {
      console.error("Error in setupAttendance:", error);
      showToast("Error setting up attendance. Please try again.", "error");
    }
  };

  const recalculateTotalHours = (
    dailyHours: Record<string, string>
  ): string => {
    let totalSec = 0;
    Object.values(dailyHours).forEach((str) => {
      const [h, m, s] = str
        .split(/[hms ]+/)
        .filter(Boolean)
        .map(Number);
      totalSec += h * 3600 + m * 60 + s;
    });
    const H = Math.floor(totalSec / 3600);
    const M = Math.floor((totalSec % 3600) / 60);
    const S = totalSec % 60;
    return `${H}h ${M}m ${S}s`;
  };
  const updateMonthlySummary = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
    const { date } = await getServerDateTime();
      const monthKey = date.slice(0, 7);
      const summaryRef = doc(db, "attendanceSummary", `${user.uid}_${monthKey}`);
    const summarySnap = await getDoc(summaryRef);

    // --- DEFAULTS ---
    const DEFAULT_WORKING_DAYS = 23;
    const DEFAULT_ENTITLED_LEAVE = 1;
    const MAX_CARRY_FORWARD = 2;

    // --- Calculate today's hours ---
    const secToday = sessions.reduce((acc: number, s: any) => {
      if (!s.login || !s.logout) return acc;
      const login = parseTimeToDate(s.login);
      const logout = parseTimeToDate(s.logout);
      let d = (logout.getTime() - login.getTime()) / 1000;
      if (d < 0) d += 86400;
      return acc + d;
    }, 0);

    const H = Math.floor(secToday / 3600);
    const M = Math.floor((secToday % 3600) / 60);
    const S = Math.floor(secToday % 60);
    const todayWorkingStr = `${H}h ${M}m ${S}s`;

    // --- Base summary ---
    const base = summarySnap.exists()
      ? summarySnap.data()
      : {
          userId: auth.currentUser!.uid,
          name: profile.name,
          email: profile.email || "",
          department: profile.department || "",
          month: monthKey,
          presentDays: 0,
          halfDays: 0,
          absentDays: 0,
          leavesTaken: 0,
          extraLeaves: 0,
          carryForwardLeaves: 0,
          totalWorkingDays: DEFAULT_WORKING_DAYS,
          totalmonthHours: "0h 0m 0s",
          dailyHours: {},
          countedDates: [],
          extraWorkLog: {},
        };

    // --- Reclassification of old count if already present ---
    const alreadyCounted = base.countedDates.includes(date);
    if (alreadyCounted) {
      const prev = base.dailyHours[date] || "0h 0m 0s";
      const [ph, pm, ps] = prev
        .split(/[hms ]+/)
        .filter(Boolean)
        .map(Number);
      const prevHours = ph + pm / 60 + ps / 3600;

        if (prevHours >= 8.4) base.presentDays -= 1;
        else if (prevHours >= 4.2) base.halfDays -= 1;
      else base.absentDays -= 1;

      const totalUsedLeaves = base.leavesTaken + base.extraLeaves;
      if (prevHours === 0 && totalUsedLeaves > 0) {
        if (base.extraLeaves > 0) base.extraLeaves -= 1;
        else base.leavesTaken -= 1;
      }
    } else {
      base.countedDates.push(date);
    }

    // --- Reclassify based on new value ---
    base.dailyHours[date] = todayWorkingStr;
      if (H >= 8.4) base.presentDays += 1;
      else if (H >= 4.2) base.halfDays += 1;
    else base.absentDays += 1;

    // --- LEAVE & CARRY FORWARD LOGIC ---
    // 1. Start with entitled leave for the month
    let entitledLeave = DEFAULT_ENTITLED_LEAVE;
    let carryForward = base.carryForwardLeaves || 0;
    let usedLeaves = 0;
    let extraLeaves = 0;
    let absentDays = 0;
    let presentDays = 0;
    let halfDays = 0;

      // 2. Count absences (days with 0 hours) and check leave status
    const allDates = Object.keys(base.dailyHours);
    for (const d of allDates) {
      const hoursStr = base.dailyHours[d];
      const [h, m, s] = hoursStr.split(/[hms ]+/).filter(Boolean).map(Number);
      const totalHrs = h + m / 60 + s / 3600;
        
        // New attendance conditions:
        // Full day: 8 hours 24 minutes and above (8.4 hours)
        // Half day: 4 hours 12 minutes to 8 hours 23 minutes 59 seconds (4.2 to 8.399 hours)
        // Absent: Less than 4 hours 11 minutes 59 seconds (less than 4.2 hours)
        
        if (totalHrs >= 8.4) presentDays += 1;
        else if (totalHrs >= 4.2) halfDays += 1;
      else {
          // Absent day - check if it's an approved leave
          try {
            // Check leave status for this date
            const leaveRef = doc(db, "leaveManage", `${user.uid}_${d}`);
            const leaveSnap = await getDoc(leaveRef);
            
            if (leaveSnap.exists()) {
              const leaveData = leaveSnap.data();
              if (leaveData.status === "accepted") {
                // Only count as leave taken if not cancelled by user
                if (leaveData.status === "accepted" && leaveData.cancelledByUser !== true) {
                  if (entitledLeave > 0) {
                    entitledLeave -= 1;
                    usedLeaves += 1;
                  } else {
                    extraLeaves += 1;
                  }
                } else {
                  // If cancelled by user, count as present
                  presentDays += 1;
                }
              } else if (leaveData.status === "cancelled" || leaveData.status === "rejected") {
                presentDays += 1;
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
        absentDays += 1;
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
              absentDays += 1;
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
            absentDays += 1;
          }
      }
    }

    // 3. Carry forward unused entitled leave (max 2)
    if (entitledLeave > 0) {
        // Unused entitled leave carries forward as CF
        carryForward = Math.min(MAX_CARRY_FORWARD, entitledLeave);
      } else {
        // If entitled leave was used, CF remains from previous month
        carryForward = base.carryForwardLeaves || 0;
    }

    // 4. Update summary fields
    base.presentDays = presentDays;
    base.halfDays = halfDays;
    base.absentDays = absentDays;
    base.leavesTaken = usedLeaves;
    base.extraLeaves = extraLeaves;
    base.carryForwardLeaves = carryForward;
    base.totalWorkingDays = DEFAULT_WORKING_DAYS;

    // 5. Total month hours
    base.totalmonthHours = recalculateTotalHours(base.dailyHours);
    await setDoc(summaryRef, base);
    } catch (error) {
      console.error("Error updating monthly summary:", error);
    }
  };

  const handleLogoutUpdate = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      // Get server date/time with fallback to local time
      let date, time;
      try {
        const serverData = await getServerDateTime();
        date = serverData.date;
        time = serverData.time;
      } catch (error) {
        console.warn("Failed to get server time, using local time:", error);
        const now = new Date();
        date = now.toISOString().slice(0, 10);
        time = now.toTimeString().slice(0, 8);
      }

      const attendanceRef = doc(db, "attendance", `${user.uid}_${date}`);
      const snap = await getDoc(attendanceRef);
      if (!snap.exists()) return null;
        
      const sessions = [...snap.data().sessions];
      const lastSession = sessions[sessions.length - 1];
      if (!lastSession || lastSession.logout) {
        showToast("No active session found to log out", "info");
        return null;
      }

      // Check if user logged in from office IP
      const isOfficeLogin = lastSession.isOfficeLogin === true;
      let logoutLocation = null;
      
      // Only get GPS location if user is not logging out from office
      if (!isOfficeLogin) {
        logoutLocation = await getCurrentLocation();
        
        // Retry logic for GPS location
        let retryCount = 0;
        while (!logoutLocation && retryCount < 3) {
          console.log(`Retrying geolocation for logout... (${retryCount + 1}/3)`);
          showToast(`Retrying location... (${retryCount + 1}/3)`, "info");
          await new Promise(resolve => setTimeout(resolve, 1000));
          logoutLocation = await getCurrentLocation();
          retryCount++;
        }
      }
    
      // Store logout_time as server time
      lastSession.logout = time;
      lastSession.logout_time = time;
      
      // Set logout location based on office/remote login
      if (isOfficeLogin) {
        // For office users, set Novel Office location
        lastSession.logoutLocation = {
          lat: 0,
          lng: 0,
          address: "Novel Office, Marthahalli, Bangalore"
        };
      } else if (logoutLocation) {
        // For remote users, use the obtained location
        lastSession.logoutLocation = {
          lat: logoutLocation.lat,
          lng: logoutLocation.lng,
          address: logoutLocation.address || "Location not available"
        };
      } else {
        // Fallback if location couldn't be obtained
        console.warn("Could not get logout location after retries");
        lastSession.logoutLocation = {
          lat: 0,
          lng: 0,
          address: "Location unavailable"
        };
      }
    
    // Calculate total working hours for this session
    const loginDate = parseTimeToDate(lastSession.login_time || lastSession.login);
    const logoutDate = parseTimeToDate(lastSession.logout_time || lastSession.logout);
    let diff = (logoutDate.getTime() - loginDate.getTime()) / 1000;
    if (diff < 0) diff += 86400;
    lastSession.sessionDuration = diff;
      
    // Only sum durations between login and logout
    const totalSec = sessions.reduce((acc, s) => acc + (s.sessionDuration || 0), 0);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.floor(totalSec % 60);
    const total = `${hrs}h ${mins}m ${secs}s`;
      
    await updateDoc(attendanceRef, { sessions, totalHours: total });
    setTotalHours(total);
    return total;
    } catch (error) {
      console.error("Error in handleLogoutUpdate:", error);
      return null;
    }
  };

  // Simple fallback logout function
  const handleSimpleLogout = async () => {
    try {
      setLoggingOut(true);
      didLogout.current = true;
      
      // Clear any existing timers
      if (shiftTimerId) {
        clearInterval(shiftTimerId);
        setShiftTimerId(null);
      }
      
      // Clear session storage
      sessionStorage.removeItem("locationChecked");
      
      // Sign out from Firebase Auth
      await signOut(auth);
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error("Simple logout error:", error);
      // Force redirect even if signOut fails
      window.location.href = '/login';
    }
  };

  const handleLogout = async () => {
    if (!auth.currentUser || !profile?.uid) {
      console.error("⛔ Skipping logout - Missing user or UID", auth.currentUser, profile?.uid);
      showToast("Logout failed: User not found", "error");
      return;
    }

    // Prevent multiple logout attempts
    if (loggingOut) {
      console.log("Logout already in progress");
      showToast("Logout already in progress", "warning");
      return;
    }

    try {
      setLoggingOut(true);
      didLogout.current = true;

      // Show loading message
      showToast("Logging out... Please wait.", "info");

      // Create a timeout for the entire logout process
      const logoutTimeout = setTimeout(() => {
        console.warn("Logout timeout - proceeding with basic logout");
        // Force logout even if some operations fail
        signOut(auth).then(() => {
          sessionStorage.removeItem("locationChecked");
          window.location.href = '/login';
        }).catch(() => {
          // If even signOut fails, force redirect
          window.location.href = '/login';
        });
      }, 30000); // 30 second timeout

      // Update active users collection with timeout
      try {
      const activeRef = doc(db, "activeUsers", profile.uid);
        await Promise.race([
          setDoc(
        activeRef,
        { 
          status: 'offline',
          lastSeen: serverTimestamp(),
          logoutTime: new Date().toLocaleTimeString()
        },
        { merge: true }
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
        ]);
      } catch (error) {
        console.error("Error updating active users:", error);
        // Continue with logout even if this fails
      }

      // Update attendance with timeout and better error handling
      try {
        await Promise.race([
          handleLogoutUpdate(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000))
        ]);
        showToast("Attendance updated successfully", "success");
      } catch (error) {
        console.error("Error updating attendance:", error);
        showToast("Warning: Attendance update failed, but logout will continue", "warning");
        // Continue with logout even if attendance update fails
      }

      // Update monthly summary with timeout
      try {
        await Promise.race([
          updateMonthlySummary(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
        ]);
      } catch (error) {
        console.error("Error updating monthly summary:", error);
        showToast("Warning: Monthly summary update failed, but logout will continue", "warning");
        // Continue with logout even if summary update fails
      }
      
      // Clear any existing timers
      if (shiftTimerId) {
        clearInterval(shiftTimerId);
        setShiftTimerId(null);
      }
      
      // Clear timeout since we're proceeding normally
      clearTimeout(logoutTimeout);
      
      // Sign out from Firebase Auth
      await signOut(auth);
      
      // Clear session storage
      sessionStorage.removeItem("locationChecked");
      
      showToast("Logged out successfully", "success");
      
      // Redirect to login page after successful logout
      window.location.href = '/login';
      
    } catch (err) {
      console.error("Logout error:", err);
      
      // Provide more specific error messages
      let errorMessage = "Failed to logout. Please try again.";
      if (err instanceof Error) {
        if (err.message.includes("network") || err.message.includes("timeout")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (err.message.includes("permission")) {
          errorMessage = "Permission denied. Please refresh the page and try again.";
        } else if (err.message.includes("auth")) {
          errorMessage = "Authentication error. Please refresh the page and try again.";
        }
      }
      
      showToast(errorMessage, "error");
      setLoggingOut(false);
      didLogout.current = false;
    }
  };

  useEffect(() => {
    setLoading(true);
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const userId = auth.currentUser.uid;
    const fetchProfile = getDoc(doc(db, "employees", userId));
    const fetchAttendance = getDoc(doc(db, "attendance", `${userId}_${currentDate}`));
    // Real-time listener for active users
    const unsub = onSnapshot(query(collection(db, "activeUsers")), (snapshot) => {
      const online = snapshot.docs.map((d) => d.data());
      setEmployees(online.length > 0 ? online : []);
    });
    Promise.all([fetchProfile, fetchAttendance])
      .then(([profileSnap, attendanceSnap]) => {
        if (profileSnap.exists()) setProfile({ ...profileSnap.data(), uid: userId });
        if (attendanceSnap.exists()) {
          const data = attendanceSnap.data();
          const sessionsData = data.sessions || [];
          setSessions(sessionsData);
          if (sessionsData.length > 0) setLoginTime(sessionsData[0].login);
          setTotalHours(data.totalHours || "0h 0m 0s");
        }
      })
      .finally(() => setLoading(false));
    return () => unsub();
  }, [currentDate]);

  // Dynamically update totalHours every second if user is clocked in
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let isMounted = true;

    async function updateTotalHours() {
      if (sessions.length > 0 && !sessions[sessions.length - 1].logout) {
        // Fetch server time
        const { time } = await getServerDateTime();
        if (isMounted) {
          setTotalHours(calculateTotalHours(sessions, true, time));
        }
      } else {
        setTotalHours(calculateTotalHours(sessions));
      }
    }

    if (sessions.length > 0 && !sessions[sessions.length - 1].logout) {
      interval = setInterval(updateTotalHours, 1000);
      updateTotalHours();
    } else {
      setTotalHours(calculateTotalHours(sessions));
    }
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [sessions]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!didLogout.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("🟢 Auth user detected:", user.email);

        try {
          const profileSnap = await getDoc(doc(db, "employees", user.uid));
          if (profileSnap.exists()) {

                        setProfile({ ...profileSnap.data(), uid: user.uid }); // ✅ Inject uid for later use

            // Mark this user online for the "Online Users" widget
            try {
              await setDoc(
                doc(db, "activeUsers", user.uid),
                {
                  name: profileSnap.data().name || user.email,
                  status: "online",
                  lastSeen: serverTimestamp(),
                },
                { merge: true }
              );
            } catch (presenceErr) {
              console.error("Failed to mark user online:", presenceErr);
            }

            await setupAttendance(user.uid, profileSnap.data().name);

            const { date } = await getServerDateTime();

            const attendanceRef = doc(db, "attendance", `${user.uid}_${date}`);
            const snap = await getDoc(attendanceRef);
            if (snap.exists()) {
              const data = snap.data();
              const sessionsData = data.sessions || [];
              setSessions(sessionsData); // <-- NEW
              if (sessionsData.length > 0) setLoginTime(sessionsData[0].login);
              setTotalHours(data.totalHours || "0h 0m 0s");
            }
            
            // Fetch AI data for the authenticated user
            await fetchAIData(user.uid);
          }
        } catch (err) {
          console.error("❌ Failed to update activeUsers:", err);
        }
      } else {
        console.log("🔴 No auth user");
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const calculateBadge = async () => {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      const { date } = await getServerDateTime();

      const monthKey = date.slice(0, 7);

      const summaryRef = doc(db, "attendanceSummary", `${userId}_${monthKey}`);
      const summarySnap = await getDoc(summaryRef);

      if (!summarySnap.exists()) {
        console.warn("⚠️ No summary found for badge");
        setBadge("🥉 Bronze");
        return;
      }

      const data = summarySnap.data();
      const dailyHours = data.dailyHours || {};
      const counted = data.countedDates || [];

      let punctualDays = 0;
      let fullDays = 0;

      for (const day of counted) {
        const attRef = doc(db, "attendance", `${userId}_${day}`);
        const attSnap = await getDoc(attRef);

        if (attSnap.exists()) {
          const sessions = attSnap.data().sessions || [];
          const firstLogin = sessions?.[0]?.login || "";
          if (firstLogin) {
            const loginTime = parseTimeToDate(firstLogin);
            const loginHour = loginTime.getHours();
            if (loginHour < 10) punctualDays += 1;
          }
        }

        const hoursStr = dailyHours[day];
        if (hoursStr) {
          const [h, m, s] = hoursStr
            .split(/[hms ]+/)
            .filter(Boolean)
            .map(Number);
          const totalHrs = h + m / 60 + s / 3600;
          if (totalHrs >= 8.4) fullDays += 1;
        }
      }

      const total = counted.length || 1;
      const punctualRate = (punctualDays / total) * 100;
      const fullDayRate = (fullDays / total) * 100;

      // 🧾 Log stats for debugging
      console.log("✅ Badge Evaluation:");
      console.log("Total Counted Days:", total);
      console.log("Punctual Days (<10AM):", punctualDays);
      console.log("Full Days (≥8.4h):", fullDays);
      console.log("Punctuality %:", punctualRate.toFixed(2));
      console.log("Full-Day %:", fullDayRate.toFixed(2));

      if (punctualRate >= 80 && fullDayRate >= 80) {
        setBadge("🥇 Gold");
      } else if (punctualRate >= 60 && fullDayRate >= 60) {
        setBadge("🥈 Silver");
      } else {
        setBadge("🥉 Bronze");
      }
    };

    calculateBadge();
  }, [auth.currentUser]);

  useEffect(() => {
    const fetchSpecialAlerts = async () => {
      const db = getFirestore();
      const employeesRef = collection(db, "employees");
      const snapshot = await getDocs(employeesRef);

      const today = new Date();
      const currentMonthDay = `${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}`;

      const messages: string[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const dob = data.dob; // format: YYYY-MM-DD
        const joiningDate = data.joiningDate; // format: YYYY-MM-DD

        if (dob?.slice(5) === currentMonthDay) {
          messages.push(
            `🌸 Wishing a Happy Birthday to ${data.name} – from Team Enkonix`
          );
        }

        if (joiningDate?.slice(5) === currentMonthDay) {
          messages.push(
            `🎊 Celebrating ${data.name}'s Work Anniversary Today!`
          );
        }
      });

      setSpecialAlerts(messages);
    };

    fetchSpecialAlerts();
  }, []);

  // ✅ AUTO IP CHECKER THAT FORCES LOGOUT ON WIFI CHANGE
  useEffect(() => {
    let ipCheckInterval: NodeJS.Timeout;

    const startPeriodicIPCheck = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const { date } = await getServerDateTime();

      const assignmentRef = doc(db, "geoAssignments", user.uid, "dates", date);
      const assignmentSnap = await getDoc(assignmentRef);

      if (!assignmentSnap.exists()) {
        console.warn("No geo assignment found for IP check");
        return;
      }

      const { workFromHome } = assignmentSnap.data();

      // ❌ If WFH, skip periodic IP check
      if (workFromHome) {
        console.log("🛑 Skipping IP check — WFH user");
        return;
      }

      const getPublicIP = async (): Promise<string | null> => {
        try {
          const res = await fetch("https://api64.ipify.org?format=json");
          if (!res.ok) throw new Error("Failed to fetch IP");
          const data = await res.json();
          return data.ip;
        } catch (error) {
          console.error("Failed to fetch public IP:", error);
          return null;
        }
      };

      let retryCount = 0;

      const checkIPAndLogoutIfChanged = async () => {
        const userIP = await getPublicIP();
        console.log("🌐 Periodic IP Check:", userIP);

        const officeRef = doc(db, "officeNetwork", "allowedIPs");
        const officeSnap = await getDoc(officeRef);
        const allowedIPs = officeSnap.exists()
          ? officeSnap.data().ips || []
          : [];

        if (!userIP || !allowedIPs.includes(userIP)) {
          if (retryCount < 3) {
            console.warn(
              `⚠️ IP not allowed. Retrying in 10s... (${retryCount + 1}/3)`
            );
            retryCount++;
            return;
          }

          alert(
            `❌ You are not connected to an allowed office Wi-Fi.\nYour IP: ${userIP}\nYou will be logged out.`
          );

          if (auth.currentUser && profile?.uid) {
            setLoggingOut(true);
            await handleLogoutUpdate();
            await updateMonthlySummary();
            await signOut(auth);
            setLoggingOut(false);
            window.location.href = "/login";
          }
        } else {
          retryCount = 0; // Reset if IP becomes valid
        }
      };

      ipCheckInterval = setInterval(checkIPAndLogoutIfChanged, 600000);

      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          checkIPAndLogoutIfChanged();
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);

      // Cleanup
      return () => {
        clearInterval(ipCheckInterval);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    };

    startPeriodicIPCheck();
  }, [auth, profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    try {
      await updateDoc(doc(db, "employees", auth.currentUser!.uid), {
        phone: profile.phone,
        photo: profile.photo,
        location: profile.location,
      });
      setMessage("✅ Profile updated!");
      setTimeout(() => setMessage(""), 3000);
      setShowEditForm(false);
    } catch {
      alert("❌ Update failed.");
    }
  };

  const handleEditClick = () => {
    setShowEditForm(true);
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
  };

  // AI Suggestions effect
  useEffect(() => {
    if (!profile) return;
    const suggestions: string[] = [];
    // Attendance and punctuality
    const presentDays = profile.presentDays || 0;
    const totalDays = profile.totalDays || 0;
    const leavesTaken = profile.leavesTaken || 0;
    const extraLeaves = profile.extraLeaves || 0;
    const carryForward = profile.carryForward || 0;
    const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : "0.00";
    if (Number(attendancePercentage) < 80) {
      suggestions.push("Your attendance percentage is below 80%. Try to be more regular to improve your badge and avoid HR warnings.");
    } else if (Number(attendancePercentage) >= 95) {
      suggestions.push("Excellent attendance! Keep it up for a Gold badge and possible rewards.");
    }
    if (carryForward > 0) {
      suggestions.push(`You have ${carryForward} carry-forward leave(s). Plan a long weekend or use them before expiry!`);
    }
    if (extraLeaves > 0) {
      suggestions.push(`You have taken ${extraLeaves} extra leave(s). Try to reduce unplanned absences to avoid loss of pay or carry forward.`);
    }
    if (leavesTaken > 5) {
      suggestions.push("You have taken more than 5 leaves. Consider planning leaves in advance to avoid last-minute disruptions.");
    }
    // Recommend best days for leave (using recommendedHolidaysCreative if available)
    if (recommendedHolidaysCreative.length > 0) {
      suggestions.push(`Best days to take off for maximizing holidays: ${recommendedHolidaysCreative.slice(0, 3).join(", ")}`);
      // Suggest a specific long weekend leave
      const findLongWeekend = () => {
        for (const date of recommendedHolidaysCreative) {
          const d = new Date(date);
          const prev = new Date(d);
          prev.setDate(d.getDate() - 1);
          const next = new Date(d);
          next.setDate(d.getDate() + 1);
          if (prev.getDay() === 5 || next.getDay() === 1) { // Friday or Monday
            return date;
          }
        }
        return null;
      };
      const longWeekendDate = findLongWeekend();
      if (longWeekendDate) {
        suggestions.push(`🤖 AI Suggestion: Consider taking leave on ${longWeekendDate} for a long weekend`);
      }
    }
    if (events && events.length === 0) {
      suggestions.push("⚠️ Events are not being fetched. Please check your network or database.");
    }
    if (suggestions.length === 0) {
      suggestions.push("Great job! Your attendance and leave management are optimal this month.");
    }
    setAiSuggestions(suggestions);
  }, [profile, recommendedHolidaysCreative, events]);

  // --- Weekly Highlights: Birthdays & Anniversaries ---
  useEffect(() => {
    // Calculate this week's birthdays and anniversaries
    if (!employees || employees.length === 0) return;
    const [weekStart, weekEnd] = getWeekRange();
    const birthdays: any[] = [];
    const anniversaries: any[] = [];
    employees.forEach(emp => {
      if (emp.dob) {
        const dob = new Date(emp.dob);
        const thisYearBirthday = new Date(weekStart.getFullYear(), dob.getMonth(), dob.getDate());
        if (isDateInWeek(thisYearBirthday.toISOString().slice(0,10), weekStart, weekEnd)) {
          birthdays.push({
            ...emp,
            eventDate: thisYearBirthday.toISOString().slice(0,10),
            type: 'Birthday',
          });
        }
      }
      if (emp.joiningDate) {
        const join = new Date(emp.joiningDate);
        const thisYearAnniv = new Date(weekStart.getFullYear(), join.getMonth(), join.getDate());
        if (isDateInWeek(thisYearAnniv.toISOString().slice(0,10), weekStart, weekEnd)) {
          anniversaries.push({
            ...emp,
            eventDate: thisYearAnniv.toISOString().slice(0,10),
            type: 'Anniversary',
          });
        }
      }
    });
    setWeekBirthdays(birthdays);
    setWeekAnniversaries(anniversaries);
  }, [employees]);

  useEffect(() => {
    // Map holidays to calendarDaysCreative for the current month
    const days: Record<string, { type: string; reason?: string }> = {};
    holidays.forEach(h => {
      const month = Number(h.date.split("-")[1]) - 1;
      if (month === calendarMonthCreative) {
        days[h.date] = { type: h.type, reason: h.reason };
      }
    });
    setCalendarDaysCreative(days);
  }, [holidays, calendarMonthCreative]);

  // Fetch attendance summary for the current month
  useEffect(() => {
    async function fetchSummary() {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const summaryRef = doc(db, "attendanceSummary", `${userId}_${currentMonth}`);
      const summarySnap = await getDoc(summaryRef);
      if (summarySnap.exists()) {
        const data = summarySnap.data();
        setAttendanceSummary({
          presentDays: data.presentDays || 0,
          leavesTaken: data.leavesTaken || 0,
        });
      }
    }
    fetchSummary();
  }, [auth.currentUser, currentDate]);

  // Shift timer logic with improved popup
  const startShiftTimer = (loginTime: string, duration: number) => {
    if (shiftTimerId) clearInterval(shiftTimerId);
    
    const timer = setInterval(async () => {
      try {
      const { time } = await getServerDateTime();
      const loginDate = parseTimeToDate(loginTime);
      const nowDate = parseTimeToDate(time);
      let elapsed = (nowDate.getTime() - loginDate.getTime()) / 1000;
      if (elapsed < 0) elapsed += 86400;
      const remaining = duration - elapsed;
        
      setShiftCountdown(remaining);
        
        // Show popup 5 minutes before shift ends
        if (remaining <= 300 && remaining > 0) { // 5 minutes = 300 seconds
        setShowShiftPopup(true);
        } else if (remaining <= 0) {
          setShowShiftPopup(false);
          clearInterval(timer);
          setShiftTimerId(null);
          
          // Auto logout when shift ends
          alert("Your shift has ended. You will be logged out automatically.");
          await handleLogout();
      } else {
        setShowShiftPopup(false);
      }
      } catch (error) {
        console.error("Error in shift timer:", error);
      }
    }, 1000);
    
    setShiftTimerId(timer);
  };

  // On login, start shift timer with correct duration
  useEffect(() => {
    if (sessions.length && !sessions[sessions.length - 1].logout && shiftDurationSec !== null) {
      startShiftTimer(sessions[sessions.length - 1].login, shiftDurationSec);
    }
    return () => {
      if (shiftTimerId) clearInterval(shiftTimerId);
    };
  }, [sessions, shiftDurationSec]);

  useEffect(() => {
    async function fetchMonthHours() {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      const monthKey = new Date().toISOString().slice(0, 7);
      const total = await calculateMonthTotalHours(userId, monthKey);
      setMonthTotalHours(total);
    }
    fetchMonthHours();
  }, [auth.currentUser, currentDate]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 dark:from-gray-900 dark:to-gray-950">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-b-4 border-blue-300 mb-6"></div>
        <p className="text-lg text-blue-700 dark:text-blue-200 font-semibold">Loading your dashboard...</p>
      </div>
    );

  if (!profile)
    return (
      <div className="text-center text-red-500 py-20">
        Employee data not found. Please contact admin to ensure your profile exists in the 'employees' collection.
      </div>
    );
  const presentDays = profile.presentDays || 0;
  const totalDays = profile.totalDays || 0;
  const leavesTaken = profile.leavesTaken || 0;
  const extraLeaves = profile.extraLeaves || 0;
  const carryForward = profile.carryForward || 0;

  const attendancePercentage =
    totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : "0.00";

  const badgeStats = {
    badge: badge || "🥉 Bronze",
    presentDays,
    totalDays,
    leavesTaken,
    extraLeaves,
    carryForward,
    attendancePercentage,
  };

  // --- Creative Calendar Integration ---
  // Calendar utilities and component
  // Month change handler
  const onMonthChangeCreative = handleMonthChangeCreative(setCalendarYearCreative, setCalendarMonthCreative);

  // Admin: toggle day type
  const onToggleDayCreative = handleToggleDayCreative(profile, calendarDaysCreative, setCalendarLoadingCreative, setCalendarDaysCreative, db);

  // Admin: import corporate holidays
  const onImportCorporateHolidaysCreative = handleImportCorporateHolidaysCreative(profile, setCalendarLoadingCreative, calendarYearCreative, db, setCalendarRefreshCreative);
  // --- Creative Calendar Section ---
  // Weather
  // Attendance streak
  // Motivational quote
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-x-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl max-w-sm transform transition-all duration-300 ${
          toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' :
          toast.type === 'error' ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white' :
          toast.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
          'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {toast.type === 'success' ? '✅' :
               toast.type === 'error' ? '❌' :
               toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Highlights Bar */}
      {!highlightsLoading && <HighlightsBar highlights={highlights} />}
      
      {/* Birthday Wishes */}
      {todaysBirthdays.length > 0 && (
        <div className="relative bg-gradient-to-br from-amber-100 via-yellow-50 to-rose-100 dark:from-amber-900 dark:via-yellow-900 dark:to-rose-900 rounded-2xl p-6 shadow-xl flex flex-col items-center gap-3 border-4 border-transparent bg-clip-padding animate-fade-in-up mb-2 overflow-hidden mt-4">
          <div className="absolute inset-0 pointer-events-none z-0">
            <svg className="w-full h-full" viewBox="0 0 400 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="30" r="6" fill="#fbbf24">
                <animate attributeName="cy" values="30;10;30" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="120" cy="20" r="4" fill="#f472b6">
                <animate attributeName="cy" values="20;40;20" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="200" cy="35" r="5" fill="#a78bfa">
                <animate attributeName="cy" values="35;15;35" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="300" cy="25" r="7" fill="#34d399">
                <animate attributeName="cy" values="25;45;25" dur="2.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="370" cy="15" r="4" fill="#f87171">
                <animate attributeName="cy" values="15;35;15" dur="2.1s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
          <span className="text-4xl z-10 animate-bounce-slow">🎂</span>
          <span className="text-2xl font-extrabold text-rose-700 dark:text-rose-200 z-10 drop-shadow-lg">
            Happy Birthday {todaysBirthdays.map(b => b.title).join(', ')}!
          </span>
          <span className="text-base text-rose-800 dark:text-rose-100 z-10 text-center">Wishing you a wonderful year ahead! 🎉<br/>Enjoy your special day with lots of joy and success!</span>
          <div className="flex gap-3 mt-2 z-10">
            {todaysBirthdays.map(b => b.photo && b.photo !== 'NA' ? (
              <img
                key={b.title}
                src={b.photo}
                alt={b.title}
                className="w-14 h-14 rounded-full border-2 border-rose-400 shadow-lg object-cover animate-fade-in-up"
              />
            ) : (
              <div
                key={b.title}
                className="w-14 h-14 rounded-full bg-rose-300 dark:bg-rose-700 flex items-center justify-center text-2xl font-bold text-white border-2 border-rose-400 shadow-lg animate-fade-in-up"
              >
                {b.title[0]}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Animated SVG/gradient background */}
      <div className="absolute inset-0 z-0 pointer-events-none" />
      
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-8 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-600 shadow-2xl sticky top-0 z-20 backdrop-blur-md rounded-b-3xl border-b border-blue-100 dark:border-gray-800 relative overflow-hidden">
        <div className="flex items-center gap-6">
          {profile.photo && profile.photo !== "NA" ? (
            <img
              src={profile.photo}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <UserCircle className="w-16 h-16 text-white bg-blue-400 rounded-full p-2 shadow-lg hover:scale-105 transition-transform duration-300" />
          )}
          <div>
            <LiveGreeting name={profile.name} />
            <p className="text-white/90 text-lg font-medium mt-1">{profile.title}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LiveDateTime />
          <div className="flex gap-2">
  <button
    onClick={handleLogout}
    disabled={loggingOut}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg transition-all duration-300 ${
              loggingOut 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:scale-105'
            }`}
          >
            {loggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Logging out...
              </>
            ) : (
              <>
    <LogOut className="w-4 h-4" />
    Logout
              </>
            )}
  </button>
            
          </div>
</div>
        {/* Animated accent */}
        <svg className="absolute right-0 top-0 h-full w-40 opacity-20 pointer-events-none" viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="200" r="120" fill="#fff" fillOpacity="0.15">
            <animate attributeName="cy" values="200;180;200" dur="6s" repeatCount="indefinite" />
          </circle>
        </svg>
      </header>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content: col-span-2 */}
          <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="stats-card stats-card-success">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{attendanceSummary ? attendanceSummary.presentDays : 0}</span>
                <span className="text-xs text-emerald-800 dark:text-emerald-100 mt-1">Present Days</span>
            </div>
              <div className="stats-card stats-card-primary">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{attendanceSummary ? attendanceSummary.leavesTaken : 0}</span>
                <span className="text-xs text-blue-800 dark:text-blue-100 mt-1">Leaves Taken</span>
            </div>
              <div className="stats-card stats-card-warning">
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-200">{totalLogins}</span>
                <span className="text-xs text-amber-800 dark:text-amber-100 mt-1">Total Logins</span>
            </div>
              <div className="stats-card stats-card-primary">
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-200">{badgeStats.badge}</span>
              
            </div>
              <div className="stats-card stats-card-success">
              <span className="text-2xl font-bold text-teal-700 dark:text-teal-200">{totalHours || "0h 0m"}</span>
              <span className="text-xs text-teal-800 dark:text-teal-100 mt-1">Total Hours</span>
          </div>
          </div>
            
            {/* Calendar Section */}
            <div className="card">
              <div className="card-header">
                <h2 className="heading-3 flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <CalendarDays className="w-7 h-7 text-blue-500" />
              Calendar
            </h2>
              </div>
              <div className="card-body">
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
              <select
                value={calendarMonthCreative}
                onChange={e => setCalendarMonthCreative(Number(e.target.value))}
                    className="input"
              >
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
                      <input
                type="number"
                value={calendarYearCreative}
                onChange={e => setCalendarYearCreative(Number(e.target.value))}
                    className="input w-24"
                min={2000}
                max={2100}
              />
                  <button
                    className="btn btn-secondary"
                onClick={() => setCalendarDaysCreative({})}
                  >
                Use Firestore
                  </button>
                </div>
                
                {/* Modern Calendar Grid */}
            {(() => {
              const days: string[] = getMonthDays_Calendar(calendarYearCreative, calendarMonthCreative);
              const firstDay = new Date(Date.UTC(calendarYearCreative, calendarMonthCreative, 1)).getUTCDay();
              const weeks: Array<Array<string>> = [[]];
              for (let i = 0; i < firstDay; i++) weeks[0].push("");
              days.forEach((d, i) => {
                if (weeks[weeks.length - 1].length === 7) weeks.push([]);
                weeks[weeks.length - 1].push(d);
              });
              while (weeks[weeks.length - 1].length < 7) weeks[weeks.length - 1].push("");
              const today = new Date().toISOString().slice(0, 10);
              return (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mt-4 w-full max-w-4xl mx-auto overflow-x-auto">
                      <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-center mb-2">
                    {"SMTWTFS".split("").map((d, i) => (
                          <div key={i} className="text-gray-600 dark:text-gray-400 p-2">{d}</div>
                  ))}
                </div>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                      {week.map((date, di) => {
                            if (!date) return <div key={di} className="h-16" />;
                        const info = calendarDaysCreative[date];
                        const isWeekend = new Date(date).getUTCDay() === 0 || new Date(date).getUTCDay() === 6;
                        let bg = "";
                        let text = "";
                        let title = "";
                        if (info?.type === "holiday") {
                              bg = "bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-900/30 dark:to-red-900/30 border border-rose-300 dark:border-rose-700";
                          text = "Holiday";
                          title = info.reason || text;
                        } else if (info?.type === "leave") {
                              bg = "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-300 dark:border-amber-700";
                          text = "Leave";
                          title = info.reason || text;
                        } else if (info?.type === "working") {
                              bg = "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-200 dark:border-emerald-700";
                          text = "Working";
                          title = info.reason || text;
                        } else if (!info && isWeekend) {
                              bg = "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700/50 dark:to-gray-800/50 border border-gray-300 dark:border-gray-600";
                          text = "Weekend";
                          title = text;
                        } else {
                              bg = "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-200 dark:border-emerald-700";
                          text = "Working";
                          title = text;
                        }
                            if (date === today) bg += " ring-2 ring-blue-400 shadow-lg";
                        // Add event badges from highlights
                        const dayEvents = highlights.filter(h => h.type === 'event' && h.date === date);
                        return (
                  <button
                            key={di}
                                className={`rounded-lg p-2 h-16 flex flex-col items-center justify-center ${bg} hover:ring-2 hover:ring-blue-400 transition-all duration-150 hover:scale-105 text-xs`}
                            title={title}
                            onClick={() => onToggleDayCreative(date, info?.type)}
                  >
                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{Number(date.slice(-2))}</span>
                                <span className="text-xs text-gray-700 dark:text-gray-300">{text}</span>
                            {info?.reason && (
                                  <span className="text-[8px] text-gray-600 dark:text-gray-400 truncate w-full text-center">{info.reason}</span>
                            )}
                            {/* Render event badges */}
                            {dayEvents.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-1 w-full items-center">
                                {dayEvents.map((ev, idx) => (
                                      <span key={idx} className="inline-flex items-center px-1 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded text-[8px] font-medium gap-1 max-w-full truncate">
                                    <span className="text-xs">📅</span>
                                    <span className="truncate">{ev.title}</span>
                                  </span>
                                ))}
          </div>
                            )}
                  </button>
                        );
                      })}
            </div>
                  ))}
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="badge badge-success">Working Day</span>
                        <span className="badge badge-danger">Holiday</span>
                        <span className="badge badge-warning">Weekend</span>
          </div>
                </div>
              );
            })()}
        </div>
        </div>
          </div>
          
          {/* Sidebar: Online Users */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="card">
              <div className="card-header">
                <h2 className="heading-4 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <span className="inline-block w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
              Online Users <span className="ml-1 text-xs text-blue-400">({onlineUsers.length})</span>
            </h2>
              </div>
              <div className="card-body">
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {onlineUsers.length > 0 ? (
                onlineUsers.map((name, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900 dark:hover:to-indigo-900 transition-all duration-300 border border-blue-100 dark:border-blue-800 shadow-sm hover:scale-105">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-700 dark:to-indigo-700 flex items-center justify-center text-lg font-bold text-blue-700 dark:text-white border-2 border-blue-300 dark:border-blue-700">
                      {name[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-blue-800 dark:text-white truncate">{name}</p>
                  </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-300 text-sm text-center py-8">No users online</p>
            )}
          </div>
      </div>
            </div>
            
          <div className="border-t border-blue-100 dark:border-blue-800 my-2"></div>
            
            <div className="card">
              <div className="card-header">
                <h3 className="heading-4 flex items-center gap-1 text-blue-700 dark:text-blue-200">🤖 AI Suggestions</h3>
              </div>
              <div className="card-body">
            {aiSuggestions && aiSuggestions.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                {aiSuggestions.map((s, i) => (
                  <li key={i} className="text-blue-800 dark:text-blue-100 text-sm">{s}</li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-blue-600 dark:text-blue-100">No suggestions at this time</span>
            )}
          </div>
          </div>
           
            
           
            <div className="card">
              <div className="card-header">
                <h3 className="heading-4 flex items-center gap-1 text-amber-700 dark:text-amber-200">🌟 Motivational Quote</h3>
              </div>
              <div className="card-body">
                <span className="italic text-amber-800 dark:text-amber-100 text-sm">{todayQuote}</span>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h3 className="heading-4 flex items-center gap-1 text-rose-700 dark:text-rose-200">🎉 Upcoming Holidays</h3>
              </div>
              <div className="card-body">
            {Object.entries(calendarDaysCreative)
              .filter(([date, info]) => info.type === "holiday" && new Date(date) >= new Date())
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(0, 3)
              .map(([date, info], i) => (
                    <div key={i} className="flex items-center gap-2 text-sm mb-2">
                      <span className="font-bold text-rose-800 dark:text-rose-100">{date}</span>
                      <span className="text-rose-700 dark:text-rose-200">{info.reason || "Holiday"}</span>
                </div>
              ))}
            {Object.entries(calendarDaysCreative).filter(([date, info]) => info.type === "holiday" && new Date(date) >= new Date()).length === 0 && (
                  <span className="text-xs text-rose-600 dark:text-rose-100">No upcoming holidays</span>
            )}
          </div>
        </div>
      </div>
        </div>
      </div>
      
      <ChatbotWidget />
      
      {/* AI Chatbot */}
      <AIChatbot />
         
      {attendanceSummary && (
        <div className="card mb-4 flex flex-col md:flex-row gap-6 items-center justify-center">
        </div>
      )}
      
      {showShiftPopup && shiftCountdown !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 flex flex-col items-center max-w-md mx-4">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold mb-4 text-blue-700 dark:text-blue-300 text-center">
              Shift Ending Soon
            </h2>
            <div className="text-center mb-6">
              <p className="text-gray-700 dark:text-gray-200 mb-2">
                Your shift will end in:
              </p>
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                {Math.floor(shiftCountdown / 60)}:{String(Math.floor(shiftCountdown % 60)).padStart(2, '0')}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                You will be automatically logged out when your shift ends.
              </p>
            </div>
            <div className="flex gap-3 w-full">
            <button
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold hover:scale-105"
              onClick={handleLogout}
            >
              Log Out Now
            </button>
              <button
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold hover:scale-105"
                onClick={() => setShowShiftPopup(false)}
              >
                Continue Working
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to calculate total hours for the month using server login/logout times
const calculateMonthTotalHours = async (userId: string, monthKey: string) => {
  let totalSec = 0;
  // Fetch all attendance records for the month
  const attQuery = query(collection(db, "attendance"), where("userId", "==", userId));  const attSnap = await getDocs(attQuery);
  attSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.userId === userId && data.date && data.date.startsWith(monthKey)) {
      const sessions = data.sessions || [];
      sessions.forEach((session: any) => {
        if (session.login && session.logout) {
          const loginDate = parseTimeToDate(session.login);
          const logoutDate = parseTimeToDate(session.logout);
          let diff = (logoutDate.getTime() - loginDate.getTime()) / 1000;
          if (diff < 0) diff += 86400;
          totalSec += Math.min(diff, 12 * 3600);
        }
      });
    }
  });
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = Math.floor(totalSec % 60);
  return `${hrs}h ${mins}m ${secs}s`;
};

// AI Components
function AIInsightsWidget({ insights }: { insights: AIInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">AI Insights</h3>
        </div>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          {insights.slice(0, 3).map((insight, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${
              insight.priority === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
              insight.priority === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
              insight.priority === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
              'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            }`}>
              <div className="flex items-start gap-2">
                {insight.type === 'alert' && <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />}
                {insight.type === 'trend' && <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />}
                {insight.type === 'optimization' && <Zap className="h-4 w-4 text-green-600 mt-0.5" />}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Confidence: {Math.round(insight.confidence * 100)}%</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      insight.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      insight.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {insight.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductivityScoreWidget({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
    return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'Excellent performance!';
    if (score >= 60) return 'Good performance, room for improvement';
    return 'Performance needs attention';
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">AI Productivity Score</h3>
        </div>
      </div>
      <div className="card-body text-center">
        <div className={`text-4xl font-bold mb-2 ${getScoreColor(score)}`}>
          {score}%
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {getScoreMessage(score)}
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${score}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Based on task completion, attendance, and performance metrics
        </p>
      </div>
    </div>
  );
}

function SmartRecommendationsWidget({ recommendations }: { recommendations: SmartSuggestion[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold">Smart Recommendations</h3>
        </div>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          {recommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-start gap-2">
                <div className={`p-1 rounded-full ${
                  rec.impact === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' :
                  rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {rec.impact === 'high' ? '🔥' : rec.impact === 'medium' ? '⚡' : '💡'}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{rec.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Impact: {rec.impact}</span>
                    <span className="text-xs text-gray-500">Effort: {rec.effort}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttendancePredictionWidget({ prediction }: { prediction: AIPrediction | null }) {
  if (!prediction) return null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold">Attendance Prediction</h3>
        </div>
      </div>
      <div className="card-body">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">
            {prediction.value}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Predicted attendance pattern
          </p>
          <div className="text-xs text-gray-500">
            Confidence: {Math.round(prediction.confidence * 100)}%
          </div>
          {prediction.recommendations.length > 0 && (
            <div className="mt-3 text-left">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Suggestions:</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {prediction.recommendations.slice(0, 2).map((rec, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-blue-500">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
