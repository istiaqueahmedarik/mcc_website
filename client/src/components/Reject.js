'use client'
import { rejectUser } from '@/lib/action'
import Image from 'next/image'
import { useActionState } from 'react'
import { IoCheckmarkCircleOutline } from 'react-icons/io5'
import { Button } from './ui/button'
import { RxCrossCircled } from 'react-icons/rx'

const Reject = ({ userId }) => {
  const [state, formAction, pending] = useActionState(rejectUser, userId)
  console.log('state', state)
  return (
    <form action={formAction}>
      <Button
        type="submit"
        className="bg-transparent text-destructive hover:bg-primary/5 w-16 overflow-hidden"
      >
        {pending ? (
          <Image
            src="/Loader.gif"
            width={30}
            height={30}
          />
        ) : (
          <RxCrossCircled size={20} />
        )}
      </Button>
    </form>
  )
}

export default Reject
