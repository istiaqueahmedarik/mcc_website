
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { get_with_token, logout } from "@/lib/action"
import { ExternalLink, LogOut, Shield, User, ZoomIn } from "lucide-react"
import Image from "next/image"



export default async function page() {
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
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">User ID</h3>
              <p className="text-sm font-mono mt-1 break-all">{user.id}</p>
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

