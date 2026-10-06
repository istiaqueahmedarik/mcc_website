import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DedicatedTopicsPage({ params }) {
  const { id } = await params;
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/login");

  redirect(`/classroom/live/${id}?tab=topics`);
}
