"use server"

export async function serverFetchContestData(contestId, sessionId) {
    if (!contestId || isNaN(Number(contestId))) {
        throw new Error("Invalid contest ID");
    }
    console.log("Fetching contest data for contest ID:", contestId , "with session ID:", sessionId);
    if (!sessionId) {
        throw new Error("Invalid session ID");
    }
    const myHeaders = new Headers();
    myHeaders.append("Cookie", "JSESSIONID=" + sessionId + ";");
    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        credentials: "include",
        redirect: "follow",
    };
    const response = await fetch(
        `https://vjudge.net/contest/rank/single/${contestId}`,
        requestOptions
    );
    if (!response.ok) {
        throw new Error("Failed to fetch contest data");
    }
    return response.json();
}
