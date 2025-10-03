
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { get_with_token, logout } from "@/lib/action"
import { ExternalLink, LogOut, Shield, User, ZoomIn, CheckCircle2, XCircle, Mail, Phone, Calendar, Users, Award } from "lucide-react"
import Image from "next/image"
import Link from 'next/link'
import { redirect } from "next/navigation"
import { post_with_token } from "@/lib/action"
import { listActiveParticipationCollections, setParticipation } from "@/actions/team_collection"
import { createClient } from "@/utils/supabase/server"
import { ParticipationToggle } from "@/components/ParticipationToggle"



export default async function page({ searchParams }) {
  // Removed Codeforces OAuth code parameter handling

  const res = await get_with_token("auth/user/profile")
  const user = res.result[0];
  const myTeamsRes = await get_with_token('team-collection/my-teams')
  const myTeams = myTeamsRes?.result || []
  const coachedTeamsRes = user?.vjudge_id ? await post_with_token('team-collection/public/teams/coached-by-vjudge', { vjudge_id: user.vjudge_id }) : { result: [] }
  const coachedTeams = coachedTeamsRes?.result || []
  const participationCollectionsRes = await listActiveParticipationCollections()
  const participationCollections = participationCollectionsRes?.result || []

  return (
    <div className="min-h-screen w-full" style={{ background: 'hsl(var(--profile-bg))' }}>
      <div className="max-w-[1400px] mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left Sidebar - Profile Summary */}
          <aside className="space-y-4 profile-sidebar-sticky" aria-label="Profile Summary">
            <div className="profile-card">
              {/* Avatar */}
              <div className="flex justify-center mb-5">
                <div className="relative group">
                  <Avatar className="h-32 w-32 rounded-2xl border-2 transition-all duration-300 hover:scale-105" style={{ borderColor: 'hsl(var(--profile-primary))' }}>
                    <AvatarImage src={user.profile_pic} alt={user.full_name || "User"} className="object-cover" />
                    <AvatarFallback className="text-4xl" style={{ background: 'linear-gradient(135deg, hsl(var(--profile-primary)), hsl(var(--profile-success)))', color: 'white' }}>
                      {user.full_name ? user.full_name.charAt(0) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Name and Badges */}
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold mb-2 transition-colors duration-200" style={{ color: 'hsl(var(--profile-text))' }}>
                  {user.full_name || "Anonymous User"}
                </h1>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {user.admin && (
                    <span className="profile-badge transition-all duration-200 hover:scale-105" style={{ background: 'hsl(var(--profile-primary))', color: 'white' }}>
                      <Shield className="h-3.5 w-3.5" />
                      Admin
                    </span>
                  )}
                  {user.granted && (
                    <span className="profile-badge profile-badge-success transition-all duration-200 hover:scale-105">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info Chips */}
              <div className="space-y-2 mb-5">
                <a href={`mailto:${user.email}`} className="profile-info-chip w-full profile-focus-ring transition-all duration-200 hover:translate-x-1" title={user.email}>
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm">{user.email}</span>
                </a>
                {user.phone && (
                  <a href={`tel:${user.phone}`} className="profile-info-chip w-full profile-focus-ring transition-all duration-200 hover:translate-x-1" title={user.phone}>
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-sm">{user.phone}</span>
                  </a>
                )}
                <div className="profile-info-chip w-full transition-all duration-200">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Profile Picture Upload */}
              <form action={updateProfilePic} className="mb-4">
                <Label htmlFor="profile-pic" className="text-sm font-medium mb-2 block" style={{ color: 'hsl(var(--profile-text-secondary))' }}>Update Profile Picture</Label>
                <Input
                  id="profile-pic"
                  type="file"
                  name="image"
                  accept="image/*"
                  className="w-full text-sm mb-2 profile-focus-ring"
                  style={{ borderRadius: 'var(--profile-radius-sm)' }}
                />
                <Button type="submit" size="sm" className="w-full profile-focus-ring transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'hsl(var(--profile-primary))', color: 'white', borderRadius: 'var(--profile-radius-sm)' }}>
                  Upload Photo
                </Button>
              </form>

              {/* Logout Button */}
              <form action={logout}>
                <Button
                  variant="outline"
                  className="w-full profile-focus-ring transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    borderRadius: 'var(--profile-radius-sm)',
                    color: 'hsl(var(--profile-danger))',
                    borderColor: 'hsl(var(--profile-danger) / 0.3)'
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </form>
            </div>

            {/* T-shirt Size */}
            <div className="profile-card">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold" style={{ color: 'hsl(var(--profile-text))' }}>
                  T-shirt Size
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs profile-focus-ring" style={{ borderRadius: 'var(--profile-radius-sm)' }}>?</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-xs">
                    <p className="mb-2 font-medium">Unisex sizes</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>XS: 34-36in | S: 36-38in</li>
                      <li>M: 38-40in | L: 40-42in</li>
                      <li>XL: 42-44in | XXL: 44-46in</li>
                      <li>3XL: 46-48in | 4XL: 48-50in</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <form action={saveTshirtSize} className="space-y-2">
                <select
                  name="tshirt_size"
                  defaultValue={user.tshirt_size || ''}
                  className="flex h-9 w-full items-center justify-between px-3 py-2 text-sm profile-focus-ring"
                  style={{
                    borderRadius: 'var(--profile-radius-sm)',
                    border: '1px solid rgba(var(--profile-border))',
                    background: 'hsl(var(--profile-surface-2))',
                    color: 'hsl(var(--profile-text))'
                  }}
                >
                  <option value="" disabled>Select size</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="3XL">3XL</option>
                  <option value="4XL">4XL</option>
                </select>
                <Button type="submit" size="sm" className="w-full profile-focus-ring transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'hsl(var(--profile-primary))', color: 'white', borderRadius: 'var(--profile-radius-sm)' }}>Save</Button>
              </form>
              {user.tshirt_size && (
                <p className="mt-2 text-xs text-center" style={{ color: 'hsl(var(--profile-text-muted))' }}>Current: {user.tshirt_size}</p>
              )}
            </div>

            {/* MIST ID */}
            {user.mist_id && (
              <div className="profile-card">
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--profile-text-secondary))' }}>MIST ID</h3>
                <p className="text-sm font-mono" style={{ color: 'hsl(var(--profile-text))' }}>{user.mist_id}</p>
              </div>
            )}

            {/* MIST ID Card - Collapsible */}
            {user.mist_id_card && (
              <div className="profile-card">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full profile-focus-ring"
                      style={{ borderRadius: 'var(--profile-radius-sm)' }}
                    >
                      <ZoomIn className="h-4 w-4 mr-2" />
                      View MIST ID Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogTitle className="text-lg font-medium">MIST ID Card</DialogTitle>
                    <Image
                      src={user.mist_id_card || "/placeholder.svg"}
                      alt="MIST ID Card"
                      className="w-full h-auto rounded-md"
                      width={600}
                      height={400}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </aside>

          {/* Right Column - Main Content */}
          <main className="space-y-6">
            {/* Contest Participation */}
            <section className="profile-card" aria-labelledby="participation-title">
              <h2 id="participation-title" className="flex items-center gap-2 text-xl font-bold mb-5" style={{ color: 'hsl(var(--profile-text))' }}>
                <Award className="h-5 w-5" />
                Contest Participation
              </h2>
              <div className="space-y-4">
                {participationCollections.length === 0 && (
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--profile-text-muted))' }}>No active participation windows.</p>
                )}
                {participationCollections.map(col => (
                  <ParticipationToggle key={col.id} col={col} />
                ))}
              </div>
            </section>

            {/* Competitive Programming Profiles */}
            <section className="profile-card" aria-labelledby="cp-profiles-title">
              <h2 id="cp-profiles-title" className="flex items-center gap-2 text-xl font-bold mb-5" style={{ color: 'hsl(var(--profile-text))' }}>
                <ExternalLink className="h-5 w-5" />
                Competitive Programming Profiles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.cf_id && (
                  <div className="flex items-start gap-4 group">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/20 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-inner">
                      <span className="font-bold text-red-600 dark:text-red-400">CF</span>
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">Codeforces</h3>
                      <a
                        href={`https://codeforces.com/profile/${user.cf_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {user.cf_id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        {user.cf_verified ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4" /> Verified</span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1 font-medium"><XCircle className="h-4 w-4" /> Pending admin verification</span>
                        )}
                      </div>
                      <div className="mt-3">
                        <CodeforcesSetIdForm current={user.cf_id} />
                        <p className="mt-1 text-xs text-muted-foreground">Changing your handle will reset verification.</p>
                      </div>
                    </div>
                  </div>
                )}
                {!user.cf_id && (
                  <div className="flex items-start gap-4 group">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/20 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-inner">
                      <span className="font-bold text-red-600 dark:text-red-400">CF</span>
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">Codeforces</h3>
                      <p className="text-sm text-muted-foreground font-medium">No handle saved</p>
                      <CodeforcesSetIdForm current={user.cf_id} />
                    </div>
                  </div>
                )}

                {user.codechef_id && (
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-inner">
                      <span className="font-bold text-amber-600 dark:text-amber-400">CC</span>
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">CodeChef</h3>
                      <a
                        href={`https://www.codechef.com/users/${user.codechef_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {user.codechef_id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {user.atcoder_id && (
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-inner">
                      <span className="font-bold text-gray-600 dark:text-gray-400">AC</span>
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">AtCoder</h3>
                      <a
                        href={`https://atcoder.jp/users/${user.atcoder_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {user.atcoder_id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {user.vjudge_id && (
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/20 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-inner">
                      <span className="font-bold text-purple-600 dark:text-purple-400">VJ</span>
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">Virtual Judge</h3>
                      <a
                        href={`https://vjudge.net/user/${user.vjudge_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {user.vjudge_id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        {user.vjudge_verified ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4" /> Verified by admin</span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1 font-medium"><XCircle className="h-4 w-4" /> Pending admin verification</span>
                        )}
                      </div>
                      <div className="mt-3">
                        <form action={saveVjudge} className="flex items-center gap-2">
                          <Label htmlFor="vjudge_id" className="text-sm">Change ID:</Label>
                          <Input id="vjudge_id" name="vjudge_id" defaultValue={user.vjudge_id} placeholder="Enter VJudge ID" className="max-w-xs rounded-xl" />
                          <Button type="submit" size="sm" variant="outline" className="rounded-full px-5">Save</Button>
                        </form>
                        {!user.vjudge_verified && (<p className="mt-1 text-xs text-muted-foreground">Saving will reset verification.</p>)}
                      </div>
                    </div>
                  </div>
                )}
                {!user.vjudge_id && (
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/20 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-inner">
                      <span className="font-bold text-purple-600 dark:text-purple-400">VJ</span>
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">Virtual Judge</h3>
                      <p className="text-sm text-muted-foreground font-medium">No VJudge ID saved</p>
                      <form action={saveVjudge} className="mt-2 flex items-center gap-2">
                        <Label htmlFor="vjudge_id_new" className="text-sm">Add ID:</Label>
                        <Input id="vjudge_id_new" name="vjudge_id" placeholder="Enter VJudge ID" className="max-w-xs rounded-xl" />
                        <Button type="submit" size="sm" className="rounded-full px-5">Save</Button>
                      </form>
                      <p className="mt-1 text-xs text-muted-foreground">Admin will verify after you save.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* My Teams */}
            <section className="profile-card" aria-labelledby="my-teams-title">
              <h2 id="my-teams-title" className="flex items-center gap-2 text-xl font-bold mb-5" style={{ color: 'hsl(var(--profile-text))' }}>
                <Users className="h-5 w-5" />
                My Teams
              </h2>
              {myTeams.length === 0 ? (
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--profile-text-muted))' }}>No finalized teams yet.</p>
              ) : (
                <div className="space-y-3">
                  {myTeams.map(t => (
                    <Link key={t.id} href={`/team/final/${t.id}`} className="block profile-stat-tile profile-focus-ring group">
                      <div className="font-semibold group-hover:underline" style={{ color: 'hsl(var(--profile-primary))' }}>{t.team_title}</div>
                      <div className="text-sm mt-1" style={{ color: 'hsl(var(--profile-text-secondary))' }}>Members: {Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids.join(', ') : ''}</div>
                      {t.collection_title && (
                        <div className="text-xs mt-1" style={{ color: 'hsl(var(--profile-text-muted))' }}>Collection: {t.collection_title}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Teams Coached */}
            <section className="profile-card" aria-labelledby="coached-teams-title">
              <h2 id="coached-teams-title" className="flex items-center gap-2 text-xl font-bold mb-5" style={{ color: 'hsl(var(--profile-text))' }}>
                <Shield className="h-5 w-5" />
                Teams Coached {coachedTeams.length > 0 && <span className="text-sm font-normal" style={{ color: 'hsl(var(--profile-text-muted))' }}>({coachedTeams.length})</span>}
              </h2>
              {(!user?.vjudge_id) && (
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--profile-text-muted))' }}>Add a VJudge ID to appear as a coach.</p>
              )}
              {user?.vjudge_id && coachedTeams.length === 0 && (
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--profile-text-muted))' }}>You are not coaching any finalized teams yet.</p>
              )}
              {user?.vjudge_id && coachedTeams.length > 0 && (
                <div className="space-y-3">
                  {coachedTeams.map(t => (
                    <Link key={`coach-${t.id}`} href={`/team/final/${t.id}`} className="block profile-stat-tile profile-focus-ring group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold group-hover:underline" style={{ color: 'hsl(var(--profile-success))' }}>{t.team_title}</div>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold" style={{ background: 'hsl(var(--profile-success) / 0.15)', color: 'hsl(var(--profile-success))' }}>Coach</span>
                      </div>
                      <div className="text-sm" style={{ color: 'hsl(var(--profile-text-secondary))' }}>Members: {Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids.join(', ') : ''}</div>
                      {t.collection_title && (
                        <div className="text-xs mt-1" style={{ color: 'hsl(var(--profile-text-muted))' }}>Collection: {t.collection_title}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

function CodeforcesSetIdForm({ current }) {
  return (
    <form action={saveCodeforces} className="mt-2 flex items-center gap-2">
      <Input
        id="cf_id"
        name="cf_id"
        defaultValue={current || ''}
        placeholder={current ? "CF Handle" : "Enter CF handle"}
        className="text-xs h-8 profile-focus-ring flex-1"
        style={{ borderRadius: 'var(--profile-radius-sm)' }}
      />
      <Button
        type="submit"
        size="sm"
        variant={current ? "outline" : "default"}
        className="text-xs h-8 px-3 profile-focus-ring"
        style={{
          borderRadius: 'var(--profile-radius-sm)',
          ...(!current && { background: 'hsl(var(--profile-primary))', color: 'white' })
        }}
      >
        {current ? 'Save' : 'Add'}
      </Button>
    </form>
  )
}

async function saveCodeforces(formData) {
  "use server"
  const cf_id = formData.get('cf_id')?.toString().trim()
  if (!cf_id) return
  await post_with_token('user/cf/set', { cf_id })
  redirect('/profile')
}

async function saveVjudge(formData) {
  "use server"
  const vjudge_id = formData.get('vjudge_id')?.toString().trim()
  if (!vjudge_id) return
  await post_with_token('user/vjudge/set', { vjudge_id })
  redirect('/profile')
}

async function saveTshirtSize(formData) {
  "use server"
  const val = formData.get('tshirt_size')?.toString().trim() || null
  await post_with_token('user/tshirt/set', { tshirt_size: val })
  redirect('/profile')
}

async function updateProfilePic(formData) {
  "use server"
  const file = formData.get('image')
  if (!file || typeof file === 'string') return

  // Get current user id/email
  const prof = await get_with_token('auth/user/profile')
  const me = prof?.result?.[0]
  const userId = me?.id || 'me'

  const supabase = await createClient()
  const fileName = `${Date.now()}-${file.name}`
  const path = `profile_pics/${userId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('all_picture')
    .upload(path, file)

  if (error) {
    console.error('Upload error:', error)
    redirect('/profile')
  }

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${data.fullPath}`
  await post_with_token('user/profile-pic/set', { profile_pic: url })
  redirect('/profile')
}


