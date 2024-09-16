'use client'
import { rejectUser } from '@/lib/action'
import Image from 'next/image'
import { useActionState } from 'react'
import { RxCrossCircled } from 'react-icons/rx'
import { Button } from './ui/button'

const Reject = ({ userId }) => {
  const [state, formAction, pending] = useActionState(rejectUser, userId)
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
