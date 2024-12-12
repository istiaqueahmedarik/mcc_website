import {
  Card,
  CardContent,
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
import { Button } from '../ui/button'

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
              <form
                action={binded}
                className="w-full"
              >
                <button className="w-full flex justify-start">
                  <Trash2
                    size={12}
                    className="mr-2"
                  />
                  Delete
                </button>
              </form>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button className="w-full flex justify-start">
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
      <CardContent></CardContent>
      <CardFooter>
        <Link
          href={`/courses/${course.id}`}
          className="w-full"
        >
          <Button className="w-full flex flex-row gap-4">
            <Telescope />
            Visit
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export default CourseCard
