import Insert from '@/components/achievements/Insert'
import Loader from '@/components/Loader'
import { get_with_token } from '@/lib/action'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

const Page = async () => {
  if (!cookies().get('token')) {
    redirect('/login')
  }
  const user = await get_with_token('auth/user/profile')
  if (user?.result.length === 0) {
    redirect('/login')
  }
  if (user?.result[0].admin === false) {
    redirect('/')
  }
  return (
    <Suspense fallback={<Loader />}>
      <Insert />
    </Suspense>
  )
}

export default Page
