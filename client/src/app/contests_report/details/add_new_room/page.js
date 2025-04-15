import { insertContestRoom } from "@/actions/contest_details"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { redirect } from "next/navigation"

export default function Page() {
    async function createRoomAction(formData) {
        "use server";
        const roomName = formData.get("room-name")?.toString() || "";
        const res = await insertContestRoom(roomName);
        if (res && (res.status === "success" || res.success)) {
            redirect("/contests_report/details");
        } else {
            const msg = encodeURIComponent(res?.message || res?.error || "Failed to create room");
            redirect(`/error/${msg}`);
        }
    }

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            <div className="flex w-full flex-1 flex-col items-center justify-center p-8 md:w-1/2">
                <form action={createRoomAction} className="mx-auto w-full max-w-md space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Create New Room</h1>
                        <p className="text-muted-foreground">Enter a name for your new room to get started.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="room-name"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Room Name
                            </label>
                            <Input id="room-name" name="room-name" placeholder="Enter room name..." className="w-full" required />
                        </div>
                        <button type="submit" className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80">
                            Create Room
                        </button>
                    </div>
                </form>
            </div>

            <div className="relative hidden w-full md:block md:w-1/2">
                <div className="absolute inset-0">
                    <Image
                        src="/vjudge_cover3.png"
                        alt="Room creation illustration"
                        fill
                        priority
                        className="object-cover"
                    />
                </div>
            </div>
        </div>
    )
}
