"use client";

import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProgressLink from "@/components/ProgressLink";
import TrainerViewTransition from "@/components/TrainerViewTransition";
import { ClassroomCardTransition, useClassroomNavigation } from "@/components/ClassroomCardTransition";

// Used by both the route fallback and the existing client-side data loader.
export default function ClassroomOpening() {
  const { id: classroomId } = useParams();
  const { preview } = useClassroomNavigation();
  if (!preview || preview.id !== classroomId) {
    return <div className="flex min-h-screen items-center justify-center bg-background py-20" role="status"><span className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">Opening classroom…</span></div>;
  }
  return (
      <TrainerViewTransition>
        <div className="min-h-screen bg-background text-foreground">
          <main className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8" aria-busy="true">
            <ProgressLink href="/trainer/dashboard" className="inline-flex h-8 w-fit items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/85">
              <ArrowLeft className="h-4 w-4" /> Trainer dashboard
            </ProgressLink>
            <ClassroomCardTransition classroomId={classroomId}>
              <section className="flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <ClassroomCardTransition classroomId={classroomId} title>
                    <h1 className="break-words text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">{preview.name}</h1>
                  </ClassroomCardTransition>
                  <p className="text-sm text-muted-foreground" role="status">Opening classroom…</p>
                </div>
              </section>
            </ClassroomCardTransition>
            <div className="h-48 rounded-xl border border-border/60 bg-muted/30" aria-hidden="true" />
          </main>
        </div>
      </TrainerViewTransition>
  );
}
