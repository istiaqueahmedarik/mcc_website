import { get_with_token } from "@/lib/action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TrainerFormDetailClient from "./TrainerFormDetailClient";

export default async function Page({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  const user = await get_with_token("auth/user/profile");
  const profile = user?.result?.[0];
  if (!profile) redirect("/login");
  if (!profile.trainer && !profile.admin) redirect("/");

  return <TrainerFormDetailClient formId={id} />;
}
