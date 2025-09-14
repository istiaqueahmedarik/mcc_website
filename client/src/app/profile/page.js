
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { get_with_token, logout } from "@/lib/action"
import { ExternalLink, LogOut, Shield, User, ZoomIn, CheckCircle2, XCircle } from "lucide-react"
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
  <div className="min-h-[calc(100vh-4rem)] w-full relative bg-[radial-gradient(ellipse_at_top,hsl(var(--background)/0.95),hsl(var(--background)/0.55))] dark:bg-[radial-gradient(ellipse_at_top,hsl(var(--background)/0.94),hsl(var(--background)/0.52))]">
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_center,white,transparent_70%)]" />
      <div className="container mx-auto py-12 px-4 sm:px-8 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Profile header */}
        <Card className="col-span-1 lg:col-span-3 border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-8 pb-8 px-6 md:px-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <Avatar className="h-32 w-32 border border-white/60 dark:border-white/10 shadow-xl relative rounded-2xl overflow-hidden bg-transparent">
                  <AvatarImage src={user.profile_pic} alt={user.full_name || "User"} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    {user.full_name ? user.full_name.charAt(0) : "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight bg-[linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--muted-foreground)))] dark:bg-[linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--muted-foreground)))] bg-clip-text text-transparent">
                    {user.full_name || "Anonymous User"}
                  </h1>
                  {user.admin && (
                    <Badge className="ml-0 md:ml-2 bg-[linear-gradient(90deg,hsl(var(--profile-accent-solid)),hsl(var(--profile-accent-solid-alt)))] hover:brightness-110 shadow text-white rounded-full">
                      <Shield className="h-3 w-3 mr-1" /> Admin
                    </Badge>
                  )}
                  {user.granted && (
                    <Badge className="ml-0 md:ml-2 bg-[linear-gradient(90deg,hsl(var(--profile-accent-2)),hsl(var(--profile-accent-3)))] hover:brightness-110 shadow text-white rounded-full">Verified</Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-sm md:text-base font-medium">{user.email}</p>
                {user.phone && <p className="text-muted-foreground text-sm md:text-base">{user.phone}</p>}
                <p className="text-xs md:text-sm text-muted-foreground mt-3 tracking-wide">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </p>
                <form action={updateProfilePic} className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                  <Input type="file" name="image" accept="image/*" className="max-w-xs rounded-xl file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-zinc-800 dark:file:text-zinc-300" />
                  <Button type="submit" variant="outline" className="rounded-full px-6">Update Photo</Button>
                </form>
              </div>
              <form action={logout} className="md:ml-auto">
                <Button
                  variant="outline"
                  className="rounded-full bg-white/70 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/40 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

  {/* Left column - Personal details */}
        <Card className="col-span-1 h-fit border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <User className="h-5 w-5" />
              Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">T-shirt Size <span className="text-amber-600">(highly recommended)</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">Size guide</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm">
                    <p className="mb-2 font-medium">Unisex sizes (Asian fit)</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>XS: Chest 34-36in (86-91cm)</li>
                      <li>S: Chest 36-38in (91-97cm)</li>
                      <li>M: Chest 38-40in (97-102cm)</li>
                      <li>L: Chest 40-42in (102-107cm)</li>
                      <li>XL: Chest 42-44in (107-112cm)</li>
                      <li>XXL: Chest 44-46in (112-117cm)</li>
                      <li>3XL: Chest 46-48in (117-122cm)</li>
                      <li>4XL: Chest 48-50in (122-127cm)</li>
                    </ul>
                    <p className="mt-2">Tip: If between sizes, choose the larger.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <form action={saveTshirtSize} className="mt-2 flex items-center gap-2">
                <select name="tshirt_size" defaultValue={user.tshirt_size || ''} className="flex h-11 w-full items-center justify-between rounded-xl border border-input/50 bg-background/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition">
                  <option value="" disabled>Select your size</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="3XL">3XL</option>
                  <option value="4XL">4XL</option>
                </select>
                <Button type="submit" size="sm" variant="outline" className="rounded-full px-5">Save</Button>
              </form>
              {user.tshirt_size && (
                <p className="mt-1 text-xs text-muted-foreground">Current: {user.tshirt_size}</p>
              )}
            </div>
            {user.mist_id && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">MIST ID</h3>
                <p className="mt-1">{user.mist_id}</p>
              </div>
            )}

            {user.mist_id_card && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">MIST ID Card</h3>
                <div className="mt-2">
                  <Dialog>
                    <DialogTitle className="text-lg font-medium">MIST ID Card</DialogTitle>
                    <DialogTrigger asChild>
                      <div className="relative group cursor-pointer">
                        <Image
                          src={user.mist_id_card || "/vercel.svg"}
                          alt="MIST ID Card"
                          className="w-full h-auto rounded-md border border-gray-200 dark:border-gray-800 shadow-sm"
                          width={300}
                          height={200}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center rounded-md">
                          <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" />
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
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
              </div>
            )}

           
          </CardContent>
        </Card>

        {/* Right column stack: CP Profiles + My Teams */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
  {/* Participation Toggles */}
  <Card className="h-fit border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              Contest Participation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-4">
            {participationCollections.length === 0 && (
              <p className="text-sm text-muted-foreground font-medium">No active participation windows.</p>
            )}
            {participationCollections.map(col => (
              <ParticipationToggle key={col.id} col={col} />
            ))}
          </CardContent>
        </Card>
  {/* Competitive Programming Profiles */}
  <Card className="h-fit border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <ExternalLink className="h-5 w-5" />
              Competitive Programming Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        <span className="text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4"/> Verified</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1 font-medium"><XCircle className="h-4 w-4"/> Pending admin verification</span>
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
                        <span className="text-emerald-600 flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4"/> Verified by admin</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1 font-medium"><XCircle className="h-4 w-4"/> Pending admin verification</span>
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
          </CardContent>
        </Card>

        {/* My Teams */}
        <Card className="h-fit border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold tracking-tight">My Teams</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {myTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground font-medium">No finalized teams yet.</p>
            ) : (
              <div className="grid gap-3">
                {myTeams.map(t => (
                  <Link key={t.id} href={`/team/final/${t.id}`} className="group block border border-black/5 dark:border-white/10 rounded-2xl p-4 bg-white/50 dark:bg-zinc-800/40 hover:bg-white/70 dark:hover:bg-zinc-800/60 transition shadow-sm hover:shadow-md">
                    <div className="font-medium text-indigo-700 dark:text-indigo-300 group-hover:underline tracking-tight">{t.team_title}</div>
                    <div className="text-sm text-muted-foreground mt-1">Members: {Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids.join(', ') : ''}</div>
                    {t.collection_title && (
                      <div className="text-xs text-muted-foreground mt-1">Collection: {t.collection_title}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teams Coached */}
        <Card className="h-fit border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">Teams Coached {coachedTeams.length > 0 && <span className="text-xs font-normal text-muted-foreground">({coachedTeams.length})</span>}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {(!user?.vjudge_id) && (
              <p className="text-sm text-muted-foreground font-medium">Add a VJudge ID to appear as a coach.</p>
            )}
            {user?.vjudge_id && coachedTeams.length === 0 && (
              <p className="text-sm text-muted-foreground font-medium">You are not coaching any finalized teams yet.</p>
            )}
            {user?.vjudge_id && coachedTeams.length > 0 && (
              <div className="grid gap-3">
                {coachedTeams.map(t => (
                  <Link key={`coach-${t.id}`} href={`/team/final/${t.id}`} className="group block border border-black/5 dark:border-white/10 rounded-2xl p-4 bg-white/50 dark:bg-zinc-800/40 hover:bg-white/70 dark:hover:bg-zinc-800/60 transition shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-purple-700 dark:text-purple-300 group-hover:underline tracking-tight">{t.team_title}</div>
                      <span className="text-[10px] uppercase bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/40">Coach</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Members: {Array.isArray(t.member_vjudge_ids) ? t.member_vjudge_ids.join(', ') : ''}</div>
                    {t.collection_title && (
                      <div className="text-xs text-muted-foreground mt-1">Collection: {t.collection_title}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
      </div>
    </div>
  )
}

function CodeforcesSetIdForm({ current }) {
  return (
    <form action={saveCodeforces} className="mt-2 flex items-center gap-2">
      <Label htmlFor="cf_id" className="text-sm">{current ? 'Change handle:' : 'Add handle:'}</Label>
      <Input id="cf_id" name="cf_id" defaultValue={current || ''} placeholder="Enter CF handle" className="max-w-xs rounded-xl" />
      <Button type="submit" size="sm" variant="outline" className="rounded-full px-5">Save</Button>
    </form>
  )
}

async function saveCodeforces(formData){
  "use server"
  const cf_id = formData.get('cf_id')?.toString().trim()
  if(!cf_id) return
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

async function updateProfilePic(formData){
  "use server"
  const file = formData.get('image')
  if(!file || typeof file === 'string') return

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

  if(error){
    console.error('Upload error:', error)
    redirect('/profile')
  }

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${data.fullPath}`
  await post_with_token('user/profile-pic/set', { profile_pic: url })
  redirect('/profile')
}


