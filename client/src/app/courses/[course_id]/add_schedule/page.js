import AddNewSchedule from '@/components/courses/addNewSchedule'
import Loader from '@/components/Loader'
import { Suspense } from 'react'

const Page = async ({ params }) => {
  const { course_id } = params
  return (
    <Suspense fallback={<Loader />}>
      <AddNewSchedule course_id={course_id} />
    </Suspense>
  )
}

export default Page
