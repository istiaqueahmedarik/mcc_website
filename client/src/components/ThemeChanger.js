'use client'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'

const ThemeChanger = () => {
  const { theme, setTheme } = useTheme()
  function handleClick() {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }
  return (
    <div className='cursor-pointer' onClick={handleClick}>
      {theme === 'light' ? <Moon /> : <Sun />}
    </div>
  )
}

export default ThemeChanger
