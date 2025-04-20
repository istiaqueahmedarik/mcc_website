import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cookies } from 'next/headers'
import Link from 'next/link'
import React from 'react'
import { redirect } from 'next/navigation'
import { DoorOpenIcon, RefreshCcwDotIcon } from 'lucide-react'
import { revalidateVJudgeSession } from '@/actions/contest_details'

async function handleLogout() {
    'use server'
    const cookieStore = await cookies()
    cookieStore.delete('vj_session')
    cookieStore.delete('vj_username')
    cookieStore.delete('vj_password')
    redirect('/contests_report')
}

async function handleRevalidate() {
    'use server'
    await revalidateVJudgeSession()
}



async function layout({ children }) {
   
    return (
        <div className=''>
           <div className='flex justify-end p-4'>
                <form action={handleLogout} className="flex justify-end p-4">
                    <Button type="submit" variant="outline" size="sm">
                        <DoorOpenIcon className="w-2 h-2 text-destructive" />
                    </Button>
                </form>
                <form action={handleRevalidate} className="flex justify-end p-4">
                    <Button type="submit" variant="outline" size="sm">
                        <RefreshCcwDotIcon className="w-2 h-2" />
                    </Button>
                </form>
           </div>
            {children}
        </div>
    )
}

export default layout