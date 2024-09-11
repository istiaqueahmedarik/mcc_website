'use client'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import React from 'react'

const MccLogo = ({w, h, classes}) => {
    const {theme} = useTheme()
  return (
    <Image src={theme === "light" ? "/mccLogoBlack.png" : "/mccLogo.png"} width={w} height={h} className={classes}/>
  )
}

export default MccLogo