'use client'
import { cn } from '@/lib/utils'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

const ThemeChanger = () => {
  const { theme, setTheme } = useTheme()
  function handleClick() {
    theme
    setTheme(theme === 'light' ? 'dark' : 'light')
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
