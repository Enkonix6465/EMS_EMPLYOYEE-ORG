import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../store/themeStore";
import SessionValidator from "./SessionValidator";
import { doc, getDoc } from "firebase/firestore";
import { db, ROLES } from "../lib/firebase";

import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquareText,
  BarChart2,
  User,
  TrendingUp,
  DollarSign,
} from "lucide-react";

function Layout() {
  const { signOut, user } = useAuthStore();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const [userRole, setUserRole] = useState<string>('member');

  const isActive = (path: string) => location.pathname === path;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Check user role on mount
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;

      try {
        // Try to get user from 'users' collection first
        let userDoc = await getDoc(doc(db, 'users', user.uid));

        // If not found, try 'employees' collection
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'employees', user.uid));
        }

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'member');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole('member');
      }
    };

    checkUserRole();
  }, [user]);

  // Function to check if user has access to a menu item
  const hasMenuAccess = (requiredRoles: string[]) => {
    if (requiredRoles.includes('all')) return true;
    if (userRole === ROLES.SUPER_ADMIN) return true;
    return requiredRoles.includes(userRole);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-all duration-500">
      <SessionValidator />
      
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-white/90 dark:bg-gray-800/90 shadow-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105"
      >
        {isSidebarOpen ? (
          <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-72 bg-white/95 dark:bg-gray-900/95 border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl md:shadow-none backdrop-blur-xl transition-all duration-500 ease-in-out`}
      >
        {/* Header */}
        <div className="h-24 px-6 py-4 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm">
          <a
            href="https://enkonix.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 hover:opacity-90 transition-all duration-300 group"
          >
            <div className="relative">
              <img
                src="/logo.jpg"
                alt="Company Logo"
                className="h-12 w-12 rounded-xl shadow-lg object-contain bg-white p-1.5 border-2 border-blue-200 dark:border-blue-700 group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                ENKONIX
              </h1>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Software Services Pvt Ltd
              </p>
            </div>
          </a>

          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800 dark:hover:to-indigo-800 transition-all duration-300 shadow-lg hover:shadow-xl"
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Sun className="h-5 w-5 text-yellow-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-6 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-gray-600 transition-all duration-300">
          {[
            { path: "/", icon: LayoutDashboard, label: "Dashboard", roles: ['all'] },
            { path: "/profile", icon: User, label: "Profile", roles: ['all'] },
            {
              path: "/AttendanceHistory",
              icon: Calendar,
              label: "Attendance History",
              roles: ['all']
            },
            {
              path: "/ViewPayslip",
              icon: DollarSign,
              label: "View Payslip",
              roles: ['all']
            },
            {
              path: "/admin-payroll",
              icon: DollarSign,
              label: "Payroll Management",
              roles: ['admin', 'super_admin', 'hr']
            },
            {
              path: "/EmployeeLeaveHistory",
              icon: Calendar,
              label: "Leave History",
              roles: ['all']
            },
            {
              path: "/LeaveApplicationPage ",
              icon: Calendar,
              label: "Leave Application",
              roles: ['all']
            },
            {
              path: "/complaint",
              icon: MessageSquareText,
              label: "Complaint",
              roles: ['all']
            },

            { path: "/calendar", icon: Calendar, label: "Calendar", roles: ['all'] },
            {
              path: "/ChatMeetingPage",
              icon: MessageSquareText,
              label: "Chat & Meeting Room",
              roles: ['all']
            },
            { path: "/settings", icon: Settings, label: "Settings", roles: ['all'] },
            { path: "/org-chart", icon: Users, label: "Org Chart", roles: ['all'] },
            { path: "/voting", icon: BarChart2, label: "Company Polls", roles: ['all'] },
            { path: "/career-development", icon: TrendingUp, label: "Career Development", roles: ['all'] },
          ].filter(({ roles }) => hasMenuAccess(roles)).map(({ path, icon: Icon, label, roles }) => (
            <Link
              key={path}
              to={path}
              onClick={closeSidebar}
              className={`group flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden ${
                isActive(path)
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25 scale-105"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-gray-700 hover:scale-105"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                isActive(path) ? "opacity-100" : ""
              }`}></div>
              <Icon className={`h-5 w-5 mr-3 transition-all duration-300 ${
                isActive(path) ? "text-white" : "text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
              }`} />
              <span className="relative z-10">{label}</span>
            </Link>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 w-full p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
                {/* User initials */}
                <div 
                  className="h-10 w-10 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-700 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center"
                >
                  {user?.email ? 
                    user.email.split('@')[0].substring(0, 2).toUpperCase() : 
                    'U'
                  }
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
            </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
            </div>
            </div>
            
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
          onClick={closeSidebar}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-transparent transition-all duration-500 ease-in-out">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
