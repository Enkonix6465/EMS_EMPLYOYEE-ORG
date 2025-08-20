import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BugReport {
  id: string;
  date: string;
  title: string;
  description: string;
  status: string;
  submittedOn?: string;
}

export default function BugReportPage() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        const ref = collection(db, "bugReports");
        onSnapshot(ref, (snapshot) => {
          const list: BugReport[] = [];
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.userId === authUser.uid) {
              list.push({
                id: doc.id,
                date: data.date,
                title: data.title,
                description: data.description,
                status: data.status,
                submittedOn: data.submittedOn,
              });
            }
          });
          setReports(list);
          setLoading(false);
        });
      }
    });
    return () => unsub();
  }, []);

  const getCurrentDateStr = () => new Date().toLocaleDateString("en-CA");

  const onSubmit = async () => {
    if (!user || !title || !description) {
      setToast({ type: "error", msg: "Please fill in all fields." });
      return;
    }
    const todayStr = getCurrentDateStr();
    const ref = doc(db, "bugReports", `${user.uid}_${Date.now()}`);
    await setDoc(ref, {
      userId: user.uid,
      date: todayStr,
      title,
      description,
      status: "pending",
      submittedOn: todayStr,
      timestamp: serverTimestamp(),
    });
    setTitle("");
    setDescription("");
    setToast({ type: "success", msg: "✅ Bug report submitted successfully!" });
    setTimeout(() => setToast(null), 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="w-3.5 h-3.5" /> Resolved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto transition-all duration-300">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      >
        ← Back
      </button>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 px-4 py-2 rounded ${
            toast.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-blue-800 dark:text-blue-300">
        🐞 Bug Report
      </h2>
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow p-4 mb-6">
        <label className="block font-medium mb-1 dark:text-gray-300">
          Title:
        </label>
        <input
          className="w-full border dark:border-gray-600 px-3 py-2 mb-4 rounded bg-white dark:bg-gray-700 dark:text-white"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter bug title"
        />
        <label className="block font-medium mb-1 dark:text-gray-300">
          Description:
        </label>
        <textarea
          className="w-full border dark:border-gray-600 px-3 py-2 mb-4 rounded bg-white dark:bg-gray-700 dark:text-white"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the bug in detail..."
        ></textarea>
        <button
          className="block w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-300"
          onClick={onSubmit}
        >
          Submit Bug Report
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded p-4 overflow-auto transition-all duration-300">
        <h3 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
          📋 Your Bug Reports
        </h3>
        {loading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            Loading...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No bug reports found.
          </div>
        ) : (
          <table className="w-full text-sm table-auto border dark:border-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="border px-3 py-2">Date</th>
                <th className="border px-3 py-2">Title</th>
                <th className="border px-3 py-2">Status</th>
                <th className="border px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {reports
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="border px-3 py-2">{r.date}</td>
                    <td className="border px-3 py-2">{r.title}</td>
                    <td className="border px-3 py-2">{getStatusBadge(r.status)}</td>
                    <td className="border px-3 py-2">{r.description}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
