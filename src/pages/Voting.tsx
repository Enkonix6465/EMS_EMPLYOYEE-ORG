import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { usePolls, Poll } from '../hooks/usePolls';

const VotingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const polls = usePolls();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Load user's previous votes on component mount
  useEffect(() => {
    const loadUserVotes = async () => {
      if (!user?.uid || polls.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const userVotes: Record<string, string> = {};
        
        // Check each poll for user's previous vote
        for (const poll of polls) {
          const pollRef = doc(db, 'polls', poll.id);
          const pollSnap = await getDoc(pollRef);
          if (pollSnap.exists()) {
            const pollData = pollSnap.data();
            const votes = pollData.votes || {};
            if (votes[user.uid]) {
              userVotes[poll.id] = votes[user.uid];
            }
          }
        }
        
        setVotedPolls(userVotes);
      } catch (err) {
        console.error('Error loading user votes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserVotes();
  }, [user?.uid, polls]);

  // User: Vote on a poll
  const handleVote = async (pollId: string) => {
    if (!user?.uid) return;
    const selected = selectedOptions[pollId];
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const pollRef = doc(db, 'polls', pollId);
      const pollSnap = await getDoc(pollRef);
      if (!pollSnap.exists()) return;
      const poll = pollSnap.data();
      const votes = poll.votes || {};
      votes[user.uid] = selected;
      await updateDoc(pollRef, { votes });
      setVotedPolls(prev => ({ ...prev, [pollId]: selected }));
    } catch (err) {
      setError('Failed to submit your vote.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPoll = (poll: Poll) => {
    const userVote = votedPolls[poll.id];
    const selected = selectedOptions[poll.id] || '';
    
    return (
      <div key={poll.id} className="mb-6 p-4 bg-white dark:bg-gray-800 rounded shadow max-w-xl mx-auto">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{poll.question}</h3>
        {userVote ? (
          <div className="text-green-600 dark:text-green-400 font-semibold mt-2">
            You voted: {userVote}
            <div className="text-blue-700 dark:text-blue-300 font-normal mt-1">Thank you for your response!</div>
          </div>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              handleVote(poll.id);
            }}
          >
            <ul>
              {poll.options && poll.options.map((opt, idx) => (
                <li key={idx} className="mb-2 flex items-center gap-2">
                  <input
                    type="radio"
                    id={`poll-${poll.id}-opt-${idx}`}
                    name={`poll-${poll.id}`}
                    value={typeof opt === 'string' ? opt : opt.text}
                    checked={selected === (typeof opt === 'string' ? opt : opt.text)}
                    disabled={submitting}
                    onChange={e => setSelectedOptions(prev => ({ ...prev, [poll.id]: e.target.value }))}
                  />
                  <label htmlFor={`poll-${poll.id}-opt-${idx}`} className="text-gray-800 dark:text-gray-100">{typeof opt === 'string' ? opt : opt.text}</label>
                </li>
              ))}
            </ul>
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded shadow disabled:opacity-60 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
              disabled={submitting || !selected}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading polls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex items-center gap-4 mb-6 max-w-xl mx-auto">
        <button
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded shadow"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300">🗳️ Voting & Polls</h1>
      </div>
      <h2 className="text-xl font-semibold mb-4 max-w-xl mx-auto">Active Polls</h2>
      {error && <div className="text-red-600 text-center mb-2">{error}</div>}
      {polls.length === 0 && <div className="text-gray-500 text-center">No polls available.</div>}
      {polls.map(renderPoll)}
    </div>
  );
};

export default VotingPage; 