import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootLayout({ children, params }) {
  // Allow public profile route /profile/[vjudge] without login
  if (params && params.vjudge) {
    return <>{children}</>;
  }
  const cookieStore = await cookies();
  if (!cookieStore.get("token")) redirect("/login");

  return <>{children}</>;
}
