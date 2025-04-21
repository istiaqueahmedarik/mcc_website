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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { createCourse } from '@/lib/action'
import { Lightbulb, Soup } from 'lucide-react'
import { useActionState, useEffect, useState, useCallback, useMemo, useRef } from 'react'

import EditorWrapper from '../EditorWrapper'

const initialState = {
  message: '',
  success: false,
}

export default function Insert({ batches }) {
  const [insEmails, setInsEmails] = useState([''])
  const [description, setDescription] = useState('')
  const [state, formAction, pending] = useActionState(
    createCourse,
    initialState,
  )
  const handleDescriptionChange = useCallback((newValue) => {
    setDescription((prev) => newValue)

  }, []);

  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-8xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Course</CardTitle>
          <CardDescription>Create a course for a new batch</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Description of the course"
                className="min-h-[100px]"
                value={description}
                type="hidden"
              />
             <EditorWrapper value={description} handleChange={handleDescriptionChange} />
                           <input type="hidden" name="description" value={description} />
            </div>
            


            <Select id="batchId" name="batchId">
              <SelectTrigger className="">
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                {batches &&
                  batches.map((batch, index) => (
                    <SelectItem key={index} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {state?.message && (
              <Alert variant={state?.success ? 'default' : 'destructive'}>
                <AlertDescription>{state?.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Submitting...' : 'Create Course'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
