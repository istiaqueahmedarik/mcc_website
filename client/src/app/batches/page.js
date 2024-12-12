import Insert from '@/components/batches/insert'
import Loader from '@/components/Loader'
import { Suspense } from 'react'

const Page = () => {
  return (
    <Suspense fallback={<Loader />}>
      <Insert />
    </Suspense>
  )
}

export default Page
