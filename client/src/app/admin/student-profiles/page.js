import { get_with_token } from "@/lib/action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StudentProfileReadinessClient from "./StudentProfileReadinessClient";

export const metadata = {
  title: "Student Profile Readiness | MCC Admin",
};

const VALID_STATUSES = new Set(["all", "complete", "incomplete"]);

function toBatch(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 99 ? parsed : fallback;
}

export default async function StudentProfilesPage({ searchParams }) {
  const cookieStore = await cookies();
  if (!cookieStore.get("token")?.value) redirect("/login");

  const user = await get_with_token("auth/user/profile");
  if (!user?.result?.[0]) redirect("/login");
  if (!user.result[0].admin) redirect("/");

  const resolvedSearchParams = await searchParams;
  const requestedFrom = toBatch(resolvedSearchParams?.from, 22);
  const requestedTo = toBatch(resolvedSearchParams?.to, 26);
  const status = VALID_STATUSES.has(resolvedSearchParams?.status)
    ? resolvedSearchParams.status
    : "complete";

  return (
    <StudentProfileReadinessClient
      initialFrom={Math.min(requestedFrom, requestedTo)}
      initialTo={Math.max(requestedFrom, requestedTo)}
      initialStatus={status}
    />
  );
}
