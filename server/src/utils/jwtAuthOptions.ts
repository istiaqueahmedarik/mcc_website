export function jwtAuthOptions() {
  return {
    secret: process.env.SECRET || "",
    alg: "HS256" as const,
    cookie: "token",
  };
}
