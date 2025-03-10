import { format, subDays } from "date-fns";

interface Submission {
    time: number;
    status: string;
    userName: string;
    run_id?: number;
    [key: string]: any;
}

interface DailySubmissions {
    date: string;
    personalCount: number;
    contestCount: number;
}

interface SubmissionStats {
    totalSubmissions: number;
    acceptedSubmissions: number;
    lastSubmissionDate: string;
    submissionFrequency: string;
    regularityStatus: string;
}

interface User {
    vjudge_id?: string;
    full_name: string;
}

interface BatchStatsItem {
    vjudge_id: string;
    full_name: string;
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
    submissionFrequency: number;
    lastSubmissionDate: string;
    irregular: boolean;

}

export async function fetchSubmissionData(
    username: string,
    contestId: string,
    days: number = 7,
    sessionId: string = ""
): Promise<{
    dailySubmissions: DailySubmissions[];
    stats: SubmissionStats;
    personalSubmissions: Submission[];
    contestSubmissions: Submission[];
}> {
    const cutoffDate = subDays(new Date(), days).getTime();
    console.log(cutoffDate.toString());
    const personalSubmissions = await fetchAllPersonalSubmissions(username, cutoffDate, sessionId);

    const contestSubmissions = await fetchAllContestSubmissions(contestId, cutoffDate, sessionId);
    const userContestSubmissions = contestSubmissions.filter((submission) => submission.userName === username);

    const allSubmissions = [...personalSubmissions, ...userContestSubmissions];

    const dailySubmissions = groupSubmissionsByDay(allSubmissions, personalSubmissions, userContestSubmissions);
    console.log(days);
    const stats = calculateStats(allSubmissions, personalSubmissions, userContestSubmissions, days);

    return {
        dailySubmissions,
        stats,
        personalSubmissions,
        contestSubmissions: userContestSubmissions,
    };
}

async function fetchAllPersonalSubmissions(
    username: string,
    cutoffDate: number,
    sessionId: string = ""
): Promise<Submission[]> {
    let allSubmissions: Submission[] = [];
    let start = 0;
    const length = 20;
    let hasMoreData = true;

    while (hasMoreData) {
        const url = `https://vjudge.net/status/data?draw=1&start=${start}&length=${length}&un=${username}&OJId=All&probNum=&res=1&language=&onlyFollowee=false&orderBy=run_id&_=${Date.now()}`;

        try {
            const headers: Record<string, string> = {};
            if (sessionId) {
                headers["Cookie"] = sessionId;
            }

            const response = await fetch(url, { headers });

            if (!response.ok) {
                console.error(`API error: ${response.status} ${response.statusText}`);
                hasMoreData = false;
                break;
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                hasMoreData = false;
                break;
            }

            const validSubmissions = data.data.filter(
                (submission: Submission) => submission && typeof submission.time === "number" && !isNaN(submission.time)
            );
            validSubmissions.sort((a: Submission, b: Submission) => b.time - a.time);

            if (validSubmissions.length > 0) {
                const oldestSubmissionTime = validSubmissions[validSubmissions.length - 1].time;
                if (oldestSubmissionTime < cutoffDate) {
                    const filteredBatch = validSubmissions.filter((submission: Submission) => submission.time >= cutoffDate);
                    allSubmissions = [...allSubmissions, ...filteredBatch];
                    hasMoreData = false;
                    break;
                }

                allSubmissions = [...allSubmissions, ...validSubmissions];
            }

            start += length;

            if (start > 500) {
                hasMoreData = false;
            }
        } catch (error) {
            console.error("Error fetching personal submissions:", error);
            hasMoreData = false;
        }
    }

    return allSubmissions;
}

async function fetchAllContestSubmissions(
    contestId: string,
    cutoffDate: number,
    sessionId: string = ""
): Promise<Submission[]> {
    let allSubmissions: Submission[] = [];
    let start = 0;
    const length = 20;
    let hasMoreData = true;

    while (hasMoreData) {
        const url = `https://vjudge.net/status/data?draw=1&start=${start}&length=${length}&un=&num=-&res=1&language=&inContest=true&contestId=${contestId}&_=${Date.now()}`;

        try {
            const myHeaders = new Headers();

            myHeaders.append("Cookie", "JSESSIONID=" + sessionId + ";");
            const requestOptions = {
                method: "GET",
                headers: myHeaders,
                credentials: "include" as RequestCredentials,
                redirect: "follow" as RequestRedirect
            };
            const response = await fetch(url, requestOptions);
            if (!response.ok) {
                console.error(`API error: ${response.status} ${response.statusText}`);
                hasMoreData = false;
                break;
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                hasMoreData = false;
                break;
            }

            const validSubmissions = data.data.filter(
                (submission: Submission) => submission && typeof submission.time === "number" && !isNaN(submission.time)
            );

            if (validSubmissions.length > 0) {
                const oldestSubmissionTime = validSubmissions[validSubmissions.length - 1].time;
                if (oldestSubmissionTime < cutoffDate) {
                    const filteredBatch = validSubmissions.filter((submission: Submission) => submission.time >= cutoffDate);
                    allSubmissions = [...allSubmissions, ...filteredBatch];
                    hasMoreData = false;
                    break;
                }

                allSubmissions = [...allSubmissions, ...validSubmissions];
            }

            start += length;

            if (start > 500) {
                hasMoreData = false;
            }
        } catch (error) {
            console.error("Error fetching contest submissions:", error);
            hasMoreData = false;
        }
    }

    return allSubmissions;
}

