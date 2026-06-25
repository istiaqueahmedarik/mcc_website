import Link from 'next/link';
import { getAllContests } from '../../actions/contest';
import { Calendar, Clock, Trophy } from 'lucide-react';

export default async function ContestsPage() {
  const contests = await getAllContests();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Programming Contests
        </h1>
      </div>

      {contests.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
          No contests found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((contest) => (
            <Link 
              key={`${contest.provider}-${contest.id}`}
              href={`/contests/${contest.provider}/${contest.slug}`}
              className="block group"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg hover:border-blue-500 hover:-translate-y-1 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    contest.provider === 'baps' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {contest.provider.toUpperCase()} OJ
                  </span>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {contest.title}
                </h2>
                
                <div className="mt-auto space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(contest.startsAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{contest.durationMinutes} minutes</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
