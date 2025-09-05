import Image from "next/image"
import { Eye } from "lucide-react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation";
import { loginToVJudge } from "@/actions/contest_details";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default async function LoginPage() {
    const cookieStore = await cookies();
    const vjudgeCookie = cookieStore.get("vj_session");
    if (vjudgeCookie)
        redirect("/contests_report/details");

    async function handleLogin(formData) {
        "use server";
        const username = formData.get("username");
        const password = formData.get("password");
        const session = await loginToVJudge(username, password);
        if (session) {
            redirect("/contests_report/details");
        }
    }

    async function handleSessionSave(formData) {
        "use server";
        const session = String(formData.get("session") || "").trim();
        if (!session) return;
        cookies().set('vj_session', session, { httpOnly: true, path: '/', sameSite: 'lax' });
        redirect("/contests_report/details");
    }

    return (
        <div className="flex min-h-screen w-full">
            <div className="flex w-full flex-col justify-center px-8 md:w-1/2 md:px-16 lg:px-24">
                <div className="mx-auto w-full max-w-md">
                    <h1 className="mb-2 text-4xl font-bold" style={{ color: "var(--foreground)" }}>
                        Login to VJudge
                    </h1>

                    <Tabs defaultValue="credentials" className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="credentials">Username/Password</TabsTrigger>
                            <TabsTrigger value="session">Session Token</TabsTrigger>
                        </TabsList>

                        <TabsContent value="credentials">
                            <form className="space-y-4" action={handleLogin}>
                                <div>
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder="VJudge Username"
                                        className="w-full rounded-full border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
                                        style={{
                                            background: "var(--background)",
                                            color: "var(--foreground)",
                                            borderColor: "var(--border)"
                                        }}
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Password"
                                        className="w-full rounded-full border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
                                        style={{
                                            background: "var(--background)",
                                            color: "var(--foreground)",
                                            borderColor: "var(--border)"
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full rounded-full bg-black py-3 font-medium text-white hover:bg-gray-800"
                                    style={{
                                        background: "var(--primary)",
                                        color: "var(--primary-foreground)"
                                    }}
                                >
                                    Login
                                </button>
                            </form>
                        </TabsContent>

                        <TabsContent value="session">
                            <form className="space-y-4" action={handleSessionSave}>
                                <div>
                                    <input
                                        type="text"
                                        name="session"
                                        placeholder="Paste VJudge JSESSIONID token"
                                        className="w-full rounded-full border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
                                        style={{
                                            background: "var(--background)",
                                            color: "var(--foreground)",
                                            borderColor: "var(--border)"
                                        }}
                                    />
                                </div>
                                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                    This will be saved as a secure cookie and used for VJudge requests.
                                </p>
                                <button
                                    type="submit"
                                    className="w-full rounded-full bg-black py-3 font-medium text-white hover:bg-gray-800"
                                    style={{
                                        background: "var(--primary)",
                                        color: "var(--primary-foreground)"
                                    }}
                                >
                                    Save Session Token
                                </button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <div className="hidden md:flex w-full bg-green-50 relative">
                <Image
                    src="/vjudge_cover.png"
                    alt="Meditation illustration"
                    fill
                    className="h-auto w-full object-cover object-center"
                    priority
                />
            </div>
        </div>
    )
}