import AddContent from "@/components/courses/addContent";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCourseContents } from "@/lib/action";
import { CirclePlus } from "lucide-react";
import Link from "next/link";

const CourseContents = async ({ params }) => {
  const { course_id } = params;
  const courseConts = await getCourseContents(course_id);
  return (
    <div className="w-full min-h-screen flex flex-row justify-center">
      <div className="w-full max-w-5xl flex flex-col mt-4 gap-4">
        <div className="flex justify-center">
          <Dialog>
            <DialogTrigger className="w-fit btn-sm btn btn-primary/5">
              <CirclePlus size={16} /> Add Problem
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <AddContent course_id={course_id} />
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-4">
          {courseConts.length > 0 &&
            courseConts.map((content, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex flex-row gap-4">
                    <CardTitle>{content.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardFooter className="gap-4">
                  {content.hints.map((hint, index) => (
                    <Dialog key={index}>
                      <DialogTrigger className="btn btn-primary btn-sm">
                        Hint {index}
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Hint {index}</DialogTitle>
                          <DialogDescription>{hint}</DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  ))}

                  <Link
                    href={content.problem_link}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <button className="btn btn-primary btn-sm">
                      Problem Link
                    </button>
                  </Link>

                  <Link
                    href={content.video_link}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <button className="btn btn-primary btn-sm">
                      Video Solution
                    </button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CourseContents;
