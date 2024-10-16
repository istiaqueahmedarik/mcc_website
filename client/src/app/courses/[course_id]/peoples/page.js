import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getCourseIns } from '@/lib/action'

const page = async ({ params }) => {
  console.log(params)
  const { course_id } = params
  const courseInstructors = await getCourseIns(course_id)
  return (
    <div className="w-full min-h-screen flex flex-row justify-center">
      <div className="w-full max-w-7xl flex flex-col items-center mt-4">
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
      </div>
    </div>
  )
}

export default page
