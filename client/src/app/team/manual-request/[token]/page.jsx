import { getCollectionPublicByToken, getParticipationState, submitTeamRequest } from '@/actions/team_collection'
import { getVjudgeID } from '@/lib/action'
import { revalidatePath } from 'next/cache'
import { ManualRequestForm } from '@/components/ManualRequestForm'

export const dynamic = 'force-dynamic'

export default async function ManualRequestPage({ params }) {
  const { token } = await params
  const res = await getCollectionPublicByToken(token)
  if(res?.error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
        <p className="text-muted-foreground text-sm">This manual request link is invalid or expired.</p>
      </div>
    </div>
  )
  const col = res.result
  const me = await getVjudgeID()
  const myVj = me?.vjudge_id || null
  const rank = Array.isArray(col.rankOrder) ? col.rankOrder : []
  const myIdx = myVj ? rank.indexOf(myVj) : -1
  let will_participate = false
  try { if(col.id){ const pr = await getParticipationState(col.id); if(pr?.success) will_participate = !!pr.result } } catch {}
  const isParticipant = will_participate && myIdx >= 0
  const phase = col.phase || (col.finalized ? 3 : (col.is_open ? 2 : 1))

  async function requestManualTeam(formData){
    'use server'
    const proposed_team_title = formData.get('proposed_team_title')
    const membersCsv = formData.get('desired_member_vjudge_ids') || ''
    const desired_member_vjudge_ids = membersCsv.split(',').map(s=>s.trim()).filter(Boolean)
    const note = formData.get('note')
    if(desired_member_vjudge_ids.length!=3){ return { error: 'Exactly three members required' } }
    try {
      const res = await submitTeamRequest(col.id, proposed_team_title, desired_member_vjudge_ids, note)
      if(res?.error){
        return { error: res.error }
      }
      revalidatePath(`/team/manual-request/${token}`)
      return { success: true }
    } catch (e){
      return { error: 'Submission failed' }
    }
  }

  const disabledReason = !myVj
    ? 'You must have a Vjudge ID set in your profile.'
    : (phase === 1)
      ? 'Manual requests open after participation phase (Phase 2 or 3).'
      : null
  const disabled = !!disabledReason

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10 text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Manual Team Request</h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">Submit a fixed team formation request. All requested members should also have compatible choices or agree out-of-band. Admins may approve directly, creating the team.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium bg-muted/40">
            <span>Collection:</span>
            <span className="font-semibold">{col.title || 'Untitled'}</span>
            <span className="opacity-50">•</span>
            <span>Phase {phase}</span>
          </div>
        </div>

        {disabled && (
          <div className="mb-8 p-4 rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground">
            <span className="font-medium">Request Disabled:</span> {disabledReason}
          </div>
        )}

  <ManualRequestForm action={requestManualTeam} disabled={disabled} myVjudge={myVj} />
       
      </div>
    </div>
  )
}
