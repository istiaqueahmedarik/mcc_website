import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cookies } from 'next/headers'
import Link from 'next/link'
import React from 'react'
import { redirect } from 'next/navigation'
import { DoorOpenIcon, RefreshCcwDotIcon } from 'lucide-react'
import { revalidateVJudgeSession } from '@/actions/contest_details'




async function layout({ children }) {
  
    return (
        <div className=''>
         
            {children}
        </div>
    )
}

export default layout