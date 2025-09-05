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
  const [deletedIds, setDeletedIds] = useState(new Set())

    const [createState, createAction] = useActionState(createCustomContestAction, { })
    const [updateState, updateAction] = useActionState(updateCustomContestAction, { })
    const [deleteState, deleteAction] = useActionState(deleteCustomContestAction, { })

  return <div className='space-y-8'>
    <form action={createAction} className='space-y-4 p-4 border rounded-lg'>
      <h2 className='text-xl font-semibold'>Add Contest</h2>
      <div className='grid md:grid-cols-2 gap-4'>
        <div className='space-y-1'>
          <label htmlFor='name' className='text-sm font-medium'>Name</label>
          <Input id='name' name='name' placeholder='Name' required />
        </div>
        <div className='space-y-1'>
          <label htmlFor='platform' className='text-sm font-medium'>Platform</label>
          <Input id='platform' name='platform' placeholder='Platform (optional)' />
        </div>
        <div className='space-y-1 md:col-span-2'>
          <label htmlFor='link' className='text-sm font-medium'>Link</label>
          <Input id='link' name='link' placeholder='Link (optional)' />
        </div>
        <div className='space-y-1'>
          <label htmlFor='start_time' className='text-sm font-medium'>Start Time</label>
          <Input id='start_time' name='start_time' type='datetime-local' required />
        </div>
        <div className='space-y-1'>
          <label htmlFor='end_time' className='text-sm font-medium'>End Time</label>
          <Input id='end_time' name='end_time' type='datetime-local' required />
        </div>
      </div>
      <div className='space-y-1'>
        <label htmlFor='description' className='text-sm font-medium'>Description</label>
        <Textarea id='description' name='description' placeholder='Description (optional)' />
      </div>
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
            <div className='grid md:grid-cols-2 gap-2'>
              <div className='space-y-1'>
                <label htmlFor={`name-${c.id}`} className='text-sm font-medium'>Name</label>
                <Input id={`name-${c.id}`} name='name' defaultValue={c.name} required />
              </div>
              <div className='space-y-1'>
                <label htmlFor={`platform-${c.id}`} className='text-sm font-medium'>Platform</label>
                <Input id={`platform-${c.id}`} name='platform' defaultValue={c.platform||''} />
              </div>
              <div className='space-y-1 md:col-span-2'>
                <label htmlFor={`link-${c.id}`} className='text-sm font-medium'>Link</label>
                <Input id={`link-${c.id}`} name='link' defaultValue={c.link||''} />
              </div>
              <div className='space-y-1'>
                <label htmlFor={`start-${c.id}`} className='text-sm font-medium'>Start Time</label>
                <Input id={`start-${c.id}`} name='start_time' type='datetime-local' defaultValue={new Date(c.start_time).toISOString().slice(0,16)} required />
              </div>
              <div className='space-y-1'>
                <label htmlFor={`end-${c.id}`} className='text-sm font-medium'>End Time</label>
                <Input id={`end-${c.id}`} name='end_time' type='datetime-local' defaultValue={new Date(c.end_time).toISOString().slice(0,16)} required />
              </div>
            </div>
            <div className='space-y-1'>
              <label htmlFor={`desc-${c.id}`} className='text-sm font-medium'>Description</label>
              <Textarea id={`desc-${c.id}`} name='description' defaultValue={c.description||''} />
            </div>
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
                <form
                  action={deleteAction}
                  onSubmit={(e)=>{
                    e.preventDefault()
                    setEditing(null)
                    const fd = new FormData(e.currentTarget)
                    const id = c.id
                    startTransition(async () => {
                      const res = await deleteAction(fd)
                      if(!res?.error){
                        setContests(prev => prev.filter(x => x.id !== id))
                        setDeletedIds(prev => new Set([...prev, id]))
                      }
                    })
                  }}
                >
                  <input type='hidden' name='contest_id' value={c.id} />
                  <Button size='sm' variant='destructive'>Deactivate</Button>
                </form>
              </div>
            </div>
            {deletedIds.has(c.id) && <p className='text-xs text-green-600'>Deactivated</p>}
          </>}        
        </div>)}
        {contests.length === 0 && <p className='text-sm text-muted-foreground'>No contests yet.</p>}
      </div>
    </div>
  </div>
}
