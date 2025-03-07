"use client";
import { useState } from "react"
import { Bell, ExternalLink, Clock, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import CountdownTimer from "./countdown-timer"
import { createGoogleCalendarUrl } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ContestCard({
  contest
}) {
  const [isReminded, setIsReminded] = useState(false)

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const getDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const handleReminder = () => {
    // In a real app, this would set up a notification
    setIsReminded(!isReminded)
  }

  const getGoogleCalendarUrl = () => {
    return createGoogleCalendarUrl({
      title: contest.name,
      startTime: contest.start_time,
      endTime: contest.end_time,
      description: `Coding contest on ${contest.site}. Visit: ${contest.url}`,
      location: contest.url,
    });
  }

  return (
    <Card
      className="overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    contest.status === "BEFORE"
                      ? "bg-yellow-500"
                      : contest.status === "CODING"
                        ? "bg-green-500"
                        : "bg-red-500"
                  }`}></span>
                <span
                  className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">{contest.site}</span>
              </div>
              <h3
                className="font-bold text-lg text-zinc-900 dark:text-zinc-50 line-clamp-2">{contest.name}</h3>
            </div>
            <div className="flex space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50">
                        <Calendar className="h-5 w-5" />
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to Google Calendar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${isReminded ? "text-red-600" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
                      onClick={handleReminder}>
                      <Bell className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isReminded ? "Remove reminder" : "Set reminder"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
              <Clock className="mr-2 h-4 w-4" />
              <span>Duration: {getDuration(contest.duration)}</span>
            </div>

            {contest.status === "BEFORE" && (
              <div className="mt-4">
                <CountdownTimer targetTime={contest.start_time} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 text-sm">
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Starts</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatDate(contest.start_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Ends</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatDate(contest.end_time)}</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-0">
        <a
          href={contest.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full">
          <Button
            variant="ghost"
            className="w-full rounded-none h-12 text-red-600 hover:text-red-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-2">
            Visit Contest
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
}

