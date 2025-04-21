import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

const SearchCourse = ({ courses }) => {
  return (
    <div className="m-auto w-full max-w-2xl">
      <Dialog className="w-full  m-auto">
        <DialogTrigger className="w-full max-w-2xl" >
          <div className="w-full max-w-2xl m-auto">
            <Command className="w-full max-w-2xl" >
              <CommandInput placeholder="Search Courses... " className="w-full max-w-2xl" />
            </Command>
          </div>
        </DialogTrigger>
        <DialogContent className="w-full max-w-2xl m-auto">
          <DialogHeader>
            <DialogTitle>Search Courses</DialogTitle>
            <DialogDescription>
              Type a command or search...
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                {courses &&
                  courses.map((course) => (
                    <Link href={`courses/${course.id}`} key={course.id}>
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SearchCourse;
