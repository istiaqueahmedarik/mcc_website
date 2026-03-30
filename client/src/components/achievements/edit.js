'use client'

import { updateAchievement, uploadImage } from '@/lib/action'
import { format } from 'date-fns'
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AchievementFormShell from '@/components/achievements/AchievementFormShell'

const baseInitialState = {
  message: '',
  success: false,
}

const badgePresets = [
  '1st Place',
  '2nd Place',
  '3rd Place',
  'Finalist',
  'Special Award',
  'Custom',
]

export default function Edit({ achievement }) {
  const initialDate = useMemo(() => {
    try {
      return format(new Date(achievement.date), 'yyyy-MM-dd')
    } catch {
      return ''
    }
  }, [achievement.date])

  const existingIntro = useMemo(() => (achievement?.intro || '').trim(), [achievement?.intro])
  const isExistingPreset = useMemo(
    () => badgePresets.includes(existingIntro) && existingIntro !== 'Custom',
    [existingIntro]
  )

  const [description, setDescription] = useState(achievement.description || '')
  const [copied, setCopied] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(achievement.image || '')
  const [uploadedImageUrl, setUploadedImageUrl] = useState(achievement.image || '')
  const [selectedBadge, setSelectedBadge] = useState(
    isExistingPreset ? existingIntro : existingIntro ? 'Custom' : '1st Place'
  )
  const [customBadge, setCustomBadge] = useState(isExistingPreset ? '' : existingIntro)

  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const initialState = useMemo(
    () => ({
      ...baseInitialState,
      ach_id: achievement.id,
      imgurl: achievement.image,
    }),
    [achievement.id, achievement.image]
  )

  const [state, formAction, pending] = useActionState(updateAchievement, initialState)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  useEffect(
    () => () => {
      if (imagePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    },
    [imagePreviewUrl]
  )

  const uploadImageForDescription = useCallback(
    async (rawImage) => {
      if (!rawImage) return

      if (imagePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      setImagePreviewUrl(URL.createObjectURL(rawImage))

      const { url, error } = await uploadImage(
        'achievements',
        new Date().getTime().toString(),
        rawImage,
        'all_picture'
      )

      if (error) {
        setUploadedImageUrl(achievement.image || '')
        setImagePreviewUrl(achievement.image || '')
        return
      }

      if (inputRef.current) inputRef.current.value = url
      setUploadedImageUrl(url)
    },
    [achievement.image, imagePreviewUrl]
  )

  const onImageInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      uploadImageForDescription(file)
    },
    [uploadImageForDescription]
  )

  const onDropImage = useCallback(
    (e) => {
      e.preventDefault()
      setIsDraggingImage(false)
      const file = e.dataTransfer.files?.[0]
      if (file?.type?.startsWith('image/')) {
        uploadImageForDescription(file)
      }
    },
    [uploadImageForDescription]
  )

  const handleCopy = useCallback(() => {
    if (!uploadedImageUrl) return
    navigator.clipboard.writeText(uploadedImageUrl)
    setCopied(true)
  }, [uploadedImageUrl])

  const initialTags = Array.isArray(achievement.tag_names) ? achievement.tag_names : []
  const isFeaturedDefaultChecked = achievement?.is_featured === true || achievement?.is_featured === 1;

  return (
    <AchievementFormShell
      formAction={formAction}
      pending={pending}
      state={state}
      heading="Edit Achievement"
      subheading="Update the achievement details and publish changes."
      description={description}
      setDescription={setDescription}
      titleDefaultValue={achievement.title}
      dateDefaultValue={initialDate}
      initialTags={initialTags}
      inputRef={inputRef}
      fileInputRef={fileInputRef}
      uploadedImageUrl={uploadedImageUrl}
      imagePreviewUrl={imagePreviewUrl}
      isDraggingImage={isDraggingImage}
      setIsDraggingImage={setIsDraggingImage}
      onDropImage={onDropImage}
      onImageInputChange={onImageInputChange}
      handleCopy={handleCopy}
      copied={copied}
      selectedBadge={selectedBadge}
      setSelectedBadge={setSelectedBadge}
      customBadge={customBadge}
      setCustomBadge={setCustomBadge}
      badgePresets={badgePresets}
      submitIdleText="Save Changes"
      submitPendingText="Saving..."
      imageHelperText="URL is auto-filled after upload. Keep thumbnail upload as the final image update if you want it as the card thumbnail."
      isFeaturedDefaultChecked={isFeaturedDefaultChecked}
    />
  )
}