import EditorWrapper from '@/components/EditorWrapper'
import TagsInput from '@/components/achievements/TagsInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarIcon, Trophy, Upload } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export default function AchievementFormShell({
  formAction,
  pending,
  state,
  heading,
  subheading,
  description,
  setDescription,
  titleDefaultValue,
  dateDefaultValue,
  initialTags,
  tagsResetKey,
  inputRef,
  fileInputRef,
  uploadedImageUrl,
  imagePreviewUrl,
  isDraggingImage,
  setIsDraggingImage,
  onDropImage,
  onImageInputChange,
  handleCopy,
  copied,
  customBadge,
  setCustomBadge,
  submitIdleText,
  submitPendingText,
  imageHelperText,
  isFeaturedDefaultChecked = false,
}) {
  const lastToastKeyRef = useRef('')

  useEffect(() => {
    if (!state?.message) return

    const toastKey = `${state.success ? 'success' : 'error'}:${state.message}`
    if (lastToastKeyRef.current === toastKey) return

    lastToastKeyRef.current = toastKey

    if (state.success) {
      toast.success(state.message)
    } else {
      toast.error(state.message)
    }
  }, [state?.message, state?.success])

  return (
    <form action={formAction} className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0a0a0f] dark:text-[#e8e8f5]">
      <main className="mx-auto w-full max-w-7xl px-4 md:px-12 py-2">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-wide text-slate-700 dark:text-[#a9a9c5] sm:text-3xl">
            {heading}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-[#8f8faf]">{subheading}</p>
        </header>

        <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-[#242434] dark:bg-[#111118] sm:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
            <div className="col-span-full grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6 items-start">
              <div className="space-y-4">
                <Label htmlFor="image" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#8f8faf]">
                  Achievement Image / Photo
                </Label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDraggingImage(true)
                  }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={onDropImage}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-5 transition-colors ${
                    isDraggingImage
                      ? 'border-amber-400 bg-amber-100/40 dark:bg-amber-400/10'
                      : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 dark:border-[#2a2a38] dark:bg-[#17171f] dark:hover:border-[#3a3a4f] dark:hover:bg-[#1d1d28]'
                  }`}
                >
                  <Input
                    ref={fileInputRef}
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={onImageInputChange}
                    className="hidden"
                  />

                  {imagePreviewUrl ? (
                    <>
                      <img
                        src={imagePreviewUrl}
                        alt="Achievement preview"
                        className="absolute inset-0 h-full w-full object-contain bg-slate-100 dark:bg-[#1d1d28]"
                      />
                      <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/50 group-hover:flex">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            fileInputRef.current?.click()
                          }}
                          className="h-9 rounded-full bg-white/20 px-4 text-white hover:bg-white/30"
                        >
                          Replace
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-[#242434] dark:text-[#9f9fbc]">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-[#c6c6dc]">Drop your image here</p>
                      <p className="text-xs text-slate-500 dark:text-[#8f8faf]">PNG, JPG, WebP - Max 10MB</p>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                        className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
                      >
                        Browse Files
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5 h-full flex flex-col justify-center">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#8f8faf]">
                    Achievement Title
                  </Label>
                  <div className="relative">
                    <Trophy className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#7c7ca0]" />
                    <Input
                      id="title"
                      name="title"
                      type="text"
                      defaultValue={titleDefaultValue}
                      placeholder="e.g. 1st Place - National Science Olympiad 2025"
                      className="h-10 rounded-md border-slate-300 bg-white pl-10 text-slate-800 placeholder:text-slate-400 focus-visible:ring-slate-400 dark:border-[#2a2a38] dark:bg-[#17171f] dark:text-[#d8d8ec] dark:placeholder:text-[#767697]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#8f8faf]">
                    Tags
                  </Label>
                  <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-[#2a2a38] dark:bg-[#17171f]">
                    <TagsInput key={tagsResetKey} initialTags={initialTags} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intro" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#8f8faf]">
                    Intro Message
                  </Label>
                  <Input
                    id="intro"
                    name="intro"
                    type="text"
                    value={customBadge}
                    onChange={(e) => setCustomBadge(e.target.value)}
                    placeholder="Write a custom intro message"
                    className="h-10 rounded-md border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus-visible:ring-slate-400 dark:border-[#2a2a38] dark:bg-[#17171f] dark:text-[#d8d8ec] dark:placeholder:text-[#767697]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#8f8faf]">
                      Date Achieved
                    </Label>
                    <div className="relative">
                      <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#7c7ca0]" />
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        defaultValue={dateDefaultValue}
                        className="h-10 w-full rounded-md border-slate-300 bg-white pl-10 text-slate-800 focus-visible:ring-slate-400 dark:border-[#2a2a38] dark:bg-[#17171f] dark:text-[#d8d8ec]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="is_Featured" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#8f8faf]">
                      Is Featured?
                    </Label>
                    <label
                      htmlFor="is_Featured"
                      className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-[#2a2a38] dark:bg-[#17171f]"
                    >
                      <span className="font-medium text-slate-700 dark:text-[#c6c6dc]">Show in main feed</span>
                      <span className="relative inline-flex h-6 w-11 items-center">
                        <input
                          id="is_Featured"
                          name="is_Featured"
                          type="checkbox"
                          defaultChecked={isFeaturedDefaultChecked}
                          className="peer sr-only"
                        />
                          <span className="absolute inset-0 rounded-full bg-zinc-300 transition-colors duration-200 peer-checked:bg-black peer-focus-visible:ring-2 peer-focus-visible:ring-black/30" />
                          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 peer-checked:translate-x-5" />
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-full border-t border-slate-200 p text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-[#242434] dark:text-[#8f8faf]">
              Description
            </div>

            <div className="col-span-full overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2a2a38] dark:bg-[#17171f]">
              <div className="p-1 sm:p-2">
                <EditorWrapper value={description} handleChange={setDescription} />
                <input type="hidden" name="description" value={description} />
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-[#2a2a38] dark:bg-[#1d1d28] dark:text-[#8f8faf]">
                <span>{description.length.toLocaleString()} characters</span>
              </div>
            </div>

            <div className="col-span-full mt-2 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-[#242434]">


              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="submit"
                disabled={pending}
                className="rounded-md bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                {pending ? submitPendingText : submitIdleText}
              </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </form>
  )
}
