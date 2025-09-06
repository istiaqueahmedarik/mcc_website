"use client"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createCustomContestAction, deleteCustomContestAction, updateCustomContestAction } from '@/lib/action'
import { CheckCircle, Edit3, Loader2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState, useTransition } from 'react'

export default function CustomContestManager({ initialContests }){
  const router = useRouter()
  const [contests, setContests] = useState(initialContests || [])
  const [editing, setEditing] = useState(null)
  const [isPending, startTransition] = useTransition()
  const [deletedIds, setDeletedIds] = useState(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(null)
  const [showSuccess, setShowSuccess] = useState(null)
  const [createFormRef, setCreateFormRef] = useState(null)
  const [previewEndTime, setPreviewEndTime] = useState('')

  const [createState, createAction] = useActionState(createCustomContestAction, { })
  const [updateState, updateAction] = useActionState(updateCustomContestAction, { })
  const [deleteState, deleteAction] = useActionState(deleteCustomContestAction, { })

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime, durationHours) => {
    if (!startTime || !durationHours) return ''
    
    console.log('Calculating end time:')
    console.log('Start time input:', startTime)
    console.log('Duration hours:', durationHours)
    
    // datetime-local gives us a string like "2024-12-25T14:30"
    // We need to parse this as local time, not UTC
    // The string format is YYYY-MM-DDTHH:mm
    const [datePart, timePart] = startTime.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    
    // Create date object with explicit local timezone
    const start = new Date(year, month - 1, day, hour, minute) // month is 0-indexed
    console.log('Parsed start date (local):', start.toLocaleString())
    
    const durationMs = parseFloat(durationHours) * 60 * 60 * 1000
    console.log('Duration in ms:', durationMs)
    
    const end = new Date(start.getTime() + durationMs)
    console.log('Calculated end date (local):', end.toLocaleString())
    
    // Format back to datetime-local format (YYYY-MM-DDTHH:mm)
    const year2 = end.getFullYear()
    const month2 = String(end.getMonth() + 1).padStart(2, '0') // month is 0-indexed
    const day2 = String(end.getDate()).padStart(2, '0')
    const hour2 = String(end.getHours()).padStart(2, '0')
    const minute2 = String(end.getMinutes()).padStart(2, '0')
    
    const endTimeString = `${year2}-${month2}-${day2}T${hour2}:${minute2}`
    console.log('End time string for input:', endTimeString)
    
    return endTimeString
  }

  // Handle success states and auto-refresh
  useEffect(() => {
    if (createState?.success) {
      setCreateLoading(false)
      setShowSuccess('create')
      
      // Clear the form
      if (createFormRef) {
        createFormRef.reset()
      }
      
      // Reload the section by fetching fresh data
      setTimeout(async () => {
        setIsRefreshing(true)
        try {
          // Force page refresh to get updated contest data
          window.location.reload()
        } catch (error) {
          console.error('Error refreshing:', error)
          setIsRefreshing(false)
        }
      }, 1000)
      
      setTimeout(() => setShowSuccess(null), 3000)
    }
    if (createState?.error) {
      setCreateLoading(false)
    }
  }, [createState, createFormRef])

  useEffect(() => {
    if (updateState?.success) {
      setUpdateLoading(false)
      setEditing(null)
      setShowSuccess('update')
      setTimeout(() => setShowSuccess(null), 3000)
      
      // Update the local state immediately with the updated contest data
      if (updateState.contest) {
        setContests(prev => prev.map(contest => 
          contest.id === updateState.contest.id ? updateState.contest : contest
        ))
      } else {
        // Fallback: if no contest data in response, refresh the page
        setTimeout(() => {
          setIsRefreshing(true)
          router.refresh()
        }, 500)
      }
      
      // Optional: Still do a delayed refresh to ensure consistency
      setTimeout(() => {
        setIsRefreshing(true)
        router.refresh()
      }, 3000) // Increased delay since we update locally first
    }
    if (updateState?.error) {
      setUpdateLoading(false)
    }
  }, [updateState, router])

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    setCreateLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // Calculate end time from start time and duration
    const startTime = formData.get('start_time')
    const duration = formData.get('duration_hours')
    
    if (startTime && duration) {
      const endTime = calculateEndTime(startTime, parseFloat(duration))
      formData.set('end_time', endTime)
    }
    
    startTransition(async () => {
      await createAction(formData)
    })
  }

  const handleUpdateSubmit = (e) => {
    e.preventDefault()
    setUpdateLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // Calculate end time from start time and duration
    const startTime = formData.get('start_time')
    const duration = formData.get('duration_hours')
    
    if (startTime && duration) {
      const endTime = calculateEndTime(startTime, parseFloat(duration))
      formData.set('end_time', endTime)
    }
    
    startTransition(async () => {
      await updateAction(formData)
    })
  }

  const getDurationFromTimes = (startTime, endTime) => {
    console.log('Getting duration from times:')
    console.log('Start time:', startTime)
    console.log('End time:', endTime)
    
    // Parse dates as local time (same method as calculateEndTime)
    const parseLocalDateTime = (dateTimeString) => {
      const [datePart, timePart] = dateTimeString.split('T')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour, minute] = timePart.split(':').map(Number)
      return new Date(year, month - 1, day, hour, minute) // month is 0-indexed
    }
    
    const start = parseLocalDateTime(startTime)
    const end = parseLocalDateTime(endTime)
    
    console.log('Parsed start (local):', start.toLocaleString())
    console.log('Parsed end (local):', end.toLocaleString())
    
    const durationMs = end.getTime() - start.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)
    
    console.log('Duration in hours:', durationHours)
    
    return durationHours.toFixed(1) // Round to 1 decimal place
  }

  // Helper function to format date for datetime-local input
  const formatDateForInput = (dateString) => {
    const date = new Date(dateString)
    // Get local time values
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Update preview when start time or duration changes
  const updateEndTimePreview = (startTime, duration) => {
    if (startTime && duration) {
      const endTime = calculateEndTime(startTime, parseFloat(duration))
      setPreviewEndTime(endTime)
    } else {
      setPreviewEndTime('')
    }
  }

  return <div className='space-y-8'>
    {/* Success notification */}
    {showSuccess && (
      <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              {showSuccess === 'create' ? 'Contest created successfully!' : 
               showSuccess === 'update' ? 'Contest updated successfully!' : 
               'Action completed successfully!'}
            </span>
          </CardContent>
        </Card>
      </div>
    )}

    {/* Refresh indicator */}
    {isRefreshing && (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Refreshing data...</span>
          </CardContent>
        </Card>
      </div>
    )}

    {/* Add Contest Form */}
    <Card className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-700 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-red-600" />
          Add New Contest
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={setCreateFormRef} onSubmit={handleCreateSubmit} className='space-y-4'>
          <div className='grid md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label htmlFor='name' className='text-sm font-medium'>Contest Name</label>
              <Input 
                id='name' 
                name='name' 
                placeholder='Enter contest name' 
                required 
                disabled={createLoading}
                className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className='space-y-2'>
              <label htmlFor='platform' className='text-sm font-medium'>Platform</label>
              <Input 
                id='platform' 
                name='platform' 
                placeholder='e.g., Codeforces, CodeChef' 
                disabled={createLoading}
                className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <label htmlFor='link' className='text-sm font-medium'>Contest Link <span className="text-zinc-400 font-normal">(Optional)</span></label>
              <Input 
                id='link' 
                name='link' 
                placeholder='https://... (optional)' 
                type="url"
                disabled={createLoading}
                className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className='space-y-2'>
              <label htmlFor='start_time' className='text-sm font-medium'>Start Time</label>
              <Input 
                id='start_time' 
                name='start_time' 
                type='datetime-local' 
                required 
                disabled={createLoading}
                className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
                onChange={(e) => {
                  const duration = document.getElementById('duration_hours')?.value
                  updateEndTimePreview(e.target.value, duration)
                }}
              />
            </div>
            <div className='space-y-2'>
              <label htmlFor='duration_hours' className='text-sm font-medium'>Duration (Hours)</label>
              <Input 
                id='duration_hours' 
                name='duration_hours' 
                type='number'
                min='0.5'
                step='0.5'
                placeholder='e.g., 2, 3.5'
                required 
                disabled={createLoading}
                className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
                onChange={(e) => {
                  const startTime = document.getElementById('start_time')?.value
                  updateEndTimePreview(startTime, e.target.value)
                }}
              />
              <div className="flex flex-col gap-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">End time will be calculated automatically</p>
                {previewEndTime && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Preview end time: {(() => {
                      const [datePart, timePart] = previewEndTime.split('T')
                      const [year, month, day] = datePart.split('-').map(Number)
                      const [hour, minute] = timePart.split(':').map(Number)
                      const date = new Date(year, month - 1, day, hour, minute)
                      return date.toLocaleString()
                    })()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className='space-y-2'>
            <label htmlFor='description' className='text-sm font-medium'>Description</label>
            <Textarea 
              id='description' 
              name='description' 
              placeholder='Contest description (optional)' 
              rows={3}
              disabled={createLoading}
              className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button 
              type='submit' 
              disabled={createLoading}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[120px] transition-all duration-200"
            >
              {createLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Contest
                </>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="min-w-[100px]"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
          
          {createState?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className='text-sm text-red-600 dark:text-red-400'>{createState.error}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>

    {/* Existing Contests */}
    <div className='space-y-6'>
      <div className="flex items-center justify-between">
        <h2 className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>Existing Contests</h2>
        <Badge variant="secondary" className="px-3 py-1">
          {contests.length} contest{contests.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className='space-y-4'>
        {contests.map(c => (
          <Card key={c.id} className="transition-all duration-200 hover:shadow-md border-zinc-200 dark:border-zinc-800">
            {editing === c.id ? (
              <CardContent className="p-6">
                <form onSubmit={handleUpdateSubmit} className='space-y-4'>
                  <input type='hidden' name='contest_id' value={c.id} />
                  <div className='grid md:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label htmlFor={`name-${c.id}`} className='text-sm font-medium'>Contest Name</label>
                      <Input 
                        id={`name-${c.id}`} 
                        name='name' 
                        defaultValue={c.name} 
                        required 
                        disabled={updateLoading}
                        className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className='space-y-2'>
                      <label htmlFor={`platform-${c.id}`} className='text-sm font-medium'>Platform</label>
                      <Input 
                        id={`platform-${c.id}`} 
                        name='platform' 
                        defaultValue={c.platform||''} 
                        disabled={updateLoading}
                        className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className='space-y-2 md:col-span-2'>
                      <label htmlFor={`link-${c.id}`} className='text-sm font-medium'>Contest Link <span className="text-zinc-400 font-normal">(Optional)</span></label>
                      <Input 
                        id={`link-${c.id}`} 
                        name='link' 
                        defaultValue={c.link||''} 
                        placeholder="https://... (optional)"
                        type="url"
                        disabled={updateLoading}
                        className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className='space-y-2'>
                      <label htmlFor={`start-${c.id}`} className='text-sm font-medium'>Start Time</label>
                      <Input 
                        id={`start-${c.id}`} 
                        name='start_time' 
                        type='datetime-local' 
                        defaultValue={formatDateForInput(c.start_time)} 
                        required 
                        disabled={updateLoading}
                        className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className='space-y-2'>
                      <label htmlFor={`duration-${c.id}`} className='text-sm font-medium'>Duration (Hours)</label>
                      <Input 
                        id={`duration-${c.id}`} 
                        name='duration_hours' 
                        type='number'
                        min='0.5'
                        step='0.5'
                        defaultValue={getDurationFromTimes(c.start_time, c.end_time)}
                        required 
                        disabled={updateLoading}
                        className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">End time will be calculated automatically</p>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <label htmlFor={`desc-${c.id}`} className='text-sm font-medium'>Description</label>
                    <Textarea 
                      id={`desc-${c.id}`} 
                      name='description' 
                      defaultValue={c.description||''} 
                      rows={3}
                      disabled={updateLoading}
                      className="transition-all duration-200 focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className='flex gap-3'>
                    <Button 
                      type='submit' 
                      disabled={updateLoading}
                      className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]"
                    >
                      {updateLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button 
                      type='button' 
                      variant='outline' 
                      onClick={()=>setEditing(null)}
                      disabled={updateLoading}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                  {updateState?.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className='text-sm text-red-600 dark:text-red-400'>{updateState.error}</p>
                    </div>
                  )}
                </form>
              </CardContent>
            ) : (
              <CardContent className="p-6">
                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className='font-bold text-lg text-zinc-900 dark:text-zinc-100'>{c.name}</h3>
                      {c.platform && (
                        <Badge variant="outline" className="text-xs">
                          {c.platform}
                        </Badge>
                      )}
                      <span className={`w-2 h-2 rounded-full ${
                        Date.now() < new Date(c.start_time).getTime() ? 'bg-yellow-500' :
                        Date.now() <= new Date(c.end_time).getTime() ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                    </div>
                    <p className='text-sm text-zinc-600 dark:text-zinc-400'>
                      {new Date(c.start_time).toLocaleString()} - {new Date(c.end_time).toLocaleString()}
                    </p>
                    {c.description && (
                      <p className='text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2'>{c.description}</p>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <Button 
                      variant='outline' 
                      onClick={()=>setEditing(c.id)}
                      disabled={editing !== null || deleteLoading === c.id}
                      className="transition-all duration-200 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <form
                      onSubmit={(e)=>{
                        e.preventDefault()
                        setEditing(null)
                        setDeleteLoading(c.id)
                        const fd = new FormData(e.currentTarget)
                        const id = c.id
                        startTransition(async () => {
                          const res = await deleteAction(fd)
                          setDeleteLoading(null)
                          if(!res?.error){
                            setContests(prev => prev.filter(x => x.id !== id))
                            setDeletedIds(prev => new Set([...prev, id]))
                          }
                        })
                      }}
                    >
                      <input type='hidden' name='contest_id' value={c.id} />
                      <Button 
                        type="submit"
                        variant='destructive' 
                        disabled={editing !== null || deleteLoading === c.id}
                        className="min-w-[110px] transition-all duration-200"
                      >
                        {deleteLoading === c.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
                {deletedIds.has(c.id) && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className='text-xs text-green-600 dark:text-green-400 flex items-center gap-2'>
                      <CheckCircle className="h-4 w-4" />
                      Contest deactivated successfully
                    </p>
                  </div>
                )}
              </CardContent>
            )}        
          </Card>
        ))}
        {contests.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <Plus className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No contests yet</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Get started by creating your first custom contest above.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  </div>
}
