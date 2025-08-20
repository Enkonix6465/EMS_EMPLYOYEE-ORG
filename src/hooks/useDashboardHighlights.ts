import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface DashboardHighlight {
  id: string;
  date: string;
  type: "holiday" | "event" | "birthday";
  title: string;
  description?: string;
  name?: string;
  photo?: string;
  reason?: string;
  customType?: string;
}

export function useDashboardHighlights() {
  const [highlights, setHighlights] = useState<DashboardHighlight[]>([]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(today.getDate() + 30);
    const todayStr = today.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    Promise.all([
      // Holidays
      getDocs(collection(db, "calendarDays")),
      // Events
      getDocs(collection(db, "customEvents")),
      // Birthdays
      getDocs(collection(db, "employees")),
    ]).then(([holidaysSnap, eventsSnap, employeesSnap]) => {
      const arr: DashboardHighlight[] = [];
      // Holidays
      holidaysSnap.forEach(doc => {
        const d = doc.data();
        if (d.type === "holiday" && d.date >= todayStr && d.date <= endStr) {
          arr.push({
            id: `holiday-${d.date}`,
            date: d.date,
            type: "holiday",
            title: d.reason || "Holiday",
            reason: d.reason,
            description: d.description,
          });
        }
      });
      // Events
      eventsSnap.forEach(doc => {
        const d = doc.data();
        if (d.date >= todayStr && d.date <= endStr) {
          arr.push({
            id: `event-${doc.id}`,
            date: d.date,
            type: "event",
            title: d.title || d.reason || "Event",
            customType: d.type,
            description: d.description,
          });
        }
      });
      // Birthdays
      employeesSnap.forEach(doc => {
        const d = doc.data();
        if (d.dob) {
          const [year, month, day] = d.dob.split("-");
          const thisYearBirthday = `${today.getFullYear()}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          if (thisYearBirthday >= todayStr && thisYearBirthday <= endStr) {
            arr.push({
              id: `birthday-${doc.id}-${thisYearBirthday}`,
              date: thisYearBirthday,
              type: "birthday",
              title: `${d.name}'s Birthday`,
              name: d.name,
              photo: d.photo || d.profileImageUrl || null,
            });
          }
        }
      });
      arr.sort((a, b) => a.date.localeCompare(b.date));
      setHighlights(arr);
    });
  }, []);

  return highlights;
} 