function groupSubmissionsByDay(
    allSubmissions: Submission[],
    personalSubmissions: Submission[],
    contestSubmissions: Submission[]
): DailySubmissions[] {
    const submissionsByDay: Record<string, { personalCount: number, contestCount: number }> = {};

    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = subDays(today, i);
        const dateStr = format(date, "MMM dd");
        submissionsByDay[dateStr] = { personalCount: 0, contestCount: 0 };
    }

    personalSubmissions.forEach((submission) => {
        try {
            if (!submission.time) return;

            const submissionDate = new Date(submission.time);
            if (isNaN(submissionDate.getTime())) return;

            const date = format(submissionDate, "MMM dd");
            if (submissionsByDay[date]) {
                submissionsByDay[date].personalCount++;
            } else {
                submissionsByDay[date] = { personalCount: 1, contestCount: 0 };
            }
        } catch (error) {
            console.error("Error processing personal submission date:", error);
        }
    });

    contestSubmissions.forEach((submission) => {
        try {
            if (!submission.time) return;

            const submissionDate = new Date(submission.time);
            if (isNaN(submissionDate.getTime())) return;

            const date = format(submissionDate, "MMM dd");
            if (submissionsByDay[date]) {
                submissionsByDay[date].contestCount++;
            } else {
                submissionsByDay[date] = { personalCount: 0, contestCount: 1 };
            }
        } catch (error) {
            console.error("Error processing contest submission date:", error);
        }
    });

    return Object.entries(submissionsByDay)
        .map(([date, counts]) => ({
            date,
            personalCount: counts.personalCount,
            contestCount: counts.contestCount,
        }))
        .sort((a, b) => {
            try {
                const dateA = new Date(`${a.date}, ${new Date().getFullYear()}`);
                const dateB = new Date(`${b.date}, ${new Date().getFullYear()}`);
                return dateA.getTime() - dateB.getTime();
            } catch (error) {
                console.error("Error sorting dates:", error);
                return 0;
            }
        });
}

function calculateStats(
    allSubmissions: Submission[],
    personalSubmissions: Submission[],
    contestSubmissions: Submission[],
    tot_days: number
): SubmissionStats {
    const totalSubmissions = allSubmissions.length;
    const acceptedSubmissions = allSubmissions.filter((submission) => submission.status === "Accepted").length;

    let lastSubmissionDate = "No submissions";
    try {
        const validSubmissions = allSubmissions.filter(
            (submission) => submission.time && !isNaN(new Date(submission.time).getTime())
        );

        if (validSubmissions.length > 0) {
            const lastSubmissionTime = Math.max(...validSubmissions.map((submission) => submission.time));
            lastSubmissionDate = format(new Date(lastSubmissionTime), "MMM dd, yyyy");
        }
    } catch (error) {
        console.error("Error calculating last submission date:", error);
    }

    const submissionFrequency = (totalSubmissions / tot_days).toFixed(1);
    console.log(totalSubmissions, tot_days, submissionFrequency);

    let regularityStatus = "Irregular";
    if (parseFloat(submissionFrequency) >= 1) {
        regularityStatus = "Regular";
    } else if (parseFloat(submissionFrequency) >= 0.5) {
        regularityStatus = "Needs Monitoring";
    }

    return {
        totalSubmissions,
        acceptedSubmissions,
        lastSubmissionDate,
        submissionFrequency,
        regularityStatus,
    };
}

export async function fetchBatchStatistics(
    users: any[],
    contestId: string,
    days: number = 7,
    sessionId: string = ""
): Promise<BatchStatsItem[]> {
    console.log(days);
    const cutoffDate = subDays(new Date(), days).getTime();
    const batchStats: BatchStatsItem[] = [];

    for (const user of users) {
        if (!user.vjudge_id) continue;

        try {
            const data = await fetchSubmissionData(user.vjudge_id, contestId, days, sessionId);

            const stats = data.stats;
            console.log(stats);
            batchStats.push({
                vjudge_id: user.vjudge_id,
                full_name: user.full_name,
                totalSubmissions: stats.totalSubmissions,
                acceptedSubmissions: stats.acceptedSubmissions,
                acceptanceRate: (stats.acceptedSubmissions / stats.totalSubmissions) * 100 || 0,
                submissionFrequency: parseFloat(stats.submissionFrequency),
                lastSubmissionDate: stats.lastSubmissionDate,
                irregular: stats.regularityStatus !== "Regular",
            });
        } catch (error) {
            console.error(`Error fetching data for user ${user.vjudge_id}:`, error);
            batchStats.push({
                vjudge_id: user.vjudge_id,
                full_name: user.full_name,
                totalSubmissions: 0,
                acceptedSubmissions: 0,
                acceptanceRate: 0,
                submissionFrequency: 0,
                lastSubmissionDate: "N/A",
                irregular: true,
            });
        }
    }

    return batchStats;
}