'use client'

import { getAchievementTags } from '@/lib/action'
import { Label } from '@/components/ui/label'
import { Tag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const TAG_ALLOWED_REGEX = /^[A-Z0-9 +#._-]+$/

const sanitizeTagInput = (value) =>
  value.toUpperCase().replace(/[^A-Z0-9 +#._-]/g, '')

const normalizeTags = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((t) => {
      if (typeof t === 'string') return t
      if (typeof t?.name === 'string') return t.name
      if (typeof t?.tag === 'string') return t.tag
      if (typeof t?.title === 'string') return t.title
      return ''
    })
    .map((t) => t.trim().toUpperCase())
    .filter((t) => t.length > 0 && TAG_ALLOWED_REGEX.test(t))
}

/**
 * TagsInput
 *
 * Props:
 *  - initialTags: string[] | object[]  — pre-selected tags (for edit mode)
 *  - name: string                      — hidden input name (default: "tags")
 */
export default function TagsInput({ initialTags = [], name = 'tags' }) {
  const [tags, setTags] = useState(() => normalizeTags(initialTags))
  const [tagInput, setTagInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1)
  const [availableTags, setAvailableTags] = useState([])
  const suggestionRefs = useRef([])

  const filteredTags = availableTags.filter((tag) => {
    const normalizedInput = tagInput.trim().toUpperCase()
    return (
      tag.includes(normalizedInput) &&
      normalizedInput.length > 0 &&
      !tags.includes(tag)
    )
  })

  // Load available tags from server
  useEffect(() => {
    let isActive = true
    const loadTags = async () => {
      const response = await getAchievementTags()
      if (!isActive || !response?.success) return
      setAvailableTags([...new Set(normalizeTags(response.tags || []))])
    }
    loadTags()
    return () => { isActive = false }
  }, [])

  // Clamp highlight index when filtered list shrinks
  useEffect(() => {
    if (filteredTags.length === 0) {
      setHighlightedTagIndex(-1)
      return
    }
    if (highlightedTagIndex >= filteredTags.length) {
      setHighlightedTagIndex(0)
    }
  }, [filteredTags, highlightedTagIndex])

  useEffect(() => {
    if (!showSuggestions || highlightedTagIndex < 0) return
    const activeSuggestion = suggestionRefs.current[highlightedTagIndex]
    if (activeSuggestion) {
      activeSuggestion.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedTagIndex, showSuggestions])

  const addTag = (value) => {
    const tag = value.trim().toUpperCase()
    if (!tag || !TAG_ALLOWED_REGEX.test(tag)) return
    if (!tags.includes(tag)) {
      setTags((prev) => [...prev, tag])
    }
  }

  const removeTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove))
  }

  const selectSuggestion = (tag) => {
    addTag(tag)
    setTagInput('')
    setShowSuggestions(false)
    setHighlightedTagIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!showSuggestions) setShowSuggestions(true)
      if (filteredTags.length > 0) {
        setHighlightedTagIndex((prev) =>
          prev < 0 ? 0 : (prev + 1) % filteredTags.length
        )
      }
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!showSuggestions) setShowSuggestions(true)
      if (filteredTags.length > 0) {
        setHighlightedTagIndex((prev) =>
          prev <= 0 ? filteredTags.length - 1 : prev - 1
        )
      }
      return
    }
    if (
      e.key === 'Enter' &&
      showSuggestions &&
      highlightedTagIndex >= 0 &&
      filteredTags[highlightedTagIndex]
    ) {
      e.preventDefault()
      selectSuggestion(filteredTags[highlightedTagIndex])
      return
    }
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
      setShowSuggestions(false)
      setHighlightedTagIndex(-1)
      return
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightedTagIndex(-1)
    }
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-md p-2 flex flex-wrap gap-2 relative">
        {/* Tag Chips */}
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded-md text-sm"
          >
            <Tag className='h-3.5 w-3.5'/>
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-xs text-red-500"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Text Input */}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => {
            setTagInput(sanitizeTagInput(e.target.value))
            setShowSuggestions(true)
            setHighlightedTagIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setShowSuggestions(true)
            setHighlightedTagIndex(filteredTags.length > 0 ? 0 : -1)
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Type and press Enter..."
          className="flex-1 outline-none bg-transparent text-sm min-w-[120px]"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && tagInput && (
          <div className="absolute left-0 top-full mt-1 w-full border rounded-md bg-white dark:bg-zinc-800 shadow-md z-50 max-h-40 overflow-y-auto">
            {filteredTags.length > 0 ? (
              filteredTags.map((tag, index) => (
                <div
                  key={tag}
                  ref={(el) => {
                    suggestionRefs.current[index] = el
                  }}
                  onMouseEnter={() => setHighlightedTagIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectSuggestion(tag)
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    highlightedTagIndex === index
                      ? 'bg-gray-100 dark:bg-zinc-700'
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
                    {tag}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-400 inline-flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
                Press Enter to create "{tagInput}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={tags.join(',')} />

      <p className="text-xs text-gray-400">Press Enter or comma to add tags</p>
    </div>
  )
}