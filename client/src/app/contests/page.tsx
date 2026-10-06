import { getPublishedContests } from '@/actions/contest';
import PublicContestsClient from './PublicContestsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Programming Contests | MIST Computer Club',
  description: 'View the list of programming contests and overall standings.',
};

export default async function PublicContestsPage() {
  const contests = await getPublishedContests();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 antialiased py-10 transition-colors duration-300">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <PublicContestsClient contests={contests} />
      </div>
    </div>
  );
}
