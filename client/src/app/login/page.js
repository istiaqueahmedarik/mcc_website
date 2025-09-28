'use client'

import ResetPasswordModal from '@/components/ResetPasswordModal'
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
import { login } from '@/lib/action'
import { AtSign, Eye, EyeOff, Lock } from 'lucide-react'
import { Link } from 'next-view-transitions'
import { useActionState, useState } from 'react'

const initialState = {
  message: '',
  success: false,
}

export default function Page() {
  const [state, formAction, pending] = useActionState(login, initialState)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Don&apos;t have an account?
            <Link
              href="/signup"
              className="text-primary"
            >
              Sign Up
            </Link>
            
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 font-normal h-auto"
                  onClick={() => setShowResetModal(true)}
                >
                  Forgot password?
                </Button>
              </div>
              <div className="flex flex-row items-center justify-center w-full rounded-xl border group focus-within:border-primary px-2">
                <Lock />
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  className="ring-0 border-0 focus:bg-transparent focus-visible:ring-offset-0 focus-visible:ring-0"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
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

      <ResetPasswordModal 
        isOpen={showResetModal} 
        onClose={() => setShowResetModal(false)} 
      />
    </div>
  )
}
