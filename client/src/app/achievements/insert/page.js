import Insert from '@/components/achievements/Insert'
import { get_with_token } from '@/lib/action'
import { cookies } from 'next/headers'
import React from 'react'

const Page = async () => {
  if (!cookies().get('token')) {
    redirect('/login')
  }
  const user = await get_with_token('auth/user/profile')
  if (user?.result.length === 0) {
    redirect('/login')
  }
  console.log(user)
  if (user?.result[0].admin === false) {
    redirect('/')
  }
  return (
    <Insert />
  )
}

export default Page