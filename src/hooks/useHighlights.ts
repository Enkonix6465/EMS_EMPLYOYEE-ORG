import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type Highlight = {
  type: 'holiday' | 'event' | 'birthday';
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  photo?: string;
  icon: string;
};

function getNext30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function useHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHighlights() {
      setLoading(true);
      const days = getNext30Days();
      const start = days[0];
      const end = days[days.length - 1];
      const result: Highlight[] = [];

      // Holidays
      const holidaysSnap = await getDocs(collection(db, 'calendarDays'));
      holidaysSnap.forEach(doc => {
        const d = doc.data();
        if (d.type === 'holiday' && d.date >= start && d.date <= end) {
          result.push({
            type: 'holiday',
            date: d.date,
            title: d.reason || 'Holiday',
            icon: '🏖️',
          });
        }
      });

      // Events
      const eventsSnap = await getDocs(collection(db, 'customEvents'));
      eventsSnap.forEach(doc => {
        const d = doc.data();
        if (d.date >= start && d.date <= end) {
          result.push({
            type: 'event',
            date: d.date,
            title: d.title || 'Event',
            description: d.description,
            icon: '📅',
          });
        }
      });

      // Birthdays
      const employeesSnap = await getDocs(collection(db, 'employees'));
      employeesSnap.forEach(doc => {
        const d = doc.data();
        if (d.dob) {
          for (const day of days) {
            if (day.slice(5) === d.dob.slice(5)) {
              result.push({
                type: 'birthday',
                date: day,
                title: d.name,
                photo: d.photo,
                icon: '🎂',
              });
            }
          }
        }
      });

      // Sort by date
      result.sort((a, b) => a.date.localeCompare(b.date));
      setHighlights(result);
      setLoading(false);
    }
    fetchHighlights();
  }, []);

  return { highlights, loading };
} 