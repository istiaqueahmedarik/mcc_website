'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { RoomState } from '@/hooks/use-supabase-realtime'

interface MultiplayerTypingProps {
  roomState: RoomState
  participantId: string | null
  onProgress: (progress: number, currentWpm: number, accuracy: number) => void
  onComplete: (wpm: number, accuracy: number, stats: any) => Promise<void> | void
  onTimeUp?: () => void
}

export function MultiplayerTyping({ roomState, participantId, onProgress, onComplete, onTimeUp }: MultiplayerTypingProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [input, setInput] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [correctChars, setCorrectChars] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const [errors, setErrors] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(roomState.timeLimit)
  const [wordResults, setWordResults] = useState<('correct' | 'incorrect')[]>([])
  const [lines, setLines] = useState<number[][]>([]) // Array of arrays containing word indices per line
  const [currentLineIndex, setCurrentLineIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const progressIntervalRef = useRef<any>(null)
  const wordsContainerRef = useRef<HTMLDivElement>(null)
  const hasHandledTimeUpRef = useRef(false)

  const words = useMemo(() => roomState.wordSet || [], [roomState.wordSet])
  const currentWord = words[currentWordIndex]

  const getElapsedMinutes = useCallback(() => {
    const baseStartTime = roomState.startedAt ?? startTime
    if (!baseStartTime) return 0
    return Math.max(0, (Date.now() - baseStartTime) / 60000)
  }, [roomState.startedAt, startTime])

  const calculateWPM = useCallback(() => {
    const minutes = getElapsedMinutes()
    return minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0
  }, [getElapsedMinutes, correctChars])

  const calculateAccuracy = useCallback(() => {
    // If no words were attempted, accuracy should be 0
    if (currentWordIndex === 0 && totalChars === 0) return 0
    return totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0
  }, [currentWordIndex, correctChars, totalChars])

  const handleTimeUp = useCallback(async () => {
    if (hasHandledTimeUpRef.current) return
    hasHandledTimeUpRef.current = true

    if (!isFinished) {
      setIsFinished(true)
      
      const wpm = calculateWPM()
      const accuracy = calculateAccuracy()
      
      await onComplete(wpm, accuracy, {
        totalKeystrokes: totalChars,
        correctKeystrokes: correctChars,
        errors,
        duration: roomState.timeLimit
      })
    }

    // Call onTimeUp to complete the room and show leaderboard
    if (onTimeUp) {
      onTimeUp()
    }
  }, [isFinished, calculateWPM, calculateAccuracy, onComplete, totalChars, correctChars, errors, roomState.timeLimit, onTimeUp])

  useEffect(() => {
    hasHandledTimeUpRef.current = false
  }, [roomState.startedAt, roomState.status])

  const handleTimeUpRef = useRef(handleTimeUp)
  useEffect(() => {
    handleTimeUpRef.current = handleTimeUp
  }, [handleTimeUp])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Calculate lines based on word widths
  useEffect(() => {
    if (!wordsContainerRef.current || words.length === 0) return

    const calculateLines = () => {
      const container = wordsContainerRef.current
      if (!container) return

      const computedStyle = window.getComputedStyle(container)
      const horizontalPadding =
        parseFloat(computedStyle.paddingLeft || '0') + parseFloat(computedStyle.paddingRight || '0')

      // Leave a tiny safety buffer to avoid wrapping from sub-pixel rounding.
      const containerWidth = Math.max(0, container.getBoundingClientRect().width - horizontalPadding - 2)
      const tempSpan = document.createElement('span')
      tempSpan.className = 'text-2xl leading-relaxed'
      tempSpan.style.cssText = 'visibility: hidden; position: absolute; white-space: nowrap;'
      container.appendChild(tempSpan)

      const newLines: number[][] = []
      let currentLine: number[] = []
      let currentWidth = 0
      const spaceWidth = 8 // gap-2 = 0.5rem = 8px

      for (let i = 0; i < words.length; i++) {
        tempSpan.textContent = words[i]
        const wordWidth = tempSpan.getBoundingClientRect().width

        if (currentWidth + wordWidth + (currentLine.length > 0 ? spaceWidth : 0) > containerWidth && currentLine.length > 0) {
          // Start a new line when we exceed container width
          newLines.push([...currentLine])
          currentLine = [i]
          currentWidth = wordWidth
        } else {
          currentLine.push(i)
          currentWidth += wordWidth + (currentLine.length > 1 ? spaceWidth : 0)
        }
      }

      if (currentLine.length > 0) {
        newLines.push(currentLine)
      }

      container.removeChild(tempSpan)
      setLines(newLines)
    }

    calculateLines()
    window.addEventListener('resize', calculateLines)
    return () => window.removeEventListener('resize', calculateLines)
  }, [words])

  useEffect(() => {
    if (!roomState.startedAt) return



    const interval = setInterval(() => {
      const elapsed = Date.now() - roomState.startedAt!
      const remaining = Math.max(0, roomState.timeLimit - Math.floor(elapsed / 1000))
      setTimeRemaining(remaining)

      if (remaining === 0) {
        handleTimeUpRef.current()
      }
    }, 100)

    return () => clearInterval(interval)
  }, [roomState.startedAt, roomState.timeLimit])

  const statsRef = useRef({ currentWordIndex, correctChars, totalChars })

  useEffect(() => {
    statsRef.current = { currentWordIndex, correctChars, totalChars }
  }, [currentWordIndex, correctChars, totalChars])

  useEffect(() => {
    if (!startTime || isFinished) return

    progressIntervalRef.current = setInterval(() => {
      const stats = statsRef.current
      const progress = Math.round((stats.currentWordIndex / words.length) * 100)
      
      const minutes = getElapsedMinutes()
      const wpm = minutes > 0 ? Math.round(stats.correctChars / 5 / minutes) : 0
      
      let accuracy = 0
      if (stats.currentWordIndex > 0 || stats.totalChars > 0) {
        accuracy = stats.totalChars > 0 ? Math.round((stats.correctChars / stats.totalChars) * 100) : 0
      }

      onProgress(progress, wpm, accuracy)
    }, 1000)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [startTime, isFinished, words.length, onProgress, getElapsedMinutes])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished) return

    const value = e.target.value
    setInput(value)

    if (!startTime) {
      setStartTime(Date.now())
    }

    if (value.endsWith(' ')) {
      const typedWord = value.trim()
      const isCorrect = typedWord === currentWord
      
      setWordResults(prev => [...prev, isCorrect ? 'correct' : 'incorrect'])
      
      if (isCorrect) {
        setCorrectChars(prev => prev + currentWord.length + 1)
      } else {
        setErrors(prev => prev + 1)
      }
      setTotalChars(prev => prev + typedWord.length + 1)

      setInput('')
      
      if (currentWordIndex < words.length - 1) {
        const nextIndex = currentWordIndex + 1
        setCurrentWordIndex(nextIndex)
        
        // Check if we've finished the current line
        if (lines.length > 0) {
          const currentLine = lines[currentLineIndex]
          if (currentLine && nextIndex > currentLine[currentLine.length - 1]) {
            // Move to next line
            setCurrentLineIndex(prev => prev + 1)
          }
        }
      } else {
        setIsFinished(true)
        
        const finalCorrectChars = correctChars + (isCorrect ? currentWord.length + 1 : 0)
        const finalTotalChars = totalChars + typedWord.length + 1
        
        const baseStartTime = roomState.startedAt ?? startTime!
        const minutes = (Date.now() - baseStartTime) / 60000
        const wpm = minutes > 0 ? Math.round(finalCorrectChars / 5 / minutes) : 0
        const accuracy = finalTotalChars > 0 ? Math.round((finalCorrectChars / finalTotalChars) * 100) : 0
        
        onComplete(wpm, accuracy, {
          totalKeystrokes: finalTotalChars,
          correctKeystrokes: finalCorrectChars,
          errors: errors + (isCorrect ? 0 : 1),
          duration: Math.floor((Date.now() - startTime!) / 1000)
        })
      }
    }
  }

  const getWordClassName = (globalIndex: number) => {
    const result = wordResults[globalIndex]
    const typedPrefix = input.trimEnd()
    
    if (result === 'correct') {
      return 'text-green-500'
    } else if (result === 'incorrect') {
      return 'text-red-500 line-through'
    } else if (globalIndex === currentWordIndex) {
      if (!typedPrefix) {
        return 'text-foreground underline underline-offset-4'
      }

      if (currentWord.startsWith(typedPrefix)) {
        return 'text-green-500 underline underline-offset-4'
      }

      return 'text-red-500 underline underline-offset-4'
    } else {
      return 'text-muted-foreground'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Timer and Stats */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="text-4xl font-bold tabular-nums">
          {timeRemaining}s
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-muted-foreground">WPM</div>
              <div className="text-2xl font-semibold">{calculateWPM()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Accuracy</div>
            <div className="text-2xl font-semibold">{calculateAccuracy()}%</div>
          </div>
        </div>
      </div>

      {/* Word Display - Two Lines Only */}
      <div 
        ref={wordsContainerRef}
        className="border rounded-lg p-8 bg-muted/30 min-h-50"
      >
        <div className="space-y-4">
          {lines.slice(currentLineIndex, currentLineIndex + 2).map((lineWordIndices, lineIdx) => (
            <div 
              key={`line-${currentLineIndex + lineIdx}`}
              className="flex flex-nowrap gap-2 text-2xl leading-relaxed overflow-hidden"
            >
              {lineWordIndices.map((wordIndex) => {
                const word = words[wordIndex]
                if (!word) return null
                return (
                  <span key={wordIndex} className={`shrink-0 ${getWordClassName(wordIndex)}`}>
                    {word}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground mt-4 text-right">
          Word {currentWordIndex + 1}/{words.length}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          disabled={isFinished}
          className="w-full px-6 py-4 text-2xl border-2 rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
          placeholder={isFinished ? 'Finished!' : 'Type here...'}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
        <div className="text-sm text-muted-foreground text-center">
          Press space after each word
        </div>
      </div>

      {/* Participants List */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Live Progress</h3>
        <div className="space-y-2">
          {roomState.participants.map((participant) => (
            <div key={participant.id} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${participant.id === participantId ? 'text-primary' : ''}`}>
                    {participant.name}
                    {participant.id === participantId && ' (You)'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {participant.currentWpm} WPM • {participant.accuracy}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      participant.completed ? 'bg-green-500' : 'bg-primary'
                    }`}
                    style={{ width: `${participant.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
