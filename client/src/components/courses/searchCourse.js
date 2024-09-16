import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from '@/components/ui/dialog'
import Link from 'next/link'

const SearchCourse = ({ courses }) => {
  return (
    <div className="pt-8">
      <Dialog>
        <DialogTrigger>
          <div>
            <Command>
              <CommandInput placeholder="Search Courses... " />
            </Command>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogDescription>
              <Command>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    {courses &&
                      courses.map((course) => (
                        <Link href={`courses/${course.id}`}>
                          <CommandItem
                            key={course.id}
                            className="cursor-pointer"
                          >
                            {course.title}
                          </CommandItem>
                        </Link>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SearchCourse
