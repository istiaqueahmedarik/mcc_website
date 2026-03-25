'use client'

import { createAchievement, uploadImage } from '@/lib/action'
import AchievementFormShell from '@/components/achievements/AchievementFormShell'
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'

const initialState = {
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

const NHEFPage = () => {
  const [description, setDescription] = useState('')
  const [editorResetKey, setEditorResetKey] = useState(0)
  const [state, formAction, pending] = useActionState(createAchievement, initialState)

  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const [copied, setCopied] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState('1st Place')
  const [customBadge, setCustomBadge] = useState('')

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    []
  )

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    if (!state?.success) return
    setDescription('')
    setEditorResetKey((prev) => (prev + 1) % 2)
    setImagePreviewUrl('')
    setUploadedImageUrl('')
    setSelectedBadge('1st Place')
    setCustomBadge('')
  }, [state])

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
        if (inputRef.current) inputRef.current.value = ''
        setUploadedImageUrl('')
        return
      }

      if (inputRef.current) inputRef.current.value = url
      setUploadedImageUrl(url)
    },
    [imagePreviewUrl]
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

  return (
    <AchievementFormShell
      formAction={formAction}
      pending={pending}
      state={state}
      heading="New Achievement"
      subheading="Document a milestone, award, or recognition worth celebrating."
      description={description}
      setDescription={setDescription}
      titleDefaultValue=""
      dateDefaultValue={today}
      initialTags={[]}
      tagsResetKey={editorResetKey}
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
      submitIdleText="Create Achievement"
      submitPendingText="Submitting..."
      imageHelperText="This field is auto-filled after upload. Keep the thumbnail image upload last so the most recent URL is used as thumbnail automatically."
    />
  )
}

export default NHEFPage;