import { getServerJsonWithToken } from "@/lib/server-api";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminFormsClient from "./AdminFormsClient";

export const metadata = {
  title: "Global Forms | MCC",
  description: "Build registration templates, run campaigns, and review submissions.",
};

export default async function Page() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/login");
  const user = await getServerJsonWithToken("auth/user/profile");
  const profile = user?.result?.[0];
  if (!profile) redirect("/login");
  if (!profile.admin) redirect("/");
  return <AdminFormsClient />;
}
