import { getRawUniversities, getUniversityAliases } from '@/actions/contest';
import { ShieldAlert } from 'lucide-react';
import AliasesManagerClient from './AliasesManagerClient';

export const dynamic = 'force-dynamic';

export default async function UniversityAliasesPage() {
  const [rawUniversities, aliases] = await Promise.all([
    getRawUniversities(),
    getUniversityAliases()
  ]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased py-10">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-800/60 pb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
              University Alias Manager
            </h1>
            <p className="text-sm text-slate-400">
              Drag and drop duplicate university names onto canonical names to merge their stats across all standings.
            </p>
          </div>
        </div>

        <AliasesManagerClient rawUniversities={rawUniversities} initialAliases={aliases} />
      </div>
    </div>
  );
}
