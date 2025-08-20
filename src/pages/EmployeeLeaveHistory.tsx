import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface LeaveHistoryRecord {
  userId: string;
  date: string;
  month: string;
  leaveType: string;
  reason: string;
  status: string;
  hrComment?: string;
  carryForwardAtThatTime: number;
  carryForwardUsed: boolean;
  finalCarryForwardLeft: number;
  markedAs: "present" | "absent";
  timestamp: string;
}

interface CFSummary {
  totalCF: number;
  cfUsed: number;
  cfLeft: number;
  cfUsedThisYear: number;
  cfLeftThisYear: number;
}

export default function EmployeeLeaveHistory() {
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<LeaveHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cfSummary, setCfSummary] = useState<CFSummary>({
    totalCF: 0,
    cfUsed: 0,
    cfLeft: 0,
    cfUsedThisYear: 0,
    cfLeftThisYear: 0,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const snapshot = await getDocs(collection(db, "leaveHistory"));
        const records: LeaveHistoryRecord[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as LeaveHistoryRecord;
          if (data.userId === user.uid) {
            records.push(data);
          }
        });

        records.sort((a, b) => (a.date < b.date ? 1 : -1));
        setHistory(records);
        
        // Calculate CF summary
        calculateCFSummary(records);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const calculateCFSummary = (records: LeaveHistoryRecord[]) => {
    const currentYear = new Date().getFullYear();
    let totalCF = 12; // Fixed at 12 CF per year
    let cfUsed = 0;
    let cfUsedThisYear = 0;

    // Calculate CF usage
    records.forEach((record) => {
      if (record.status === "accepted" && record.carryForwardUsed) {
        cfUsed++;
        
        // Check if it's this year
        const recordYear = new Date(record.date).getFullYear();
        if (recordYear === currentYear) {
          cfUsedThisYear++;
        }
      }
    });

    // Get the most recent CF left value or calculate from records
    const mostRecentRecord = records.find(record => record.finalCarryForwardLeft !== undefined);
    const cfLeft = mostRecentRecord ? mostRecentRecord.finalCarryForwardLeft : (totalCF - cfUsedThisYear);
    
    const cfLeftThisYear = cfLeft;

    setCfSummary({
      totalCF,
      cfUsed,
      cfLeft,
      cfUsedThisYear,
      cfLeftThisYear,
    });
  };

  const getCFStatus = (record: LeaveHistoryRecord, index: number) => {
    // Calculate CF for this specific record
    let cfAtThatTime = record.carryForwardAtThatTime;
    let cfUsed = record.carryForwardUsed ? 1 : 0;
    let cfLeft = record.finalCarryForwardLeft;

    // If values are missing, calculate from previous records
    if (cfAtThatTime === undefined || cfAtThatTime === 0) {
      // Look for the most recent record before this one
      const previousRecords = history.slice(index + 1);
      const lastValidRecord = previousRecords.find(r => r.finalCarryForwardLeft !== undefined);
      if (lastValidRecord) {
        cfAtThatTime = lastValidRecord.finalCarryForwardLeft;
      } else {
        cfAtThatTime = cfSummary.totalCF;
      }
    }

    if (cfLeft === undefined || cfLeft === 0) {
      cfLeft = cfAtThatTime - cfUsed;
    }

    return {
      cfAtThatTime,
      cfUsed: record.carryForwardUsed ? "Yes" : "No",
      cfLeft,
    };
  };

  if (!userId) return <p className="p-6 text-center">Loading user...</p>;
  if (loading)
    return <p className="p-6 text-center">Loading leave history...</p>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto transition-all duration-500 ease-in-out">
      <h2 className="text-3xl font-bold mb-6 text-center text-purple-700 dark:text-purple-300">
        📜 My Leave History
      </h2>

      {/* CF Summary Card */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold">{cfSummary.totalCF}</div>
          <div className="text-sm opacity-90">Total CF</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold">{cfSummary.cfLeft}</div>
          <div className="text-sm opacity-90">CF Left</div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold">{cfSummary.cfUsed}</div>
          <div className="text-sm opacity-90">CF Used</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold">{cfSummary.cfUsedThisYear}</div>
          <div className="text-sm opacity-90">CF Used This Year</div>
        </div>
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold">{cfSummary.cfLeftThisYear}</div>
          <div className="text-sm opacity-90">CF Left This Year</div>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400">
          No leave history found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded shadow-sm">
          <table className="min-w-full table-auto text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-all duration-300">
            <thead className="bg-purple-100 dark:bg-purple-900 text-gray-800 dark:text-white">
              <tr>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Leave Type</th>
                <th className="border px-4 py-2">Reason</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Marked As</th>
                <th className="border px-4 py-2">No. of CF</th>
                <th className="border px-4 py-2">CF Used</th>
                <th className="border px-4 py-2">No. of CF Left</th>
                <th className="border px-4 py-2">HR Comment</th>
              </tr>
            </thead>
            <tbody>
              {history.map((rec, i) => {
                const cfStatus = getCFStatus(rec, i);
                return (
                  <tr
                    key={i}
                    className="text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                  >
                    <td className="border px-3 py-2">{rec.date}</td>
                    <td className="border px-3 py-2">{rec.leaveType}</td>
                    <td className="border px-3 py-2">{rec.reason}</td>
                    <td
                      className={`border px-3 py-2 capitalize font-semibold ${
                        rec.status === "accepted"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {rec.status}
                    </td>
                    <td className="border px-3 py-2 capitalize">
                      {rec.markedAs}
                    </td>
                    <td className="border px-3 py-2 font-mono">
                      {cfStatus.cfAtThatTime}
                    </td>
                    <td className="border px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        rec.carryForwardUsed 
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}>
                        {cfStatus.cfUsed}
                      </span>
                    </td>
                    <td className="border px-3 py-2 font-mono">
                      {cfStatus.cfLeft}
                    </td>
                    <td className="border px-3 py-2">{rec.hrComment || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
