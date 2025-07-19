'use client'

import { Loader, Trash2 } from 'lucide-react'
import { useActionState, useCallback } from 'react'

const initialState = {
  message: '',
  success: false,
}

export default function DeleteComp({ delFunc, content }) {
  const [state, formAction, pending] = useActionState(delFunc, {})

  const handleSubmit = useCallback(
    (formData) => {
      formData.append('id', content.id)
      formAction(formData)
    },
    [formAction, content],
  )
  return (
    <form
      className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
      action={handleSubmit}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-destructive px-3 py-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors shadow"
      >
        {pending ? (
          <Loader
            size={12}
            className=""
          />
        ) : (
          <Trash2
            size={12}
            className=""
          />
        )}
      </button>
    </form>
  )
}
