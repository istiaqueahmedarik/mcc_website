import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClassroomLiveClient from './ClassroomLiveClient';

export default async function Page({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) redirect('/login');

  return <ClassroomLiveClient classroomId={id} />;
}
