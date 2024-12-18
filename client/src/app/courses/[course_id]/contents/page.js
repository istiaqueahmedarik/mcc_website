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

import {
  deleteCourseContent,
  getCourseContents,
  getVjudgeID,
  solveDetails,
} from '@/lib/action'
import { CirclePlus, FileJson, Lightbulb, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

function getColumnName(n) {
  let result = ''
  while (n > 0) {
    n--
    const char = String.fromCharCode((n % 26) + 65)
    result = char + result
    n = Math.floor(n / 26)
  }
  return result
}

const CourseContents = async ({ params }) => {
  const { course_id } = params
  const courseConts = await getCourseContents(course_id)

  let ojList = []

  const vjudgeID = await getVjudgeID()
  const vjudge_id = vjudgeID.vjudge_id
  const solveListFetch = await solveDetails(vjudge_id)
  let solveList = solveListFetch.acRecords
  for (let i in solveList) {
    ojList.push(i)
    for (let j = 0; j < solveList[i].length; j++) {
      solveList[i][j] = solveList[i][j].toLowerCase()
    }
    solveList[i].sort(function (a, b) {
      return a - b
    })
  }

  return (
    <div className="w-full min-h-screen flex flex-row justify-center">
      <div className="w-full max-w-5xl flex flex-col mt-4 gap-4">
        <div className="flex justify-center">
          <Dialog>
            <DialogTrigger className="w-fit flex gap-2 align-baseline">
              <CirclePlus size={20} /> Add Problem
            </DialogTrigger>
            <DialogContent className="w-full max-w-md">
              <DialogHeader>
                <AddContent
                  course_id={course_id}
                  ojList={ojList}
                  defaultName={getColumnName(courseConts.length + 1)}
                />
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-4">
          {courseConts.length > 0 &&
            courseConts.map((content, index) => {
              const binded = deleteCourseContent.bind(null, {
                content_id: content.id,
                course_id: course_id,
              })

              content.bgcolor = 'bg-accent'

              if (content.problem_id) {
                if (
                  solveList[content.oj].includes(
                    content.problem_id.toLowerCase(),
                  )
                ) {
                  content.bgcolor = 'bg-greenAC'
                }
              }

              return (
                <Card
                  key={index}
                  className={`${content.bgcolor} `}
                >
                  <CardHeader>
                    <div className="flex flex-row gap-4 bg-inherit">
                      <CardTitle>{content.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardFooter className="w-full gap-4 flex-wrap">
                    {content.hints.map((hint, index) => (
                      <Dialog key={index}>
                        <DialogTrigger className="flex p-2 border border-yellowCus1-foreground rounded-lg">
                          <Lightbulb /> {index}
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-lg">
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
                      <DialogContent className="w-full max-w-md">
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
                      className=""
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
