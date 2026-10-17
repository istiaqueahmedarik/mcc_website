import { getPublicAlumni } from "@/lib/action";
import { cookies } from "next/headers";
import AlumniClient from "./AlumniClient";

export const metadata = { title: "Alumni | MIST Computer Club" };

export const dynamic = 'force-dynamic'

export default async function AlumniPage() {
  const [alumni, cookieStore] = await Promise.all([getPublicAlumni(), cookies()]);
  const isAdmin = cookieStore.get("admin")?.value === "true";
  return <AlumniClient initialBatches={alumni.batches || []} loadError={alumni.error} isAdmin={isAdmin} />;
}
