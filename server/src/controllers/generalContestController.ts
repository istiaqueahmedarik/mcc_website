import type { Context } from "hono"
import { fetchUpcomingContests } from "@qatadaazzeh/atcoder-api"

type Contest = {
  id: string
  name: string
  site: string
  start_time: number
  end_time: number
  duration: number
  status: "BEFORE" | "CODING" | "FINISHED"
  url: string
}

const statusOf = (start: number, end: number): Contest["status"] => {
  const now = Date.now()
  return now < start ? "BEFORE" : now < end ? "CODING" : "FINISHED"
}

// "01:40" or "240:00" -> milliseconds
const parseDuration = (s: string) => {
  const [h, m] = String(s).split(":").map(Number)
  return ((h || 0) * 60 + (m || 0)) * 60 * 1000
}

// "2026-10-24 21:00:00+0900" -> timestamp (made ISO-safe for any JS engine)
const parseAtcoderTime = (s: string) =>
  new Date(s.replace(" ", "T").replace(/([+-]\d\d)(\d\d)$/, "$1:$2")).getTime()

async function codeforces(): Promise<Omit<Contest, "duration">[]> {
  const res = await fetch("https://codeforces.com/api/contest.list")
  const { result } = await res.json()
  return result
    .filter((c: any) => c.phase === "BEFORE" || c.phase === "CODING")
    .map((c: any) => {
      const start = c.startTimeSeconds * 1000
      return {
        id: `cf-${c.id}`,
        name: c.name,
        site: "CodeForces",
        start_time: start,
        end_time: start + c.durationSeconds * 1000,
        status: c.phase,
        url: `https://codeforces.com/contest/${c.id}`,
      }
    })
}

async function codechef(): Promise<Omit<Contest, "duration">[]> {
  const res = await fetch(
    "https://www.codechef.com/api/list/contests/all?sort_by=START&sort_order=asc&offset=0&mode=all",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  )
  const data = await res.json()
  return [...data.present_contests, ...data.future_contests].map((c: any) => {
    const start = new Date(c.contest_start_date_iso).getTime()
    const end = new Date(c.contest_end_date_iso).getTime()
    return {
      id: `cc-${c.contest_code}`,
      name: c.contest_name,
      site: "CodeChef",
      start_time: start,
      end_time: end,
      status: statusOf(start, end),
      url: `https://www.codechef.com/${c.contest_code}`,
    }
  })
}

async function atcoder(): Promise<Omit<Contest, "duration">[]> {
  const contests = await fetchUpcomingContests()
  return contests.map((c: any) => {
    const start = parseAtcoderTime(c.contestTime)
    const end = start + parseDuration(c.contestDuration)
    return {
      id: `ac-${c.contestId}`,
      name: c.contestName,
      site: "AtCoder",
      start_time: start,
      end_time: end,
      status: statusOf(start, end),
      url: c.contestUrl,
    }
  })
}

// in-memory cache: upstream sites get hit at most once per 10 minutes
const TTL = 10 * 60 * 1000
let cache: { data: Contest[]; at: number } | null = null

async function loadContests(): Promise<Contest[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data

  const names = ["codeforces", "codechef", "atcoder"]
  const results = await Promise.allSettled([codeforces(), codechef(), atcoder()])
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`${names[i]} failed:`, r.reason)
  })

  const data = results
  .filter((r): r is PromiseFulfilledResult<Omit<Contest, "duration">[]> => r.status === "fulfilled")
  .flatMap((r) => r.value)
  .map((c) => ({ ...c, duration: Math.round((c.end_time - c.start_time) / 1000) }))
  .sort((a, b) => a.start_time - b.start_time)

  // if everything failed, keep serving the last good data
  if (data.length > 0 || !cache) cache = { data, at: Date.now() }
  return cache.data
}

export const getAllContests = async (c: Context) => {
  try {
    return c.json(await loadContests())
  } catch (error) {
    console.error(error)
    return c.json({ error: "Failed to fetch contests" }, 500)
  }
}