import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClassroomListClient from './ClassroomListClient';

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) redirect('/login');

  return <ClassroomListClient />;
}
