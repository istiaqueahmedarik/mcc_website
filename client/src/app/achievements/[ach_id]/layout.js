import ProgressLink from "@/components/ProgressLink";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

export default async function AchievementLayout({ children, params }) {
  const { ach_id } = await params;
  return (
    <div className="w-full flex flex-col justify-center">
      <div className="w-full flex flex-row items-center justify-center gap-2">
        <Badge className="cursor-pointer">
          <Pencil size={12} className="mr-2" />
          <ProgressLink href={`/achievements/${ach_id}/edit`}>
            Edit
          </ProgressLink>
        </Badge>
      </div>
      {children}
    </div>
  );
}
