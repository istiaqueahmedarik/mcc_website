import { Button } from "@/components/ui/button";

import { cookies } from "next/headers";
import React from "react";
import { redirect } from "next/navigation";
import { DoorOpenIcon, RefreshCcwDotIcon } from "lucide-react";
import {
  getContestRoomContestById,
  revalidateVJudgeSession,
} from "@/actions/contest_details";

async function handleLogout() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete("vj_session");
  cookieStore.delete("vj_username");
  cookieStore.delete("vj_password");
  redirect("/contests_report");
}

async function handleRevalidate() {
  "use server";
  await revalidateVJudgeSession();
}

async function layout({ children, params }) {
  const roomId = (await params).id;
  const roomRes = await getContestRoomContestById(roomId);

  if (roomRes.error) return <></>;
  return (
    <div className="">
      <div className="flex m-auto p-4">
        <div className="m-auto w-full text-4xl font-bold text-center uppercase">
          {roomRes?.name}
        </div>
        <div className="flex justify-end">
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
      </div>
      {children}
    </div>
  );
}

export default layout;
