"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export default function CreateContestRoomForm({ action, tfcRooms = [] }) {
  const [contestType, setContestType] = useState("TFC");
  const isTsc = contestType === "TSC";

  const hasTfcRooms = useMemo(() => Array.isArray(tfcRooms) && tfcRooms.length > 0, [tfcRooms]);

  return (
    <form action={action} className="mx-auto w-full max-w-md space-y-6">
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

        <div className="space-y-2">
          <label
            htmlFor="contest-type"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Contest Type
          </label>
          <select
            id="contest-type"
            name="contest-type"
            value={contestType}
            onChange={(event) => setContestType(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="TFC">TFC - Team Formation Contest</option>
            <option value="TSC">TSC - Team Selection Contest</option>
            <option value="TPC">TPC - Team Practice Contest</option>
          </select>
        </div>

        {isTsc && (
          <div className="rounded-md border border-border p-4 space-y-3">
            <p className="text-sm font-medium">TSC Settings</p>
            <p className="text-xs text-muted-foreground">
              Select the related TFC room. You will set TFC percentage during final report generation.
            </p>

            <div className="space-y-2">
              <label
                htmlFor="tfc-room-id"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Reference TFC Room
              </label>
              <select
                id="tfc-room-id"
                name="tfc-room-id"
                defaultValue=""
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No TFC Room</option>
                {tfcRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room["Room Name"]}
                  </option>
                ))}
              </select>
              {!hasTfcRooms && (
                <p className="text-xs text-amber-600">
                  No TFC rooms found yet. Create a TFC room first if you want to include TFC score in TSC report.
                </p>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80"
        >
          Create Room
        </button>
      </div>
    </form>
  );
}
