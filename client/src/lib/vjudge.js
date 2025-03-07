'use server'
import { format, subDays } from "date-fns";
import { cookies } from "next/headers";



export async function fetchSubmissionData(username, contestId, days = 7, sessionId = "") {
    const cutoffDate = subDays(new Date(), days).getTime();
    console.log(cutoffDate.toLocaleString());
    const personalSubmissions = await fetchAllPersonalSubmissions(username, cutoffDate, sessionId);

    const contestSubmissions = await fetchAllContestSubmissions(contestId, cutoffDate, sessionId);
    const userContestSubmissions = contestSubmissions.filter((submission) => submission.userName === username);
    console.log(contestSubmissions);

    const allSubmissions = [...personalSubmissions, ...userContestSubmissions];

    const dailySubmissions = groupSubmissionsByDay(allSubmissions, personalSubmissions, userContestSubmissions);

    const stats = calculateStats(allSubmissions, personalSubmissions, userContestSubmissions, days);

    return {
        dailySubmissions,
        stats,
        personalSubmissions,
        contestSubmissions: userContestSubmissions,
    };
}

async function fetchAllPersonalSubmissions(username, cutoffDate, sessionId = "") {
    let allSubmissions = [];
    let start = 0;
    const length = 20;
    let hasMoreData = true;

    while (hasMoreData) {
        const url = `https://vjudge.net/status/data?draw=1&start=${start}&length=${length}&un=${username}&OJId=All&probNum=&res=1&language=&onlyFollowee=false&orderBy=run_id&_=${Date.now()}`;

        try {
            const headers = {};
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
                (submission) => submission && typeof submission.time === "number" && !isNaN(submission.time)
            );
            validSubmissions.sort((a, b) => b.time - a.time);
            if (validSubmissions.length > 0) {
                const oldestSubmissionTime = validSubmissions[validSubmissions.length - 1].time;
                if (oldestSubmissionTime < cutoffDate) {
                    const filteredBatch = validSubmissions.filter((submission) => submission.time >= cutoffDate);
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

async function fetchAllContestSubmissions(contestId, cutoffDate, sessionId = "") {
    let allSubmissions = [];
    let start = 0;
    const length = 20;
    let hasMoreData = true;

    while (hasMoreData) {
        const url = `https://vjudge.net/status/data?draw=1&start=${start}&length=${length}&un=&num=-&res=1&language=&inContest=true&contestId=${contestId}&_=${Date.now()}`;

        try {
            const myHeaders = new Headers();
            
            myHeaders.append("Cookie", "JSESSIONID=" + sessionId + ";");
            (await cookies()).set("JSESSIONID", sessionId);
            console.log(myHeaders);
            const requestOptions = {
                method: "GET",
                headers: myHeaders,
                credentials: "include",
                redirect: "follow"
            };
            const response = await fetch(url, requestOptions);
            console.log(response);
            if (!response.ok) {
                console.error(`API error: ${response.status} ${response.statusText}`);
                hasMoreData = false;
                break;
            }

            const data = await response.json();
            console.log(data);

            if (!data.data || data.data.length === 0) {
                hasMoreData = false;
                break;
            }

            const validSubmissions = data.data.filter(
                (submission) => submission && typeof submission.time === "number" && !isNaN(submission.time)
            );
            
            if (validSubmissions.length > 0) {
                const oldestSubmissionTime = validSubmissions[validSubmissions.length - 1].time;
                if (oldestSubmissionTime < cutoffDate) {
                    const filteredBatch = validSubmissions.filter((submission) => submission.time >= cutoffDate);
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

function groupSubmissionsByDay(allSubmissions, personalSubmissions, contestSubmissions) {
    const submissionsByDay = {};

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

function calculateStats(allSubmissions, personalSubmissions, contestSubmissions, days) {
    const totalSubmissions = allSubmissions.length;
    console.log(totalSubmissions);
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

    const submissionFrequency = totalSubmissions / days;

    let regularityStatus = "Irregular";
    if (submissionFrequency >= 1) {
        regularityStatus = "Regular";
    } else if (submissionFrequency >= 0.5) {
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