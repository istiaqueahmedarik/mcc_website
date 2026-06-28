'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Users, Star, ArrowLeft, RefreshCw, GitMerge } from 'lucide-react';

interface ContestMeta {
  provider: string;
  slug: string;
  title: string;
}

interface Performance {
  rank: number;
  score: number;
  penalty: number;
  teams: number;
}

interface UniversityData {
  university: string;
  totalScore: number;
  totalPenalty: number;
  totalTeams: number;
  performances: Record<string, Performance>;
}

interface CombinedData {
  success: boolean;
  contests: ContestMeta[];
  universities: UniversityData[];
}

export default function CombinedStandingsClient({ initialData }: { initialData: CombinedData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(30);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter universities
  const filteredUniversities = useMemo(() => {
    if (!initialData.universities) return [];
    return initialData.universities.filter(u =>
      u.university.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [initialData.universities, searchTerm]);

  // Reset pagination count on search
  useEffect(() => {
    setDisplayCount(30);
  }, [searchTerm]);

  // Infinite scroll effect
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => Math.min(prev + 30, filteredUniversities.length));
      }
    }, { threshold: 0.1 });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [filteredUniversities.length]);

  const visibleUniversities = useMemo(() => {
    return filteredUniversities.slice(0, displayCount);
  }, [filteredUniversities, displayCount]);

  if (!initialData.success || !initialData.contests || initialData.contests.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80">
        <h2 className="text-xl font-bold text-white mb-2">No Saved Standings Found</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-6">
          Archived standings pages will automatically aggregate here to compute the overall university leaderboard. Go save some standings first!
        </p>
        <Link 
          href="/contests"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Contests</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back link & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <Link 
          href="/contests" 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Contests</span>
        </Link>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search universities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800/80 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-950/20">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4 text-center w-20 sticky left-0 bg-[#0c101a] z-10">Rank</th>
                <th className="px-6 py-4 min-w-[240px] sticky left-20 bg-[#0c101a] z-10">University</th>
                <th className="px-6 py-4 text-center w-28">Overall Score</th>
                <th className="px-6 py-4 text-center w-36">Overall Penalty</th>
                <th className="px-6 py-4 text-center w-28">Teams Sent</th>
                {initialData.contests.map((c) => (
                  <th key={`${c.provider}-${c.slug}`} className="px-6 py-4 min-w-[200px] text-center border-l border-slate-850">
                    <div className="text-[10px] text-slate-500 mb-1">{c.provider.toUpperCase()} OJ</div>
                    <div className="text-xs text-white truncate max-w-[180px] normal-case font-bold" title={c.title}>
                      {c.title}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {visibleUniversities.map((uni, idx) => {
                const isTopThree = idx < 3;
                const rankColor = idx === 0 
                  ? 'text-amber-400' 
                  : idx === 1 
                    ? 'text-slate-300' 
                    : idx === 2 
                      ? 'text-amber-600' 
                      : 'text-slate-400';

                return (
                  <tr key={uni.university} className="hover:bg-slate-800/20 transition-colors text-slate-300 text-sm">
                    {/* Rank */}
                    <td className="px-6 py-5 text-center font-black sticky left-0 bg-[#0c101a] z-10 border-r border-slate-850/50">
                      <div className="flex items-center justify-center gap-1">
                        {isTopThree && <Star className={`h-4 w-4 fill-current ${rankColor}`} />}
                        <span className={rankColor}>{idx + 1}</span>
                      </div>
                    </td>

                    {/* University Name */}
                    <td className="px-6 py-5 font-bold text-white sticky left-20 bg-[#0c101a] z-10 border-r border-slate-850/50 whitespace-normal break-words max-w-[240px]">
                      {uni.university}
                    </td>

                    {/* Overall Score */}
                    <td className="px-6 py-5 text-center font-black text-white text-base">
                      {uni.totalScore}
                    </td>

                    {/* Overall Penalty */}
                    <td className="px-6 py-5 text-center text-slate-400 font-medium">
                      {uni.totalPenalty.toLocaleString()}
                    </td>

                    {/* Teams Count */}
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-800/60 px-3 py-1 rounded-xl text-slate-300">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-xs font-bold">{uni.totalTeams}</span>
                      </div>
                    </td>

                    {/* Contest-specific performances */}
                    {initialData.contests.map((c) => {
                      const key = `${c.provider}-${c.slug}`;
                      const perf = uni.performances[key];

                      return (
                        <td key={key} className="px-6 py-5 text-center border-l border-slate-850">
                          {perf ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                #{perf.rank}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400">
                                {perf.score} solved
                              </span>
                              <span className="text-[9px] text-slate-500">
                                ({perf.teams} {perf.teams === 1 ? 'team' : 'teams'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-bold">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sentinel loader for infinite scroll */}
        {visibleUniversities.length < filteredUniversities.length && (
          <div 
            ref={sentinelRef} 
            className="h-20 flex items-center justify-center text-slate-500 text-sm border-t border-slate-850"
          >
            <RefreshCw className="h-4 w-4 animate-spin mr-2 text-blue-500" />
            Loading more universities...
          </div>
        )}

        {filteredUniversities.length === 0 && (
          <div className="text-center py-20 text-slate-500 text-sm">
            No universities found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
