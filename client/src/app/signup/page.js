'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/lib/action'
import {
  AtSign,
  CircleArrowOutUpRight,
  IdCard,
  Lock,
  LockKeyhole,
  Phone,
  UserRound,
} from 'lucide-react'
import { Link } from 'next-view-transitions'
import { useActionState } from 'react'
const initialState = {
  message: '',
  success: false,
}

export default function Page() {
  const [state, formAction, pending] = useActionState(signUp, initialState)
  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription>
            Have you an existing account?{' '}
            <Link
              href="/login"
              className="text-primary"
            >
              Login
            </Link>{' '}
            with it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={formAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <UserRound />
                <Input
                  type="text"
                  id="full_name"
                  name="full_name"
                  placeholder="Enter your full name"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="profile_pic">Profile Picture</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <UserPlus />
                <Input
                  type="file"
                  id="profile_pic"
                  name="profile_pic"
                  accept="image/*"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div> */}

            {/* <div className="space-y-2">
              <Label htmlFor="mist_id">MIST ID</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <FileDigit />
                <Input
                  type="text"
                  id="mist_id"
                  name="mist_id"
                  placeholder="Enter your MIST ID"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="mist_id_card">MIST ID card</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <IdCard />
                <Input
                  type="file"
                  id="mist_id_card"
                  name="mist_id_card"
                  accept="image/*"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <AtSign />
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone No</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <Phone />
                <Input
                  type="text"
                  id="phone"
                  name="phone"
                  placeholder="Enter your mobile number"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <Lock />
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter a super secret password"
                  className="ring-0 border-0 focus:bg-transparent focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_passowrd">Confirm Passowrd</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <LockKeyhole />
                <Input
                  type="password"
                  id="confirm_passowrd"
                  name="confirm_passowrd"
                  placeholder="Confirm your password"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vjudge_id">Vjudge ID</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <CircleArrowOutUpRight />
                <Input
                  type="text"
                  id="vjudge_id"
                  name="vjudge_id"
                  placeholder="Enter your Vjudge ID"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cf_id">Codeforces ID</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <CircleArrowOutUpRight />
                <Input
                  type="text"
                  id="cf_id"
                  name="cf_id"
                  placeholder="Enter your Codeforces ID"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="codechef_id">CodeChef ID</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <CircleArrowOutUpRight />
                <Input
                  type="text"
                  id="codechef_id"
                  name="codechef_id"
                  placeholder="Enter your CodeChef ID"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="atcoder_id">Atcoder ID</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <CircleArrowOutUpRight />
                <Input
                  type="text"
                  id="atcoder_id"
                  name="atcoder_id"
                  placeholder="Enter your Atcoder ID"
                  className="ring-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            {state?.message && (
              <Alert variant={state?.success ? 'default' : 'destructive'}>
                <AlertDescription>{state?.message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={pending}
            >
              {pending ? 'Submitting...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
