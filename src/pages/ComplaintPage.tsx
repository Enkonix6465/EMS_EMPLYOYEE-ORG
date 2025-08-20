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
import { useNavigate } from "react-router-dom";

interface ComplaintRecord {
  id: string;
  date: string;
  subject: string;
  description: string;
  status: string;
  submittedOn?: string;
}

export default function ComplaintPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        const ref = collection(db, "complaints");
        onSnapshot(ref, (snapshot) => {
          const list: ComplaintRecord[] = [];
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.userId === authUser.uid) {
              list.push({
                id: doc.id,
                date: data.date,
                subject: data.subject,
                description: data.description,
                status: data.status,
                submittedOn: data.submittedOn,
              });
            }
          });
          setComplaints(list);
        });
      }
    });
    return () => unsub();
  }, []);

  const getCurrentDateStr = () => new Date().toLocaleDateString("en-CA");

  const onSubmit = async () => {
    if (!user || !subject || !description) return;
    const todayStr = getCurrentDateStr();
    const ref = doc(db, "complaints", `${user.uid}_${Date.now()}`);
    await setDoc(ref, {
      userId: user.uid,
      date: todayStr,
      subject,
      description,
      status: "pending",
      submittedOn: todayStr,
      timestamp: serverTimestamp(),
    });
    setSubject("");
    setDescription("");
    alert("✅ Complaint submitted successfully!");
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto transition-all duration-300">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      >
        ← Back
      </button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-blue-800 dark:text-blue-300">
        📝 Complaint Submission
      </h2>
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow p-4 mb-6">
        <label className="block font-medium mb-1 dark:text-gray-300">
          Subject:
        </label>
        <input
          className="w-full border dark:border-gray-600 px-3 py-2 mb-4 rounded bg-white dark:bg-gray-700 dark:text-white"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter complaint subject"
        />
        <label className="block font-medium mb-1 dark:text-gray-300">
          Description:
        </label>
        <textarea
          className="w-full border dark:border-gray-600 px-3 py-2 mb-4 rounded bg-white dark:bg-gray-700 dark:text-white"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your complaint..."
        ></textarea>
        <button
          className="block w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-300"
          onClick={onSubmit}
        >
          Submit Complaint
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded p-4 overflow-auto transition-all duration-300">
        <h3 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
          📋 Your Complaints
        </h3>
        <table className="w-full text-sm table-auto border dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="border px-3 py-2">Date</th>
              <th className="border px-3 py-2">Subject</th>
              <th className="border px-3 py-2">Status</th>
              <th className="border px-3 py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {complaints
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((c, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="border px-3 py-2">{c.date}</td>
                  <td className="border px-3 py-2">{c.subject}</td>
                  <td className="border px-3 py-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(
                        c.status
                      )}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="border px-3 py-2">{c.description}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
