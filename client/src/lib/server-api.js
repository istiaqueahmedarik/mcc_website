import { cookies } from "next/headers";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

export async function getServerJsonWithToken(path) {
  const token = (await cookies()).get("token");
  if (!token) {
    return { error: "Unauthorized" };
  }

  if (!serverBase) {
    return { error: "Server URL is not configured" };
  }

  try {
    const response = await fetch(`${serverBase}/${path.replace(/^\/+/, "")}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      cache: "no-store",
    });
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch (error) {
      return { error: text || "An error occurred " + error };
    }
  } catch (error) {
    return { error: error?.message || "Failed to reach server" };
  }
}
