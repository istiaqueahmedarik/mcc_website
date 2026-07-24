import PublicTrainerFormClient from "./PublicTrainerFormClient";

export default async function Page({ params }) {
  const { slug } = await params;
  return <PublicTrainerFormClient slug={slug} />;
}
