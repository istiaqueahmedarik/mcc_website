import Insert from '@/components/courses/insert'
import Loader from '@/components/Loader'
import { getAllBatches } from '@/lib/action';
import { Suspense } from 'react'

const Page = async () => {
  const allBatches = await getAllBatches();
  return (
    <Suspense fallback={<Loader />}>
        <Insert batches = {allBatches} />
    </Suspense>
  )
}

export default Page
