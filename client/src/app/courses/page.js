import CourseCard from "@/components/courses/courseCard"
import SearchCourse from "@/components/courses/searchCourse"
import { getAllCourses } from "@/lib/action"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

const CourseCardWithImage = ({ course }) => {
  return (
    <div className="relative h-64 w-full rounded-2xl overflow-hidden group shadow-md">
      <Image
        src={course.image || "/vjudge_cover.png"}
        alt={course.title || "Course cover"}
        fill
        className="object-cover w-full h-full"
        priority
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all" />
      <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
        <div>
          <h2 className="text-4xl font-bold text-white drop-shadow mb-2 truncate">{course.title}</h2>
        </div>
        <div className="flex justify-end">
          <Link
            href={`/courses/${course.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow"
          >
            View Course
          </Link>
        </div>
      </div>
    </div>
  )
}

const Page = async () => {
  const allCourses = await getAllCourses()
  if (!Array.isArray(allCourses)) {
    redirect("/login")
  }
  if (allCourses.length === 0) {
    redirect("/login")
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gradient-to-b from-background to-muted/50">
      <div className="w-full max-w-7xl flex flex-col items-center justify-center px-4 py-12">
        <div className="relative w-full mb-12">
          <div className="absolute inset-0 bg-primary/10 rounded-3xl -z-10"></div>
          <div className="relative z-10 py-12 px-6 flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-foreground">
              Explore Courses
            </h1>
            <div className="h-1.5 w-24 bg-primary/80 rounded-full mt-4 mb-8"></div>
            
            <div className="w-full max-w-2xl m-auto">
              <SearchCourse courses={allCourses} />
            </div>
          </div>
          <div className="absolute -bottom-6 left-0 right-0 h-12 overflow-hidden">
            <div className="absolute inset-0 bg-background rounded-t-[50%]"></div>
          </div>
        </div>

        {allCourses.length === 0 && (
          <div className="w-full p-8 rounded-xl bg-card text-card-foreground shadow-sm">
            <p className="text-center">No courses available</p>
          </div>
        )}

        {allCourses.length > 0 && (
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              {allCourses.map((course, index) => {
                let sizeClass = ""
                const position = index % 8
                switch (position) {
                  case 0:
                  case 1:
                  case 5:
                  case 6:
                  case 7:
                    sizeClass = "col-span-1 md:col-span-6 lg:col-span-6"
                    break
                  case 2:
                  case 3:
                  case 4:
                  default:
                    sizeClass = "col-span-1 md:col-span-4 lg:col-span-4"
                }
                const isFeatured = index % 8 === 0
                return (
                  <div
                    key={course.id}
                    className={cn(sizeClass, "transition-all duration-300 hover:scale-[1.02] group")}
                  >
                    <div
                      className={cn(
                        "h-full rounded-2xl overflow-hidden shadow-md",
                        isFeatured ? "bg-primary/5 ring-1 ring-primary/20" : "bg-card",
                      )}
                    >
                      <CourseCardWithImage course={course} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Page
