import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarIcon, Check, Copy, Link2, Trophy, Upload } from 'lucide-react'
import EditorWrapper from '@/components/EditorWrapper'
import TagsInput from '@/components/achievements/TagsInput'

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
  selectedBadge,
  setSelectedBadge,
  customBadge,
  setCustomBadge,
  badgePresets,
  submitIdleText,
  submitPendingText,
  imageHelperText,
  isFeaturedDefaultChecked = false,
}) {
  const introValue = selectedBadge === 'Custom' ? customBadge.trim() : selectedBadge
  const badgePreviewText = introValue || selectedBadge

  return (
    <form action={formAction} className="min-h-screen">
      <div className="relative min-h-screen bg-[var(--ab-bg)] text-[var(--ab-text)] [font-family:'DM_Sans',system-ui,sans-serif] [--ab-bg:#f8fafc] [--ab-surface:#ffffff] [--ab-surface-2:#f1f5f9] [--ab-border:rgba(15,23,42,0.14)] [--ab-accent:#4f46e5] [--ab-accent-2:#7c3aed] [--ab-gold:#d97706] [--ab-text:#0f172a] [--ab-muted:#475569] dark:[--ab-bg:#0a0a0f] dark:[--ab-surface:#111118] dark:[--ab-surface-2:#17171f] dark:[--ab-border:#2a2a38] dark:[--ab-accent:#6366f1] dark:[--ab-accent-2:#a78bfa] dark:[--ab-gold:#f59e0b] dark:[--ab-text:#f1f0ff] dark:[--ab-muted:#9090b0]">
        <div className="pointer-events-none fixed -left-40 -top-44 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_72%)]" />
        <div className="pointer-events-none fixed -bottom-40 -right-44 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.1)_0%,transparent_72%)]" />

        <main className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-20 pt-10 sm:px-8 lg:px-10 sm:pt-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent [font-family:'Syne',sans-serif] bg-gradient-to-r from-[var(--ab-text)] to-[var(--ab-accent-2)] bg-clip-text sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-2 text-sm font-light text-[var(--ab-muted)]">{subheading}</p>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
            <div className="col-span-full flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-[var(--ab-muted)] [font-family:'Syne',sans-serif]">
              Basic Info
              <span className="h-px flex-1 bg-[var(--ab-border)]" />
            </div>

            <div className="col-span-full space-y-2">
              <Label
                htmlFor="title"
                className="text-[11px] uppercase tracking-[0.12em] text-[var(--ab-muted)] [font-family:'Syne',sans-serif]"
              >
                Achievement Title
              </Label>
              <div className="relative">
                <Trophy className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ab-muted)]" />
                <Input
                  id="title"
                  name="title"
                  type="text"
                  defaultValue={titleDefaultValue}
                  placeholder="e.g. 1st Place - National Science Olympiad 2025"
                  className="h-12 border-[var(--ab-border)] bg-[var(--ab-surface)] pl-10 text-[var(--ab-text)] placeholder:text-[rgba(144,144,176,0.6)] focus-visible:ring-[var(--ab-accent)]"
                />
              </div>
            </div>

            <div className="col-span-full grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="image"
                  className="text-[11px] uppercase tracking-[0.12em] text-[var(--ab-muted)] [font-family:'Syne',sans-serif]"
                >
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
                  className={`group relative aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-5 transition-colors flex ${
                    isDraggingImage
                      ? 'border-amber-400 bg-amber-400/10'
                      : 'border-[var(--ab-border)] bg-[var(--ab-surface)] hover:border-[var(--ab-accent)] hover:bg-[var(--ab-surface-2)]'
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
                        className="absolute inset-0 h-full w-full object-contain bg-[var(--ab-surface-2)]"
                      />
                      <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/55 backdrop-blur-[1px] group-hover:flex">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            fileInputRef.current?.click()
                          }}
                          className="h-9 bg-white/15 text-white backdrop-blur hover:bg-white/25"
                        >
                          Replace
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-400/20 text-indigo-200">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold [font-family:'Syne',sans-serif]">
                        Drop your image here
                      </p>
                      <p className="text-xs text-[var(--ab-muted)]">PNG, JPG, WebP - Max 10MB</p>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                        className="bg-gradient-to-r from-[var(--ab-accent)] to-[var(--ab-accent-2)] text-white hover:opacity-90"
                      >
                        Browse Files
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <Label
                    htmlFor="imageUrl"
                    className="text-[11px] uppercase tracking-[0.12em] text-[var(--ab-muted)] [font-family:'Syne',sans-serif]"
                  >
                    Uploaded Image URL
                  </Label>

                  <div className="rounded-xl border border-[var(--ab-border)] bg-[var(--ab-surface)] p-4">
                    <div className="flex h-12 items-stretch overflow-hidden rounded-md border border-[var(--ab-border)] bg-[var(--ab-surface)]">
                      <span className="flex items-center border-r border-[var(--ab-border)] bg-[var(--ab-surface-2)] px-3 text-[var(--ab-muted)]">
                        <Link2 className="h-4 w-4" />
                      </span>
                      <Input
                        id="imageUrl"
                        ref={inputRef}
                        name="imageUrl"
                        disabled
                        value={uploadedImageUrl}
                        placeholder="URL will appear after image is uploaded"
                        className="h-full flex-1 border-0 bg-transparent text-xs text-[var(--ab-muted)] [font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation_Mono','Courier_New',monospace] focus-visible:ring-0"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!uploadedImageUrl}
                        className={`border-l border-[var(--ab-border)] px-3 transition-colors ${
                          uploadedImageUrl
                            ? 'bg-[var(--ab-surface-2)] text-[var(--ab-muted)] hover:bg-indigo-500/15 hover:text-[var(--ab-accent-2)]'
                            : 'cursor-not-allowed bg-[var(--ab-surface-2)] text-[rgba(144,144,176,0.35)]'
                        }`}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-4 flex gap-2 rounded-md border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-600">
                      <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600/25 text-[10px] font-bold">
                        i
                      </div>
                      <p className="leading-relaxed">{imageHelperText}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-[0.12em] text-[var(--ab-muted)] [font-family:'Syne',sans-serif]">
                    Tags
                  </Label>
                  <div className="rounded-md border border-[var(--ab-border)] bg-[var(--ab-surface)] p-3">
                    <TagsInput key={tagsResetKey} initialTags={initialTags} />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label
                    htmlFor="date"
                    className="text-[11px] uppercase tracking-[0.12em] text-[var(--ab-muted)] [font-family:'Syne',sans-serif]"
                  >
                    Date Achieved
                  </Label>
                  <div className="relative">
                    <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ab-muted)]" />
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      defaultValue={dateDefaultValue}
                      className="h-12 w-full border-[var(--ab-border)] bg-[var(--ab-surface)] pl-10 text-[var(--ab-text)] focus-visible:ring-[var(--ab-accent)]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[11px] uppercase tracking-[0.12em] text-[var(--ab-muted)] [font-family:'Syne',sans-serif]">
                    Intro Badge / Position
                  </Label>
                  <input type="hidden" name="intro" value={introValue} />

                  <div className="flex flex-wrap gap-2">
                    {badgePresets.map((badge) => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => {
                          setSelectedBadge(badge)
                          if (badge !== 'Custom') {
                            setCustomBadge('')
                          }
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide [font-family:'Syne',sans-serif] transition-colors ${
                          selectedBadge === badge
                            ? 'border-transparent bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950'
                            : 'border-[var(--ab-border)] bg-[var(--ab-surface)] text-[var(--ab-muted)] hover:border-[var(--ab-accent-2)] hover:text-[var(--ab-accent-2)]'
                        }`}
                      >
                        {badge}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex h-11 min-w-[9rem] items-center gap-2 rounded-md border border-amber-400/25 bg-amber-500/10 px-3 text-sm font-bold text-amber-600 [font-family:'Syne',sans-serif]">
                      <Trophy className="h-4 w-4" />
                      <span className="truncate">{badgePreviewText}</span>
                    </div>
                    <Input
                      type="text"
                      value={customBadge}
                      onChange={(e) => setCustomBadge(e.target.value)}
                      placeholder="Or type a custom intro"
                      className="h-11 border-[var(--ab-border)] bg-[var(--ab-surface)] text-[var(--ab-text)] placeholder:text-[rgba(144,144,176,0.6)] focus-visible:ring-[var(--ab-accent)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-full my-1 h-px bg-gradient-to-r from-transparent via-[var(--ab-border)] to-transparent" />

            <div className="col-span-full flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-[var(--ab-muted)] [font-family:'Syne',sans-serif]">
              Description
              <span className="h-px flex-1 bg-[var(--ab-border)]" />
            </div>

            <div className="col-span-full overflow-hidden rounded-xl border border-[var(--ab-border)] bg-[var(--ab-surface)]">
              <div className="p-1 sm:p-2">
                <EditorWrapper value={description} handleChange={setDescription} />
                <input type="hidden" name="description" value={description} />
              </div>

              <div className="flex items-center justify-between border-t border-[var(--ab-border)] bg-[var(--ab-surface-2)] px-4 py-2 text-xs text-[var(--ab-muted)]">
                <span>{description.length.toLocaleString()} characters</span>
              </div>
            </div>

            <div className="col-span-full mt-2 flex flex-col gap-3 border-t border-[var(--ab-border)] pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Label
                htmlFor="is_Featured"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--ab-border)] bg-[var(--ab-surface)] px-3 py-2 text-xs font-semibold text-[var(--ab-text)] [font-family:'Syne',sans-serif]"
              >
                <input
                  id="is_Featured"
                  name="is_Featured"
                  type="checkbox"
                  defaultChecked={isFeaturedDefaultChecked}
                  className="h-4 w-4 rounded border-[var(--ab-border)] text-[var(--ab-accent)] focus:ring-[var(--ab-accent)]"
                />
                <span>Is Featured</span>
              </Label>

              <Button
                type="submit"
                disabled={pending}
                className="bg-gradient-to-r from-[var(--ab-accent)] to-indigo-400 px-7 text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:opacity-95"
              >
                {pending ? submitPendingText : submitIdleText}
              </Button>
            </div>

            {state?.message && (
              <div className="col-span-full">
                <Alert
                  variant={state.success ? 'success' : 'destructive'}
                  className="border-[var(--ab-border)] bg-[var(--ab-surface)]"
                >
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </main>
      </div>
    </form>
  )
}
