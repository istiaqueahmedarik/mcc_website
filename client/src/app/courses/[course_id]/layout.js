import CopyCourseLink from '@/components/courses/copyLink'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteCourse, get_with_token } from '@/lib/action'
import { Bell, ListFilter, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'next-view-transitions'

const CourseLayout = async ({ children, params }) => {
  const { course_id } = params
  const user = await get_with_token('auth/user/profile')
  const binded = deleteCourse.bind(null, course_id)
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-7xl flex items-center justify-center gap-2">
        <Link href={`/courses/${course_id}`}>
          <Badge>Details</Badge>
        </Link>
        <Link href={`/courses/${course_id}/peoples`}>
          <Badge>Peoples</Badge>
        </Link>
        <Link href={`/courses/${course_id}/contents`}>
          <Badge>Contents</Badge>
        </Link>
        {user.result[0].admin && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <ListFilter size={12} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <form
                  action={binded}
                  className="w-full"
                >
                  <button className="btn btn-sm w-full flex justify-start">
                    <Trash2
                      size={12}
                      className="mr-2"
                    />
                    Delete
                  </button>
                </form>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CopyCourseLink
                  course_id={course_id}
                  domain={process.env.CLIENT_URL}
                />
              </DropdownMenuItem>
              <DropdownMenuItem>
                <button className="btn btn-sm w-full flex justify-start">
                  <Pencil
                    size={12}
                    className="mr-2"
                  />
                  <Link href={`/courses/${course_id}/edit`}>Edit</Link>
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <button className="btn btn-sm w-full flex justify-start">
                  <Bell
                    size={12}
                    className="mr-2"
                  />
                  <Link href={`/courses/${course_id}/add_schedule`}>
                    Add Schedule
                  </Link>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {children}
    </div>
  )
}

export default CourseLayout
