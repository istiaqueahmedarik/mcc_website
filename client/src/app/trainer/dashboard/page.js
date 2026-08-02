import { getServerJsonWithToken } from '@/lib/server-api';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TrainerDashboardClient from './TrainerDashboardClient';

export const metadata = {
  title: 'Trainer Dashboard | MCC',
  description: 'Manage trainer classrooms, live sessions, forms, and classroom operations.',
};

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) redirect('/login');

  const user = await getServerJsonWithToken('auth/user/profile');
  const profile = user?.result?.[0];
  if (!profile) redirect('/login');

  // Only trainers and admins may access the trainer dashboard.
  if (!profile.trainer && !profile.admin) redirect('/');

  return <TrainerDashboardClient />;
}
