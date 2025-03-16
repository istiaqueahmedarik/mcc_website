'use client'

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
import { Textarea } from '@/components/ui/textarea'
import { editCourse } from '@/lib/action'
import { Soup } from 'lucide-react'
import { EditorContent } from 'novel'
import { useActionState, useState } from 'react'
import MarkdownRender from '../MarkdownRenderer'
import NovelEditor from '../novelEditor/editor'

const initialState = {
  message: '',
  success: false,
}

export default function Edit({ course }) {
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description)
  console.log(course)
  initialState.course_id = course.id
  const [state, formAction, pending] = useActionState(editCourse, initialState)

  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Edit Course</CardTitle>
          <CardDescription>Edit current course</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={formAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <div className="relative">
                <Soup className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="Title of the course"
                  className="pl-10"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Description of the course"
                className="min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Dialog className="w-screen">
              <DialogTrigger className="flex p-2 border border-yellowCus1-foreground rounded-lg">
                Preview Description
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Preview</DialogTitle>
                  <DialogDescription>
                    <MarkdownRender content={description} />
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Button
              type="submit"
              className="w-full"
              disabled={pending}
            >
              {pending ? 'Submitting...' : 'Confirm Edit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
