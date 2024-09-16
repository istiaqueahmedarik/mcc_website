import CourseCard from '@/components/courses/courseCard'
import SearchCourse from '@/components/courses/searchCourse'
import { getAllCourses } from '@/lib/action'

const Page = async () => {
  const allCourses = await getAllCourses()
  const firstColumn = allCourses.filter((_, index) => index % 3 === 0)
  const secondColumn = allCourses.filter((_, index) => index % 3 === 1)
  const thirdColumn = allCourses.filter((_, index) => index % 3 === 2)
  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-7xl flex flex-col items-center justify-center">
        <h1 className="text-2xl uppercase font-extrabold text-center">
          Courses
        </h1>
        <SearchCourse courses={allCourses} />
        {allCourses.length === 0 && <p>No courses available</p>}
        {allCourses.length < 3 ? (
          <div className="flex flex-row flex-wrap mt-12 gap-4">
            {allCourses.map((course) => (
              <CourseCard
                course={course}
                key={course.id}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            <div className="flex flex-col gap-4">
              {firstColumn.map((course) => (
                <CourseCard
                  course={course}
                  key={course.id}
                />
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {secondColumn.map((course) => (
                <CourseCard
                  course={course}
                  key={course.id}
                />
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {thirdColumn.map((course) => (
                <CourseCard
                  course={course}
                  key={course.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Page
