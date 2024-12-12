import AddMembers from '@/components/batches/addMembers'
import RemoveMembers from '@/components/batches/removeMembers'
import Loader from '@/components/Loader'
import { getBatch, getBatchNonUsers, getBatchUsers } from '@/lib/action'
import { Suspense } from 'react'

const Page = async ({ params, searchParams }) => {
  const offsetNonUsers = searchParams.offsetNonUsers
    ? parseInt(searchParams.offsetNonUsers)
    : 0
  const offsetUsers = searchParams.offsetUsers
    ? parseInt(searchParams.offsetUsers)
    : 0
  const limit = 50
  const { batch_id } = params
  const [batch, nonUsers, users] = await Promise.all([
    getBatch(batch_id),
    getBatchNonUsers(batch_id, offsetNonUsers, limit),
    getBatchUsers(batch_id, offsetUsers, limit),
  ])
  // console.log(users)
  if (!Array.isArray(batch) || !Array.isArray(nonUsers) || batch.length === 0) {
    return (
      <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
        Batch Not Found
      </div>
    )
  }

  return (
    <div className="w-full flex md:flex-row flex-col">
      <Suspense fallback={<Loader />}>
        <RemoveMembers
          batch={batch[0]}
          users={users}
          offset={offsetNonUsers}
          limit={limit}
        />
      </Suspense>
      <Suspense fallback={<Loader />}>
        <AddMembers
          batch={batch[0]}
          nonUsers={nonUsers}
          offset={offsetNonUsers}
          limit={limit}
        />
      </Suspense>
    </div>
  )
}

export default Page
