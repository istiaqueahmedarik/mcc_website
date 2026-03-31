import { get_with_token } from "@/lib/action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ICPCAdminClient from "./ICPCAdminClient";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  const user = await get_with_token("auth/user/profile");
  if (user?.result?.length === 0) redirect("/login");
  if (user?.result?.[0]?.admin === false) redirect("/");

  return <ICPCAdminClient token={token} />;
}
