import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MarkdownRender from "@/components/MarkdownRenderer";
import ProgressLink from "@/components/ProgressLink";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString();
}

function readingMinutes(content) {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  if (!words) return "Link resource";
  return `${Math.max(Math.ceil(words / 220), 1)} min read`;
}

async function getResource(classroomId, resourceId, token) {
  const res = await fetch(`${serverBase}/classroom/${classroomId}/resources/${resourceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

export default async function ResourceReaderPage({ params }) {
  const { id, resourceId } = await params;
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/login");

  const result = await getResource(id, resourceId, token);
  if (!result.ok || result.json?.error) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <ProgressLink href={`/classroom/live/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to classroom
          </ProgressLink>
          <section className="mt-10 rounded-lg border border-dashed bg-card p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-bold">Resource unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.json?.error || "This resource could not be loaded."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const { resource, classroom, classItem } = result.json;
  const hasContent = Boolean(resource.content);

  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <ProgressLink href={`/classroom/live/${id}`} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to classroom
        </ProgressLink>

        <header className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Classroom resource
            </Badge>
            {classItem && (
              <Badge variant="outline" className="capitalize text-muted-foreground">
                {classItem.name}
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              {readingMinutes(resource.content)}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
            {resource.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span>{classroom.name}</span>
            <span>Shared {formatDate(resource.created_at)}</span>
          </div>
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex max-w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/40"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate">Open source link</span>
            </a>
          )}
        </header>

        {hasContent ? (
          <MarkdownRender
            allowRawHtml={false}
            className="prose-lg prose-pre:max-w-full prose-pre:overflow-x-auto prose-a:break-words"
            content={resource.content}
            useDefaultWidth={false}
          />
        ) : (
          <section className="rounded-lg border border-dashed bg-card p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold">Link-only resource</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              This resource is an external link. Open it from the button above.
            </p>
            {resource.url && (
              <a href={resource.url} target="_blank" rel="noreferrer" className="mt-5 inline-block">
                <Button className="gap-2 font-semibold">
                  <ExternalLink className="h-4 w-4" />
                  Open resource
                </Button>
              </a>
            )}
          </section>
        )}
      </article>
    </main>
  );
}
