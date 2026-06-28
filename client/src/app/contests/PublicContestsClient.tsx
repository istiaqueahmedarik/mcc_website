'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Search, Trophy, BarChart3 } from 'lucide-react';
import { UnifiedContest } from '@/lib/data-sources/unified';

export default function PublicContestsClient({ contests }: { contests: UnifiedContest[] }) {
  const [search, setSearch] = useState('');

  const filteredContests = useMemo(() => {
    return contests.filter(c => {
      const titleLower = c.title.toLowerCase();
      // 1. Search filter
      if (search && !titleLower.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [contests, search]);

  return (
    <div className="space-y-8">
      {/* Header section with modern design */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/60 pb-8 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 flex items-center gap-3">
            <Trophy className="h-9 w-9 text-yellow-500 animate-pulse" />
            Programming Contests
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Explore archived contests and view university leaderboards.
          </p>
        </div>
        
        <Link
          href="/contests/combined"
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
        >
          <BarChart3 className="h-4.5 w-4.5" />
          <span>Combined Leaderboard</span>
        </Link>
      </div>

      {/* Search Filter Box */}
      <div className="relative max-w-md">
        <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search contests by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-5 py-3.5 bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-sm shadow-inner"
        />
      </div>

      {/* Grid of contests */}
      {filteredContests.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-slate-900/20 backdrop-blur rounded-3xl border border-slate-800/60">
          No published contests found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContests.map((contest) => (
            <div 
              key={`${contest.provider}-${contest.slug}`}
              className="bg-slate-900/40 backdrop-blur rounded-2xl border border-slate-800/80 p-6 transition-all duration-300 hover:border-slate-700/50 hover:bg-slate-900/60 shadow-lg shadow-slate-950/15 flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-5">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  contest.provider === 'baps' 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {contest.provider.toUpperCase()} OJ
                </span>
              </div>
              
              <h2 className="text-lg font-bold text-white mb-4 line-clamp-2 leading-snug">
                {contest.title}
              </h2>
              
              <div className="mt-auto space-y-2.5 text-xs text-slate-400 pt-4 border-t border-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span>{new Date(contest.startsAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span>Duration: {(contest.durationMinutes / 60).toFixed(1)} hrs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
