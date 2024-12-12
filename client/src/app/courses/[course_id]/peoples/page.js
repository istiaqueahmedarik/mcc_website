import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getCourseIns, getCourseMems } from '@/lib/action'

const page = async ({ params }) => {
  console.log(params)
  const { course_id } = params
  const courseInstructors = await getCourseIns(course_id)
  const courseMembers = await getCourseMems(course_id)
  return (
    <div className="w-full min-h-screen flex flex-row justify-center">
      <div className="w-full max-w-7xl flex flex-col items-center mt-4 gap-4">
        <div className="flex flex-col gap-4 mt-4 w-96">
          <h1 className="text-2xl uppercase font-extrabold text-center tracking-wider">
            Instructors
          </h1>
          {courseInstructors.length > 0 &&
            courseInstructors.map((ins, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex flex-row gap-4">
                    <Avatar>
                      <AvatarImage src={ins.profile_pic} />
                      <AvatarFallback>
                        {ins.full_name.slice(0, 2)}
                      </AvatarFallback>
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
        <div className="flex flex-col gap-4 mt-4 w-96">
          <h1 className="text-2xl uppercase font-extrabold text-center tracking-wider">
            Members
          </h1>
          {courseMembers.length > 0 &&
            courseMembers.map((mem, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex flex-row gap-4">
                    <Avatar>
                      <AvatarImage src={mem.profile_pic} />
                      <AvatarFallback>
                        {mem.full_name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{mem.full_name}</CardTitle>
                      <CardDescription>{mem.email}</CardDescription>
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

export default page
