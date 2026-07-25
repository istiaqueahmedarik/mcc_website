import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TeamMatrixClient from "./TeamMatrixClient";

export default async function TeamMatrixPage({ params }) {
  const { id, teamId } = await params;
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/login");

  return <TeamMatrixClient classroomId={id} teamId={teamId} />;
}
