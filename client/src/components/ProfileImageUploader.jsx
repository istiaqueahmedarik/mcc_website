"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUploadFile } from '@/lib/uploadthing'

export default function ProfileImageUploader({ currentUrl, onUploaded }){
  const [file, setFile] = useState(null)
  const { isUploading, progress, uploadFile } = useUploadFile({
    onUploadComplete: (fileData) => {
      if(onUploaded) onUploaded(fileData)
    }
  })

  async function handleUpload(){
    if(!file) return
    const res = await uploadFile(file)
    if(res && onUploaded){
      onUploaded(res)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input type="file" accept="image/*" onChange={(e)=> setFile(e.target.files?.[0] || null)} />
      <Button type="button" onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? `Uploading ${Math.round(progress)}%` : 'Upload'}
      </Button>
    </div>
  )
}
