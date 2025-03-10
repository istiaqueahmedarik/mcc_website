import AddMembers from '@/components/batches/addMembers'
import RemoveMembers from '@/components/batches/removeMembers'
import Loader from '@/components/Loader'
import { getBatch, getBatchNonUsers, getBatchUsers } from '@/lib/action'
import { Suspense } from 'react'
import PerformanceDashboard from '@/components/performance-dashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const Page = async ({ params, searchParams }) => {
  const offsetNonUsers = (await (await searchParams)).offsetNonUsers
    ? parseInt((await searchParams).offsetNonUsers)
    : 0
  const offsetUsers = (await searchParams).offsetUsers
    ? parseInt((await searchParams).offsetUsers)
    : 0
  const limit = 50
  const { batch_id } = await params
  const [batch, nonUsers, users] = await Promise.all([
    getBatch(batch_id),
    getBatchNonUsers(batch_id, offsetNonUsers, limit),
    getBatchUsers(batch_id, offsetUsers, limit),
  ])

  if (!Array.isArray(batch) || batch.length === 0) {
    return (
      <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
        Batch Not Found
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col p-4 gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{batch[0].name}</h1>
        <p className="text-sm text-muted-foreground">Created: {new Date(batch[0].created_at).toLocaleDateString()}</p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="members">Batch Members</TabsTrigger>
          <TabsTrigger value="performance">Performance Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="w-full flex md:flex-row flex-col gap-4">
            <Suspense fallback={<Loader />}>
              <div className="w-full md:w-1/2 p-4 border rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Batch Members</h2>
                <RemoveMembers
                         batch={batch[0]}
                         users={users}
                         offset={offsetNonUsers}
                         limit={limit}
                       />
              </div>
            </Suspense>

            <Suspense fallback={<Loader />}>
              <div className="w-full md:w-1/2 p-4 border rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Add Members</h2>
              <AddMembers
                       batch={batch[0]}
                       nonUsers={nonUsers}
                       offset={offsetNonUsers}
                       limit={limit}
                     />
              </div>
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Suspense fallback={<Loader />}>
            <PerformanceDashboard users={users} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Page
