'use client'
import { acceptUser } from '@/lib/action'
import Image from 'next/image'
import { useActionState } from 'react'
import { IoCheckmarkCircleOutline } from 'react-icons/io5'
import { Button } from './ui/button'

const Accept = ({ userId }) => {
  const [state, formAction, pending] = useActionState(acceptUser, userId)
  return (
    <form action={formAction}>
      <Button
        type="submit"
        className="bg-transparent text-yellowCus1-foreground hover:bg-primary/5 w-16 overflow-hidden"
      >
        {pending ? (
          <Image
            src="/Loader.gif"
            width={30}
            height={30}
          />
        ) : (
          <IoCheckmarkCircleOutline size={20} />
        )}
      </Button>
    </form>
  )
}

export default Accept
