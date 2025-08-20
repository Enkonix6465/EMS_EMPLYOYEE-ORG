import React, { useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { Sun, Moon, Settings as SettingsIcon, KeyRound } from 'lucide-react';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Link } from "react-router-dom";

function Settings() {
  const { theme, setTheme } = useThemeStore();
  const [showPassword, setShowPassword] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setPwdLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('User not found.');

      // Re-authenticate
      const cred = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, cred);

      // Update password
      await updatePassword(user, newPwd);
      setPwdMsg({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your application preferences
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-8">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            Appearance
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <Sun className={`h-5 w-5 mr-2 ${
                    theme === 'light' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'light'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-300'
                  }`}>
                    Light Mode
                  </span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <Moon className={`h-5 w-5 mr-2 ${
                    theme === 'dark' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'dark'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-300'
                  }`}>
                    Dark Mode
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Feature */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <KeyRound className="h-5 w-5 mr-2" />
            Change Password
          </h2>
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-3 py-2 border rounded dark:bg-gray-900 dark:border-gray-700"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-3 py-2 border rounded dark:bg-gray-900 dark:border-gray-700"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-3 py-2 border rounded dark:bg-gray-900 dark:border-gray-700"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="show-password"
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword(v => !v)}
                className="h-4 w-4"
              />
              <label htmlFor="show-password" className="text-sm text-gray-600 dark:text-gray-400">
                Show Passwords
              </label>
            </div>
            {pwdMsg && (
              <div className={`text-sm ${pwdMsg.type === 'success' ? 'text-green-600' : 'text-red-600'} mt-1`}>
                {pwdMsg.text}
              </div>
            )}
            <button
              type="submit"
              className="w-full mt-2 py-2 px-4 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              disabled={pwdLoading}
            >
              {pwdLoading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mt-8">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            🐞 Bug Report
          </h2>
          <Link
            to="/bugreport"
            className="w-full block py-2 px-4 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-center"
          >
            Report a Bug
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Settings;