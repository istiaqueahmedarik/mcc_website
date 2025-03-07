import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function createGoogleCalendarUrl(event) {
  const { title, startTime, endTime, description, location } = event
  const startDate = new Date(startTime).toISOString().replace(/-|:|\.\d+/g, "")
  const endDate = new Date(endTime).toISOString().replace(/-|:|\.\d+/g, "")

  const url = new URL("https://www.google.com/calendar/render?action=TEMPLATE")
  url.searchParams.append("text", title)
  url.searchParams.append("dates", `${startDate}/${endDate}`)
  url.searchParams.append("details", description)
  url.searchParams.append("location", location)

  return url.toString()
}