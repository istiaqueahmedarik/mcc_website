import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2, FileText, Scale } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getContestRoomContestById, insertContestRoomContest, deleteContestRoomContest, updateContestRoomContestWithWeight } from "@/actions/contest_details"
import { redirect } from "next/navigation"
import { revalidateTag } from "next/cache"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

async function handleAddContest(formData, paramsBox) {
    "use server"
    const contestId = formData.get("room-name")
    const roomId = paramsBox

    const res = await insertContestRoomContest(roomId, contestId)
    if (res && (res.status === "success" || res.success)) {
        redirect(`/contests_report/details/${roomId}`)
    } else {
        const msg = encodeURIComponent(res?.message || res?.error || "Failed to create room")
        redirect(`/error/${msg}`)
    }
}

async function handleDeleteContest(formData, paramsBox) {
    "use server"
    const contestRoomContestId = formData.get("contestRoomContestId")
    const roomId = paramsBox
    const res = await deleteContestRoomContest(contestRoomContestId)
    if (res && (res.status === "success" || res.success)) {
        revalidateTag(`/contests_report/details/${roomId}`)
    } else {
        const msg = encodeURIComponent(res?.message || res?.error || "Failed to delete contest")
        redirect(`/error/${msg}`)
    }
}

// Add a handler for weight update
async function handleUpdateWeight(formData, paramsBox) {
    "use server"
    const contestRoomContestId = formData.get("contestRoomContestId")
    const roomId = formData.get("roomId")
    const contestId = formData.get("contestId")
    const weight = Number(formData.get("weight"))
    const res = await updateContestRoomContestWithWeight(contestRoomContestId, roomId, contestId, weight)
    if (res && (res.status === "success" || res.success)) {
        redirect(`/contests_report/details/${roomId}`)
    } else {
        const msg = encodeURIComponent(res?.message || res?.error || "Failed to update weight")
        redirect(`/error/${msg}`)
    }
}

