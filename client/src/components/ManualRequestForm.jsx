"use client"
import { useTransition } from 'react'
import { toast } from 'sonner'

export function ManualRequestForm({ action, disabled }) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (disabled) return
        const form = e.currentTarget
        const fd = new FormData(form)
        startTransition(async () => {
          const id = toast.loading('Submitting request...')
          try {
            const res = await action(fd)
            if (res?.error) {
              toast.error(res.error, { id })
              return
            }
            form.reset()
            toast.success('Manual team request submitted', { id })
          } catch (err) {
            console.error(err)
            toast.error('Submission failed', { id })
          }
        })
      }}
      className="space-y-8 bg-card border border-border rounded-3xl p-8 shadow-sm"
      aria-disabled={disabled}
    >
      <fieldset disabled={isPending || disabled} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Proposed Team Title (optional)</label>
            <input name="proposed_team_title" placeholder="e.g. Dynamic Trio" className="w-full px-4 py-2 rounded-xl border bg-background/50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Member Vjudge IDs (comma separated)</label>
            <input name="desired_member_vjudge_ids" placeholder="alice,bob,charlie" className="w-full px-4 py-2 rounded-xl border bg-background/50" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Note / Rationale</label>
            <textarea name="note" rows={4} placeholder="All members agree." className="w-full px-4 py-3 rounded-xl border bg-background/50 resize-none" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-xs text-muted-foreground space-y-2">
            <p><span className="font-semibold">Guidelines:</span></p>
            <ul className="list-disc ml-4 space-y-1">
              <li>List only vjudge IDs (no spaces)</li>
              <li>Admins may partially adjust membership</li>
            </ul>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <p><span className="font-semibold">After Submission:</span></p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Admin reviews for fairness</li>
              <li>Approved team appears under teams list</li>
              <li>Conflicts resolved by admin decision</li>
              <li>Duplicate or spam requests ignored</li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isPending ? 'Submitting...' : 'Submitting does not guarantee approval.'}</span>
          <button type="submit" disabled={isPending || disabled} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </fieldset>
    </form>
  )
}
