import "server-only";

import { cookies } from "next/headers";

const authCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export async function setAuthCookies(token, admin) {
  const cookieStore = await cookies();

  cookieStore.set("token", token, authCookieOptions);
  cookieStore.set("admin", String(Boolean(admin)), authCookieOptions);
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  const expiredCookieOptions = {
    ...authCookieOptions,
    maxAge: 0,
  };

  cookieStore.set("token", "", expiredCookieOptions);
  cookieStore.set("admin", "", expiredCookieOptions);
}
