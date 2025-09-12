"use client";
import { useTransition } from 'react'
import { toast } from 'sonner'

export default function RenameTeamClient({ serverAction }) {
  const [pending, startTransition] = useTransition()
  return (
    <form
      onSubmit={(e)=>{
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const id = toast.loading('Renaming team...')
        startTransition(async ()=>{
          try {
            await serverAction(fd)
            toast.success('Team renamed', { id })
          } catch (err){
            console.error(err)
            toast.error('Failed to rename team', { id })
          }
        })
      }}
      className="flex items-center gap-3 bg-secondary/80 rounded-2xl p-4 border border-border/50"
    >
      <input
        name="new_title"
        placeholder="New team name"
        disabled={pending}
        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground font-medium"
      />
      <button
        disabled={pending}
        className="bg-[hsl(var(--brand))] text-white rounded-xl px-6 py-2.5 font-medium hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-60"
      >
        {pending ? 'Renaming...' : 'Rename'}
      </button>
    </form>
  )
}
