'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export function RoomDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded-md border transition-colors hover:bg-accent flex items-center gap-1"
      >
        Room
        {mounted && <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-40 bg-background border rounded-md shadow-lg py-1 z-50">
          <Link
            href="/typing/room/create"
            className="block px-4 py-2 text-sm hover:bg-accent"
            onClick={() => setIsOpen(false)}
          >
            Create Room
          </Link>
          <Link
            href="/typing/room/join"
            className="block px-4 py-2 text-sm hover:bg-accent"
            onClick={() => setIsOpen(false)}
          >
            Join Room
          </Link>
        </div>
      )}
    </div>
  )
}
