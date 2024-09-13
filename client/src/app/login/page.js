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
import { login, signUp } from '@/lib/action'
import {
  AtSign,
  FileDigit,
  IdCard,
  Lock,
  LockKeyhole,
  Phone,
  UserPlus,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { useActionState } from 'react'
const initialState = {
  message: '',
  success: false,
}

export default function Page() {
  const [state, formAction, pending] = useActionState(login, initialState)
  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Don't have an account?{' '}
            <Link
              href="/login"
              className="text-primary"
            >
              Create
            </Link>{' '}
            a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={formAction}
            className="space-y-4"
          >

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
              <Label htmlFor="password">Password</Label>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <Lock />
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  className="ring-0 border-0 focus:bg-transparent focus-visible:ring-offset-0 focus-visible:ring-0"
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
              {pending ? 'Submitting...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
