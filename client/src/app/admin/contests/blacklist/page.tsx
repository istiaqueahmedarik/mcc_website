import { getTeamBlacklist, getRawTeams } from '@/actions/contest';
import BlacklistManagerClient from './BlacklistManagerClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Team Blacklist Manager',
  description: 'Manage blacklisted/extra participant teams to exclude them from standings',
};

export default async function BlacklistPage() {
  const [initialBlacklist, rawTeams] = await Promise.all([
    getTeamBlacklist(),
    getRawTeams()
  ]);

  return <BlacklistManagerClient initialBlacklist={initialBlacklist} rawTeams={rawTeams} />;
}
