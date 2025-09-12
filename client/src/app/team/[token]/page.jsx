import { getCollectionPublicByToken, submitTeamChoices, myChoiceForToken, getParticipationState } from "@/actions/team_collection"
import { getVjudgeID } from "@/lib/action"
import { revalidatePath } from "next/cache"
import { TeamSelectForm } from "@/components/TeamSelectForm"
import { DeadlineCountdown } from "@/components/DeadlineCountdown"

export const dynamic = "force-dynamic"

export default async function Page({ params }) {
  const { token } = await params
  const res = await getCollectionPublicByToken(token)
  if (res?.error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-3xl shadow-lg border border-border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-card-foreground mb-2">Invalid Link</h2>
          <p className="text-muted-foreground">This team selection link is invalid or has expired.</p>
        </div>
      </div>
    )

  const col = res.result
  const existing = await myChoiceForToken(token)
  const myChoice = existing?.result || null
  const me = await getVjudgeID()
  const myVj = me?.vjudge_id || null
  const rank = Array.isArray(col.rankOrder) ? col.rankOrder : []
  const performance = col.performance || {}
  const myIdx = myVj ? rank.indexOf(myVj) : -1
  // Participation (explicit) state; if request fails treat as false
  let will_participate = false
  try {
    const partRes = col.id ? await getParticipationState(col.id) : null
    if (partRes && partRes.success) will_participate = !!partRes.result
  } catch (e) { }
  const isParticipant = will_participate && myIdx >= 0
  const phase = col.phase || (col.finalized ? 3 : (col.is_open ? 2 : 1))

  // Only compute eligible list during phase 2 and if participant
  let eligible = []
  if (phase === 2 && isParticipant) {
    eligible = rank.slice(myIdx + 1)
    const myEff = performance?.[myVj]?.effectiveSolved
    if (typeof myEff === "number") {
      let within = eligible.filter((vj) => {
        const eff = performance?.[vj]?.effectiveSolved
        return typeof eff === "number" && eff >= myEff - 5 && eff <= myEff + 5
      })
      if (within.length < 5) {
        for (const vj of eligible) {
          if (within.length >= 5) break
          if (!within.includes(vj)) within.push(vj)
        }
      }
      eligible = within
    }
  }
  const UI_MIN = 2
  const UI_MAX = 5
  const SUBMIT_MIN = 5
  const SUBMIT_MAX = 5

  async function submit(formData) { "use server"; const title = formData.get("team_title"); const choices = (formData.get("choices") || "").split(",").map((s) => s.trim()).filter(Boolean); const min = SUBMIT_MIN; const max = SUBMIT_MAX; const out = await submitTeamChoices(token, title, choices, min, max); revalidatePath(`/team/${token}`); return out }


  const getStatusColor = () => {
    if (col.finalized) return "bg-accent/10 text-accent border-accent/20"
    if (col.is_open) return "bg-primary/10 text-primary border-primary/20"
    return "bg-muted text-muted-foreground border-border"
  }

  const getStatusIcon = () => {
    if (col.finalized)
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    if (col.is_open)
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    )
  }

  // Phase specific banners
  const PhaseBanner = () => {
    if (phase === 1) {
      return (
        <div className="bg-accent border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-1">Participation Phase In Progress</h3>
              <p className="text-sm text-blue-700 leading-relaxed mb-3">Admin has not started team selection yet. Toggle your participation from your profile page. Once Phase 2 starts, you can submit team preferences here.</p>
              {col.phase1_deadline && (
                <div className="flex items-center gap-2 text-xs">
                  <DeadlineCountdown iso={col.phase1_deadline} mode="participation" />
                  <span className="text-blue-700/70">Ends {new Date(col.phase1_deadline).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }
    if (phase === 2 && !isParticipant) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">You Are Not Participating</h3>
              <p className="text-sm text-amber-700 leading-relaxed">You did not opt into this contest before selection began. You can view information but cannot submit choices.</p>
            </div>
          </div>
        </div>
      )
    }
    if (phase === 2 && isParticipant && !col.is_open && !col.finalized) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">Selection Paused</h3>
              <p className="text-sm text-amber-700 leading-relaxed">Admin temporarily closed submissions. Your existing preferences are saved.</p>
            </div>
          </div>
        </div>
      )
    }
    if (phase === 3 && !col.finalized) {
      return null
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">Team Selection</h1>
          <p className="text-xl text-muted-foreground mb-6">{col.title || "Room"}</p>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${getStatusColor()}`}
          >
            {getStatusIcon()}
            {col.finalized ? "Finalized" : col.is_open ? "Open for Selection" : "Closed"}
          </div>
        </div>

        <PhaseBanner />

        {/* Current Submission Display */}
        {myChoice && (
          <div className="bg-card border border-border rounded-3xl p-8 mb-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-card-foreground mb-4">Your Current Submission</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Team Title:</span>
                    <span className="font-semibold text-card-foreground bg-primary/5 px-3 py-1 rounded-full text-sm">
                      {myChoice.team_title}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px] mt-1">Choices:</span>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(myChoice.ordered_choices)
                        ? myChoice.ordered_choices.map((choice, index) => (
                          <span
                            key={choice}
                            className="bg-secondary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                          >
                            {index + 1}. {choice}
                          </span>
                        ))
                        : null}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 bg-muted/50 px-4 py-2 rounded-xl">
                  💡 You can resubmit to update your choices while the collection remains open.
                </p>
              </div>
            </div>
          </div>
        )}

        {phase === 2 && col.is_open && !col.finalized && isParticipant && (
          <TeamSelectForm
            submitAction={submit}
            myChoice={myChoice}
            isParticipant={isParticipant}
            eligible={eligible}
            performance={performance}
            UI_MIN={UI_MIN}
            UI_MAX={UI_MAX}
            SUBMIT_MIN={SUBMIT_MIN}
            SUBMIT_MAX={SUBMIT_MAX}
            token={token}
          />
        )}
        {phase === 2 && isParticipant && !col.is_open && !col.finalized && (
          <p className="text-center text-sm text-muted-foreground">Waiting for admin to reopen or finalize.</p>
        )}
      </div>
    </div>
  )
}
