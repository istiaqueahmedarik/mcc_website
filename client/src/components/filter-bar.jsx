"use client";
import { Button } from "@/components/ui/button"
import { DatePicker } from "./date-picker"
import { X } from "lucide-react"

export default function FilterBar({
  activeFilter,
  setFilter,
  dateFilter,
  setDateFilter
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex space-x-2">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="h-9">
            All
          </Button>
          <Button
            variant={activeFilter === "upcoming" ? "default" : "outline"}
            onClick={() => setFilter("upcoming")}
            className="h-9">
            Upcoming
          </Button>
          <Button
            variant={activeFilter === "ongoing" ? "default" : "outline"}
            onClick={() => setFilter("ongoing")}
            className="h-9">
            Ongoing
          </Button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="w-full sm:w-64">
          <DatePicker date={dateFilter} setDate={setDateFilter} />
        </div>

        {dateFilter && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDateFilter(undefined)}
            className="h-9 w-9">
            <X className="h-4 w-4" />
          </Button>
        )}

        {dateFilter && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing contests on {dateFilter.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

