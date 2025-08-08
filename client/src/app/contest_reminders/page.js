import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import IUPCSection from "@/components/iupc-section"
import ContestList from "@/components/contest-list"
import CustomContestDisplay from "@/components/custom-contest-display"

export default function Page() {
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-900">
            <div className="container mx-auto px-4 py-8 space-y-10">
                <CustomContestDisplay />
                <Tabs defaultValue="iupc" className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-full max-w-md grid-cols-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                            <TabsTrigger
                                value="iupc"
                                className="rounded-lg px-8 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
                            >
                                IUPC
                            </TabsTrigger>
                            <TabsTrigger
                                value="general"
                                className="rounded-lg px-8 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
                            >
                                General
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="iupc" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
                        <IUPCSection />
                    </TabsContent>

                    <TabsContent value="general" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
                        <ContestList />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

