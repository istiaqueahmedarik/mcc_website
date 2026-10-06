import React from "react";
import { getContestRoomContestById } from "@/actions/contest_details";

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
      </div>
      {children}
    </div>
  );
}

export default layout;
