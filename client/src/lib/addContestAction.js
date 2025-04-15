"use server";

export async function addContestAction(formData) {
  const contestId = formData.get("contestId"); 
  const sessionId = formData.get("sessionId"); 
  if (!contestId || isNaN(Number(contestId))) {
    throw new Error("Invalid contest ID");
  } 
 
  const myHeaders = new Headers();

  myHeaders.append("Cookie", "JSESSIONID=" + sessionId + ";");
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    credentials: "include",
    redirect: "follow"
  };
  const response = await fetch(
    `https://vjudge.net/contest/rank/single/${contestId}`,
    requestOptions
  );
  console.log(response  );
  if (!response.ok) {
    throw new Error("Failed to fetch contest details");
  }
  const contestData = await response.json();
  return contestData;
}
