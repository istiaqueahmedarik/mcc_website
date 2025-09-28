import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { get_with_token } from '@/lib/action'
import VJudgeVerifyClient from './vjudge-client'

export default async function Page(){
  const cookieStore = await cookies()
  if(!cookieStore.get('token')) redirect('/login')
  const user = await get_with_token('auth/user/profile')
  if(user?.result?.length === 0) redirect('/login')
  if(user?.result?.[0]?.admin === false) redirect('/')
  return <VJudgeVerifyClient />
}
