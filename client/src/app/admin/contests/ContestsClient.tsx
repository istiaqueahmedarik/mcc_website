'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Search, Filter, Link2, AlertTriangle, Database, RefreshCw, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { UnifiedContest } from '@/lib/data-sources/unified';
import { saveContestsList, deleteContestsList, toggleContestPublish } from '@/actions/contest';

function parseContestUrl(urlStr: string): { provider: 'baps' | 'toph'; slug: string } | null {
  try {
    const url = urlStr.trim().toLowerCase();
    
    if (url.includes('toph.co/c/')) {
      const parts = urlStr.trim().split('toph.co/c/');
      if (parts.length > 1) {
        const slugPart = parts[1].split('/')[0];
        if (slugPart) {
          return { provider: 'toph', slug: slugPart };
        }
      }
    }
    
    if (url.includes('baps.amarbari.net')) {
      if (url.includes('/contests/')) {
        const parts = urlStr.trim().split('/contests/');
        if (parts.length > 1) {
          const slugPart = parts[1].split('/')[0];
          if (slugPart) {
            return { provider: 'baps', slug: slugPart };
          }
        }
      }
    }
  } catch (e) {
    console.error('URL parse error', e);
  }
  return null;
}

export default function ContestsClient({ 
  initialContests, 
  listStatus 
  }: { 
  initialContests: UnifiedContest[], 
  listStatus: { saved: boolean, savedAt: string | null } 
}) {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState<string>('all');
  const [year, setYear] = useState<string>('all');
  const [month, setMonth] = useState<string>('all');
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});

  const [displayCount, setDisplayCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Extract unique years from contests for the year filter dropdown
  const years = useMemo(() => {
    const set = new Set<string>();
    initialContests.forEach(c => {
      if (c.startsAt) {
        const y = new Date(c.startsAt).getFullYear().toString();
        if (y && y !== 'NaN') set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [initialContests]);

  const months = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  const filteredContests = useMemo(() => {
    return initialContests.filter(c => {
      const titleLower = c.title.toLowerCase();
      
      // 1. Search filter
      if (search && !titleLower.includes(search.toLowerCase())) return false;

      // 2. Provider filter
      if (provider !== 'all' && c.provider !== provider) return false;

      // 3. Date filters (startsAt)
      if (c.startsAt) {
        const contestDate = new Date(c.startsAt);
        if (year !== 'all' && contestDate.getFullYear().toString() !== year) return false;
        if (month !== 'all' && contestDate.getMonth().toString() !== month) return false;
      }

      // 4. Force show only past contests (duration completed) - except saved ones
      if (c.startsAt && !c.isSaved) {
        const now = new Date();
        const start = new Date(c.startsAt);
        const end = new Date(start.getTime() + c.durationMinutes * 60000);
        if (now <= end) return false;
      }

      return true;
    });
  }, [initialContests, search, provider, year, month]);

  // Infinite scroll auto-load effect
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => Math.min(prev + 12, filteredContests.length));
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
  }, [filteredContests.length]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(12);
  }, [search, provider, year, month]);

  const visibleContests = useMemo(() => {
    return filteredContests.slice(0, displayCount);
  }, [filteredContests, displayCount]);

  const [isSavingList, setIsSavingList] = useState(false);
  const [isSyncingList, setIsSyncingList] = useState(false);

  const handleSaveList = async () => {
    setIsSavingList(true);
    try {
      const res = await saveContestsList(initialContests);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message || 'Failed to save contests list');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving contests list');
    } finally {
      setIsSavingList(false);
    }
  };

  const handleResyncList = async () => {
    if (!confirm('Are you sure you want to re-sync the contests list? This will clear all database entries not attached to saved standings.')) {
      return;
    }
    setIsSyncingList(true);
    try {
      const res = await deleteContestsList();
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message || 'Failed to clear database copy');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while clearing database copy');
    } finally {
      setIsSyncingList(false);
    }
  };

  const handleFetchUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');
    
    const parsed = parseContestUrl(urlInput);
    if (parsed) {
      router.push(`/admin/contests/${parsed.provider}/${parsed.slug}`);
    } else {
      setUrlError('Unrecognized URL format. Please paste a valid Toph.co or BAPS OJ contest link.');
    }
  };

  const handleTogglePublish = async (e: React.MouseEvent, provider: string, slug: string) => {
    e.preventDefault(); // Prevent navigating to the card standings page
    e.stopPropagation();
    
    const key = `${provider}-${slug}`;
    setPublishing(prev => ({ ...prev, [key]: true }));
    try {
      const res = await toggleContestPublish(provider, slug);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message || 'Failed to toggle publish status');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setPublishing(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Contests List DB Status Banner */}
      <div className="mb-6">
        {!listStatus.saved ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-white">Warning:</span> The contests list is not saved in the database yet. Live crawler data might expire.
              </div>
            </div>
            <button
              onClick={handleSaveList}
              disabled={isSavingList}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-700 disabled:bg-amber-700/50 text-white transition-all shadow-md shadow-amber-600/10 whitespace-nowrap self-end sm:self-auto"
            >
              <Database className="h-3.5 w-3.5" />
              {isSavingList ? 'Saving List...' : 'Save List to Database'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300">
            <div className="flex items-start sm:items-center gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-white">List Saved:</span> The contests list is safely archived. Saved on {listStatus.savedAt ? new Date(listStatus.savedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true
                }) : 'N/A'}.
              </div>
            </div>
            <button
              onClick={handleResyncList}
              disabled={isSyncingList}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700/50 text-slate-300 transition-all border border-slate-700 whitespace-nowrap self-end sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingList ? 'animate-spin' : ''}`} />
              {isSyncingList ? 'Syncing...' : 'Re-sync List with Live'}
            </button>
          </div>
        )}
      </div>
      {/* Fetch by Link Form */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-950/20">
        <div className="flex items-center gap-2 text-white font-bold text-lg mb-2">
          <Link2 className="h-5 w-5 text-blue-500" />
          <span>Fetch Standings by Link</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Standings not in the list? Paste the contest link from Toph (e.g., <code>https://toph.co/c/duet-inter-university-2026</code>) or BAPS OJ to fetch it directly.
        </p>
        <form onSubmit={handleFetchUrl} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Paste Toph or BAPS OJ contest link..."
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (urlError) setUrlError('');
              }}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800/80 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-sm"
            />
            {urlError && <p className="text-xs text-red-400 mt-1.5 pl-1">{urlError}</p>}
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 whitespace-nowrap"
          >
            Fetch Standings
          </button>
        </form>
      </div>

      {/* Filters Dashboard */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl shadow-slate-950/20">
        <div className="flex items-center gap-2 text-white font-bold text-lg mb-2">
          <Filter className="h-5 w-5 text-blue-500" />
          <span>Filter Contests</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search contests by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800/80 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-sm"
            />
          </div>

          {/* Provider Select */}
          <div className="relative">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800/80 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Platforms</option>
              <option value="baps">BAPS OJ</option>
              <option value="toph">Toph OJ</option>
            </select>
          </div>

          {/* Year Select */}
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800/80 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800/80 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Months</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {filteredContests.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/80">
          No contests found matching the selected filters.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleContests.map((contest) => (
              <Link 
                key={`${contest.provider}-${contest.slug}`}
                href={`/admin/contests/${contest.provider}/${contest.slug}`}
                className="block group"
              >
                <div className="bg-slate-800/40 rounded-2xl border border-slate-800/80 p-6 transition-all duration-300 hover:border-slate-700/50 hover:bg-slate-800/60 hover:-translate-y-1 h-full flex flex-col shadow-lg shadow-slate-950/10">
                  <div className="flex justify-between items-center mb-4 w-full">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      contest.provider === 'baps' 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {contest.provider.toUpperCase()} OJ
                    </span>
                    {contest.isSaved && (
                      <button
                        onClick={(e) => handleTogglePublish(e, contest.provider, contest.slug)}
                        disabled={publishing[`${contest.provider}-${contest.slug}`]}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                          contest.published
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                        }`}
                        title={contest.published ? "Unpublish Contest" : "Publish Contest"}
                      >
                        {contest.published ? (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <h2 className="text-lg font-bold text-white mb-4 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {contest.title}
                  </h2>
                  
                  <div className="mt-auto space-y-2 text-xs text-slate-400 pt-4 border-t border-slate-800/40">
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
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {visibleContests.length < filteredContests.length && (
            <div 
              ref={sentinelRef} 
              className="h-20 flex items-center justify-center text-slate-500 text-sm border-t border-slate-800/40 mt-8"
            >
              <RefreshCw className="h-4 w-4 animate-spin mr-2 text-blue-500" />
              Loading more contests...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
