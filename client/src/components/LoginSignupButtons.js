'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SheetClose } from '@/components/ui/sheet'
import { LogIn, UserPlus, Loader2 } from 'lucide-react'

const LoginSignupButtons = ({ loggedIn, mobile = false }) => {
    const router = useRouter()
    const [loadingState, setLoadingState] = useState({ login: false, signup: false })

    const handleNavigation = async (path, type) => {
        setLoadingState(prev => ({ ...prev, [type]: true }))

        // Show loading animation for a more noticeable duration
        await new Promise(resolve => setTimeout(resolve, 300))

        router.push(path)

        // Reset loading state after navigation completes
        setTimeout(() => {
            setLoadingState(prev => ({ ...prev, [type]: false }))
        }, 1500)
    }

    if (loggedIn) return null

    if (mobile) {
        return (
            <>
                <SheetClose asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-start text-lg transition-none"
                        onClick={() => handleNavigation('/login', 'login')}
                        disabled={loadingState.login || loadingState.signup}
                    >
                        {loadingState.login ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <LogIn className="mr-2 h-5 w-5" />
                        )}
                        {loadingState.login ? 'Redirecting...' : 'Login'}
                    </Button>
                </SheetClose>
                <SheetClose asChild>
                    <Button
                        variant="default"
                        className="w-full justify-start text-lg transition-none"
                        onClick={() => handleNavigation('/signup', 'signup')}
                        disabled={loadingState.login || loadingState.signup}
                    >
                        {loadingState.signup ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <UserPlus className="mr-2 h-5 w-5" />
                        )}
                        {loadingState.signup ? 'Redirecting...' : 'Sign Up'}
                    </Button>
                </SheetClose>
            </>
        )
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="transition-none"
                onClick={() => handleNavigation('/login', 'login')}
                disabled={loadingState.login || loadingState.signup}
            >
                {loadingState.login ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <LogIn className="w-4 h-4 mr-2" />
                )}
                {loadingState.login ? 'Redirecting...' : 'Login'}
            </Button>
            <Button
                variant="default"
                size="sm"
                className="transition-none"
                onClick={() => handleNavigation('/signup', 'signup')}
                disabled={loadingState.login || loadingState.signup}
            >
                {loadingState.signup ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                )}
                {loadingState.signup ? 'Redirecting...' : 'Sign Up'}
            </Button>
        </>
    )
}

export default LoginSignupButtons
