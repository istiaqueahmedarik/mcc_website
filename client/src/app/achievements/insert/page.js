'use client'

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
import { Textarea } from '../../../components/ui/textarea'
import { useActionState } from "react"
import { createAchievement } from '@/lib/action'
const initialState = {
    message: '',
}

export default function InsertAchievement() {

  const [state, formAction, pending] = useActionState(createAchievement, initialState)

  return (
    <div className="w-full py-12 flex justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Create Achievement</CardTitle>
          <CardDescription>
            Create and share the latest achievements of MIST Computer Club
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="Title of the achievement"
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="image">Image</Label>
                <Input
                  type="file"
                  id="image"
                  name="image"
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Description of the achievement"
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  type="date"
                  id="date"
                  name="date"
                  placeholder="Date of the achievement"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
              >
                Submit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
