'use client';

import { useState } from 'react';
import { TrainerVisualProvider } from '@/components/TrainerVisualContext';
import TrainerActionGroup from '@/app/classroom/live/[id]/TrainerActionGroup';
import radiusStyles from '@/app/classroom/live/[id]/TrainerClassroomRadius.module.css';
import { Button } from '@/components/ui/button';
import { AnimatedCollapsibleContent } from '@/components/ui/animated-collapsible';
import { RefreshCw, ShieldCheck, Eye, Calendar, ChevronRight, History, Library } from '@/components/ui/heroicons-animated/TrainerClassroomIcons';

export default function ActionLensPreview() {
  const [lastAction, setLastAction] = useState('No action yet');
  const [contestSourcesOpen, setContestSourcesOpen] = useState(false);
  return (
    <TrainerVisualProvider enabled>
      <main className={`${radiusStyles.surface} mx-auto min-h-screen max-w-4xl space-y-10 bg-background px-6 py-12 text-foreground`}>
        <div><h1 className="text-2xl font-semibold">Classroom action lens preview</h1><p className="mt-2 text-muted-foreground">Isolated controls with sample actions.</p></div>
        <TrainerActionGroup aria-label="Report actions" className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setLastAction('Refreshed')}><RefreshCw />Refresh</Button>
          <Button onClick={() => setLastAction('Generated report')}><ShieldCheck />Generate report</Button>
          <Button variant="outline" onClick={() => setLastAction('Shared')}><Eye />Share</Button>
        </TrainerActionGroup>
        <div className="max-w-[240px]">
          <TrainerActionGroup aria-label="Wrapped classroom actions" className="flex flex-wrap gap-2 rounded-lg">
            <Button variant="ghost" onClick={() => setLastAction('History')}><History />History</Button>
            <Button variant="ghost" onClick={() => setLastAction('Resources')}><Library />Resources</Button>
            <Button variant="ghost" onClick={() => setLastAction('Schedule')}><Calendar />Schedule</Button>
            <Button disabled>Unavailable</Button>
          </TrainerActionGroup>
        </div>
        <section className="max-w-xl rounded-2xl border bg-card">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setContestSourcesOpen((open) => !open)}
            aria-expanded={contestSourcesOpen}
            aria-controls="preview-contest-sources"
          >
            <span className="font-semibold">Contest sources</span>
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none ${contestSourcesOpen ? 'rotate-90' : ''}`} />
          </button>
          <AnimatedCollapsibleContent open={contestSourcesOpen} id="preview-contest-sources">
            <div className="border-t px-4 py-5 text-sm text-muted-foreground">Three configured contest sources</div>
          </AnimatedCollapsibleContent>
        </section>
        <p role="status">{lastAction}</p>
      </main>
    </TrainerVisualProvider>
  );
}
