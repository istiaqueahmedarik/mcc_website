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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addCourseContent } from '@/lib/action'
import { useActionState, useState } from 'react'

const initialState = {
  message: '',
  success: false,
}

export default function AddContent({ course_id }) {
  initialState.course_id = course_id
  const [Hints, setHints] = useState([''])
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
