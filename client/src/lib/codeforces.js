"use server"
import { format, subDays } from "date-fns"

export async function fetchCodeforcesSubmissionData(username, contestId = "all", days = 7) {
    const cutoffDate = subDays(new Date(), days).getTime()

    try {
        // Fetch submissions from Codeforces API
        const url = `https://codeforces.com/api/user.status?handle=${username}&from=1&count=100`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Codeforces API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.status !== "OK") {
            throw new Error(`Codeforces API returned error: ${data.comment}`)
        }

        // Filter submissions by date and contest if needed
        let submissions = data.result.filter((submission) => {
            const submissionTime = submission.creationTimeSeconds * 1000
            return submissionTime >= cutoffDate
        })

        // Filter by contest if specified
        if (contestId !== "all") {
            submissions = submissions.filter(
                (submission) => submission.contestId && submission.contestId.toString() === contestId,
            )
        }

        // Separate personal and contest submissions
        const personalSubmissions = submissions.filter((submission) => !submission.contestId)
        const contestSubmissions = submissions.filter((submission) => submission.contestId)

        // Format submissions for our UI
        const formattedPersonalSubmissions = personalSubmissions.map(formatCodeforcesSubmission)
        const formattedContestSubmissions = contestSubmissions.map(formatCodeforcesSubmission)

        // Group submissions by day
        const dailySubmissions = groupCodeforcesSubmissionsByDay(
            [...formattedPersonalSubmissions, ...formattedContestSubmissions],
            formattedPersonalSubmissions,
            formattedContestSubmissions,
            days,
        )

        // Calculate stats
        const stats = calculateCodeforcesStats(
            [...formattedPersonalSubmissions, ...formattedContestSubmissions],
            formattedPersonalSubmissions,
            formattedContestSubmissions,
            days,
        )

        return {
            dailySubmissions,
            stats,
            personalSubmissions: formattedPersonalSubmissions,
            contestSubmissions: formattedContestSubmissions,
        }
    } catch (error) {
        console.error("Error fetching Codeforces data:", error)
        throw error
    }
}

function formatCodeforcesSubmission(submission) {
    return {
        id: submission.id,
        time: submission.creationTimeSeconds * 1000,
        status: submission.verdict === "OK" ? "Accepted" : submission.verdict,
        language: submission.programmingLanguage,
        problemName: submission.problem.name,
        problemUrl: `https://codeforces.com/problemset/problem/${submission.problem.contestId}/${submission.problem.index}`,
        contestId: submission.contestId,
        userName: submission.author.members[0].handle,
        runTime: submission.timeConsumedMillis,
        memory: submission.memoryConsumedBytes / 1024,
    }
}

function groupCodeforcesSubmissionsByDay(allSubmissions, personalSubmissions, contestSubmissions, days) {
    const submissionsByDay = {}

    const today = new Date()
    for (let i = 0; i < days; i++) {
        const date = subDays(today, i)
        const dateStr = format(date, "MMM dd")
        submissionsByDay[dateStr] = { personalCount: 0, contestCount: 0 }
    }

    personalSubmissions.forEach((submission) => {
        try {
            if (!submission.time) return

            const submissionDate = new Date(submission.time)
            if (isNaN(submissionDate.getTime())) return

            const date = format(submissionDate, "MMM dd")
            if (submissionsByDay[date]) {
                submissionsByDay[date].personalCount++
            } else {
                submissionsByDay[date] = { personalCount: 1, contestCount: 0 }
            }
        } catch (error) {
            console.error("Error processing personal submission date:", error)
        }
    })

    contestSubmissions.forEach((submission) => {
        try {
            if (!submission.time) return

            const submissionDate = new Date(submission.time)
            if (isNaN(submissionDate.getTime())) return

            const date = format(submissionDate, "MMM dd")
            if (submissionsByDay[date]) {
                submissionsByDay[date].contestCount++
            } else {
                submissionsByDay[date] = { personalCount: 0, contestCount: 1 }
            }
        } catch (error) {
            console.error("Error processing contest submission date:", error)
        }
    })

    return Object.entries(submissionsByDay)
        .map(([date, counts]) => ({
            date,
            personalCount: counts.personalCount,
            contestCount: counts.contestCount,
        }))
        .sort((a, b) => {
            try {
                const dateA = new Date(`${a.date}, ${new Date().getFullYear()}`)
                const dateB = new Date(`${b.date}, ${new Date().getFullYear()}`)
                return dateA.getTime() - dateB.getTime()
            } catch (error) {
                console.error("Error sorting dates:", error)
                return 0
            }
        })
}

function calculateCodeforcesStats(allSubmissions, personalSubmissions, contestSubmissions, days) {
    const totalSubmissions = allSubmissions.length
    const acceptedSubmissions = allSubmissions.filter((submission) => submission.status === "Accepted").length

    let lastSubmissionDate = "No submissions"
    try {
        const validSubmissions = allSubmissions.filter(
            (submission) => submission.time && !isNaN(new Date(submission.time).getTime()),
        )

        if (validSubmissions.length > 0) {
            const lastSubmissionTime = Math.max(...validSubmissions.map((submission) => submission.time))
            lastSubmissionDate = format(new Date(lastSubmissionTime), "MMM dd, yyyy")
        }
    } catch (error) {
        console.error("Error calculating last submission date:", error)
    }

    const submissionFrequency = totalSubmissions / days

    let regularityStatus = "Irregular"
    if (submissionFrequency >= 1) {
        regularityStatus = "Regular"
    } else if (submissionFrequency >= 0.5) {
        regularityStatus = "Needs Monitoring"
    }

    return {
        totalSubmissions,
        acceptedSubmissions,
        lastSubmissionDate,
        submissionFrequency,
        regularityStatus,
    }
}

export async function fetchCodeforcesStatistics(users, days = 7) {
    const cutoffDate = subDays(new Date(), days).getTime() / 1000 // Codeforces uses seconds
    const batchStats = []

    for (const user of users) {
        if (!user.cf_id) continue

        try {
            const response = await fetch(`https://codeforces.com/api/user.status?handle=${user.cf_id}&from=1&count=1000`)
            const data = await response.json()

            if (data.status !== "OK") {
                throw new Error(`Codeforces API error: ${data.comment}`)
            }

            const submissions = data.result.filter((sub) => sub.creationTimeSeconds >= cutoffDate)
            const acceptedSubmissions = submissions.filter((sub) => sub.verdict === "OK")

            const stats = {
                cf_id: user.cf_id,
                totalSubmissions: submissions.length,
                acceptedSubmissions: acceptedSubmissions.length,
                acceptanceRate: (acceptedSubmissions.length / submissions.length) * 100 || 0,
                submissionFrequency: submissions.length / days,
                lastSubmissionDate:
                    submissions.length > 0 ? format(new Date(submissions[0].creationTimeSeconds * 1000), "yyyy-MM-dd") : "N/A",
            }

            batchStats.push(stats)
        } catch (error) {
            console.error(`Error fetching Codeforces data for user ${user.cf_id}:`, error)
            batchStats.push({
                cf_id: user.cf_id,
                totalSubmissions: 0,
                acceptedSubmissions: 0,
                acceptanceRate: 0,
                submissionFrequency: 0,
                lastSubmissionDate: "N/A",
            })
        }
    }

    return batchStats
}

