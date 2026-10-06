import { getServerJsonWithToken } from "@/lib/server-api";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TrainerProfileClient from "./TrainerProfileClient";

export const metadata = {
  title: "Trainer Profile | MCC",
  description: "Manage your trainer profile — bio, experience, specializations, and social links.",
};

export default async function TrainerProfilePage() {
  noStore();

  const cookieStore = await cookies();
  if (!cookieStore.get("token")) redirect("/login");

  const res = await getServerJsonWithToken("auth/user/profile");
  if (!res || res.error || !Array.isArray(res.result) || res.result.length === 0) {
    redirect("/login");
  }
  const user = res.result[0];

  // Only trainers and admins may access this page
  if (!user.trainer && !user.admin) redirect("/profile");

  return <TrainerProfileClient user={user} />;
}
