import { getAllContestRooms, revalidateVJudgeSession } from "@/actions/contest_details"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Calendar, Users, Clock, ChevronRight, DoorOpenIcon, RefreshCcwDotIcon } from "lucide-react"
import { cookies } from "next/headers"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"


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


export default async function ContestRoomsPage() {
    // await revalidateVJudgeSession();

    const res = await getAllContestRooms()
    if (res.error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Card className="max-w-md w-full rounded-3xl overflow-hidden shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center text-destructive">Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground">Failed to load contest rooms. Please try again later.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const contestRooms = res.result || []

    return (
        <div className="min-h-screen bg-background">
            <div className="flex justify-end p-4">
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
            <div className="container mx-auto py-8 px-4">
                <header className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Contest Rooms</h1>
                            <p className="text-muted-foreground mt-1">Manage and create contest rooms for your competitions</p>
                        </div>
                        <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-6">
                            <Link href="/contests_report/details/add_new_room" className="flex items-center">
                                <PlusCircle className="w-5 h-5 mr-2" />
                                Create New Room
                            </Link>
                        </Button>
                    </div>
                </header>

                {contestRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-card rounded-3xl shadow-sm border border-border">
                        <div className="text-center max-w-md">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                <Calendar className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">No Contest Rooms Yet</h2>
                            <p className="text-muted-foreground mb-6">
                                Create your first contest room to start organizing competitions and tracking results.
                            </p>
                            <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-6">
                                <Link href="/contests_report/details/add_new_room" className="flex items-center">
                                    <PlusCircle className="w-5 h-5 mr-2" />
                                    Create Your First Room
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contestRooms.map((room) => (
                            <Link key={room.id} href={`/contests_report/details/${room.id}`} className="block group">
                                <Card className="h-full rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-lg group-hover:border-primary/50">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                                                <Users className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle
                                                    className="text-xl font-semibold text-foreground truncate"
                                                    title={room["Room Name"]}
                                                >
                                                    {room["Room Name"]}
                                                </CardTitle>
                                                <CardDescription className="flex items-center mt-1 truncate">
                                                    <Clock className="w-4 h-4 mr-1" />
                                                    <span>Created {formatDistanceToNow(new Date(room.created_at), { addSuffix: true })}</span>
                                                </CardDescription>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <div className="ml-16 text-muted-foreground">
                                            <span>Manage participants and contests</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t border-border pt-4">
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-full group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20"
                                        >
                                            View Details
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
