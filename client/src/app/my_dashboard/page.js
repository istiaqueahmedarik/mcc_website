import ViewScheduleTableDash from '@/components/my_dashboard/viewSchedulesTableDash'
import { getSchedulesDash } from '@/lib/action'

export default async function MyDeshboard() {
  const shedules = await getSchedulesDash()
  return (
    <div className="w-full min-h-screen flex flex-row justify-center">
      <div className="w-full max-w-7xl flex flex-col items-center mt-4">
        <div className="flex flex-col gap-12 mt-4">
          <h1 className="text-2xl uppercase font-extrabold text-center tracking-wider">
            Schedules
          </h1>
          <div className="w-full">
            <ViewScheduleTableDash schedules={shedules} />
          </div>
        </div>
      </div>
    </div>
  )
}
