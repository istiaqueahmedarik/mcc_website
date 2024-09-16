import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteCourse } from '@/lib/action'
import { Copy, EllipsisVertical, Telescope, Trash2 } from 'lucide-react'
import Link from 'next/link'

const truncate = (text, length) => {
  return text.length > length ? text.slice(0, length) + '...' : text
}

const CourseCard = ({ course }) => {
  const binded = deleteCourse.bind(null, course.id)
  return (
    <Card key={course.id}>
      <div className="flex justify-end pt-2 pr-2">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <form action={binded}>
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
              <button className="btn btn-sm w-full flex justify-start">
                <Copy
                  size={12}
                  className="mr-2"
                />
                Copy URL
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{truncate(course.description, 256)}</CardDescription>
      </CardContent>
      <CardFooter>
        <Link href={`/courses/${course.id}`} className='w-full'>
          <button className="btn btn-primary w-full">
            <Telescope />
            Visit
          </button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export default CourseCard
