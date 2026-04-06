import { TypingTest } from '@/components/typing/typing-test'
import { RoomDropdown } from '@/components/typing/room-dropdown'
import Link from 'next/link'

export default function TypingPage() {
  return (
    <div className="py-6 md:py-10 w-full space-y-8">
      <div className="flex gap-3 justify-center items-center pt-4">
        <Link
          href="/typing"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          Practice
        </Link>
        <RoomDropdown />
      </div>

      <div className="border-t pt-8">
        <h2 className="text-2xl font-semibold text-center mb-6">Practice Mode</h2>
        <TypingTest />
      </div>
    </div>
  )
}
