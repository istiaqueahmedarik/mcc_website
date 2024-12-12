import MarkdownRender from '@/components/MarkdownRenderer'
import { getCourse, getCourseIns } from '@/lib/action'
import { redirect } from 'next/navigation'

const SingleCourse = async ({ params }) => {
  const { course_id } = params
  let course = await getCourse(course_id)
  if (course.length === 0) {
    redirect('/courses')
  }
  course = course[0]
  let courseInstructors = await getCourseIns(course_id)
  return (
    <div className="w-full min-h-screen flex flex-row justify-center">
      <div className="w-full max-w-7xl flex flex-col items-center mt-4">
        <div className="flex flex-col gap-12 mt-4">
          <h1 className="text-2xl uppercase font-extrabold text-center tracking-wider">
            {course.title}
          </h1>
          <div className="text-lg leading-loose">
            <MarkdownRender content={course.description} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SingleCourse
