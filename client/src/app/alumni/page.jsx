import { getPublicAlumni } from "@/lib/action";
import AlumniClient from "./AlumniClient";

export const metadata = { title: "Alumni | MIST Computer Club" };

export const dynamic = 'force-dynamic'

export default async function AlumniPage() {
  const { batches, error } = await getPublicAlumni();
  return <AlumniClient initialBatches={batches || []} loadError={error} />;
}
