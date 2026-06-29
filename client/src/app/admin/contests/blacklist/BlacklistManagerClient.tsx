'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addTeamToBlacklist, removeTeamFromBlacklist } from '@/actions/contest';
import { ArrowLeft, UserX, UserPlus, Trash2, Search, AlertTriangle, Info, CheckCircle, Plus } from 'lucide-react';

interface Props {
  initialBlacklist: string[];
  rawTeams: string[];
}

export default function BlacklistManagerClient({ initialBlacklist, rawTeams }: Props) {
  const [blacklist, setBlacklist] = useState<string[]>(initialBlacklist);
  const [newTeam, setNewTeam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableSearchTerm, setAvailableSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Blacklist set for fast lookup
  const blacklistLowerSet = new Set(blacklist.map(t => t.toLowerCase().trim()));

  // Filter available teams from saved contests that are not blacklisted
  const availableTeams = rawTeams
    .filter(team => !blacklistLowerSet.has(team.toLowerCase().trim()))
    .filter(team => team.toLowerCase().includes(availableSearchTerm.toLowerCase()));

  const handleAdd = async (team: string) => {
    const trimmedTeam = team.trim();
    if (!trimmedTeam) return;

    setLoading(true);
    setMessage(null);

    const res = await addTeamToBlacklist(trimmedTeam);
    setLoading(false);

    if (res.success) {
      setBlacklist(prev => [...prev, trimmedTeam].sort((a, b) => a.localeCompare(b)));
      setNewTeam('');
      setMessage({ type: 'success', text: `Successfully blacklisted team "${trimmedTeam}"` });
    } else {
      setMessage({ type: 'error', text: res.message });
    }
  };

  const handleRemove = async (team: string) => {
    if (!confirm(`Are you sure you want to remove "${team}" from the blacklist?`)) return;

    setLoading(true);
    setMessage(null);

    const res = await removeTeamFromBlacklist(team);
    setLoading(false);

    if (res.success) {
      setBlacklist(prev => prev.filter(t => t !== team));
      setMessage({ type: 'success', text: `Successfully removed "${team}" from blacklist` });
    } else {
      setMessage({ type: 'error', text: res.message });
    }
  };

  const filteredBlacklist = blacklist.filter(team =>
    team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased py-10">
      <div className="container mx-auto px-4 max-w-[1100px]">
        {/* Navigation / Header */}
        <div className="mb-10">
          <Link
            href="/admin/contests"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white font-semibold transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Contests Manager
          </Link>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <UserX className="h-8 w-8 text-rose-500" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Team Blacklist Manager</h1>
              <p className="text-slate-400 text-sm mt-1">
                Exclude extra participants, test teams, or unregistered guest teams from standings and leaderboards.
              </p>
            </div>
          </div>
        </div>


        {/* Global Notifications */}
        {message && (
          <div
            className={`mb-8 flex gap-3 p-4 rounded-2xl border text-sm items-center transition-all ${
              message.type === 'success'
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Team Panel (Left / Middle depending on screens) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Quick Add from Saved Contests */}
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex flex-col h-[520px]">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-500" />
                  Teams from Saved Contests
                </h2>
                
                {/* Search Available */}
                <div className="relative w-full sm:max-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={availableSearchTerm}
                    onChange={e => setAvailableSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-850 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Scrollable list of available teams */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 mb-4 border border-slate-850/60 rounded-2xl bg-slate-950/30 p-2">
                {availableTeams.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 text-xs font-medium">
                    No teams available to blacklist
                  </div>
                ) : (
                  availableTeams.map((team, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900 hover:border-slate-800 hover:bg-slate-950 transition-all group"
                    >
                      <span className="font-semibold text-xs text-slate-300 truncate pr-4">
                        {team}
                      </span>
                      <button
                        onClick={() => handleAdd(team)}
                        disabled={loading}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/10 text-[10px] font-bold transition-all shrink-0 uppercase tracking-wider"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Blacklist</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Manual Input Form */}
              <div className="border-t border-slate-850/85 pt-4">
                <p className="text-xs text-slate-400 font-semibold mb-3">Or manually add a custom team name:</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdd(newTeam);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Enter custom team name..."
                    value={newTeam}
                    onChange={e => setNewTeam(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-xs font-medium"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newTeam.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-200 disabled:text-slate-500 font-bold text-xs border border-slate-700/60 transition-all shrink-0"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Blacklisted List Panel (Right) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex flex-col h-[520px]">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-lg font-bold text-white shrink-0">
                  Blacklisted Teams ({blacklist.length})
                </h2>

                {/* Search */}
                <div className="relative w-full sm:max-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search blacklist..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-850 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Blacklist List */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 border border-slate-850/60 rounded-2xl bg-slate-950/30 p-2">
                {filteredBlacklist.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 text-xs font-medium">
                    {searchTerm ? 'No matching teams found' : 'No teams blacklisted yet'}
                  </div>
                ) : (
                  filteredBlacklist.map((team, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-955/65 border border-slate-850 hover:border-slate-800 hover:bg-slate-950 transition-all group"
                    >
                      <span className="font-semibold text-xs text-slate-200 truncate pr-4">
                        {team}
                      </span>
                      <button
                        onClick={() => handleRemove(team)}
                        disabled={loading}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-400 hover:text-rose-500 transition-all shrink-0"
                        title="Remove from blacklist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
