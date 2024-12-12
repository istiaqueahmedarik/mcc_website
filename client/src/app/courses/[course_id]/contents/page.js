import AddContent from '@/components/courses/addContent'
import EditContent from '@/components/courses/editContent'
import MarkdownRender from '@/components/MarkdownRenderer'
import { Button } from '@/components/ui/button'
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteCourseContent, getCourseContents } from '@/lib/action'
import { CirclePlus, FileJson, Lightbulb, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

const CourseContents = async ({ params }) => {
  const { course_id } = params
  const courseConts = await getCourseContents(course_id)
  return (
    <div className="w-full min-h-screen flex flex-row justify-center">
      <div className="w-full max-w-5xl flex flex-col mt-4 gap-4">
        <div className="flex justify-center">
          <Dialog>
            <DialogTrigger className="w-fit flex gap-2 align-baseline">
              <CirclePlus size={20} /> Add Problem
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <AddContent course_id={course_id} />
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-4">
          {courseConts.length > 0 &&
            courseConts.map((content, index) => {
              console.log(content)
              const binded = deleteCourseContent.bind(null, {
                content_id: content.id,
                course_id: course_id,
              })
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex flex-row gap-4">
                      <CardTitle>{content.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardFooter className="gap-4">
                    {content.hints.map((hint, index) => (
                      <Dialog key={index}>
                        <DialogTrigger className="flex p-2 border border-yellowCus1-foreground rounded-lg">
                          <Lightbulb /> {index}
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Hint {index}</DialogTitle>
                            <DialogDescription>{hint}</DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    ))}

                    <Link
                      href={content.problem_link}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Button>Problem Link</Button>
                    </Link>

                    <Link
                      href={content.video_link}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Button>Video Solution</Button>
                    </Link>

                    <Dialog>
                      <DialogTrigger className="flex p-2 border border-yellowCus1-foreground rounded-lg gap-2">
                      <FileJson size={20} /> Code
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                        <MarkdownRender content={content.code} />
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger className="flex p-2 border border-yellowCus1-foreground rounded-lg gap-2">
                        <Pencil size={20} /> Edit
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <EditContent
                            course_id={course_id}
                            content={content}
                          />
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>

                    <form
                      action={binded}
                      className="w-full"
                    >
                      <Button variant="destructive">
                        <Trash2
                          size={12}
                          className="mr-2"
                        />
                        Delete
                      </Button>
                    </form>
                  </CardFooter>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  )
}

export default CourseContents
