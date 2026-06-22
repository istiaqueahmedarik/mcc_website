import ContestList from "@/components/contest-list"
import CustomContestDisplay from "@/components/custom-contest-display"
import IUPCSection from "@/components/iupc-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default async function Page({ searchParams }) {
    const resolvedParams = await searchParams
    const activeTab = resolvedParams?.tab || "mcc"

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-900">
            <div className="container mx-auto px-4 py-8 space-y-10">
                <Tabs value={activeTab} className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-full max-w-lg grid-cols-3 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                            <TabsTrigger
                                value="mcc"
                                asChild
                                className="rounded-lg px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
                            >
                                <Link href="?tab=mcc" scroll={false}>MCC</Link>
                            </TabsTrigger>
                            <TabsTrigger
                                value="general"
                                asChild
                                className="rounded-lg px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
                            >
                                <Link href="?tab=general" scroll={false}>General</Link>
                            </TabsTrigger>
                            <TabsTrigger
                                value="iupc"
                                asChild
                                className="rounded-lg px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
                            >
                                <Link href="?tab=iupc" scroll={false}>IUPC/ICPC</Link>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="iupc" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
                        <IUPCSection />
                    </TabsContent>

                    <TabsContent value="general" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
                        <ContestList />
                    </TabsContent>

                    <TabsContent value="mcc" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
                        <CustomContestDisplay />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

