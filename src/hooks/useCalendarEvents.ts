import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useEffect, useState } from "react";

// Fetches all events (holidays, custom, birthdays, etc.) for a given year
export function useCalendarEvents(year: number) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const qSnap = await getDocs(collection(db, "calendarDays"));
        const data: any[] = [];
        qSnap.forEach(doc => {
          const d = doc.data();
          let dateStr = d.date;
          if (dateStr && typeof dateStr !== "string" && dateStr.toDate) {
            dateStr = dateStr.toDate().toISOString().slice(0, 10);
          }
          if (typeof dateStr === "string" && dateStr.startsWith(`${year}-`)) {
            data.push({ id: doc.id, ...d, date: dateStr });
          }
        });

        const customSnap = await getDocs(collection(db, "customEvents"));
        customSnap.forEach(doc => {
          const d = doc.data();
          let dateStr = d.date;
          if (dateStr && typeof dateStr !== "string" && dateStr.toDate) {
            dateStr = dateStr.toDate().toISOString().slice(0, 10);
          }
          if (typeof dateStr === "string" && dateStr.startsWith(`${year}-`)) {
            data.push({ id: doc.id, ...d, date: dateStr, type: d.type || "custom" });
          }
        });

        // Fetch birthdays from employees collection
        const empSnap = await getDocs(collection(db, "employees"));
        empSnap.forEach(doc => {
          const d = doc.data();
          if (d.dob) {
            // Format: YYYY-MM-DD
            const [bYear, bMonth, bDay] = d.dob.split("-");
            const birthdayDate = `${year}-${bMonth.padStart(2, "0")}-${bDay.padStart(2, "0")}`;
            data.push({
              id: `birthday-${doc.id}`,
              date: birthdayDate,
              name: d.name,
              type: "birthday",
              photo: d.photo || null,
            });
          }
        });

        // Sort by date
        data.sort((a, b) => a.date.localeCompare(b.date));
        setEvents(data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEvents([]);
      }
      setLoading(false);
    }
    fetchEvents();
  }, [year]);

  return { events, loading };
} 