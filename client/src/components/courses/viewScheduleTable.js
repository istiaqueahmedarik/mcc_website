import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteSchedule } from '@/lib/action'
import { formatRelative } from 'date-fns'
import { Trash2 } from 'lucide-react'

export default function ViewScheduleTable({ schedules }) {
  return (
    <div>
      <Table>
        <TableCaption className="caption-top">Recent Schedules</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">SL</TableHead>
            <TableHead>Event Name</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule, index) => {
            const time = new Date(schedule.time)
            const fDate = formatRelative(time, new Date())

            const binded = deleteSchedule.bind(null, {
              course_id: schedule.course_id,
              schedule_id: schedule.id,
            })

            return (
              <TableRow key={index}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{schedule.event_name}</TableCell>
                <TableCell>{fDate}</TableCell>
                <TableCell className="text-right">
                  <form
                    action={binded}
                    className="w-full"
                  >
                    <button className="w-full flex justify-center bg-destructive border border-destructive text-white rounded-lg p-2">
                      <Trash2
                        size={20}
                        className="mr-2"
                      />
                    </button>
                  </form>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
