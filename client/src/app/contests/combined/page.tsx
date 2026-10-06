import { getCombinedUniversityStandings } from '@/actions/contest';
import CombinedStandingsClient from './CombinedStandingsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Combined University Leaderboard | MIST Computer Club',
  description: 'Aggregated standings of all universities computed across all published contests.',
};

export default async function CombinedUniversityStandingsPage() {
  const data = await getCombinedUniversityStandings();

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased py-10">
      <div className="container mx-auto px-4 max-w-[1600px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-800/60 pb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-white flex items-center gap-3 tracking-tight mb-2">
              Combined University Leaderboard
            </h1>
            <p className="text-sm text-slate-400">
              Aggregated standings of all universities computed across all published contests.
            </p>
          </div>
        </div>

        <CombinedStandingsClient initialData={data} />
      </div>
    </div>
  );
}
