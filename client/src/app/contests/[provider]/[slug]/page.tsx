import { getContestStandings } from '../../../../../actions/contest';
import { ContestProvider } from '../../../../../lib/data-sources/unified';
import StandingsClient from './StandingsClient';

export default async function StandingsPage({ params }: { params: { provider: string, slug: string } }) {
  const data = await getContestStandings(params.provider as ContestProvider, params.slug);

  if (!data) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold">Contest or Standings not found.</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <div className="mb-8 border-b pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 uppercase tracking-wider">
            {data.contest.provider}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.contest.title}</h1>
        <p className="text-gray-600">
          Started at {new Date(data.contest.startsAt).toLocaleString()} · Duration: {data.contest.durationMinutes} mins
        </p>
      </div>

      <StandingsClient data={data} />
    </div>
  );
}
