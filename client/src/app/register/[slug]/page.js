import RegistrationClient from "./RegistrationClient";

export const metadata = {
  title: "Registration | MCC",
  description: "Review your MCC profile and submit a campaign registration.",
};

export default async function Page({ params }) {
  const { slug } = await params;
  return <RegistrationClient slug={slug} />;
}
