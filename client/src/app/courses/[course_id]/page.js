import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <div className="w-full min-h-screen flex flex-row items-center">
      <div className="w-full max-w-7xl flex flex-wrap justify-center">
        <div className="flex flex-col gap-12 mt-4 flex-grow">
          <h1 className="text-2xl uppercase font-extrabold text-center tracking-wider">
            {course.title}
          </h1>
          <div className="flex justify-center">
            <div className="text-muted-foreground max-w-md text-justify pl-4">
              {course.description.split('\n').map((line, index) => (
                <p
                  key={index}
                  className="mb-4"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-12 mt-4 w-96">
          <h1 className="text-2xl uppercase font-extrabold text-center tracking-wider">
            Instructor(s)
          </h1>
          {courseInstructors.length > 0 &&
            courseInstructors.map((ins, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex flex-row gap-4">
                    <Avatar>
                      <AvatarImage src={ins.profile_pic} />
                      <AvatarFallback>{ins.full_name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{ins.full_name}</CardTitle>
                      <CardDescription>{ins.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}

export default SingleCourse
