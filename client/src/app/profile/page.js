
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
import { redirect } from "next/navigation"
import { post_with_token } from "@/lib/action"
import { createClient } from "@/utils/supabase/server"



export default async function page({ searchParams }) {
  const awaitedSearchParams = await searchParams;
  const rawCode = awaitedSearchParams?.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  if (code) {
    const redirectUri = process.env.CF_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/profile`
    try {
      await post_with_token('user/cf/verify', { code, redirect_uri: redirectUri })
    } catch (e) {}
    redirect('/profile')
  }

  const res = await get_with_token("auth/user/profile")
  const user = res.result[0];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Profile header */}
        <Card className="col-span-1 lg:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src={user.profile_pic} alt={user.full_name || "User"} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  {user.full_name ? user.full_name.charAt(0) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h1 className="text-3xl font-bold">{user.full_name || "Anonymous User"}</h1>
                  {user.admin && (
                    <Badge className="ml-0 md:ml-2 bg-indigo-600 hover:bg-indigo-700 self-center">
                      <Shield className="h-3 w-3 mr-1" /> Admin
                    </Badge>
                  )}
                  {user.granted && (
                    <Badge className="ml-0 md:ml-2 bg-green-600 hover:bg-green-700 self-center">Verified</Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">{user.email}</p>
                {user.phone && <p className="text-muted-foreground">{user.phone}</p>}
                <p className="text-sm text-muted-foreground mt-2">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </p>
                <form action={updateProfilePic} className="mt-4 flex flex-col sm:flex-row items-center gap-2">
                  <Input type="file" name="image" accept="image/*" className="max-w-xs" />
                  <Button type="submit" variant="outline">Update Photo</Button>
                </form>
              </div>
              <form action={logout}>
                <Button
                  variant="outline"
                  className="ml-auto bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:text-red-700 dark:hover:text-red-300"

                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Left column - Personal details */}
        <Card className="col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
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
                <select name="tshirt_size" defaultValue={user.tshirt_size || ''} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none">
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
                <Button type="submit" size="sm" variant="outline">Save</Button>
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

        {/* Right column - Competitive Programming Profiles */}
        <Card className="col-span-1 lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Competitive Programming Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user.cf_id && (
                <div className="flex items-start space-x-4">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <span className="font-bold text-red-600 dark:text-red-400">CF</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Codeforces</h3>
                    <a
                      href={`https://codeforces.com/profile/${user.cf_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {user.cf_id}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {user.cf_verified ? (
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/> Verified</span>
                      ) : (
                        <>
                          <span className="text-amber-600 flex items-center gap-1"><XCircle className="h-4 w-4"/> Not verified</span>
                          <CodeforcesVerifyButton />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!user.cf_id && (
                <div className="flex items-start space-x-4">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <span className="font-bold text-red-600 dark:text-red-400">CF</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Codeforces</h3>
                    <p className="text-sm text-muted-foreground">No handle saved</p>
                    <CodeforcesVerifyButton />
                  </div>
                </div>
              )}

              {user.codechef_id && (
                <div className="flex items-start space-x-4">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                    <span className="font-bold text-amber-600 dark:text-amber-400">CC</span>
                  </div>
                  <div>
                    <h3 className="font-medium">CodeChef</h3>
                    <a
                      href={`https://www.codechef.com/users/${user.codechef_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {user.codechef_id}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {user.atcoder_id && (
                <div className="flex items-start space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="font-bold text-gray-600 dark:text-gray-400">AC</span>
                  </div>
                  <div>
                    <h3 className="font-medium">AtCoder</h3>
                    <a
                      href={`https://atcoder.jp/users/${user.atcoder_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {user.atcoder_id}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {user.vjudge_id && (
                <div className="flex items-start space-x-4">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <span className="font-bold text-purple-600 dark:text-purple-400">VJ</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Virtual Judge</h3>
                    <a
                      href={`https://vjudge.net/user/${user.vjudge_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {user.vjudge_id}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {user.vjudge_verified ? (
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/> Verified by admin</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1"><XCircle className="h-4 w-4"/> Pending admin verification</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <form action={saveVjudge} className="flex items-center gap-2">
                        <Label htmlFor="vjudge_id" className="text-sm">Change ID:</Label>
                        <Input id="vjudge_id" name="vjudge_id" defaultValue={user.vjudge_id} placeholder="Enter VJudge ID" className="max-w-xs" />
                        <Button type="submit" size="sm" variant="outline">Save</Button>
                      </form>
                      {!user.vjudge_verified && (<p className="mt-1 text-xs text-muted-foreground">Saving will reset verification.</p>)}
                    </div>
                  </div>
                </div>
              )}
              {!user.vjudge_id && (
                <div className="flex items-start space-x-4">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <span className="font-bold text-purple-600 dark:text-purple-400">VJ</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Virtual Judge</h3>
                    <p className="text-sm text-muted-foreground">No VJudge ID saved</p>
                    <form action={saveVjudge} className="mt-2 flex items-center gap-2">
                      <Label htmlFor="vjudge_id_new" className="text-sm">Add ID:</Label>
                      <Input id="vjudge_id_new" name="vjudge_id" placeholder="Enter VJudge ID" className="max-w-xs" />
                      <Button type="submit" size="sm">Save</Button>
                    </form>
                    <p className="mt-1 text-xs text-muted-foreground">Admin will verify after you save.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CodeforcesVerifyButton() {
  return (
    <form action={startCfOauth}>
      <Button type="submit" size="sm" className="mt-2">Verify with Codeforces</Button>
    </form>
  )
}

async function startCfOauth() {
  "use server"
  const clientId = process.env.CF_CLIENT_ID
  const redirectUri = process.env.CF_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/profile`
  const authUrl = new URL('https://codeforces.com/oauth/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid')
  authUrl.searchParams.set('client_id', clientId || '')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  redirect(authUrl.toString())
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


