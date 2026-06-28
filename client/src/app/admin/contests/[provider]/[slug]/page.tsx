import { getContestStandings } from '@/actions/contest';
import { ContestProvider } from '@/lib/data-sources/unified';
import { redirect } from 'next/navigation';
import StandingsClient from './StandingsClient';

export default async function StandingsPage({ params }: { params: Promise<{ provider: string, slug: string }> }) {
  const resolvedParams = await params;
  const data = await getContestStandings(resolvedParams.provider as ContestProvider, resolvedParams.slug);

  if (data && data.contest.slug !== resolvedParams.slug) {
    redirect(`/admin/contests/${resolvedParams.provider}/${data.contest.slug}`);
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-2">Contest or Standings not found.</h1>
          <p className="text-slate-400">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  const durationHours = data.contest.durationMinutes / 60;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased py-10">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-800/60 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 uppercase tracking-wider">
                {data.contest.provider} OJ
              </span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">{data.contest.title}</h1>
            <p className="text-sm text-slate-400">
              Started: {new Date(data.contest.startsAt).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
              })}
            </p>
          </div>
        </div>

        <StandingsClient data={data} />
      </div>
    </div>
  );
}
