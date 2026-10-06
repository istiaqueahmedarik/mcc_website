import { getServerJsonWithToken } from "@/lib/server-api";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TrainerFormDetailClient from "./TrainerFormDetailClient";

export const metadata = {
  title: "Form Responses | MCC",
  description: "Review trainer form responses, analytics, and saved response JSON.",
};

export default async function Page({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  const user = await getServerJsonWithToken("auth/user/profile");
  const profile = user?.result?.[0];
  if (!profile) redirect("/login");
  if (!profile.trainer && !profile.admin) redirect("/");

  return <TrainerFormDetailClient formId={id} />;
}
