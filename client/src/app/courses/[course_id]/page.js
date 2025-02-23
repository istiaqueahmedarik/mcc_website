import ViewScheduleTable from '@/components/courses/viewScheduleTable'
import MarkdownRender from '@/components/MarkdownRenderer'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { getCourse, getSchedules } from '@/lib/action'
import { redirect } from 'next/navigation'

const SingleCourse = async ({ params }) => {
  const { course_id } = params
  let course = await getCourse(course_id)
  if (course.length === 0) {
    redirect('/courses')
  }
  course = course[0]
  const schedules = await getSchedules(course_id)
  return (
    <div className="w-full min-h-screen flex flex-row justify-center">
      <div className="w-full max-w-7xl flex flex-col items-center mt-4">
        <div className="flex flex-col gap-12 mt-4">
          <h1 className="text-2xl uppercase font-extrabold text-center tracking-wider">
            {course.title}
          </h1>
          <Accordion
            type="single"
            collapsible
          >
            <AccordionItem value="item-1">
              <AccordionTrigger>Schedules</AccordionTrigger>
              <AccordionContent>
                <ViewScheduleTable schedules={schedules} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-lg leading-loose">
            <MarkdownRender content={course.description} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SingleCourse
