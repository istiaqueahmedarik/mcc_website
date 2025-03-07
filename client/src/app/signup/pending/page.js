import { ShieldQuestion } from 'lucide-react'
import {Link} from 'next-view-transitions'
import React from 'react'

const Page = () => {
  return (
    <div className='min-h-screen w-full flex justify-center p-12'>
        <div className='flex flex-col gap-4'>
            <div className='w-full flex justify-center'><ShieldQuestion size={40} /></div>
            <h1 className='text-2xl font-bold text-center'>Your account is pending</h1>
            <p className='text-sm text-muted-foreground text-center'>We are reviewing your account. You will receive an email once your account is approved. Go to <Link href='/' className='text-primary'>Home</Link>.</p>
        </div>
    </div>
  )
}

export default Page