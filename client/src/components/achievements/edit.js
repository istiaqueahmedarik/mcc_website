'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateAchievement, uploadImage } from '@/lib/action'
import { format } from 'date-fns'
import { CalendarIcon, Check, Copy, ImageIcon, Menu, TrophyIcon, X } from 'lucide-react'
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import EditorWrapper from '../EditorWrapper'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import TagsInput from '@/components/achievements/TagsInput'

const initialState = {
  message: '',
  success: false,
}

const EditSidebar = ({ achievement, state, inputRef, handleCopy }) => {
  // console.log('Initial achievement data:', achievement) // Debug log to check incoming data
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const ach_date = format(achievement.date, 'yyyy-MM-dd')
  const initialTags = Array.isArray(achievement.tag_names)
    ? achievement.tag_names
    : []

  useEffect(() => {
    if (copied) {
      setTimeout(() => setCopied(false), 2500)
    }
  }, [copied])

  const uploadImageForDescription = useCallback(async (rawImage) => {
    const { url, error } = await uploadImage(
      'achievements',
      new Date().getTime().toString(),
      rawImage,
      'all_picture'
    )
    if (error) {
      return { success: false, message: 'Problem uploading image', url: '' }
    }
    inputRef.current.value = url
    return { success: true, message: '', url }
  }, [])

  const updateCopy = () => {
    handleCopy()
    setCopied(true)
  }

  return (
    <>
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed bottom-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {isMobileMenuOpen && (
        <div
          style={{ background: 'var(--sidebar-background)' }}
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        style={{ background: 'var(--sidebar-background)' }}
        className={`fixed
          lg:relative inset-y-0 left-0 z-50
          w-80 sm:w-96 lg:w-80
          border-r border-gray-200 dark:border-zinc-700
          transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 h-[90vh] overflow-y-auto`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-zinc-700 relative">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="flex items-center space-x-3 pr-8 lg:pr-0">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-100 truncate">
                Edit Achievement
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-300 break-words">
                Update the achievement details below
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col px-4 mt-4 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <div className="relative">
              <TrophyIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                id="title"
                name="title"
                defaultValue={achievement.title}
                placeholder="Title of the achievement"
                className="pl-10 border-gray-300 dark:border-zinc-700 dark:focus:ring-zinc-600"
              />
            </div>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label htmlFor="image">
              Image{' '}
              <span className="text-xs text-gray-400">(leave blank to keep existing)</span>
            </Label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="file"
                id="image"
                name="image"
                onChange={(e) => uploadImageForDescription(e.target.files[0])}
                className="pl-10 border-gray-300 dark:border-zinc-700"
                accept="image/*"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Uploaded Image URL</Label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                id="imageUrl"
                ref={inputRef}
                name="imageUrl"
                disabled
                defaultValue={achievement.image}
                placeholder="Image URL of the achievement"
                className="pl-10 pr-12 border-gray-300 dark:border-zinc-700 dark:focus:ring-zinc-600"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={updateCopy}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white"
                  >
                    {copied ? 'Copied!' : 'Copy to clipboard'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                id="date"
                name="date"
                defaultValue={ach_date}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tags — pre-populated with existing achievement tags */}
          <TagsInput initialTags={initialTags} />

          <div className="space-b-2">
            <p className="italic text-gray-400 text-sm dark:text-gray-700">
              Note: You can copy the URL by uploading an image and paste it into
              the description. Upload the thumbnail image last so it is
              automatically used as the thumbnail.
            </p>
          </div>

          {state?.message && (
            <Alert variant={state?.success ? 'success' : 'destructive'}>
              <AlertDescription>{state?.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </>
  )
}

const EditMainContent = ({ description, setDescription, pending }) => {
  const handleDescriptionChange = useCallback(
    (newValue) => setDescription(newValue),
    [setDescription]
  )

  return (
    <div className="flex-1 h-screen lg:ml-0 ml-0">
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col">
          <div>
            <EditorWrapper value={description} handleChange={handleDescriptionChange} />
            <input type="hidden" name="description" value={description} />
          </div>
          <div className="mt-4 flex justify-between items-center px-4">
            <span className="text-sm text-gray-500">{description.length} characters</span>
            <button
              type="submit"
              disabled={pending}
              className="px-6 py-2 bg-zinc-700 dark:bg-zinc-200 text-white rounded-lg dark:text-zinc-800 transition-colors"
            >
              {pending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Edit({ achievement }) {
  const [description, setDescription] = useState(achievement.description)
  const inputRef = useRef(null)

  initialState.ach_id = achievement.id
  initialState.imgurl = achievement.image

  const [state, formAction, pending] = useActionState(updateAchievement, initialState)

  const handleCopy = useCallback(() => {
    if (inputRef.current?.value) {
      navigator.clipboard.writeText(inputRef.current.value)
    }
  }, [])

  return (
    <form action={formAction} className="w-full flex flex-col justify-center">
      <div className="flex w-full">
        <EditSidebar
          achievement={achievement}
          state={state}
          inputRef={inputRef}
          handleCopy={handleCopy}
        />
        <EditMainContent
          pending={pending}
          description={description}
          setDescription={setDescription}
        />
      </div>
    </form>
  )
}