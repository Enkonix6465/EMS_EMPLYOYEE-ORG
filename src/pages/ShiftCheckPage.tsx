import React, { useEffect, useState } from "react";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

// Helper: get current date in YYYY-MM-DD
const getCurrentDate = () => new Date().toLocaleDateString("en-CA");

// AI Suggestions with more innovation
function getAiSuggestions({
  status,
  shiftTime,
  currentTime,
}: {
  status: string;
  shiftTime: { startTime: string; endTime: string };
  currentTime: string;
}) {
  const suggestions: string[] = [];
  if (status === "valid") {
    suggestions.push("🚀 Great! You're on time for your shift.");
    if (currentTime && shiftTime.startTime) {
      const [ch, cm] = currentTime.split(":").map(Number);
      const [sh, sm] = shiftTime.startTime.split(":").map(Number);
      const diff = ch * 60 + cm - (sh * 60 + sm);
      if (diff > 10)
        suggestions.push("⏰ Try to login closer to your shift start for best attendance.");
      else if (diff < -5)
        suggestions.push("🕑 You're a bit early. Enjoy a coffee break or review your tasks!");
      else
        suggestions.push("✅ Perfect timing! Keep it up.");
    }
    suggestions.push("💡 Tip: Use the first 10 minutes to plan your top 3 priorities for today.");
    suggestions.push("🌱 Remember: Short breaks during your shift can boost productivity.");
  } else if (status === "early") {
    suggestions.push("⛔ Access denied. Please login only during your assigned shift hours.");
    suggestions.push(`📅 Your shift time: ${shiftTime.startTime} - ${shiftTime.endTime}`);
    suggestions.push("🔒 Security: Login is restricted to shift hours only.");
  } else if (status === "none") {
    suggestions.push("⚠ No shift assigned. Please contact HR for shift assignment.");
    suggestions.push("❓ If you believe this is an error, contact your supervisor.");
    suggestions.push("🔒 Access is restricted to assigned shift hours only.");
  }
  return suggestions;
}

// Fun fact generator for engagement
const funFacts = [
  "Did you know? Taking a 5-minute walk can boost your creativity by 60%.",
  "Fact: People who plan their day in the morning are 30% more productive.",
  "Tip: Hydration helps you stay focused. Drink a glass of water now!",
  "Fun: Smiling at your colleagues can improve team morale.",
  "Quick tip: A tidy workspace can reduce stress and increase efficiency.",
];

const getRandomFact = () => funFacts[Math.floor(Math.random() * funFacts.length)];

