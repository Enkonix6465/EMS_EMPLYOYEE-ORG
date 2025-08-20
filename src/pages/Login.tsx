import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, Mail } from "lucide-react";
import axios from "axios";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

import { Sun, Moon } from "lucide-react";

// Detect device type and block Android, iPhone, iPad
const getDeviceType = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod|mobile|tablet/.test(ua)) return "Blocked";
  return "Desktop";
};

const getPublicIP = async () => {
  try {
    const res = await axios.get("https://api.ipify.org?format=json");
    return res.data.ip;
  } catch {
    return "Unavailable";
  }
};

const getOS = () => {
  const { userAgent } = navigator;
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Mac OS X/.test(userAgent)) return "macOS";
  if (/Linux/.test(userAgent)) return "Linux";
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad/.test(userAgent)) return "iOS";
  return "Unknown";
};

const getBrowser = () => {
  const { userAgent } = navigator;
  let match =
    userAgent.match(
      /(firefox|msie|trident|chrome|safari|edg|opera|opr)\/?\s*(\d+)/i
    ) || [];
  if (/trident/i.test(match[1])) return "IE";
  if (match[1] === "Chrome" && /Edg\//.test(userAgent)) return "Edge";
  if (match[1] === "OPR") return "Opera";
  return match.length > 1 ? `${match[1]} ${match[2]}` : "Unknown";
};

function Login() {
  const { signIn, setSessionId } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Device block logic
  const deviceType = getDeviceType();
  const isBlockedDevice = deviceType === "Blocked";

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Add shake animation on error
  const [shake, setShake] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isBlockedDevice) {
        toast.error("Access denied. Login allowed only on desktop devices.");
        setIsLoading(false);
        setShake(true);
        setTimeout(() => setShake(false), 600);
        return;
      }
      await signIn(email, password);
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const newSessionId = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
        setSessionId(newSessionId);
        const sessionRef = doc(db, "activeSessions", user.uid);
        await setDoc(sessionRef, {
          sessionId: newSessionId,
          deviceType,
          loginTime: new Date().toISOString(),
        });
        const ipAddress = await getPublicIP();
        const os = getOS();
        const browser = getBrowser();
        const screenSize = `${window.screen.width}x${window.screen.height}`;
        await addDoc(collection(db, "loginLogs", user.uid, "entries"), {
          email: user.email,
          ipAddress,
          deviceType,
          os,
          browser,
          screenSize,
          loginTime: new Date().toISOString(),
        });
        navigate("/ShiftCheckPage");
      }
    } catch (err) {
      toast.error("Invalid login credentials");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, forgotEmail);
      toast.success("Password reset link sent to your email.");
      setShowForgot(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const BackgroundSVG = () => (
    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bg-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-gradient)" />
      <circle cx="80%" cy="20%" r="140" fill="#6366f1" fillOpacity="0.10" />
      <circle cx="20%" cy="80%" r="110" fill="#f59e42" fillOpacity="0.13" />
      <circle cx="50%" cy="50%" r="70" fill="#38bdf8" fillOpacity="0.09" />
    </svg>
  );

  return (
    <div className={`relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden transition-colors duration-500 ${darkMode ? 'dark' : ''}`}
      style={{ fontFamily: 'Poppins, Inter, sans-serif' }}>
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 w-full h-full z-0 animate-gradient-move">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bg-gradient2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.16" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg-gradient2)" />
          <circle cx="80%" cy="20%" r="160" fill="#6366f1" fillOpacity="0.13">
            <animate attributeName="cy" values="20%;30%;20%" dur="8s" repeatCount="indefinite" />
          </circle>
          <circle cx="20%" cy="80%" r="120" fill="#f59e42" fillOpacity="0.15">
            <animate attributeName="cx" values="20%;30%;20%" dur="10s" repeatCount="indefinite" />
          </circle>
          <circle cx="50%" cy="50%" r="80" fill="#38bdf8" fillOpacity="0.11">
            <animate attributeName="r" values="80;100;80" dur="12s" repeatCount="indefinite" />
          </circle>
        </svg>
          </div>
      {/* Dark/Light Mode Toggle */}
      <button
        className="absolute top-6 right-8 z-20 p-2 rounded-full bg-white/70 dark:bg-gray-800/70 shadow hover:scale-110 transition"
        onClick={() => setDarkMode((d) => !d)}
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-blue-600" />}
      </button>
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md w-full px-2 md:px-0">
        <div className="flex justify-center"></div>
        <h2 className="mt-8 text-center text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight drop-shadow font-poppins">
          Welcome to
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-yellow-400 dark:from-blue-400 dark:via-indigo-300 dark:to-yellow-300 animate-gradient-x">
            ENKONIX
          </span>
        </h2>
        <p className="mt-2 text-center text-lg text-gray-600 dark:text-gray-300 font-medium">
          Sign in to access your dashboard
        </p>
      </div>
      <div className="relative z-10 mt-10 sm:mx-auto sm:w-full sm:max-w-md w-full px-2 md:px-0">
        <div className={`glass-card bg-white/60 dark:bg-gray-900/60 py-10 px-6 sm:px-8 md:px-12 shadow-2xl rounded-2xl border border-blue-100 dark:border-gray-800 backdrop-blur-lg transition-all duration-300 ${shake ? 'animate-shake' : ''}`}
          style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' }}>

          {/* Login Form */}
          {!showForgot ? (
            <form className="space-y-8" onSubmit={handleSubmit} autoComplete="on">
              {/* Blocked device warning */}
              {isBlockedDevice && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-center font-semibold">
                  Access denied. Login allowed only on desktop devices.
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-base font-semibold text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-6 w-6 text-blue-400 dark:text-blue-300" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 px-4 py-3 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-lg shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition focus:shadow-lg focus:border-blue-500"
                    placeholder="Enter your email"
                    disabled={isBlockedDevice}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-base font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-6 w-6 text-blue-400 dark:text-blue-300" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 px-4 py-3 w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-lg shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition focus:shadow-lg focus:border-blue-500"
                    placeholder="Enter your password"
                    disabled={isBlockedDevice}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button type="button" className="text-sm text-blue-600 hover:underline font-medium" onClick={() => setShowForgot(true)} disabled={isBlockedDevice}>
                  Forgot password?
                </button>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading || isBlockedDevice}
                  className={`w-full flex justify-center py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isLoading || isBlockedDevice ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  {isBlockedDevice ? (
                    <span>Login Disabled</span>
                  ) : isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-7" onSubmit={handleSendResetEmail} autoComplete="on">
              <div>
                <label htmlFor="forgot-email" className="block text-base font-semibold text-gray-700 dark:text-gray-300">
                  Enter your email to reset password
                </label>
                <input
                  id="forgot-email"
                  name="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="mt-2 block w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-lg shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition focus:shadow-lg focus:border-blue-500"
                  placeholder="Enter your email"
                  disabled={resetLoading}
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:underline"
                  onClick={() => {
                    setShowForgot(false);
                    setForgotEmail("");
                  }}
                >
                  Back to login
                </button>
                <button
                  type="submit"
                  className="ml-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="mt-10 text-center text-xs text-gray-400 dark:text-gray-600 tracking-widest">
          &copy; {new Date().getFullYear()} ENKONIX. All rights reserved.
        </div>
      </div>
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap');
        .font-poppins { font-family: 'Poppins', Inter, sans-serif; }
        .glass-card {
          background: rgba(255,255,255,0.55);
          box-shadow: 0 8px 32px 0 rgba(31,38,135,0.18);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border-radius: 1.5rem;
          border: 1px solid rgba(255,255,255,0.18);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .glass-card:hover {
          box-shadow: 0 16px 48px 0 rgba(31,38,135,0.22);
          transform: scale(1.01);
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 4s ease-in-out infinite;
        }
        @keyframes gradient-x {
          0%,100% {background-position: 0% 50%;}
          50% {background-position: 100% 50%;}
        }
        .animate-bounce-slow {
          animation: bounce 2.5s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0);}
          50% { transform: translateY(-18px);}
        }
        .animate-gradient-move {
          animation: gradient-move 18s ease-in-out infinite alternate;
        }
        @keyframes gradient-move {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(30deg); }
        }
        .animate-shake {
          animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .bg-gradient-to-br {
          background-image: linear-gradient(to bottom right, #eff6ff, #e0e7ff, #fef9c3);
        }
        .dark .bg-gradient-to-br {
          background-image: linear-gradient(to bottom right, #111827, #1e293b, #334155);
        }
        @media (max-width: 640px) {
          .glass-card {
            padding: 1.5rem 1rem;
            border-radius: 1rem;
          }
        }
      `}
      </style>
    </div>
  );
}

export default Login;