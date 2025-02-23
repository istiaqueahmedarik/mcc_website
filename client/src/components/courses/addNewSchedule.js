'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createSchedule } from '@/lib/action'
import { add, format } from 'date-fns'
import { Calendar as CalendarIcon, Link, Soup } from 'lucide-react'
import { useActionState, useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TimePickerDemo } from '../ui/time-picker-demo'

const initialState = {
  message: '',
  success: false,
}

export default function AddNewSchedule({ course_id }) {
  initialState.course_id = course_id
  const [state, formAction, pending] = useActionState(
    createSchedule,
    initialState,
  )

  const [date, setDate] = useState()

  /**
   * carry over the current time when a user clicks a new day
   * instead of resetting to 00:00
   */
  const handleSelect = (newDay) => {
    if (!newDay) return
    if (!date) {
      setDate(newDay)
      return
    }
    const diff = newDay.getTime() - date.getTime()
    const diffInDays = diff / (1000 * 60 * 60 * 24)
    const newDateFull = add(date, { days: Math.ceil(diffInDays) })
    setDate(newDateFull)
  }

  const handleSubmit = useCallback(
    (formData) => {
      const d = new Date(date)
      formData.append('date', d.toISOString())
      formAction(formData)
    },
    [date, formAction],
  )

  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Schedule</CardTitle>
          <CardDescription>
            Insert upcoming events of the course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={handleSubmit}
            className="space-y-4"
          >
            <div className="relative">
              <Soup className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                id="name"
                name="name"
                placeholder="Name of the event"
                className="pl-10"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    format(date, 'PPP HH:mm:ss')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => handleSelect(d)}
                  initialFocus
                />
                <div className="p-3 border-t border-border">
                  <TimePickerDemo
                    setDate={setDate}
                    date={date}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <div className="relative">
              <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                id="link"
                name="link"
                placeholder="Link of the event"
                className="pl-10"
              />
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
              {pending ? 'Submitting...' : 'Create Event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