const ShiftCheckPage = () => {
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"checking" | "valid" | "early" | "none">("checking");
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [countdown, setCountdown] = useState(10);
  const [shiftTime, setShiftTime] = useState({ startTime: "", endTime: "" });
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [fact, setFact] = useState(getRandomFact());
  // Always show the fact on page load and during countdown

  // Fetch current server time from timeapi.io
  const fetchServerTime = async () => {
    try {
      const res = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata");
      if (!res.ok) throw new Error("Failed to fetch time");
      const data = await res.json();
      // Parse time as HH:MM:SS
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(data.hour)}:${pad(data.minute)}:${pad(data.seconds)}`;
    } catch (error) {
      console.error("❌ Failed to fetch server time, using local time:", error);
      // Fallback: use local system time
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
  };

  // Update current time every second using server time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const updateTime = async () => {
      const serverTime = await fetchServerTime();
      if (serverTime) setCurrentTime(serverTime);
    };
    updateTime();
    interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Main shift check logic
  useEffect(() => {
    const checkShift = async (user: any) => {
      const today = getCurrentDate();
      // Try both collections for shift assignment
      let shiftSnap = await getDoc(doc(db, "shiftAssignments", user.uid, "dates", today));
      if (!shiftSnap.exists()) {
        shiftSnap = await getDoc(doc(db, "geoAssignments", user.uid, "dates", today));
      }
      
      // 1. Show local time immediately
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setCurrentTime(localTime);
      
      // 2. Fetch server time in parallel
      const serverTimeRes = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata");

      if (!shiftSnap.exists()) {
        setStatus("none");
        setMessage("⚠ No shift assigned for today. Access denied.");
        // Immediately sign out and redirect
        setTimeout(() => {
          signOut(auth);
          navigate("/login", { replace: true });
        }, 2000);
        return;
      }

      const { startTime, endTime } = shiftSnap.data();
      setShiftTime({ startTime, endTime });

      const data = await serverTimeRes.json();
      const nowSec = data.hour * 3600 + data.minute * 60 + data.seconds;

      const [sh, sm, ss] = startTime.split(":").map(Number);
      const [eh, em, es] = endTime.split(":").map(Number);
      const startSec = sh * 3600 + sm * 60 + ss;
      const endSec = eh * 3600 + em * 60 + es;

      // Check if current time is within shift hours
      if (nowSec < startSec) {
        const waitMin = Math.floor((startSec - nowSec) / 60);
        const waitSec = (startSec - nowSec) % 60;
        setStatus("early");
        setMessage(`⛔ Access denied. Your shift starts at ${startTime}. Please login during your shift hours only.`);
        // Immediately sign out and redirect
        setTimeout(() => {
          signOut(auth);
          navigate("/login", { replace: true });
        }, 3000);
        return;
      }

      if (nowSec > endSec) {
        setStatus("none");
        setMessage("⛔ Access denied. Your shift is over. Please login during your shift hours only.");
        // Immediately sign out and redirect
        setTimeout(() => {
          signOut(auth);
          navigate("/login", { replace: true });
        }, 3000);
        return;
      }

      // Only allow access if within shift hours
      setStatus("valid");
      setMessage("✅ Access granted. Within shift hours. Redirecting in 10 seconds...");
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) checkShift(user);
      else navigate("/login", { replace: true });
    });
    return () => unsub();
    // eslint-disable-next-line
  }, [auth, db, navigate]);

  // AI Suggestions update
  useEffect(() => {
    setAiSuggestions(getAiSuggestions({ status, shiftTime, currentTime }));
  }, [status, shiftTime, currentTime]);

  // Countdown and redirect logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "valid") {
      setCountdown(10);
      let sec = 10;
      timer = setInterval(() => {
        sec--;
        setCountdown(sec);
        if (sec === 0) {
          clearInterval(timer);
          navigate("/", { replace: true });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, navigate]);

  // Optionally, rotate the fact every few seconds (optional, but not required by user)
  // useEffect(() => {
  //   const interval = setInterval(() => setFact(getRandomFact()), 8000);
  //   return () => clearInterval(interval);
  // }, []);

  // Loading spinner
  if (status === "checking")
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4 text-center">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
          <div className="text-lg text-gray-700 font-semibold">Checking your shift status...</div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4 text-center">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md space-y-6 relative">
        {/* Back to Login Button */}
        <button
          onClick={() => navigate('/login')}
          className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-lg shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
          title="Back to Login"
        >
          <LogIn className="w-4 h-4" />
          Back to Login
        </button>
        <h1 className="text-2xl font-extrabold text-gray-800">
          Shift Status Checker
        </h1>

        <div className="text-left">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Current Server Time:
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {currentTime}
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md text-blue-800 text-sm font-medium">
          {message}
        </div>

        {status === "valid" && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md text-green-800 text-sm font-medium">
            Your shift is active! ({shiftTime.startTime} - {shiftTime.endTime})
          </div>
        )}

        {status === "early" && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md text-red-800 text-sm font-medium">
            ⛔ Access Denied: Please login only during your shift hours ({shiftTime.startTime} - {shiftTime.endTime})
          </div>
        )}

        {status === "none" && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md text-red-800 text-sm font-medium">
            ⛔ Access Denied: No shift assigned for today or shift time has ended.
          </div>
        )}

        {/* Motivational/Fun Quote - always visible, animated */}
        <div className="mt-6 flex justify-center">
          <div className="relative w-full">
            <div className="animate-fade-in-up bg-gradient-to-r from-indigo-100 via-yellow-50 to-blue-100 border-l-4 border-indigo-400 p-4 rounded-xl shadow text-indigo-900 text-base font-semibold italic tracking-wide transition-all duration-500">
              <span role="img" aria-label="lightbulb" className="mr-2">💡</span>
              {fact}
        </div>
            <style>{`
              @keyframes fade-in-up {
                0% { opacity: 0; transform: translateY(20px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-up {
                animation: fade-in-up 1s cubic-bezier(.39,.575,.565,1) both;
              }
            `}</style>
          </div>
        </div>

        {/* Add a motivational footer or company branding */}
        <div className="mt-8 text-xs text-gray-400 tracking-widest">
          &copy; {new Date().getFullYear()} ENKONIX. Stay inspired, stay productive!
        </div>
      </div>
    </div>
  );
};

export default ShiftCheckPage;