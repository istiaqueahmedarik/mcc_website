import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { get_with_token } from "@/lib/action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import React from "react";

async function layout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");
  const vjudgeCookie = cookieStore.get("vj_session");

  if (!token) {
    redirect("/login");
  }

  const userRes = await get_with_token("auth/user/profile");
  const me = Array.isArray(userRes?.result) ? userRes.result[0] : null;
  if (!me) {
    redirect("/login");
  }
  if (!me?.admin) {
    redirect("/");
  }

  if (!vjudgeCookie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md w-full rounded-3xl overflow-hidden shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-destructive">
              Authentication Required
            </CardTitle>
            <CardDescription className="text-center">
              You need to be logged in to access contest rooms.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <p className="text-muted-foreground mb-4">
              Please login to Vjudge first to view and manage contest rooms.
            </p>
            <Button asChild className="rounded-full px-6">
              <Link href="/contests_report">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <div className="">{children}</div>;
}

export default layout;
