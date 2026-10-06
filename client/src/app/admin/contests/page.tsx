import { getAllContests, getContestsListStatus } from '@/actions/contest';
import Link from 'next/link';
import { GitMerge, UserX } from 'lucide-react';
import ContestsClient from './ContestsClient';

export const dynamic = 'force-dynamic';

export default async function ContestsPage() {
  const [contests, listStatus] = await Promise.all([
    getAllContests(),
    getContestsListStatus()
  ]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased py-10">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 border-b border-slate-800/60 pb-8 gap-4">
          <h1 className="text-4xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            Programming Contests Manager
          </h1>
          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            <Link
              href="/admin/contests/blacklist"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm border border-slate-800 shadow-lg shadow-slate-950/10 transition-all shrink-0"
            >
              <UserX className="h-4 w-4 text-rose-500" />
              <span>Team Blacklist</span>
            </Link>
            <Link
              href="/admin/contests/combined/aliases"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm border border-slate-800 shadow-lg shadow-slate-950/10 transition-all shrink-0"
            >
              <GitMerge className="h-4 w-4 text-blue-500" />
              <span>Manage Aliases</span>
            </Link>
            <Link
              href="/admin/contests/combined"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all"
            >
              <span>Combined Leaderboard</span>
            </Link>
          </div>
        </div>

        <ContestsClient initialContests={contests} listStatus={listStatus} />
      </div>
    </div>
  );
}
