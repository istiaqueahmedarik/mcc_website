'use client'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'

const ThemeChanger = () => {
  const { setTheme } = useTheme()
  const [themeName, setThemeName] = useState('dark')
  const handleClick = () => {
    if (themeName === 'dark') {
      setTheme('light')
      setThemeName('light')
    } else {
      setTheme('dark')
      setThemeName('dark')
    }
  }
  return (
    <div onClick={handleClick}>
      {themeName === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
    </div>
  )
}

export default ThemeChanger
