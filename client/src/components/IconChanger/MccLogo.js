'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import Image from 'next/image'

const MccLogo = ({ w, h, classes }) => {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div>
      <Image
        src={resolvedTheme === 'light' ? '/mccLogoBlack.png' : '/mccLogo.png'}
        width={w}
        height={h}
        className={classes}
        alt="MCC Logo"
      />
    </div>
  )
}

export default MccLogo
