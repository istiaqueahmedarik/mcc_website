'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedStandingsResponse, UnifiedStandingsRow } from '@/lib/data-sources/unified';
import { Search, Download, Users, Info, Shield, AlertTriangle, Database, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';
import { saveContestStandings, deleteSavedStandings } from '@/actions/contest';

export default function StandingsClient({ data }: { data: UnifiedStandingsResponse }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'standard' | 'mist'>('standard');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [displayCount, setDisplayCount] = useState(50);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const toggleExpandRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const standingsWithUniqueRank = useMemo(() => {
    const seenUniversities = new Set<string>();
    return data.standings.map((row) => {
      if (row.institution) {
        seenUniversities.add(row.institution.trim().toLowerCase());
      }
      return {
        ...row,
        uniqueUniRank: seenUniversities.size
      };
    });
  }, [data.standings]);

  const filteredStandings = useMemo(() => {
    let list = standingsWithUniqueRank;
    if (viewMode === 'mist') {
      list = list.filter(row => {
        const institutionLower = (row.institution || '').toLowerCase().trim();
        const teamLower = (row.teamName || '').toLowerCase().trim();
        return teamLower.startsWith('mist_') || 
               institutionLower === 'mist' || 
               institutionLower === 'military institute of science and technology';
      });
    }
    return list.filter(row => 
      row.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      row.institution.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [standingsWithUniqueRank, searchTerm, viewMode]);

  // Reset pagination count when filters or views change
  useEffect(() => {
    setDisplayCount(50);
  }, [searchTerm, viewMode]);

  // Infinite scroll auto-load effect
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => Math.min(prev + 50, filteredStandings.length));
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
  }, [filteredStandings.length]);

  const visibleStandings = useMemo(() => {
    return filteredStandings.slice(0, displayCount);
  }, [filteredStandings, displayCount]);

  const downloadCSV = () => {
    let csv = '';
    
    const headers = [viewMode === 'mist' ? 'Unique University Rank' : 'Rank', 'Team', 'Institution', 'Score', 'Penalty'];
    data.problems.forEach(p => headers.push(p.label));
    csv += headers.join(',') + '\n';

    filteredStandings.forEach((row, i) => {
      const rowData = [
        viewMode === 'mist' ? row.uniqueUniRank : row.displayRank,
        `"${row.teamName.replace(/"/g, '""')}"`,
        `"${row.institution.replace(/"/g, '""')}"`,
        row.score,
        row.penalty
      ];
      data.problems.forEach(p => {
        const stat = row.problems.find(pr => pr.label === p.label);
        if (!stat) rowData.push('');
        else if (stat.solved) rowData.push(`1 (${stat.tries})`);
        else if (stat.tries > 0) rowData.push(`0 (${stat.tries})`);
        else rowData.push('');
      });
      csv += rowData.join(',') + '\n';

      if (row.skippedTeams) {
        row.skippedTeams.forEach(skipRow => {
          const skipRowData = [
            '-',
            `"${skipRow.teamName.replace(/"/g, '""')}"`,
            `"${skipRow.institution.replace(/"/g, '""')}"`,
            skipRow.score,
            skipRow.penalty
          ];
          data.problems.forEach(p => {
            const stat = skipRow.problems.find(pr => pr.label === p.label);
            if (!stat) skipRowData.push('');
            else if (stat.solved) skipRowData.push(`1 (${stat.tries})`);
            else if (stat.tries > 0) skipRowData.push(`0 (${stat.tries})`);
            else skipRowData.push('');
          });
          csv += skipRowData.join(',') + '\n';
        });
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${data.contest.title}_standings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToDb = async () => {
    setIsSaving(true);
    try {
      const res = await saveContestStandings(data.contest.provider, data.contest.slug, data);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message || 'Failed to save standings');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving standings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResyncLive = async () => {
    if (!confirm('Are you sure you want to re-sync this contest with live data? This will clear the database copy.')) {
      return;
    }
    setIsSyncing(true);
    try {
      const res = await deleteSavedStandings(data.contest.provider, data.contest.slug);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message || 'Failed to clear database copy');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while clearing database copy');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div>
      {/* DB Saved Status Banner */}
      <div className="mb-6">
        {!data.isSaved ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-white">Warning:</span> This standings page is not saved in the database yet. Live crawler data might expire or become invalid.
              </div>
            </div>
            <button
              onClick={handleSaveToDb}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-700 disabled:bg-amber-700/50 text-white transition-all shadow-md shadow-amber-600/10 whitespace-nowrap self-end sm:self-auto"
            >
              <Database className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save to Database'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300">
            <div className="flex items-start sm:items-center gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-white">Saved in Database:</span> This standings page is safely archived. Saved on {data.savedAt ? new Date(data.savedAt).toLocaleString('en-US', {
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
              onClick={handleResyncLive}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700/50 text-slate-300 transition-all border border-slate-700 whitespace-nowrap self-end sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Re-sync with Live'}
            </button>
          </div>
        )}
      </div>

      {/* Actual Standings Link */}
      <div className="mb-6 flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-slate-300">
        <div className="flex items-center gap-3">
          <ExternalLink className="h-5 w-5 text-blue-400 shrink-0" />
          <div className="text-xs sm:text-sm text-slate-300">
            You can view the original standings page on{' '}
            <a 
              href={data.contest.provider === 'baps' 
                ? `https://baps.amarbari.net/contests/${data.contest.slug}` 
                : `https://toph.co/c/${data.contest.slug}/standings`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              {data.contest.provider === 'baps' ? 'BAPS OJ' : 'Toph'}
            </a>.
          </div>
        </div>
      </div>
      {/* Controls Area */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl w-full md:w-auto flex-wrap">
          <button
            onClick={() => setViewMode('standard')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              viewMode === 'standard' 
                ? 'bg-slate-800 text-white shadow-lg shadow-slate-950/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Standard Standings
          </button>

          <button
            onClick={() => setViewMode('mist')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              viewMode === 'mist' 
                ? 'bg-slate-800 text-white shadow-lg shadow-slate-950/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MIST Performance
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search Team or University..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800/80 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-sm"
            />
          </div>
          <button 
            onClick={downloadCSV}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20"
          >
            <Download className="h-4 w-4" />
            <span>Export Results</span>
          </button>
        </div>
      </div>

      {/* Cards List Area */}
      <div className="space-y-4">
        {viewMode === 'standard' || viewMode === 'mist' ? (
          visibleStandings.map((row, idx) => {
            const rowKey = row.teamName + row.institution;
            const isExpanded = expandedRows.has(rowKey);
            const hasSkipped = row.skippedTeams && row.skippedTeams.length > 0;

            const institutionLower = (row.institution || '').toLowerCase().trim();
            const teamLower = (row.teamName || '').toLowerCase().trim();
            const isMist = 
              teamLower.startsWith('mist_') || 
              institutionLower === 'mist' || 
              institutionLower === 'military institute of science and technology';

            const isEven = idx % 2 === 0;
             const rowClass = isMist 
              ? 'border-slate-500/50 bg-slate-400 hover:bg-slate-400/80 shadow-md shadow-white/5' 
              : isEven
                ? 'border-slate-800/80 bg-slate-800/45 hover:border-slate-700/60 hover:bg-slate-800/65'
                : 'border-slate-800/40 bg-slate-900/40 hover:border-slate-750 hover:bg-slate-900/60';

            return (
              <div 
                key={idx} 
                className={`flex flex-col p-5 border rounded-2xl transition-all duration-300 ${rowClass}`}
              >
                {/* Main Row Content wrapper */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
                  {/* Left section: Rank */}
                  {(!isMist || viewMode === 'mist') && (
                    <div className="flex lg:flex-col items-center lg:items-center justify-between lg:justify-center pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-slate-700/50 pb-3 lg:pb-0 min-w-[120px]">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-center">
                        {viewMode === 'mist' ? 'Unique University Rank' : 'Rank'}
                      </span>
                      <span className="text-2xl font-black mt-0.5 lg:mt-1 text-white">
                        {viewMode === 'mist' ? row.uniqueUniRank : row.displayRank}
                      </span>
                    </div>
                  )}

                  {/* Team Details Section */}
                  <div className={`flex-1 min-w-[220px] ${isMist && viewMode !== 'mist' ? 'lg:min-w-[366px] lg:max-w-[406px]' : 'lg:min-w-[280px] lg:max-w-[320px]'}`}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-lg font-bold break-words whitespace-normal ${isMist ? 'text-slate-950' : 'text-white'}`}>
                        {row.institution || 'Unknown'}
                      </span>
                      {isMist && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200/60">
                          <Shield className="h-2.5 w-2.5 fill-violet-700/20" />
                          MIST
                        </span>
                      )}
                      {hasSkipped && (
                        <button
                          onClick={() => toggleExpandRow(rowKey)}
                          className={`p-1 rounded-full border transition-all ${
                            isExpanded 
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-600' 
                              : isMist
                                ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-200 hover:border-blue-300'
                                : 'bg-slate-700/40 border-slate-700/60 text-slate-400 hover:text-blue-400 hover:border-blue-500/30'
                          }`}
                          title={`Show ${row.skippedTeams.length} other team(s) from this university`}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className={`text-xs mt-1 truncate ${isMist ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                      {row.teamName}
                    </div>
                  </div>

                  {/* Score & Penalty Section */}
                  <div className={`flex items-center gap-8 px-0 lg:px-8 py-2 lg:py-0 border-t border-b lg:border-t-0 lg:border-b-0 lg:border-r lg:border-l justify-around lg:justify-start ${isMist ? 'border-slate-200' : 'border-slate-700/50'}`}>
                    <div className="flex flex-col">
                      <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isMist ? 'text-white' : 'text-slate-500'}`}>Score</span>
                      <span className={`text-xl font-black mt-0.5 ${isMist ? 'text-slate-950' : 'text-white'}`}>{row.score}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isMist ? 'text-white' : 'text-slate-500'}`}>Penalty</span>
                      <span className={`text-xl font-extrabold mt-0.5 ${isMist ? 'text-slate-700' : 'text-slate-300'}`}>{row.penalty}</span>
                    </div>
                    {isMist && viewMode !== 'mist' && (
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-extrabold text-white tracking-wider">Rank</span>
                        <span className="text-xl font-black mt-0.5 text-slate-950">{row.originalRank}</span>
                      </div>
                    )}
                  </div>

                  {/* Problems Badges Section */}
                  <div className="w-full lg:flex-1 min-w-0 flex items-center gap-2 overflow-x-auto py-1 pl-0 lg:pl-4 no-scrollbar">
                    {data.problems.map(p => {
                      const stat = row.problems.find(pr => pr.label === p.label);
                      let statusClass = "bg-slate-800/80 text-slate-400 border border-slate-700/30";
                      let attemptsText = "-";
                      
                      if (stat) {
                        if (stat.solved) {
                          statusClass = "bg-emerald-500 text-slate-950 font-extrabold";
                          attemptsText = `${stat.tries}/${stat.penalty}`;
                        } else if (stat.tries > 0) {
                          statusClass = "bg-red-500/90 text-white font-extrabold";
                          attemptsText = data.contest.provider === 'toph' ? 'X' : `-${stat.tries}`;
                        }
                      }

                      return (
                        <div 
                          key={p.label} 
                          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl text-center shadow-sm select-none transition-all ${statusClass}`}
                          title={`${p.title} ${stat ? (stat.solved ? '(Solved)' : '(Attempted)') : '(Unattempted)'}`}
                        >
                          <span className="text-[11px] font-extrabold uppercase leading-none">{p.label}</span>
                          <span className="text-[9px] font-bold mt-1 opacity-90 leading-none">{attemptsText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Skipped Teams expandable panel (sitting at full width inside the vertical stack) */}
                {hasSkipped && isExpanded && (
                  <div className="w-full mt-4 pt-4 border-t border-slate-700/50 bg-slate-900/35 rounded-b-xl p-4">
                    <div className="text-xs font-semibold text-slate-400 mb-3 flex justify-between">
                      <span>Other teams from {row.institution}</span>
                      <span className="font-normal text-slate-500">{row.skippedTeams.length} skipped team(s)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500">
                            <th className="px-4 py-2 font-medium">Team Name</th>
                            <th className="px-4 py-2 font-medium text-center">Score</th>
                            <th className="px-4 py-2 font-medium text-center">Penalty</th>
                            <th className="px-4 py-2 font-medium text-right">Original Rank</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {row.skippedTeams.map((sTeam, sIdx) => (
                            <tr key={sIdx} className="hover:bg-slate-800/20 transition-colors text-slate-300">
                              <td className="px-4 py-2 font-semibold">{sTeam.teamName}</td>
                              <td className="px-4 py-2 text-center font-bold text-white">{sTeam.score}</td>
                              <td className="px-4 py-2 text-center">{sTeam.penalty}</td>
                              <td className="px-4 py-2 text-right text-slate-500">#{sTeam.originalRank}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : null}

        {/* Infinite Scroll Sentinel */}
        {(viewMode === 'standard' || viewMode === 'mist') && visibleStandings.length < filteredStandings.length && (
          <div 
            ref={sentinelRef} 
            className="h-20 flex items-center justify-center text-slate-500 text-sm border-t border-slate-800/40 mt-6"
          >
            <RefreshCw className="h-4 w-4 animate-spin mr-2 text-blue-500" />
            Loading more team standings...
          </div>
        )}

        {/* Empty States */}
        {((viewMode === 'standard' || viewMode === 'mist') && filteredStandings.length === 0) && (
          <div className="text-center py-20 text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            No results found matching your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
