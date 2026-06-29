'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, GitMerge, RefreshCw, X, HelpCircle, Plus, Sparkles } from 'lucide-react';
import { mergeUniversities, splitUniversityAlias } from '@/actions/contest';

interface AliasMapping {
  aliasName: string;
  canonicalName: string;
}

interface AliasesManagerProps {
  rawUniversities: string[];
  initialAliases: AliasMapping[];
}

export default function AliasesManagerClient({ rawUniversities, initialAliases }: AliasesManagerProps) {
  const router = useRouter();
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');
  
  const [isMerging, setIsMerging] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [draggedUni, setDraggedUni] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [selectedLeftUni, setSelectedLeftUni] = useState<string | null>(null);

  // Group mappings by canonical name: Map<canonicalName, Array<aliasName>>
  const aliasGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    initialAliases.forEach(a => {
      if (!map.has(a.canonicalName)) {
        map.set(a.canonicalName, []);
      }
      map.get(a.canonicalName)!.push(a.aliasName);
    });
    return map;
  }, [initialAliases]);

  // Set of all raw names that are registered as aliases (so they should NOT appear on the left)
  const activeAliasesSet = useMemo(() => {
    return new Set(initialAliases.map(a => a.aliasName.trim().toLowerCase()));
  }, [initialAliases]);

  // Left column: list of raw universities that are NOT aliases (they can be canonical targets or dragged)
  const independentUnis = useMemo(() => {
    return rawUniversities.filter(uni => !activeAliasesSet.has(uni.trim().toLowerCase()));
  }, [rawUniversities, activeAliasesSet]);

  // Filtered lists
  const filteredLeft = useMemo(() => {
    return independentUnis.filter(uni => 
      uni.toLowerCase().includes(searchLeft.toLowerCase())
    );
  }, [independentUnis, searchLeft]);

  const filteredGroups = useMemo(() => {
    const list = Array.from(aliasGroups.entries());
    if (!searchRight) return list;
    return list.filter(([canonical, aliases]) => 
      canonical.toLowerCase().includes(searchRight.toLowerCase()) ||
      aliases.some(alias => alias.toLowerCase().includes(searchRight.toLowerCase()))
    );
  }, [aliasGroups, searchRight]);

  // Click and Selection Merge Handlers
  const handleUniCardClick = (uniName: string) => {
    if (selectedLeftUni === uniName) {
      setSelectedLeftUni(null);
    } else {
      setSelectedLeftUni(uniName);
    }
  };

  const handleMergeAction = async (source: string, target: string) => {
    if (source === target) return;
    
    setSelectedLeftUni(null);

    if (confirm(`Merge university statistics?\n\nThis will redirect all standings from:\n⚠️ "${source}"\n\nto point to:\n✅ "${target}"`)) {
      setIsMerging(true);
      try {
        const res = await mergeUniversities(source, target);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.message);
        }
      } catch (err: any) {
        alert(err.message || 'An error occurred during merging');
      } finally {
        setIsMerging(false);
      }
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (uni: string) => {
    setDraggedUni(uni);
  };

  const handleDragEnd = () => {
    setDraggedUni(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    if (draggedUni && draggedUni !== targetName) {
      setDragOverTarget(targetName);
    }
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCanonicalName: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedUni || draggedUni === targetCanonicalName) return;

    const source = draggedUni;
    const target = targetCanonicalName;

    if (confirm(`Merge university statistics?\n\nThis will redirect all standings from:\n⚠️ "${source}"\n\nto point to:\n✅ "${target}"`)) {
      setIsMerging(true);
      try {
        const res = await mergeUniversities(source, target);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.message);
        }
      } catch (err: any) {
        alert(err.message || 'An error occurred during merging');
      } finally {
        setIsMerging(false);
      }
    }
  };

  // Split Alias Handler
  const handleSplitAlias = async (alias: string) => {
    if (confirm(`Split university alias?\n\nThis will restore "${alias}" as an independent university in all standings.`)) {
      setIsSplitting(true);
      try {
        const res = await splitUniversityAlias(alias);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.message);
        }
      } catch (err: any) {
        alert(err.message || 'An error occurred during splitting');
      } finally {
        setIsSplitting(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link 
        href="/admin/contests/combined" 
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold self-start"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Combined Leaderboard</span>
      </Link>

      {/* Guide Note Banner */}
      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-start gap-3">
        <HelpCircle className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed">
          <span className="font-bold text-white">How it works:</span> Either **drag** any card from the left list and drop it onto another card/group, or **click** a card on the left to select it, then click **"Merge Here"** on any other card or group.
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Independent Unis */}
        <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-950/10 h-[650px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Independent Universities</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
                  {independentUnis.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Click to select, then merge. Or drag them.</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search independent list..."
              value={searchLeft}
              onChange={(e) => setSearchLeft(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-xs"
            />
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 no-scrollbar">
            {filteredLeft.map((uni) => {
              const isTarget = dragOverTarget === uni;
              const isDragged = draggedUni === uni;
              const isSelected = selectedLeftUni === uni;

              return (
                <div
                  key={uni}
                  draggable={!isMerging && !isSplitting}
                  onDragStart={() => handleDragStart(uni)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, uni)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, uni)}
                  onClick={() => handleUniCardClick(uni)}
                  className={`p-3.5 rounded-xl border text-xs font-semibold select-none cursor-pointer transition-all ${
                    isDragged 
                      ? 'opacity-40 border-slate-800 bg-slate-950/30'
                      : isSelected
                        ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-400'
                        : isTarget
                          ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-400'
                          : 'border-slate-850 bg-slate-950/40 text-slate-300 hover:border-slate-700/60 hover:bg-slate-900/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{uni}</span>
                    {selectedLeftUni && !isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMergeAction(selectedLeftUni, uni);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition-all"
                      >
                        <GitMerge className="h-3 w-3" />
                        <span>Merge Here</span>
                      </button>
                    )}
                    {!selectedLeftUni && (
                      <Plus className="h-3 w-3 text-slate-500 opacity-40 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}

            {filteredLeft.length === 0 && (
              <div className="text-center py-20 text-slate-600 text-xs">
                No independent universities found matching your search.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Merged Groups */}
        <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-950/10 h-[650px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-blue-500" />
                <span>Merged Groups</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
                  {aliasGroups.size} groups
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Drop raw cards here to assign aliases.</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search merged groups..."
              value={searchRight}
              onChange={(e) => setSearchRight(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-xs"
            />
          </div>

          {/* Scrollable Groups list */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 no-scrollbar">
            {filteredGroups.map(([canonicalName, aliases]) => {
              const isTarget = dragOverTarget === canonicalName;

              return (
                <div
                  key={canonicalName}
                  onDragOver={(e) => handleDragOver(e, canonicalName)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, canonicalName)}
                  className={`p-4 rounded-2xl border transition-all duration-300 ${
                    isTarget
                      ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      : 'border-slate-850 bg-slate-950/20'
                  }`}
                >
                  {/* Canonical Title */}
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-850/60 gap-3">
                    <span className="text-xs font-black text-white truncate">
                      {canonicalName}
                    </span>
                    {selectedLeftUni && (
                      <button
                        onClick={() => handleMergeAction(selectedLeftUni, canonicalName)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition-all shrink-0"
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                        <span>Merge Here</span>
                      </button>
                    )}
                  </div>

                  {/* Aliases List nested */}
                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-800/80">
                    {aliases.map((alias) => (
                      <div
                        key={alias}
                        className="flex items-center justify-between gap-3 p-2 bg-slate-900/40 border border-slate-850/40 rounded-lg text-[11px] text-slate-300 font-semibold"
                      >
                        <span className="truncate">{alias}</span>
                        <button
                          onClick={() => handleSplitAlias(alias)}
                          disabled={isSplitting || isMerging}
                          className="text-slate-500 hover:text-red-400 p-0.5 hover:bg-slate-800/50 rounded transition-all shrink-0"
                          title="Remove alias (split out)"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredGroups.length === 0 && (
              <div className="text-center py-20 text-slate-600 text-xs">
                {aliasGroups.size === 0 
                  ? 'No merged groups yet. Drag and drop cards on the left to merge them!'
                  : 'No merged groups match your search.'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Loading Spinners Overlay */}
      {(isMerging || isSplitting) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
            <span className="text-sm font-semibold text-white">
              {isMerging ? 'Merging university statistics...' : 'Splitting university alias...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
