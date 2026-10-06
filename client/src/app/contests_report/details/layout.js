import { get_with_token } from "@/lib/action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

async function layout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (!token) {
    redirect("/login");
  }

  const userRes = await get_with_token("auth/user/profile");
  const me = Array.isArray(userRes?.result) ? userRes.result[0] : null;
  if (!me) {
    redirect("/login");
  }
  if (!me?.admin) {
    redirect("/");
  }

  return <div className="">{children}</div>;
}

export default layout;
