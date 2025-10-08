import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get_with_token } from "@/lib/action";
import { getAllCustomContests } from "@/lib/action";
import CustomContestManager from "@/components/CustomContestManager";

export default async function Page() {
  if (!(await cookies()).get("token")) redirect("/login");
  const user = await get_with_token("auth/user/profile");
  if (user?.result.length === 0) redirect("/login");
  if (user?.result[0].admin === false) redirect("/");
  const contests = await getAllCustomContests();
  return (
    <div className="min-h-screen w-full py-12 px-4 flex justify-center bg-background">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Manage Custom Contests</h1>
        <CustomContestManager initialContests={contests} />
      </div>
    </div>
  );
}
