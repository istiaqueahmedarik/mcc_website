import { getContestStandings, getPublishedContests } from '@/actions/contest';
import { ContestProvider } from '@/lib/data-sources/unified';
import { redirect, notFound } from 'next/navigation';
import StandingsClient from './StandingsClient';

export const dynamic = 'force-dynamic';

export default async function PublicStandingsPage({ params }: { params: Promise<{ provider: string, slug: string }> }) {
  const resolvedParams = await params;
  const { provider, slug } = resolvedParams;

  // Verify if the contest is published
  const published = await getPublishedContests();
  const isPublished = published.some(
    (c) => c.provider === provider && c.slug === slug
  );

  if (!isPublished) {
    notFound();
  }

  const data = await getContestStandings(provider as ContestProvider, slug);

  if (data && data.contest.slug !== slug) {
    redirect(`/contests/${provider}/${data.contest.slug}`);
  }

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 antialiased py-10 transition-colors duration-300">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-200 dark:border-slate-800/60 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-200 text-slate-850 dark:bg-slate-800 dark:text-slate-300 uppercase tracking-wider">
                {data.contest.provider} OJ
              </span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight mb-2">{data.contest.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
