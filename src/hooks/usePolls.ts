import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Poll {
  id: string;
  question: string;
  options: any[];
}

export function usePolls(): Poll[] {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const snap = await getDocs(collection(db, 'polls')); // <-- change here
        const data: Poll[] = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            question: d.question || '',
            options: d.options || [],
          };
        });
        setPolls(data);
      } catch (err) {
        setPolls([]);
      }
    };
    fetchPolls();
  }, []);

  return polls;
} 