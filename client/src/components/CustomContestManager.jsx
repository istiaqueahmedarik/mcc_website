"use client"
import { useActionState, useState, useTransition } from 'react'
import { createCustomContestAction, updateCustomContestAction, deleteCustomContestAction } from '@/lib/action'
import { useFormState } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function CustomContestManager({ initialContests }){
  const [contests, setContests] = useState(initialContests || [])
  const [editing, setEditing] = useState(null)
  const [isPending, startTransition] = useTransition()

    const [createState, createAction] = useActionState(createCustomContestAction, { })
    const [updateState, updateAction] = useActionState(updateCustomContestAction, { })
    const [deleteState, deleteAction] = useActionState(deleteCustomContestAction, { })

  return <div className='space-y-8'>
    <form action={createAction} className='space-y-4 p-4 border rounded-lg'>
      <h2 className='text-xl font-semibold'>Add Contest</h2>
      <div className='grid md:grid-cols-2 gap-4'>
        <Input name='name' placeholder='Name' required />
        <Input name='platform' placeholder='Platform (optional)' />
        <Input name='link' placeholder='Link (optional)' />
        <Input name='start_time' type='datetime-local' required />
        <Input name='end_time' type='datetime-local' required />
      </div>
      <Textarea name='description' placeholder='Description (optional)' />
      <Button type='submit'>Create</Button>
      {createState?.error && <p className='text-sm text-red-500'>{createState.error}</p>}
      {createState?.success && <p className='text-sm text-green-600'>Created</p>}
    </form>

    <div className='space-y-4'>
      <h2 className='text-xl font-semibold'>Existing Contests</h2>
      <div className='space-y-4'>
        {contests.map(c => <div key={c.id} className='border rounded-lg p-4'>
          {editing === c.id ? <form action={updateAction} className='space-y-2'>
            <input type='hidden' name='contest_id' value={c.id} />
            <Input name='name' defaultValue={c.name} required />
            <Input name='platform' defaultValue={c.platform||''} />
            <Input name='link' defaultValue={c.link||''} />
            <Input name='start_time' type='datetime-local' defaultValue={new Date(c.start_time).toISOString().slice(0,16)} required />
            <Input name='end_time' type='datetime-local' defaultValue={new Date(c.end_time).toISOString().slice(0,16)} required />
            <Textarea name='description' defaultValue={c.description||''} />
            <div className='flex gap-2'>
              <Button type='submit' size='sm'>Save</Button>
              <Button type='button' variant='outline' size='sm' onClick={()=>setEditing(null)}>Cancel</Button>
            </div>
            {updateState?.error && <p className='text-sm text-red-500'>{updateState.error}</p>}
            {updateState?.success && <p className='text-sm text-green-600'>Updated</p>}
          </form> : <>
            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
              <div>
                <h3 className='font-medium'>{c.name}</h3>
                <p className='text-xs text-muted-foreground'>{c.platform} • {new Date(c.start_time).toLocaleString()} - {new Date(c.end_time).toLocaleString()}</p>
              </div>
              <div className='flex gap-2'>
                <Button size='sm' variant='outline' onClick={()=>setEditing(c.id)}>Edit</Button>
                <form action={deleteAction} onSubmit={()=>setEditing(null)}>
                  <input type='hidden' name='contest_id' value={c.id} />
                  <Button size='sm' variant='destructive'>Deactivate</Button>
                </form>
              </div>
            </div>
            {deleteState?.success && <p className='text-xs text-green-600'>Deactivated</p>}
          </>}        
        </div>)}
        {contests.length === 0 && <p className='text-sm text-muted-foreground'>No contests yet.</p>}
      </div>
    </div>
  </div>
}
