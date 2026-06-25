'use client';

import { useState, useMemo } from 'react';
import { UnifiedStandingsResponse, UnifiedStandingsRow } from '../../../../../lib/data-sources/unified';
import { Search, Download, Users } from 'lucide-react';

export default function StandingsClient({ data }: { data: UnifiedStandingsResponse }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'standard' | 'combined'>('standard');

  const filteredStandings = useMemo(() => {
    return data.standings.filter(row => 
      row.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      row.institution.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data.standings, searchTerm]);

  const combinedUniversities = useMemo(() => {
    const uniMap = new Map<string, { institution: string, score: number, penalty: number, teams: number }>();
    
    data.standings.forEach(row => {
      const inst = row.institution || 'Unknown';
      if (!uniMap.has(inst)) {
        uniMap.set(inst, { institution: inst, score: 0, penalty: 0, teams: 0 });
      }
      const u = uniMap.get(inst)!;
      u.score += row.score;
      u.penalty += row.penalty;
      u.teams += 1;
    });

    const arr = Array.from(uniMap.values());
    arr.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.penalty - b.penalty;
    });
    return arr;
  }, [data.standings]);

  const downloadCSV = () => {
    let csv = '';
    
    if (viewMode === 'standard') {
      const headers = ['Rank', 'Team', 'Institution', 'Score', 'Penalty'];
      data.problems.forEach(p => headers.push(p.label));
      csv += headers.join(',') + '\n';

      filteredStandings.forEach(row => {
        const rowData = [
          row.displayRank,
          `"${row.teamName.replace(/"/g, '""')}"`,
          `"${row.institution.replace(/"/g, '""')}"`,
          row.score,
          row.penalty
        ];
        data.problems.forEach(p => {
          const stat = row.problems.find(pr => pr.label === p.label);
          if (!stat) rowData.push('');
          else if (stat.solved) rowData.push(`1 (${stat.tries})`);
          else if (stat.tries > 0) rowData.push(`0 (${stat.tries})`);
          else rowData.push('');
        });
        csv += rowData.join(',') + '\n';
      });
    } else {
      const headers = ['Rank', 'Institution', 'Total Score', 'Total Penalty', 'Teams Count'];
      csv += headers.join(',') + '\n';
      combinedUniversities.forEach((u, i) => {
        if (!u.institution.toLowerCase().includes(searchTerm.toLowerCase())) return;
        csv += [
          i + 1,
          `"${u.institution.replace(/"/g, '""')}"`,
          u.score,
          u.penalty,
          u.teams
        ].join(',') + '\n';
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${data.contest.title}_standings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('standard')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'standard' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Standard Standings
          </button>
          <button
            onClick={() => setViewMode('combined')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'combined' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Combined University Rank
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter by team or uni..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {viewMode === 'standard' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-gray-900">Rank</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Team</th>
                <th className="px-4 py-3 font-semibold text-gray-900 text-center">Score</th>
                <th className="px-4 py-3 font-semibold text-gray-900 text-center">Penalty</th>
                {data.problems.map(p => (
                  <th key={p.label} className="px-3 py-3 font-semibold text-gray-900 text-center min-w-[60px]" title={p.title}>
                    <div className="flex flex-col items-center">
                      <span>{p.label}</span>
                      <span className="text-[10px] text-gray-500 font-normal mt-1">{p.solvedBy}/{p.attemptedBy}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStandings.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.displayRank}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-blue-600">{row.teamName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{row.institution || 'Unknown'}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">{row.score}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">{row.penalty}</td>
                  {data.problems.map(p => {
                    const stat = row.problems.find(pr => pr.label === p.label);
                    return (
                      <td key={p.label} className="px-3 py-3 text-center">
                        {!stat ? (
                          <span className="text-gray-300">-</span>
                        ) : stat.solved ? (
                          <div className="bg-green-100 text-green-800 rounded px-2 py-1 text-sm font-semibold inline-block">
                            {stat.tries}
                            {stat.penalty > 0 && <span className="text-[10px] block font-normal">{stat.penalty}</span>}
                          </div>
                        ) : stat.tries > 0 ? (
                          <div className="bg-red-100 text-red-800 rounded px-2 py-1 text-sm font-semibold inline-block">
                            -{stat.tries}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredStandings.length === 0 && (
                <tr>
                  <td colSpan={4 + data.problems.length} className="px-4 py-8 text-center text-gray-500">
                    No teams found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 font-semibold text-gray-900">Rank</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Institution</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-center">Total Score</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-center">Total Penalty</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-center">Teams Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {combinedUniversities
                .filter(u => u.institution.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((u, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{idx + 1}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600">{u.institution}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-900">{u.score}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">{u.penalty}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600 flex justify-center">
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                      <Users className="h-4 w-4" />
                      <span>{u.teams}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
