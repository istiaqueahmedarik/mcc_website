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
import { ExternalLink, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function ViewScheduleTableDash({ schedules }) {
  return (
    <div>
      <Table>
        <TableCaption className="caption-top">Recent Schedules</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">SL</TableHead>
            <TableHead>Batch Name</TableHead>
            <TableHead>Course Title</TableHead>
            <TableHead>Event Name</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Link</TableHead>
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
                <TableCell>{schedule.batch_name}</TableCell>
                <TableCell>{schedule.course_title}</TableCell>
                <TableCell>{schedule.event_name}</TableCell>
                <TableCell>{fDate}</TableCell>
                <TableCell>
                  <Link
                    href={schedule.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink
                      size={20}
                      className="mr-2"
                    />
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <form
                    action={binded}
                    className="w-full flex justify-end"
                  >
                    <button className="w-fit bg-destructive border border-destructive text-white rounded-lg p-2">
                      <Trash2 size={20} />
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
