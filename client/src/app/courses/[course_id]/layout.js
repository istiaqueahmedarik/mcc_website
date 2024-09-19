import CopyCourseLink from '@/components/courses/copyLink'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteCourse } from '@/lib/action'
import { ListFilter, Trash2 } from 'lucide-react'
import Link from 'next/link'

const CourseLayout = ({ children, params }) => {
  const { course_id } = params
  const binded = deleteCourse.bind(null, course_id)
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-7xl flex items-center justify-center">
        <Link href={`/courses/${course_id}`}>
          <button className="btn btn-ghost btn-sm">Details</button>
        </Link>
        <Link href={`/courses/${course_id}/peoples`}>
          <button className="btn btn-ghost btn-sm">Peoples</button>
        </Link>
        <Link href={`/courses/${course_id}/contents`}>
          <button className="btn btn-ghost btn-sm">Contents</button>
        </Link>
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
            <DropdownMenuItem>Team</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}
    </div>
  )
}

export default CourseLayout
