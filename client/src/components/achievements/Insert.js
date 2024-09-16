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
import { Textarea } from '@/components/ui/textarea'
import { useActionState } from "react"
import { createAchievement } from '@/lib/action'
import { CalendarIcon, ImageIcon, TrophyIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const initialState = {
  message: '',
  success: false,
}

export default function Insert() {
  
  const [state, formAction, pending] = useActionState(createAchievement, initialState)

  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Achievement</CardTitle>
          <CardDescription>
            Share the latest achievements of MIST Computer Club
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <div className="relative">
                <TrophyIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="Title of the achievement"
                  className="pl-10"
                  
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="file"
                  id="image"
                  name="image"
                  className="pl-10"
                  accept="image/*"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Description of the achievement"
                className="min-h-[100px]"
                
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  id="date"
                  name="date"
                  className="pl-10"
                  
                />
              </div>
            </div>

            {state?.message && (
              <Alert variant={state?.success ? "default" : "destructive"}>
                <AlertDescription>{state?.message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={pending}
            >
              {pending ? 'Submitting...' : 'Create Achievement'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}