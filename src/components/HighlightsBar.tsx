import React from 'react';
import type { Highlight } from '../hooks/useHighlights';

export default function HighlightsBar({ highlights }: { highlights: Highlight[] }) {
  if (!highlights || highlights.length === 0) return null;
  return (
    <div className="w-full overflow-x-auto py-3 px-1 flex gap-4 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
      {highlights.map((h, i) => (
        <div
          key={i}
          className={
            'min-w-[220px] max-w-xs flex-shrink-0 rounded-2xl shadow-lg p-4 flex items-center gap-3 bg-gradient-to-br ' +
            (h.type === 'holiday'
              ? 'from-yellow-100 to-yellow-300 border-l-4 border-yellow-400'
              : h.type === 'event'
              ? 'from-blue-100 to-blue-300 border-l-4 border-blue-400'
              : 'from-pink-100 to-pink-300 border-l-4 border-pink-400')
          }
        >
          <div className="flex flex-col items-center justify-center mr-2">
            <span className="text-3xl mb-1">{h.icon}</span>
            <span className="text-xs font-semibold text-gray-600">{h.date.slice(5)}</span>
          </div>
          <div className="flex-1">
            <div className="font-bold text-base text-gray-800 truncate">
              {h.type === 'birthday' ? `Birthday: ${h.title}` : h.title}
            </div>
            {h.description && (
              <div className="text-xs text-gray-600 truncate">{h.description}</div>
            )}
          </div>
          {h.type === 'birthday' && h.photo && h.photo !== 'NA' && (
            <img
              src={h.photo}
              alt={h.title}
              className="w-10 h-10 rounded-full object-cover border-2 border-pink-400 shadow"
            />
          )}
        </div>
      ))}
    </div>
  );
} 