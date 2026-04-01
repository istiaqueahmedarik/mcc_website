import { ExternalLink, GitFork, Star, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const OWNER = process.env.GITHUB_REPO_OWNER;
const REPO = process.env.GITHUB_REPO_NAME;
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;

export const metadata = {
  title: "Project Developers | MIST Computer Club",
  description: "See who contributed to the MCC website project on GitHub.",
};

async function getRepoData() {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const [contributorsRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contributors?per_page=100`, {
      headers,
      next: { revalidate: 3600 },
    }),
    fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
      headers,
      next: { revalidate: 3600 },
    }),
  ]);

  const contributorsJson = await contributorsRes.json().catch(() => []);
  const repoJson = await repoRes.json().catch(() => ({}));

  const contributors = Array.isArray(contributorsJson)
    ? contributorsJson
        .filter((item) => item && item.type === "User")
        .map((item) => ({
          id: item.id,
          login: item.login,
          profileUrl: item.html_url,
          avatarUrl: item.avatar_url,
          contributions: item.contributions || 0,
        }))
    : [];

  const hasError = !contributorsRes.ok || !repoRes.ok;

  return {
    contributors,
    stats: {
      stars: repoJson?.stargazers_count ?? 0,
      forks: repoJson?.forks_count ?? 0,
      watchers: repoJson?.subscribers_count ?? 0,
    },
    error: hasError
      ? "Could not load fresh data from GitHub right now."
      : null,
  };
}

export default async function DevelopersPage() {
  const { contributors, stats, error } = await getRepoData();
  
  return (
    <main className="w-full bg-background text-foreground">
      <section className="mx-auto w-full max-w-7xl p-4">
        <div className="mb-8 rounded-2xl flex flex-col items-center bg-card p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Open Source Team
          </p>
          <h1 className="mt-2 text-3xl font-bold uppercase tracking-wide md:text-4xl">
            Project Developers
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">
            Contributors are fetched from GitHub and refreshed every hour.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 font-medium transition hover:bg-accent hover:text-blue-500"
            >
              View Repository <ExternalLink className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">
              <Star className="h-4 w-4" /> {stats.stars} Stars
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">
              <GitFork className="h-4 w-4" /> {stats.forks} Forks
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">
              <Users className="h-4 w-4" /> {contributors.length} Contributors
            </span>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {error}
            </p>
          )}
        </div>

        {contributors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            No contributor data available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {contributors.map((dev) => (
              <article
                key={dev.id}
                className="rounded-md border border-border bg-card p-5 transition hover:bg-accent/40"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={dev.avatarUrl}
                    alt={`${dev.login} avatar`}
                    width={56}
                    height={56}
                    className="rounded-full"
                  />
                  <div>
                    <h2 className="text-lg font-semibold">{dev.login}</h2>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      GitHub Contributor
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="rounded-md border border-border bg-background px-3 py-1 font-medium text-muted-foreground">
                    {dev.contributions} commits
                  </span>
                  <Link
                    href={dev.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline hover:text-blue-500"
                  >
                    Profile <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
