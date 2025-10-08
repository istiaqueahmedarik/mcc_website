import React from "react";
import AlumniClient from "./AlumniClient";

export const metadata = { title: "Alumni | MIST Computer Club" };

async function fetchAlumni() {
  const base = process.env.NEXT_PUBLIC_SERVER_URL;
  try {
    const res = await fetch(base + "/alumni/public", { cache: "no-store" });
    if (!res.ok) return { batches: [], error: "Bad response" };
    return await res.json();
  } catch (e) {
    return { batches: [], error: "Network error" };
  }
}

export default async function AlumniPage() {
  const { batches, error } = await fetchAlumni();
  console.log(batches, error);
  return <AlumniClient initialBatches={batches || []} loadError={error} />;
}
