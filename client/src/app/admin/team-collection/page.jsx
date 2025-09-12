import {
  adminDeleteTeamCollection,
  adminFinalizeTeamCollection,
  adminUnfinalizeTeamCollection,
  adminListTeamCollections,
  adminStartTeamCollection,
  adminStopTeamCollection,
  adminReopenTeamCollection,
} from "@/actions/team_collection"
import { TeamActionForm } from "@/components/TeamActionForm"
import { getAllContestRooms } from "@/actions/contest_details"
import Link from "next/link"
import { Eye, Square, CheckCircle, Unlock, Trash2, Play } from "lucide-react"
import { revalidatePath } from "next/cache"
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { get_with_token } from '@/lib/action'

export const dynamic = "force-dynamic"

export default async function Page() {
  // Admin guard (server-side)
  const cookieStore = await cookies()
  if(!cookieStore.get('token')) redirect('/login')
  const user = await get_with_token('auth/user/profile')
  if(user?.result?.length === 0) redirect('/login')
  if(user?.result?.[0]?.admin === false) redirect('/')

  const roomsRes = await getAllContestRooms()
  const rooms = roomsRes?.result || []
  const collections = (await adminListTeamCollections())?.result || []

  async function start(formData) { "use server"; const room_id = formData.get("room_id"); const title = formData.get("title"); await adminStartTeamCollection(room_id, title || ""); revalidatePath('/admin/team-collection') }
  async function stop(formData) { "use server"; const id = formData.get("id"); await adminStopTeamCollection(id); revalidatePath('/admin/team-collection') }
  async function reopen(formData) { "use server"; const id = formData.get("id"); await adminReopenTeamCollection(id); revalidatePath('/admin/team-collection') }
  async function finalize(formData) { "use server"; const id = formData.get("id"); await adminFinalizeTeamCollection(id); revalidatePath('/admin/team-collection') }
  async function unfinalize(formData) { "use server"; const id = formData.get("id"); await adminUnfinalizeTeamCollection(id); revalidatePath('/admin/team-collection') }
  async function del(formData) { "use server"; const id = formData.get("id"); await adminDeleteTeamCollection(id); revalidatePath('/admin/team-collection') }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Team Collection Admin</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage team collections and contest rooms</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12 space-y-16">

        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">Active Collections</h2>
            <p className="text-muted-foreground">Manage ongoing and recent team collections</p>
          </div>

          <div className="grid gap-6">
            {collections.map((col) => (
              <div
                key={col.id}
                className="bg-card rounded-2xl shadow-sm border border-border p-8 hover:shadow-lg transition-all duration-300 ease-out"
              >
                <div className="flex items-start justify-between gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Link
                        className="text-xl font-semibold text-primary hover:text-primary/80 transition-colors duration-200"
                        href={`/admin/team-collection/${col.id}`}
                      >
                        {col.title || "Untitled Collection"}
                      </Link>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground font-medium">Room:</span>
                        <span className="text-sm text-foreground font-semibold">{col.room_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${col.finalized ? "bg-chart-2" : col.is_open ? "bg-chart-1" : "bg-muted-foreground"
                            }`}
                        ></div>
                        <span className="text-sm font-medium text-foreground">
                          {col.finalized ? "Finalized" : col.is_open ? "Collecting" : "Closed"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">Share:</span>
                        <Link
                          className="text-sm text-primary hover:text-primary/80 font-mono bg-muted px-3 py-1 rounded-lg hover:bg-muted/80 transition-colors duration-200"
                          href={`/team/${col.token}`}
                        >
                          /team/{col.token}
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/team-collection/${col.id}`}
                      className="px-6 py-2.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Details
                    </Link>

                    {!col.finalized && (
                      col.is_open ? (
                        <TeamActionForm action={stop} pending="Stopping..." success="Collection stopped" error="Failed to stop">
                          <input type="hidden" name="id" value={col.id} />
                          <button className="px-6 py-2.5 rounded-full bg-chart-5/20 hover:bg-chart-5/30 text-chart-5 font-semibold transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                            <Square className="w-4 h-4" />
                            Stop
                          </button>
                        </TeamActionForm>
                      ) : (
                        <TeamActionForm action={reopen} pending="Reopening..." success="Collection reopened" error="Failed to reopen">
                          <input type="hidden" name="id" value={col.id} />
                          <button className="px-6 py-2.5 rounded-full bg-chart-1/20 hover:bg-chart-1/30 text-chart-1 font-semibold transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                            <Play className="w-4 h-4" />
                            Reopen
                          </button>
                        </TeamActionForm>
                      )
                    )}

                    {!col.finalized && (
                      <TeamActionForm action={finalize} pending="Finalizing..." success="Collection finalized" error="Failed to finalize">
                        <input type="hidden" name="id" value={col.id} />
                        <button className="px-6 py-2.5 rounded-full bg-chart-2/20 hover:bg-chart-2/30 text-chart-2 font-semibold transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Finalize
                        </button>
                      </TeamActionForm>
                    )}

                    {col.finalized && (
                      <TeamActionForm action={unfinalize} pending="Unfinalizing..." success="Collection unfinalized" error="Failed to unfinalize">
                        <input type="hidden" name="id" value={col.id} />
                        <button className="px-6 py-2.5 rounded-full bg-chart-5/20 hover:bg-chart-5/30 text-chart-5 font-semibold transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                          <Unlock className="w-4 h-4" />
                          Unfinalize
                        </button>
                      </TeamActionForm>
                    )}

                    <TeamActionForm action={del} pending="Deleting..." success="Collection deleted" error="Failed to delete">
                      <input type="hidden" name="id" value={col.id} />
                      <button className="px-6 py-2.5 rounded-full bg-destructive/20 hover:bg-destructive/30 text-destructive font-semibold transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </TeamActionForm>
                  </div>
                </div>
              </div>
            ))}

            {collections.length === 0 && (
              <div className="bg-card rounded-2xl border border-border p-16 text-center">
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">No collections yet</h3>
                  <p className="text-muted-foreground font-medium">Start your first team collection above</p>
                </div>
              </div>
            )}
          </div>
        </section>


        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">Start New Collection</h2>
            <p className="text-muted-foreground">Begin collecting teams for contest rooms</p>
          </div>

          <div className="grid gap-6">
            {rooms.map((r) => (
              <TeamActionForm action={start} key={r.id} pending="Starting..." success="Collection started" error="Failed to start">
                <div className="bg-card rounded-2xl shadow-sm border border-border p-8 hover:shadow-lg hover:border-border/80 transition-all duration-300 ease-out">
                  <input type="hidden" name="room_id" value={r.id} />
                  <input type="hidden" name="title" value={r["Room Name"]} />
                  <div className="flex items-center justify-between gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-card-foreground">{r["Room Name"]}</h3>
                        <p className="text-sm text-muted-foreground font-medium">Contest Room</p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-all duration-200 ease-out transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start Collection
                    </button>
                  </div>
                </div>
              </TeamActionForm>
            ))}
            {rooms.length === 0 && (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <p className="text-muted-foreground font-medium">No contest rooms available</p>
              </div>
            )}
          </div>
        </section>

        
      </div>
    </div>
  )
}
