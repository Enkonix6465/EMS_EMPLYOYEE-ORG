import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const SessionTerminatedPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 mb-6">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Whoops! Something went wrong
        </h1>
        <div className="text-left text-gray-700 dark:text-gray-300 space-y-4">
          <p>Dear employee,</p>
          <p>
            You have been logged out of the current employee dashboard because
            someone has used your email and password to log in elsewhere. Only
            one user can access the employee dashboard at a time.
          </p>
          <p className="font-semibold">
            Please do not share your password with anyone.
          </p>
          <p>
            If you did not initiate this new login, we recommend you log in
            again immediately and change your password.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Thanks,
            <br />
            ESS TEAM
          </p>
        </div>
        <div className="mt-8">
          <Link
            to="/login"
            className="inline-block w-full sm:w-auto bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Click here to go back to start
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SessionTerminatedPage; 