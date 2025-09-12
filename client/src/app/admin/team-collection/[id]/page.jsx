import {
  adminFinalizeTeamCollection,
  adminUnfinalizeTeamCollection,
  adminGetCollectionDetail,
  adminPreviewCollection,
  adminApproveManualTeam,
  adminDeleteTeam,
  adminRemoveMember,
  adminRenameTeam,
  adminListTeamRequests,
  adminProcessTeamRequest,
} from "@/actions/team_collection"
import { TeamActionForm } from "@/components/TeamActionForm"
import CoachAssignInline from "@/components/CoachAssignInline"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Users, FileText, Settings, Plus, Trash2, Edit3, UserPlus, CheckCircle2, AlertCircle, Clock, FastForward, LinkIcon } from "lucide-react"
import { revalidatePath } from "next/cache"
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { get_with_token } from '@/lib/action'
import { adminSetPhase1Deadline, adminStartPhase2 } from '@/actions/team_collection'
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function Page({ params }) {
  // Admin guard (server-side)
  const cookieStore = await cookies()
  if(!cookieStore.get('token')) redirect('/login')
  const user = await get_with_token('auth/user/profile')
  if(user?.result?.length === 0) redirect('/login')
  if(user?.result?.[0]?.admin === false) redirect('/')
  const { id } = await params
  const detail = await adminGetCollectionDetail(id)
  if (detail?.error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Collection Not Found</h3>
              <p className="text-muted-foreground">The requested collection could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )

  const { collection, rankOrder, choices, teams } = detail.result || {}
  // Load manual team requests
  let teamRequests = []
  try {
    const reqRes = await adminListTeamRequests(id)
    if(reqRes?.success) teamRequests = reqRes.result || []
  } catch {}
  const preview = await adminPreviewCollection(id)
  const manualTeams = preview?.result?.manualTeams || []
  const autoTeams = preview?.result?.autoTeams || []

  async function finalize() {
    "use server"
    await adminFinalizeTeamCollection(id)
    revalidatePath(`/admin/team-collection/${id}`)
  }
  async function unfinalize() {
    "use server"
    await adminUnfinalizeTeamCollection(id)
    revalidatePath(`/admin/team-collection/${id}`)
  }

  async function approve(formData) {
    "use server"
    const title = formData.get("team_title")
    const members = (formData.get("members") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    await adminApproveManualTeam(id, title, members)
    revalidatePath(`/admin/team-collection/${id}`)
  }

  async function delTeam(formData) {
    "use server"
    const title = formData.get("team_title")
    await adminDeleteTeam(id, title)
    revalidatePath(`/admin/team-collection/${id}`)
  }

  async function removeMember(formData) {
    "use server"
    const title = formData.get("team_title")
    const member = formData.get("member")
    await adminRemoveMember(id, title, member)
    revalidatePath(`/admin/team-collection/${id}`)
  }

  async function renameTeam(formData) {
    "use server"
    const title = formData.get("team_title")
    const new_title = formData.get("new_title")
    await adminRenameTeam(id, title, new_title)
    revalidatePath(`/admin/team-collection/${id}`)
  }
  async function assignCoachAction(team_title, coach_vjudge_id) {
    "use server"
    const { adminAssignCoach } = await import("@/actions/team_collection")
    await adminAssignCoach(id, team_title, coach_vjudge_id)
    revalidatePath(`/admin/team-collection/${id}`)
  }
  async function setDeadline(formData){
    "use server"
    const deadline = formData.get('phase1_deadline')
    await adminSetPhase1Deadline(id, deadline || null)
    revalidatePath(`/admin/team-collection/${id}`)
  }
  async function startPhase2(){
    "use server"
    await adminStartPhase2(id)
    revalidatePath(`/admin/team-collection/${id}`)
  }
  function formatLocalDateTime(isoOrDate){
    try {
      const d = new Date(isoOrDate)
      const pad = (n)=>String(n).padStart(2,'0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch { return '' }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-balance">Collection Management</h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="font-medium">{collection?.title}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Contest: {collection?.room_name}
                </span>
              </div>
            </div>
            {/* Copy Links */}
            <div className="flex flex-col items-end gap-3">
              {collection?.token && (
                <div className="flex flex-col items-end text-[10px] font-mono text-muted-foreground leading-tight">
                  <span className="uppercase tracking-wide text-[9px] font-semibold mb-1 text-foreground/60">Share Links</span>
                  <Link href={`/team/${collection.token}`} className="underline break-all hover:text-primary/90 transition-colors">
                    Team Choices 
                    <LinkIcon className="inline-block w-3 h-3 mb-0.5" />
                  </Link>
                  <Link href={`/team/manual-request/${collection.token}`} className="underline break-all hover:text-primary/90 transition-colors">
                    Manual Requests
                    <LinkIcon className="inline-block w-3 h-3 mb-0.5" />
                  </Link>
                </div>
              )}
            {collection?.finalized ? (
              <TeamActionForm action={unfinalize} pending="Unfinalizing..." success="Collection unfinalized" error="Failed to unfinalize">
                <Button variant="outline" size="lg" className="gap-2 bg-transparent">
                  <AlertCircle className="h-4 w-4" />
                  Unfinalize
                </Button>
              </TeamActionForm>
            ) : (
              <TeamActionForm action={finalize} pending="Finalizing..." success="Collection finalized" error="Failed to finalize">
                <Button size="lg" className="gap-2 bg-green-400 hover:bg-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Finalize Collection
                </Button>
              </TeamActionForm>
            )}
            </div>
          </div>
          <div className="mt-4 flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Phase:</span>
              <span className="px-2 py-0.5 rounded-md bg-muted border text-xs font-mono">{collection?.phase || 1}</span>
            </div>
            {collection?.phase === 1 && !collection?.finalized && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <TeamActionForm action={setDeadline} pending="Saving..." success="Deadline set" error="Failed">
                  <input type="hidden" name="id" value={collection?.id} />
                  <div className="flex items-center gap-2">
                    <input type="datetime-local" name="phase1_deadline" defaultValue={collection?.phase1_deadline ? formatLocalDateTime(collection.phase1_deadline) : ''} className="px-2 py-1 rounded border bg-background/70" />
                    <Button variant="outline" size="sm">Set Deadline</Button>
                  </div>
                </TeamActionForm>
                <form action={startPhase2}>
                  <Button type="submit" variant="outline" size="sm" className="gap-1 bg-accent hover:bg-accent/90  text-primary/90">
                    <FastForward className="w-3 h-3" /> Start Phase 2
                  </Button>
                </form>
                {collection?.phase1_deadline && (
                  <span className="font-mono text-muted-foreground">Ends: {new Date(collection.phase1_deadline).toLocaleString()}</span>
                )}
              </div>
            )}
            {collection?.phase === 2 && (
              <span className="text-xs font-semibold text-green-600">Phase 2 Active (Team Selection)</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Submissions Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-accent" />
              Submissions
              <Badge variant="secondary" className="ml-auto">
                {choices?.length || 0} submissions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {choices?.map((ch) => (
                <div
                  key={ch.id}
                  className="p-4 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-foreground">{ch.full_name || ch.vjudge_id}</div>
                    <Badge variant="outline" className="text-xs">
                      {ch.team_title}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Choices:</span>{" "}
                    {Array.isArray(ch.ordered_choices) ? ch.ordered_choices.join(", ") : "None"}
                  </div>
                </div>
              ))}
              {!choices?.length && (
                <div className="text-center py-8 text-muted-foreground">No submissions received yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-accent" />
              Current Teams
              <Badge variant="secondary" className="ml-auto">
                {teams?.length || 0} teams
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {teams?.map((t) => {
                const availableToAdd = (rankOrder || []).filter((u) => !(t.member_vjudge_ids || []).includes(u))
                return (
                  <Card key={t.id} className="border-border/50">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{t.team_title}</h3>
                            {t.approved_by && (
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                              </Badge>
                            )}
                          </div>
                          {collection?.finalized && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Coach: <span className="font-medium">{t.coach_vjudge_id || "— not assigned —"}</span>
                            </div>
                          )}
                        </div>
                        <TeamActionForm action={delTeam} pending="Deleting team..." success="Team deleted" error="Failed to delete team">
                          <input type="hidden" name="team_title" value={t.team_title} />
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive gap-2 bg-transparent"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </TeamActionForm>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Members:</p>
                        <div className="flex flex-wrap gap-2">
                          {(t.member_vjudge_ids || []).map((member) => (
                            <Badge key={member} variant="secondary" className="px-3 py-1">
                              {member}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <details className="group/manage border border-border/40 rounded-xl bg-muted/10 overflow-hidden">
                        <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/40 transition-colors">
                          <span className="text-sm font-medium tracking-wide">Manage Team</span>
                          <span className="text-xs text-muted-foreground group-open/manage:hidden">expand</span>
                          <span className="text-xs text-muted-foreground hidden group-open/manage:inline">collapse</span>
                        </summary>
                        <div className="p-5 space-y-8">
                          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-3">
                              {availableToAdd.length ? (
                                <AddMemberForm
                                  collectionId={id}
                                  teamTitle={t.team_title}
                                  rankOrder={rankOrder}
                                  existing={t.member_vjudge_ids || []}
                                />
                              ) : (
                                <p className="text-xs text-muted-foreground">No available members to add.</p>
                              )}
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Remove Member</h4>
                              <TeamActionForm action={removeMember} pending="Removing..." success="Member removed" error="Failed to remove" >
                                <input type="hidden" name="team_title" value={t.team_title} />
                                <div className="flex-1">
                                  <Select name="member">
                                    <SelectTrigger className="h-10 rounded-md border-border/50 bg-background/60">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(t.member_vjudge_ids || []).map((m) => (
                                        <SelectItem key={m} value={m}>
                                          {m}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button variant="outline" size="sm" className="gap-2 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  Remove
                                </Button>
                              </TeamActionForm>
                            </div>
                            {/* Rename Team */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Rename Team</h4>
                              <TeamActionForm action={renameTeam} pending="Renaming..." success="Team renamed" error="Failed to rename">
                                <input type="hidden" name="team_title" value={t.team_title} />
                                <Input name="new_title" placeholder="New name" className="h-10" />
                                <Button variant="outline" size="sm" className="gap-2 text-accent">
                                  <Edit3 className="h-4 w-4" /> Rename
                                </Button>
                              </TeamActionForm>
                            </div>
                            {collection?.finalized && (
                              <div className="space-y-3 md:col-span-2 xl:col-span-1">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Assign Coach</h4>
                                <CoachAssignInline
                                  teamTitle={t.team_title}
                                  initialCoach={t.coach_vjudge_id}
                                  collectionId={id}
                                  onAssign={assignCoachAction}
                                />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground tracking-wide uppercase">All actions auto-save.</p>
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                )
              })}
              {!teams?.length && <div className="text-center py-8 text-muted-foreground">No teams created yet.</div>}
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Settings className="h-5 w-5 text-accent" />
              Auto-Generated Preview
              <Badge variant="secondary" className="ml-auto">
                {autoTeams.length} teams
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {autoTeams.map((t, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-muted/20 border border-border/50">
                  <h3 className="font-semibold mb-2">{t.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {t.members.map((member) => (
                      <Badge key={member} variant="outline" className="px-3 py-1">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              {!autoTeams.length && (
                <div className="text-center py-8 text-muted-foreground">
                  No auto teams can be formed with current submissions.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/30">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                <Plus className="h-5 w-5 text-accent" />
              </div>
              Create Team Manually
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <TeamActionForm action={approve} pending="Creating team..." success="Team created" error="Failed to create team" resetOnSuccess={true}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80 tracking-wide">Team Name</label>
                  <Input
                    name="team_title"
                    placeholder="Enter team name"
                    className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-accent/50 focus:shadow-lg focus:shadow-accent/10 hover:border-border/70 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80 tracking-wide">Team Members</label>
                  <Input
                    name="members"
                    placeholder="Comma-separated member IDs"
                    className="h-12 rounded-2xl border-2 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-200 focus:border-accent/50 focus:shadow-lg focus:shadow-accent/10 hover:border-border/70 text-base"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  className="h-12 px-8 rounded-2xl bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent/80 shadow-lg shadow-accent/20 transition-all duration-200 hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.02] gap-3 text-base font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Create Team
                </Button>
              </div>
            </TeamActionForm>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-accent" />
              Participants
              <Badge variant="secondary" className="ml-auto">
                {rankOrder?.length || 0} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {rankOrder?.map((u, i) => (
                <div
                  key={u}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-sm font-mono font-semibold text-accent">{i + 1}</span>
                  </div>
                  <span className="truncate font-medium" title={u}>
                    {u}
                  </span>
                </div>
              ))}
              {!rankOrder?.length && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No participants registered yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-accent" />
              Manual Team Requests
              <Badge variant="secondary" className="ml-auto">{teamRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {teamRequests.map(req => (
              <ManualRequestItem key={req.id} request={req} collectionId={id} />
            ))}
            {!teamRequests.length && (
              <div className="text-center py-12 text-muted-foreground text-sm">No manual requests submitted.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AddMemberForm({ collectionId, teamTitle, rankOrder, existing }) {
  async function add(formData) {
    "use server"
    const { adminApproveManualTeam } = await import("@/actions/team_collection")
    const title = formData.get("team_title")
    const member = formData.get("member")
    const existingCsv = formData.get("existing") || ""
    const current = String(existingCsv).split(",").filter(Boolean)
    const members = [...current, member].filter(Boolean)
    await adminApproveManualTeam(collectionId, title, members)
  }
  const options = (rankOrder || []).filter((u) => !existing.includes(u))

  if (!options.length) {
    return (
      <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/20 text-muted-foreground">
        <div className="p-2 rounded-lg bg-muted/40">
          <UserPlus className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">No available members to add</span>
      </div>
    )
  }

  return (
    <TeamActionForm action={add} pending="Adding member..." success="Member added" error="Failed to add member">
      <input type="hidden" name="team_title" value={teamTitle} />
      <input type="hidden" name="existing" value={(existing || []).join(",")} />
      <div className="flex-1 space-y-2">
        <label className="text-xs font-medium text-foreground/70 tracking-wide uppercase">Add Member</label>
        <Select name="member">
          <SelectTrigger className="h-11 rounded-xl border-2 border-border/50 bg-background/60 backdrop-blur-sm transition-all duration-200 hover:border-border/60 focus:border-accent/50">
            <SelectValue placeholder="Select member to add" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-2 border-border bg-background backdrop-blur-md">
            {options.map((u) => (
              <SelectItem key={u} value={u} className="rounded-lg">
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-11 px-4 rounded-xl border-2 border-accent/80 text-foreground hover:text-accent-foreground hover:bg-accent hover:border-accent transition-all duration-200 hover:shadow-lg hover:shadow-accent/20 gap-2 bg-transparent"
      >
        <UserPlus className="h-4 w-4" />
        Add
      </Button>
    </TeamActionForm>
  )
}

function ManualRequestItem({ request, collectionId }){
  async function toggleProcessed(){
    "use server"
    await adminProcessTeamRequest(request.id, !request.processed)
    revalidatePath(`/admin/team-collection/${collectionId}`)
  }
  async function approveDirect(){
    "use server"
    const { adminApproveManualTeam } = await import("@/actions/team_collection")
    const members = Array.isArray(request.desired_member_vjudge_ids) ? request.desired_member_vjudge_ids : []
    await adminApproveManualTeam(collectionId, request.proposed_team_title || `Manual-${members.slice(0,3).join('-')}`, members)
    await adminProcessTeamRequest(request.id, true)
    revalidatePath(`/admin/team-collection/${collectionId}`)
  }
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-accent/10 text-accent">{new Date(request.created_at).toLocaleString()}</span>
            {request.processed && <span className="px-2 py-0.5 rounded-md text-xs bg-green-100 text-green-700 border border-green-300">Processed</span>}
          </div>
          <div className="text-sm font-medium">From: {request.vjudge_id || 'unknown'}</div>
          <div className="text-sm">Proposed Title: <span className="font-semibold">{request.proposed_team_title || '—'}</span></div>
          <div className="text-sm">Members: {Array.isArray(request.desired_member_vjudge_ids) ? request.desired_member_vjudge_ids.join(', ') : ''}</div>
          {request.note && <div className="text-xs text-muted-foreground whitespace-pre-line border-l-2 border-accent/40 pl-3">{request.note}</div>}
        </div>
        <div className="flex gap-2 md:flex-col">
          <form action={toggleProcessed}>
            <button type="submit" className="px-3 py-2 rounded-lg text-xs font-medium border bg-background hover:bg-muted/40">{request.processed ? 'Mark Unprocessed' : 'Mark Processed'}</button>
          </form>
          <form action={approveDirect}>
            <button type="submit" className="px-3 py-2 rounded-lg text-xs font-medium border bg-accent text-accent-foreground hover:opacity-90">Approve & Create Team</button>
          </form>
        </div>
      </div>
    </div>
  )
}


