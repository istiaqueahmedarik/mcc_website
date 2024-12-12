import Edit from '@/components/courses/edit'
import Loader from '@/components/Loader'
import { getCourse } from '@/lib/action'
import { Suspense } from 'react'

const Page = async ({ params }) => {
  const { course_id } = params
  const course = await getCourse(course_id)
  if (!Array.isArray(course) || course.length === 0) {
    return (
      <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
        Course Not Found
      </div>
    )
  }
  return (
    <Suspense fallback={<Loader />}>
      <Edit course={course[0]} />
    </Suspense>
  )
}

export default Page
