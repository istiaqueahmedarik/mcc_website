import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cookies } from 'next/headers'
import Link from 'next/link'
import React from 'react'
import { redirect } from 'next/navigation'
import { DoorOpenIcon } from 'lucide-react'

async function handleLogout() {
    'use server'
    const cookieStore = await cookies()
    cookieStore.delete('vj_session')
    redirect('/contests_report')
}

async function layout({ children }) {
    const cookieStore = await cookies()
    const vjudgeCookie = cookieStore.get("vj_session")

    if (!vjudgeCookie) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Card className="max-w-md w-full rounded-3xl overflow-hidden shadow-lg">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center text-destructive">Authentication Required</CardTitle>
                        <CardDescription className="text-center">You need to be logged in to access contest rooms.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <p className="text-muted-foreground mb-4">Please login to Vjudge first to view and manage contest rooms.</p>
                        <Button asChild className="rounded-full px-6">
                            <Link href="/contests_report">Go to Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }
    return (
        <div>
            <form action={handleLogout} className="flex justify-end p-4">
                <Button type="submit" variant="outline" size="sm">
                    <DoorOpenIcon className="w-2 h-2 text-destructive"/>
                </Button>
            </form>
            {children}
        </div>
    )
}

export default layout