async function page({ params, searchParams }) {
    const paramsBox = await params
    const id = paramsBox.id
    const searchParamsBox = await searchParams
    const show = searchParamsBox?.show
    console.log(show)
    if (show) return <Modal paramsBox={id} />
    const res = await getContestRoomContestById(id)
    console.log(res)
    /**
       * {
    result: [
      {
        id: '7714cda7-16c9-442e-937b-76d3d6f6487f',
        created_at: '2025-04-15T18:48:32.673Z',
        room_id: '8e6cfd2b-a74b-4df0-b200-408df3cb19b2',
        contest_id: '709641'
      },
      {
        id: 'bd041ae5-21d4-4714-9469-fb56ae6a6dc4',
        created_at: '2025-04-15T18:50:08.723Z',
        room_id: '8e6cfd2b-a74b-4df0-b200-408df3cb19b2',
        contest_id: '709642'
      }
    ],
    success: true
  }
       */
    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Your Room</h1>
                        <p className="text-muted-foreground mt-1">Add and find report on contests</p>
                    </div>
                    <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-6">
                        <Link href={`/contests_report/details/${paramsBox.id}?show=true`} className="flex items-center">
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Add More Contest
                        </Link>
                    </Button>
                </div>
            </header>
            <div className="mb-6 flex items-center justify-between">
                <Button variant="secondary" size="sm" className="rounded-lg w-full">
                    <Link href={`/contests_report/details/${paramsBox.id}/generate_report`} className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                        Generate Full Report
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {res.result && res.result.length > 0 ? (
                    res.result.map((contest, idx) => (
                        <Card key={idx} className="overflow-hidden border-0 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 bg-card">
                            <div className="relative h-16 bg-foreground/10 rounded-t-3xl px-6 flex items-center">
                                <Badge
                                    variant="secondary"
                                    className="absolute -bottom-3 left-6 py-1 px-4 rounded-full text-xs font-bold bg-card dark:bg-card shadow-sm"
                                >
                                    Contest #{contest.contest_id}
                                </Badge>
                            </div>

                            <CardContent className="pt-8 pb-4 px-6">
                                <div className="space-y-4 mt-2">
                                    <div className="grid grid-cols-[1fr,auto] gap-y-3 text-sm">
                                        <span className="font-medium text-muted-foreground">ID</span>
                                        <span className="font-mono text-right">{contest.id.substring(0, 8)}...</span>

                                        <span className="font-medium text-muted-foreground">Created</span>
                                        <span className="text-right">
                                            {new Date(contest.created_at).toLocaleDateString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>

                                        <span className="font-medium text-muted-foreground">Room ID</span>
                                        <span className="font-mono text-right">{contest.room_id.substring(0, 8)}...</span>
                                    </div>
                                </div>
                            </CardContent>

                            <Separator className="mx-6 bg-border dark:bg-border" />

                            <CardFooter className="flex flex-col gap-4 pt-4 pb-6 px-6">
                                {/* Action buttons with improved styling */}
                                <div className="flex w-full gap-3">
                                    <form
                                        action={async (formData) => {
                                            "use server"
                                            await handleDeleteContest(formData, paramsBox.id)
                                        }}
                                        className="w-1/2"
                                    >
                                        <input type="hidden" name="contestRoomContestId" value={contest.id} />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive dark:hover:bg-destructive/20 bg-card"
                                            type="submit"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </Button>
                                    </form>

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="rounded-full w-1/2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border-0 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/70"
                                    >
                                        <Link
                                            href={`/contests_report/details/${paramsBox.id}/generate_report?id=${contest.contest_id}`}
                                            className="flex items-center w-full justify-center"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Generate Report
                                        </Link>
                                    </Button>
                                </div>

                                <form
                                    action={async (formData) => {
                                        "use server"
                                        await handleUpdateWeight(formData, paramsBox.id)
                                    }}
                                    className="flex items-center gap-3 w-full"
                                >
                                    <input type="hidden" name="contestRoomContestId" value={contest.id} />
                                    <input type="hidden" name="roomId" value={contest.room_id} />
                                    <input type="hidden" name="contestId" value={contest.contest_id} />

                                    <div className="relative flex-1">
                                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            type="number"
                                            name="weight"
                                            min="1"
                                            step="1"
                                            placeholder="Weight"
                                            defaultValue={contest.weight}
                                            className="pl-10 h-9 rounded-full border-slate-200 dark:border-slate-800"
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                                    >
                                        Update
                                    </Button>
                                </form>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-foreground mb-2">No contests found</h3>
                            <p className="text-muted-foreground mb-4">Add your first contest to get started</p>
                            <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-6">
                                <Link href={`/contests_report/details/${paramsBox.id}?show=true`} className="flex items-center">
                                    <PlusCircle className="w-5 h-5 mr-2" />
                                    Add Contest
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default page

async function Modal({ paramsBox }) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            <div className="flex w-full flex-1 flex-col items-center justify-center p-8 md:w-1/2">
                <form
                    action={async (formData) => {
                        "use server"
                        await handleAddContest(formData, paramsBox)
                    }}
                    className="mx-auto w-full max-w-md space-y-6"
                >
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Add New Contest</h1>
                        <p className="text-muted-foreground">
                            Enter Contest id like (<code>1235</code>) to get started.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="room-name"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Contest Id
                            </label>
                            <Input id="room-name" name="room-name" placeholder="Enter Contest Id..." className="w-full" required />
                        </div>
                        <button
                            type="submit"
                            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80"
                        >
                            Add Contest
                        </button>
                    </div>
                </form>
            </div>
            <div className="relative hidden w-full md:block md:w-1/2">
                <div className="absolute inset-0">
                    <Image src="/vjudge_cover4.png" alt="Room creation illustration" fill priority className="object-cover" />
                </div>
            </div>
        </div>
    )
}
