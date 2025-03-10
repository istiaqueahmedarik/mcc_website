import Edit from '@/components/batches/edit'
import Loader from '@/components/Loader'
import { getBatch, getBatchIns } from '@/lib/action'
import { Suspense } from 'react'

const Page = async ({ params }) => {
  const { batch_id } = await params
  const [batch, ins] = await Promise.all([
    getBatch(batch_id),
    getBatchIns(batch_id),
  ])
  if (!Array.isArray(batch) || !Array.isArray(ins) || batch.length === 0) {
    return (
      <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
        Batch Not Found
      </div>
    )
  }
  const ins_arr = ins.map((i) => i.email)
  return (
    <Suspense fallback={<Loader />}>
      <Edit
        batch={batch[0]}
        ins={ins_arr}
      />
    </Suspense>
  )
}

export default Page
