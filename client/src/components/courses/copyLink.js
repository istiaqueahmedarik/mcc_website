'use client'
import { Copy } from 'lucide-react'

const CopyCourseLink = ({ course_id, domain }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(
      domain + `/courses/${course_id}`,
    )
  }
  return (
    <button
      className="btn btn-sm w-full flex justify-start"
      onClick={handleCopy}
    >
      <Copy
        size={12}
        className="mr-2"
      />
      Copy URL
    </button>
  )
}

export default CopyCourseLink
