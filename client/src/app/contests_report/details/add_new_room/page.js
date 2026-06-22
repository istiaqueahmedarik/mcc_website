import { getAllContestRooms, insertContestRoom } from "@/actions/contest_details"
import CreateContestRoomForm from "@/components/CreateContestRoomForm"
import Image from "next/image"
import { redirect } from "next/navigation"

export default async function Page() {
    const roomsRes = await getAllContestRooms();
    const allRooms = Array.isArray(roomsRes?.result) ? roomsRes.result : [];
    const tfcRooms = allRooms.filter((room) => {
        const type = String(room?.contest_type || "TFC").toUpperCase();
        return type === "TFC";
    });

    async function createRoomAction(formData) {
        "use server";
        const roomName = formData.get("room-name")?.toString() || "";
        const contestType = (formData.get("contest-type")?.toString() || "TFC").toUpperCase();
        const tfcRoomIdRaw = formData.get("tfc-room-id")?.toString() || "";

        const res = await insertContestRoom(roomName, {
            contestType,
            tfcRoomId: contestType === "TSC" ? (tfcRoomIdRaw || null) : null,
        });
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
                <CreateContestRoomForm action={createRoomAction} tfcRooms={tfcRooms} />
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
