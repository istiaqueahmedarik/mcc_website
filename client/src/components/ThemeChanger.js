'use client'
import { cn } from '@/lib/utils'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const ThemeChanger = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null // prevents hydration mismatch

  function handleClick() {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  if (!mounted) {
    return (
      <div className="cursor-pointer" aria-hidden>
        <Sun />
      </div>
    )
  }

  return (
    <div
      className="cursor-pointer"
      onClick={handleClick}
    >
      <Sun className={cn({ hidden: theme !== 'light' })} />
      <Moon className={cn({ hidden: theme === 'light' })} />
    </div>
  )
}

export default ThemeChanger
