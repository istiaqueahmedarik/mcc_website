'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedStandingsResponse, UnifiedStandingsRow, isMistTeam } from '@/lib/data-sources/unified';
import { Search, Download, Users, Info, Shield, AlertTriangle, Database, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';
import { useTheme } from 'next-themes';
import { saveContestStandings, deleteSavedStandings, updateContestRegistrationFee } from '@/actions/contest';

export default function StandingsClient({ data }: { data: UnifiedStandingsResponse }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isBlackAndWhite = mounted && resolvedTheme === 'light';
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'standard' | 'mist' | 'sponsorship'>('standard');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [displayCount, setDisplayCount] = useState(50);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [feeInput, setFeeInput] = useState(data.contest.registrationFee || 0);
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);
  const [rulesConfig, setRulesConfig] = useState<any>(null);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);

  useEffect(() => {
    fetch('/sponsored-rules.json')
      .then((res) => res.json())
      .then((config) => setRulesConfig(config))
      .catch((err) => console.error('Failed to load sponsored rules config', err));
  }, []);

  useEffect(() => {
    setFeeInput(data.contest.registrationFee || 0);
  }, [data.contest.registrationFee]);

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
    return data.standings.map((row, idx) => {
      const isMist = isMistTeam(row.teamName, row.institution);
      let uniqueUniRank = idx + 1;
      if (isMist) {
        // Find the first non-MIST team after this index
        let nextNonMist = null;
        for (let j = idx + 1; j < data.standings.length; j++) {
          if (!isMistTeam(data.standings[j].teamName, data.standings[j].institution)) {
            nextNonMist = data.standings[j];
            break;
          }
        }
        if (nextNonMist) {
          const nextRank = typeof nextNonMist.displayRank === 'number'
            ? nextNonMist.displayRank
            : parseInt(nextNonMist.displayRank as string, 10);
          uniqueUniRank = isNaN(nextRank) ? (idx + 1) : nextRank;
        } else {
          // Find the last non-MIST team before this index
          let prevNonMist = null;
          for (let j = idx - 1; j >= 0; j--) {
            if (!isMistTeam(data.standings[j].teamName, data.standings[j].institution)) {
              prevNonMist = data.standings[j];
              break;
            }
          }
          if (prevNonMist) {
            const prevRank = typeof prevNonMist.displayRank === 'number'
              ? prevNonMist.displayRank
              : parseInt(prevNonMist.displayRank as string, 10);
            uniqueUniRank = isNaN(prevRank) ? (idx + 1) : (prevRank + 1);
          }
        }
      }
      return {
        ...row,
        uniqueUniRank
      };
    });
  }, [data.standings]);

  const filteredStandings = useMemo(() => {
    let list = standingsWithUniqueRank;
    if (viewMode === 'mist' || viewMode === 'sponsorship') {
      list = list.filter(row => isMistTeam(row.teamName, row.institution));
    }
    return list.filter(row =>
      row.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.institution.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [standingsWithUniqueRank, searchTerm, viewMode]);

  const sponsoredCalculation = useMemo(() => {
    if (!rulesConfig || !rulesConfig.rules) return new Map<string, any>();

    const calcMap = new Map<string, any>();

    const mistTeams = standingsWithUniqueRank
      .map((row) => ({ row, uniqueRank: row.uniqueUniRank }))
      .filter(item => isMistTeam(item.row.teamName, item.row.institution));

    const rawResults = mistTeams.map((item, idx) => {
      const mistRank = idx + 1;
      const uniqueRank = item.uniqueRank;

      let matchedRule = rulesConfig.rules.find((r: any) => {
        if (Array.isArray(r.mistRanks)) {
          return r.mistRanks.includes(mistRank);
        } else if (typeof r.mistRanks === 'string' && r.mistRanks.endsWith('+')) {
          const limit = parseInt(r.mistRanks.slice(0, -1), 10);
          return mistRank >= limit;
        }
        return false;
      });

      let percentage = matchedRule ? matchedRule.defaultPercentage : 50;

      if (item.row.score > 0 && matchedRule && matchedRule.brackets) {
        const bracket = matchedRule.brackets.find((b: any) => uniqueRank <= b.limit);
        if (bracket) {
          percentage = bracket.percentage;
        }
      }

      return {
        key: item.row.teamName + item.row.institution,
        mistRank,
        uniqueRank,
        percentage
      };
    });

    let currentCap = Infinity;
    const baseFee = data.contest.registrationFee || 0;
    const registrationFee = Math.min(baseFee, 10000);

    rawResults.forEach((res) => {
      const finalPercentage = Math.min(res.percentage, currentCap);
      currentCap = finalPercentage;

      const rawAmount = (registrationFee * finalPercentage) / 100;
      const amount = Math.ceil(rawAmount / 10) * 10;

      calcMap.set(res.key, {
        percentage: finalPercentage,
        amount,
        mistRank: res.mistRank,
        uniqueRank: res.uniqueRank
      });
    });

    return calcMap;
  }, [standingsWithUniqueRank, rulesConfig, data.contest.registrationFee]);

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

    const headers = [
      viewMode === 'mist' || viewMode === 'sponsorship' ? 'Unique University Rank' : 'Rank',
      'Team',
      'Institution',
      'Score',
      'Penalty'
    ];
    if (viewMode === 'sponsorship') {
      headers.push('Sponsorship', 'Reimbursement');
    }
    data.problems.forEach(p => headers.push(p.label));
    csv += headers.join(',') + '\n';

    filteredStandings.forEach((row, i) => {
      const rowData = [
        row.score === 0
          ? '∞'
          : (viewMode === 'mist' || viewMode === 'sponsorship' ? row.uniqueUniRank : row.displayRank),
        `"${row.teamName.replace(/"/g, '""')}"`,
        `"${row.institution.replace(/"/g, '""')}"`,
        row.score,
        row.penalty
      ];
      if (viewMode === 'sponsorship') {
        const rowKey = row.teamName + row.institution;
        const pct = sponsoredCalculation.has(rowKey) ? `${sponsoredCalculation.get(rowKey)!.percentage}%` : '50%';
        const amt = sponsoredCalculation.has(rowKey) && data.contest.registrationFee
          ? `৳${sponsoredCalculation.get(rowKey)!.amount}`
          : '৳0';
        rowData.push(`"${pct}"`, `"${amt}"`);
      }
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

  const renderGridCell = (pct: number) => {
    const isBonus = pct > 100;
    const bonusPct = pct - 100;
    
    let cellClass = "";
    let badgeClass = "";
    
    if (pct >= 200) {
      cellClass = isBlackAndWhite
        ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
        : "bg-emerald-950/20 border-emerald-500/20 text-white hover:border-emerald-500/40";
      badgeClass = isBlackAndWhite
        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    } else if (pct >= 150) {
      cellClass = isBlackAndWhite
        ? "bg-teal-50/50 border-teal-200 text-teal-800"
        : "bg-teal-950/20 border-teal-500/20 text-white hover:border-teal-500/40";
      badgeClass = isBlackAndWhite
        ? "bg-teal-100 text-teal-800 border-teal-200"
        : "bg-teal-500/20 text-teal-400 border-teal-500/30";
    } else if (pct > 100) { // e.g. 125%
      cellClass = isBlackAndWhite
        ? "bg-blue-50/50 border-blue-200 text-blue-800"
        : "bg-blue-950/20 border-blue-500/20 text-white hover:border-blue-500/40";
      badgeClass = isBlackAndWhite
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : "bg-blue-500/20 text-blue-400 border-blue-500/30";
    } else {
      cellClass = isBlackAndWhite
        ? "bg-slate-50 border-slate-200 text-slate-700"
        : "bg-slate-900/40 border-slate-800/80 text-slate-300 hover:border-slate-700/40";
    }
    
    return (
      <div className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all duration-300 min-h-[76px] ${cellClass}`}>
        {isBonus ? (
          <>
            <span className="text-sm font-medium opacity-85">100%</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border mt-1 select-none whitespace-nowrap uppercase tracking-wider ${badgeClass}`}>
              +{bonusPct}% Bonus
            </span>
          </>
        ) : (
          <span className="text-lg font-black">{pct}%</span>
        )}
      </div>
    );
  };

  const renderRuleCell = (rankRange: string, pct: number) => {
    let cellClass = "";
    
    if (pct >= 200) {
      cellClass = isBlackAndWhite
        ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
        : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40";
    } else if (pct >= 150) {
      cellClass = isBlackAndWhite
        ? "bg-teal-50/50 border-teal-200 text-teal-800"
        : "bg-teal-950/20 border-teal-500/20 text-teal-400 hover:border-teal-500/40";
    } else if (pct > 100) { // 125%
      cellClass = isBlackAndWhite
        ? "bg-blue-50/50 border-blue-200 text-blue-800"
        : "bg-blue-950/20 border-blue-500/20 text-blue-400 hover:border-blue-500/40";
    } else if (pct === 100) {
      cellClass = isBlackAndWhite
        ? "bg-indigo-50 border-indigo-200 text-indigo-850"
        : "bg-indigo-950/20 border-indigo-500/20 text-indigo-300 hover:border-indigo-500/40";
    } else if (pct === 75) {
      cellClass = isBlackAndWhite
        ? "bg-amber-50 border-amber-250 text-amber-800"
        : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:border-amber-500/30";
    } else {
      cellClass = isBlackAndWhite
        ? "bg-slate-50 border-slate-200 text-slate-700"
        : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700/40";
    }
    
    return (
      <div className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all duration-300 min-h-[64px] ${cellClass}`}>
        <span className="text-xs font-black">{rankRange}</span>
      </div>
    );
  };

  return (
    <div className="transition-colors duration-300">
      {/* DB Saved Status Banner */}
      <div className="mb-6">
        {!data.isSaved ? (
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border ${isBlackAndWhite ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className={`h-5 w-5 shrink-0 ${isBlackAndWhite ? 'text-amber-600' : 'text-amber-500'}`} />
              <div className="text-xs sm:text-sm">
                <span className={`font-bold ${isBlackAndWhite ? 'text-amber-900' : 'text-white'}`}>Warning:</span> This standings page is not saved in the database yet. Live crawler data might expire or become invalid.
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
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border ${isBlackAndWhite ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'}`}>
            <div className="flex items-start sm:items-center gap-3">
              <CheckCircle className={`h-5 w-5 shrink-0 ${isBlackAndWhite ? 'text-slate-900' : 'text-emerald-500'}`} />
              <div className="text-xs sm:text-sm">
                <span className={`font-bold ${isBlackAndWhite ? 'text-slate-900' : 'text-white'}`}>Saved in Database:</span> This standings page is safely archived. Saved on {data.savedAt ? new Date(data.savedAt).toLocaleString('en-US', {
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
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap self-end sm:self-auto ${isBlackAndWhite ? 'bg-slate-100 hover:bg-slate-200 text-slate-850 border border-slate-350/80' : 'bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700/50 text-slate-300 border border-slate-700'}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Re-sync with Live'}
            </button>
          </div>
        )}
      </div>

      {/* MCC Sponsored Budget Settings (Admin Only) & Rules Accordion */}
      {viewMode === 'sponsorship' && (
        <>
          <div className={`mb-6 p-6 rounded-2xl border transition-all duration-300 ${isBlackAndWhite
            ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
            : 'bg-slate-900/60 backdrop-blur-md border-slate-800/85 text-slate-350 shadow-lg'
            }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className={`text-lg font-bold tracking-tight mb-1 ${isBlackAndWhite ? 'text-slate-900' : 'text-white'}`}>
                  MCC Sponsored Budget Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Set the registration fee to calculate and display the sponsored return amounts for MIST teams (capped at a max registration fee of ৳10,000).
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold ${isBlackAndWhite ? 'text-slate-500' : 'text-slate-450'}`}>
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Registration Fee"
                    value={feeInput || ''}
                    onChange={(e) => setFeeInput(parseInt(e.target.value, 10) || 0)}
                    disabled={!data.isSaved || isUpdatingFee}
                    className={`w-full pl-9 pr-12 py-2.5 border rounded-xl outline-none transition-all text-sm font-semibold ${isBlackAndWhite
                      ? 'bg-slate-50 border-slate-350 text-slate-900 focus:ring-2 focus:ring-slate-100'
                      : 'bg-slate-950 border-slate-850 text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold ${isBlackAndWhite ? 'text-slate-500' : 'text-slate-450'}`}>
                    TK
                  </span>
                </div>

                <button
                  onClick={async () => {
                    if (!data.isSaved) return;
                    setIsUpdatingFee(true);
                    try {
                      const res = await updateContestRegistrationFee(data.contest.provider, data.contest.slug, feeInput);
                      if (res.success) {
                        router.refresh();
                      } else {
                        alert(res.message);
                      }
                    } catch (err: any) {
                      alert(err.message || 'Failed to update registration fee');
                    } finally {
                      setIsUpdatingFee(false);
                    }
                  }}
                  disabled={!data.isSaved || isUpdatingFee}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${isBlackAndWhite
                    ? 'bg-slate-950 hover:bg-slate-900 disabled:bg-slate-400 text-white shadow-md'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700/50 text-white shadow-md shadow-blue-600/10'
                    } disabled:cursor-not-allowed`}
                >
                  {isUpdatingFee ? 'Saving...' : 'Save Fee'}
                </button>
              </div>
            </div>

            {!data.isSaved && (
              <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                Please save this standings page to the database first to enable setting the registration fee.
              </div>
            )}
          </div>

          {/* Expandable Rules Accordion */}
          <div className={`mb-6 rounded-2xl border overflow-hidden transition-all duration-300 ${isBlackAndWhite
            ? 'bg-slate-50 border-slate-200'
            : 'bg-slate-900/35 border-slate-800/80'
            }`}>
            <button
              onClick={() => setIsRulesExpanded(!isRulesExpanded)}
              className={`w-full flex items-center justify-between p-4 text-left font-bold text-sm transition-all ${isBlackAndWhite
                ? 'hover:bg-slate-100/50 text-slate-850'
                : 'hover:bg-slate-800/20 text-slate-200'
                }`}
            >
              <div className="flex items-center gap-2">
                <Info className={`h-4 w-4 ${isBlackAndWhite ? 'text-slate-600' : 'text-blue-400'}`} />
                <span>MCC Sponsored Budget Rules </span>
              </div>
              <span className="text-xs text-slate-500 font-normal">
                {isRulesExpanded ? 'Hide Rules ▲' : 'Show Rules ▼'}
              </span>
            </button>

            {isRulesExpanded && (
              <div className={`p-5 border-t text-xs space-y-4 leading-relaxed ${isBlackAndWhite
                ? 'border-slate-200 text-slate-650 bg-white'
                : 'border-slate-800/60 text-slate-350 bg-slate-950/30'
                }`}>
                <p>
                  MCC automatically sponsors the registration fees for MIST teams based on their rank in the standings.
                  Here is how it is calculated step-by-step:
                </p>

                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>Unique University Rank:</strong>
                    Ranks are calculated after filtering out secondary teams from other universities. Only the top team of other universities is counted, but <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>all MIST teams are kept</strong>, each getting their own unique university rank slot.
                  </li>
                  <li>
                    <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>MIST-Relative Rank:</strong>
                    MIST teams are ranked relative to each other based on their order in the standings (e.g. 1st MIST team, 2nd MIST team, etc.).
                  </li>
                  <li>
                    <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>Return Percentage Brackets:</strong>
                    {/* Visual Return Bracket Grid Matrix (7 Columns to match JSON rules exactly) */}
                    <div className="overflow-x-auto pb-2 mt-3">
                      <div className="min-w-[850px] grid grid-cols-7 gap-2.5 mb-2">
                        {/* Headers */}
                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl ${
                          isBlackAndWhite ? 'border-slate-350 bg-slate-100 text-slate-850' : 'border-slate-800/80 bg-slate-950 text-slate-400'
                        }`}>
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-center opacity-65">Y-AXIS</span>
                          <span className="text-[11px] font-extrabold text-center">Team Tier</span>
                        </div>
                        
                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl ${
                          isBlackAndWhite ? 'border-slate-350 bg-slate-100 text-slate-850' : 'border-slate-800/80 bg-slate-950 text-slate-400'
                        }`}>
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-center text-emerald-450">100% Base</span>
                          <span className="text-[11px] font-extrabold text-center text-emerald-400">+100% Bonus</span>
                        </div>

                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl ${
                          isBlackAndWhite ? 'border-slate-350 bg-slate-100 text-slate-850' : 'border-slate-800/80 bg-slate-950 text-slate-400'
                        }`}>
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-center text-teal-450">100% Base</span>
                          <span className="text-[11px] font-extrabold text-center text-teal-400">+50% Bonus</span>
                        </div>

                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl ${
                          isBlackAndWhite ? 'border-slate-350 bg-slate-100 text-slate-850' : 'border-slate-800/80 bg-slate-950 text-slate-400'
                        }`}>
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-center text-blue-450">100% Base</span>
                          <span className="text-[11px] font-extrabold text-center text-blue-400">+25% Bonus</span>
                        </div>

                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl ${
                          isBlackAndWhite ? 'border-slate-350 bg-slate-100 text-slate-850' : 'border-slate-800/80 bg-slate-950 text-slate-400'
                        }`}>
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-center text-indigo-400">100% Base</span>
                          <span className="text-[11px] font-extrabold text-center">Reimbursement</span>
                        </div>

                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl ${
                          isBlackAndWhite ? 'border-slate-350 bg-slate-100 text-slate-850' : 'border-slate-800/80 bg-slate-950 text-slate-400'
                        }`}>
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-center text-amber-500">75%</span>
                          <span className="text-[11px] font-extrabold text-center">Reimbursement</span>
                        </div>

                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl ${
                          isBlackAndWhite ? 'border-slate-350 bg-slate-100 text-slate-850' : 'border-slate-800/80 bg-slate-950 text-slate-450'
                        }`}>
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-center text-slate-500">50%</span>
                          <span className="text-[11px] font-extrabold text-center">Default</span>
                        </div>

                        {/* Row 1: 1st MIST */}
                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl font-bold text-xs ${
                          isBlackAndWhite ? 'bg-slate-100/50 border-slate-350 text-slate-850' : 'bg-slate-950/40 border-slate-800/80 text-white'
                        }`}>
                          <span>1st MIST</span>
                        </div>
                        {renderRuleCell("Rank 1", 200)}
                        {renderRuleCell("Rank 2-5", 150)}
                        {renderRuleCell("Rank 6-10", 125)}
                        {renderRuleCell("Rank 11-20", 100)}
                        {renderRuleCell("Rank 21-25", 75)}
                        {renderRuleCell("Rank 26+", 50)}

                        {/* Row 2: 2nd & 3rd MIST */}
                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl text-center font-bold text-xs ${
                          isBlackAndWhite ? 'bg-slate-100/50 border-slate-350 text-slate-855' : 'bg-slate-950/40 border-slate-800/80 text-white'
                        }`}>
                          <span>2nd & 3rd</span>
                          <span className="text-[8px] font-medium opacity-65 mt-0.5 uppercase tracking-wider">MIST Teams</span>
                        </div>
                        {renderRuleCell("Rank 1-2", 200)}
                        {renderRuleCell("Rank 3-10", 150)}
                        {renderRuleCell("Rank 11-20", 125)}
                        {renderRuleCell("Rank 21-30", 100)}
                        {renderRuleCell("Rank 31-35", 75)}
                        {renderRuleCell("Rank 36+", 50)}

                        {/* Row 3: 4th+ MIST */}
                        <div className={`flex flex-col items-center justify-center p-2.5 border rounded-xl text-center font-bold text-xs ${
                          isBlackAndWhite ? 'bg-slate-100/50 border-slate-350 text-slate-855' : 'bg-slate-950/40 border-slate-800/80 text-white'
                        }`}>
                          <span>4th+</span>
                          <span className="text-[8px] font-medium opacity-65 mt-0.5 uppercase tracking-wider">MIST Teams</span>
                        </div>
                        {renderRuleCell("Rank 1-3", 200)}
                        {renderRuleCell("Rank 4-15", 150)}
                        {renderRuleCell("Rank 16-30", 125)}
                        {renderRuleCell("Rank 31-40", 100)}
                        {renderRuleCell("Rank 41-45", 75)}
                        {renderRuleCell("Rank 46+", 50)}
                      </div>
                    </div>
                  </li>
                  <li>
                    <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>The Capping Rule (Fairness Cap):</strong>
                    To ensure fairness, an upper-ranked team will never get less reimbursement than a lower-ranked team. For example, if the 1st MIST team ranks 22nd and receives 75%, then the 2nd MIST team (even if they qualified for 100% based on their brackets) will be capped at 75%.
                  </li>
                  <li>
                    <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>International ICPC competition (e.g. World Finals, Super-regional, etc.) Transport rule:</strong>
                    If a MIST team successfully qualifies for and enters an International ICPC competition (e.g. World Finals, Super-regional, etc.), all of their transport, lodging, and contest-related expenses will be <strong className="text-emerald-500">100% sponsored</strong> by MCC/MIST (automatically covered, no ranking rules apply).
                  </li>
                  <li>
                    <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>Registration Fee Capping Rule:</strong>
                    The registration fee used for calculating sponsorship return amounts is capped at a maximum of <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>৳10,000</strong>. If the registration fee is higher than this amount, the reimbursement calculations are still performed as if the fee is exactly ৳10,000.
                  </li>
                  <li>
                    <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>Reimbursement Rounding Rule:</strong>
                    Calculated reimbursement amounts are rounded up (ceiled) to the nearest <strong className={isBlackAndWhite ? 'text-slate-900' : 'text-white'}>৳10</strong> for cleaner distribution (e.g., a calculated ৳2,502 reimbursement is adjusted to ৳2,510).
                  </li>
                </ol>
              </div>
            )}
          </div>
        </>
      )}

      {/* Actual Standings Link */}
      <div className={`mb-6 flex items-center justify-between p-4 rounded-2xl border ${isBlackAndWhite ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/40 border-slate-800/80 text-slate-300'}`}>
        <div className="flex items-center gap-3">
          <ExternalLink className={`h-5 w-5 shrink-0 ${isBlackAndWhite ? 'text-slate-900' : 'text-blue-400'}`} />
          <div className="text-xs sm:text-sm">
            You can view the original standings page on{' '}
            <a
              href={data.contest.provider === 'baps'
                ? `https://bapsoj.org/contests/${data.contest.slug}`
                : `https://toph.co/c/${data.contest.slug}/standings`
              }
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold underline transition-colors ${isBlackAndWhite ? 'text-slate-900 hover:text-slate-800' : 'text-blue-400 hover:text-blue-300'}`}
            >
              {data.contest.provider === 'baps' ? 'BAPS OJ' : 'Toph'}
            </a>.
          </div>
        </div>
      </div>
      {/* Controls Area */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className={`flex border p-1.5 rounded-2xl w-full md:w-auto flex-wrap ${isBlackAndWhite ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <button
            onClick={() => setViewMode('standard')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'standard'
              ? isBlackAndWhite
                ? 'bg-white text-slate-950 shadow-md shadow-slate-200/80'
                : 'bg-slate-800 text-white shadow-lg shadow-slate-950/20'
              : isBlackAndWhite
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Standard Standings
          </button>

          <button
            onClick={() => setViewMode('mist')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'mist'
              ? isBlackAndWhite
                ? 'bg-white text-slate-950 shadow-md shadow-slate-200/80'
                : 'bg-slate-800 text-white shadow-lg shadow-slate-950/20'
              : isBlackAndWhite
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            MIST Performance
          </button>

          <button
            onClick={() => setViewMode('sponsorship')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'sponsorship'
              ? isBlackAndWhite
                ? 'bg-white text-slate-950 shadow-md shadow-slate-200/80'
                : 'bg-slate-800 text-white shadow-lg shadow-slate-950/20'
              : isBlackAndWhite
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Sponsorship
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:flex-1 md:w-72">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${isBlackAndWhite ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Search Team or University..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 border rounded-2xl outline-none transition-all text-sm ${isBlackAndWhite
                ? 'bg-white border-slate-350 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-slate-100 focus:border-slate-400'
                : 'bg-slate-900 border-slate-800/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50'
                }`}
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
        {visibleStandings.map((row, idx) => {
          const rowKey = row.teamName + row.institution;
          const isExpanded = expandedRows.has(rowKey);
          const hasSkipped = row.skippedTeams && row.skippedTeams.length > 0;

          const isMist = isMistTeam(row.teamName, row.institution);

          if (viewMode === 'sponsorship') {
            const calc = sponsoredCalculation.get(rowKey) || { percentage: 50, amount: 0, mistRank: idx + 1 };
            const pct = calc.percentage;
            const reimbursementAmount = calc.amount;

            let badgeColorClass = "";
            if (pct >= 200) {
              badgeColorClass = isBlackAndWhite
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]";
            } else if (pct >= 125) {
              badgeColorClass = isBlackAndWhite
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]";
            } else if (pct >= 100) {
              badgeColorClass = isBlackAndWhite
                ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]";
            } else if (pct >= 75) {
              badgeColorClass = isBlackAndWhite
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]";
            } else {
              badgeColorClass = isBlackAndWhite
                ? "bg-slate-100 text-slate-700 border-slate-350"
                : "bg-slate-500/10 text-slate-400 border-slate-500/30";
            }

            const cardClass = isBlackAndWhite
              ? 'border-slate-350 bg-slate-100/60 hover:bg-slate-200/40 shadow-sm'
              : 'border-slate-500/30 bg-slate-900/60 hover:bg-slate-900/80 hover:border-slate-700/60 shadow-lg';

            return (
              <div
                key={rowKey}
                className={`flex flex-col p-5 border rounded-2xl transition-all duration-300 ${cardClass}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full">
                  {/* Left: Rank Indicators */}
                  <div className="flex lg:flex-col items-start lg:items-center justify-between lg:justify-center min-w-[140px] pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r pb-3 lg:pb-0 border-slate-200/20 lg:border-slate-800/80">
                    <span className={`text-[10px] uppercase font-bold tracking-wider text-center ${isBlackAndWhite ? 'text-slate-400' : 'text-slate-500'}`}>
                      Unique University Rank
                    </span>
                    <span className={`text-2xl font-black mt-0.5 lg:mt-1 ${isBlackAndWhite ? 'text-slate-900' : 'text-white'}`}>
                      {row.score === 0 ? '∞' : row.uniqueUniRank}
                    </span>
                    <span className={`text-[10px] font-semibold mt-1 opacity-80 ${isBlackAndWhite ? 'text-slate-500' : 'text-slate-400'}`}>
                      Overall Rank: #{row.score === 0 ? '∞' : row.originalRank}
                    </span>
                  </div>

                  {/* Middle Left: Team & University Details */}
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-lg font-bold ${isBlackAndWhite ? 'text-slate-900' : 'text-white'}`}>
                        {row.institution || 'Unknown'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${isBlackAndWhite ? 'bg-slate-950 text-white' : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'}`}>
                        <Shield className="h-2.5 w-2.5 fill-current opacity-80" />
                        MIST
                      </span>
                    </div>
                    <div className={`text-xs mt-1 truncate ${isBlackAndWhite ? 'text-slate-500 font-medium' : 'text-slate-450'}`}>
                      {row.teamName}
                    </div>
                  </div>

                  {/* Middle Right: Performance Score (Solved count only) */}
                  <div className="flex flex-col min-w-[90px] justify-center">
                    <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isBlackAndWhite ? 'text-slate-400' : 'text-slate-500'}`}>Score</span>
                    <span className={`text-xl font-black mt-1 ${isBlackAndWhite ? 'text-slate-900' : 'text-white'}`}>{row.score} Solved</span>
                  </div>

                  {/* Right: Sponsorship & Reimbursement Details */}
                  <div className="flex items-center gap-6 lg:pl-6 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 border-slate-200/20 lg:border-slate-800/80 justify-between lg:justify-start w-full lg:w-auto">
                    <div className="flex flex-col min-w-[100px]">
                      <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isBlackAndWhite ? 'text-slate-400' : 'text-slate-500'}`}>Sponsorship</span>
                      {pct > 100 ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border mt-1 w-max ${badgeColorClass}`}>
                          <span>100% Base</span>
                          <span className="opacity-40">•</span>
                          <span className="uppercase text-[9px] font-black">+{pct - 100}% Bonus</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-sm font-extrabold border mt-1 w-max ${badgeColorClass}`}>
                          {pct}% Cover
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-[120px]">
                      <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isBlackAndWhite ? 'text-slate-400' : 'text-slate-500'}`}>Reimbursement</span>
                      <span className={`text-2xl font-black mt-1 tracking-tight ${isBlackAndWhite ? 'text-slate-900' : 'text-blue-400'}`}>
                        ৳{reimbursementAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-500">TK</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const isEven = idx % 2 === 0;
          const rowClass = isBlackAndWhite
            ? isMist
              ? 'border-slate-350 bg-slate-100/60 hover:bg-slate-200/40 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/20 shadow-sm'
            : isMist
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
                <div className={`flex lg:flex-col items-center lg:items-center justify-between lg:justify-center pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r pb-3 lg:pb-0 min-w-[120px] ${isBlackAndWhite ? 'border-slate-200' : 'border-slate-700/50'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider text-center ${isBlackAndWhite ? 'text-slate-400' : 'text-slate-500'}`}>
                    {viewMode === 'mist' ? 'Unique University Rank' : 'Rank'}
                  </span>
                  <span className={`text-2xl font-black mt-0.5 lg:mt-1 ${isBlackAndWhite ? 'text-slate-900' : 'text-white'}`}>
                    {row.score === 0 ? '∞' : (viewMode === 'mist' ? row.uniqueUniRank : row.displayRank)}
                  </span>
                </div>

                {/* Team Details Section */}
                <div className="flex-1 min-w-[220px] lg:min-w-[366px] lg:max-w-[406px]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-lg font-bold break-words whitespace-normal ${isBlackAndWhite ? 'text-slate-900' : isMist ? 'text-slate-950' : 'text-white'}`}>
                      {row.institution || 'Unknown'}
                    </span>
                    {isMist && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${isBlackAndWhite ? 'bg-slate-950 text-white border border-slate-950' : 'bg-violet-100 text-violet-700 border border-violet-200/60'}`}>
                        <Shield className="h-2.5 w-2.5 fill-current opacity-80" />
                        MIST
                      </span>
                    )}
                    {hasSkipped && (
                      <button
                        onClick={() => toggleExpandRow(rowKey)}
                        className={`p-1 rounded-full border transition-all ${isExpanded
                          ? isBlackAndWhite
                            ? 'bg-slate-100 border-slate-350 text-slate-900'
                            : 'bg-blue-500/20 border-blue-500/40 text-blue-600'
                          : isBlackAndWhite
                            ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100'
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
                  <div className={`text-xs mt-1 truncate ${isBlackAndWhite ? 'text-slate-500 font-medium' : isMist ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    {row.teamName}
                  </div>
                </div>

                {/* Score & Penalty Section */}
                <div className={`flex items-center gap-8 px-0 lg:px-8 py-2 lg:py-0 border-t border-b lg:border-t-0 lg:border-b-0 lg:border-r lg:border-l justify-around lg:justify-start ${isBlackAndWhite ? 'border-slate-200' : isMist ? 'border-slate-200' : 'border-slate-700/50'}`}>
                  <div className="flex flex-col">
                    <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isBlackAndWhite ? 'text-slate-400' : isMist ? 'text-white' : 'text-slate-500'}`}>Score</span>
                    <span className={`text-xl font-black mt-0.5 ${isBlackAndWhite ? 'text-slate-900' : isMist ? 'text-slate-950' : 'text-white'}`}>{row.score}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isBlackAndWhite ? 'text-slate-400' : isMist ? 'text-white' : 'text-slate-500'}`}>Penalty</span>
                    <span className={`text-xl font-extrabold mt-0.5 ${isBlackAndWhite ? 'text-slate-650' : isMist ? 'text-slate-700' : 'text-slate-300'}`}>{row.penalty}</span>
                  </div>
                </div>

                {/* Problems Badges Section */}
                <div className="w-full lg:flex-1 min-w-0 flex items-center gap-2 overflow-x-auto py-1 pl-0 lg:pl-4 no-scrollbar">
                  {data.problems.map(p => {
                    const stat = row.problems.find(pr => pr.label === p.label);
                    let statusClass = isBlackAndWhite
                      ? "bg-white text-slate-300 border border-slate-200"
                      : "bg-slate-800/80 text-slate-400 border border-slate-700/30";
                    let attemptsText = "-";

                    if (stat) {
                      if (stat.solved) {
                        statusClass = isBlackAndWhite
                          ? "bg-slate-950 text-white font-extrabold border border-slate-950"
                          : "bg-emerald-500 text-slate-950 font-extrabold";
                        attemptsText = `${stat.tries}/${stat.penalty}`;
                      } else if (stat.tries > 0) {
                        statusClass = isBlackAndWhite
                          ? "bg-white text-slate-400 font-medium border border-slate-300 line-through"
                          : "bg-red-500/90 text-white font-extrabold";
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
                <div className={`w-full mt-4 pt-4 border-t p-4 rounded-b-xl ${isBlackAndWhite ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/35 border-slate-700/50'}`}>
                  <div className={`text-xs font-semibold mb-3 flex justify-between ${isBlackAndWhite ? 'text-slate-400' : 'text-slate-400'}`}>
                    <span>Other teams from {row.institution}</span>
                    <span className="font-normal text-slate-500">{row.skippedTeams.length} skipped team(s)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`border-b ${isBlackAndWhite ? 'border-slate-200 text-slate-400' : 'border-slate-800 text-slate-500'}`}>
                          <th className="px-4 py-2 font-medium">Team Name</th>
                          <th className="px-4 py-2 font-medium text-center">Score</th>
                          <th className="px-4 py-2 font-medium text-center">Penalty</th>
                          <th className="px-4 py-2 font-medium text-right">Original Rank</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isBlackAndWhite ? 'divide-slate-200/60' : 'divide-slate-800/40'}`}>
                        {row.skippedTeams.map((sTeam, sIdx) => (
                          <tr key={sIdx} className={`transition-colors ${isBlackAndWhite ? 'hover:bg-slate-100/50 text-slate-850' : 'hover:bg-slate-800/20 text-slate-300'}`}>
                            <td className="px-4 py-2 font-semibold">{sTeam.teamName}</td>
                            <td className={`px-4 py-2 text-center font-bold ${isBlackAndWhite ? 'text-slate-900' : 'text-white'}`}>{sTeam.score}</td>
                            <td className="px-4 py-2 text-center">{sTeam.penalty}</td>
                            <td className="px-4 py-2 text-right text-slate-450">#{sTeam.score === 0 ? '∞' : sTeam.originalRank}</td>
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
        }

        {/* Infinite Scroll Sentinel */}
        {visibleStandings.length < filteredStandings.length && (
          <div
            ref={sentinelRef}
            className={`h-20 flex items-center justify-center text-slate-500 text-sm border-t mt-6 ${isBlackAndWhite ? 'border-slate-200' : 'border-slate-800/40'}`}
          >
            <RefreshCw className="h-4 w-4 animate-spin mr-2 text-slate-455" />
            Loading more team standings...
          </div>
        )}

        {/* Empty States */}
        {filteredStandings.length === 0 && (
          <div className={`text-center py-20 border ${isBlackAndWhite ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900/40 border-slate-800/80 text-slate-500'}`}>
            No results found matching your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
