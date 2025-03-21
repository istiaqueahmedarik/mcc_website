'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addCourseContent } from '@/lib/action'
import { useActionState, useState } from 'react'
import MarkdownRender from '../MarkdownRenderer'
import { Textarea } from '../ui/textarea'

const initialState = {
  message: '',
  success: false,
}

export default function AddContent({ course_id, ojList, defaultName }) {
  initialState.course_id = course_id
  const [problemName, setProblemName] = useState(defaultName)
  const [Hints, setHints] = useState([''])
  const [code, setCode] = useState('')
  const [state, formAction, pending] = useActionState(
    addCourseContent,
    initialState,
  )

  return (
    <div className="">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Add Problem</CardTitle>
          <CardDescription>Add a new problem in this course</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={formAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Problem Name</Label>
              <div>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Name of the problem"
                  value={problemName}
                  onChange={(e) => setProblemName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="problem_link">Problem Link</Label>
              <Input
                type="text"
                id="problem_link"
                name="problem_link"
                placeholder="URL of the problem"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_link">Video Link</Label>
              <Input
                type="text"
                id="video_link"
                name="video_link"
                placeholder="Video URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="OJ">OJ (for Vjudge)</Label>
              <Select
                name="oj"
                id="oj"
              >
                <SelectTrigger className="">
                  <SelectValue placeholder="OJ" />
                </SelectTrigger>
                <SelectContent>
                  {ojList.length > 0 ? (
                    ojList.map((oj, index) => (
                      <SelectItem
                        key={index}
                        value={oj}
                      >
                        {oj}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="No OJ found">No OJ found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="Problem ID">Problem ID (for Vjudge)</Label>
              <Input
                id="problem_id"
                name="problem_id"
                placeholder="Problem ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Textarea
                id="code"
                name="code"
                placeholder="C++ code here"
                className="min-h-[100px]"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <Dialog className="w-screen">
              <DialogTrigger className="flex p-2 border border-yellowCus1-foreground rounded-lg">
                Preview Code
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Preview</DialogTitle>
                  <DialogDescription>
                    <MarkdownRender content={code} />
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            {Hints.map((hint, index) => (
              <div
                key={index}
                className="space-y-2"
              >
                <Label htmlFor={`hint-${index}`}>Hint {index + 1}</Label>
                <Input
                  type="text"
                  id={`hint-${index}`}
                  name={`hint-${index}`}
                  value={hint}
                  onChange={(e) => {
                    const newHints = [...Hints]
                    newHints[index] = e.target.value
                    setHints(newHints)
                  }}
                />
              </div>
            ))}

            <div className="w-full flex items-center justify-center">
              <Button
                onClick={() => setHints([...Hints, ''])}
                type="button"
              >
                {' '}
                + Add Hint
              </Button>
            </div>

            {state?.message && (
              <Alert variant={state?.success ? 'default' : 'destructive'}>
                <AlertDescription>{state?.message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={pending}
            >
              {pending ? 'Submitting...' : 'Add Problem'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
