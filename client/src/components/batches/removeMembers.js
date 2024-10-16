'use client'

import { useCallback, useMemo, useState } from 'react'
import { useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { removeBatchMemebers } from '@/lib/action'
import { ChevronLeft, ChevronRight, Search, Minus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ITEMS_PER_PAGE = 5

const MotionCard = motion(Card)
const MotionButton = motion(Button)

export default function RemoveMembers({ batch, users = [] }) {
  const [offset, setOffset] = useState(0)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  const [state, formAction, isPending] = useActionState(removeBatchMemebers, {
    message: '',
    success: false,
  })

  const filteredMembers = useMemo(() => {
    return users.filter(
      (mem) =>
        mem.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mem.mist_id.includes(searchTerm)
    )
  }, [users, searchTerm])

  const currentPageMembers = useMemo(() => {
    return filteredMembers.slice(offset, offset + ITEMS_PER_PAGE)
  }, [filteredMembers, offset])

  const handleCheckboxChange = useCallback((memberId, isChecked) => {
    setSelectedMembers(prev =>
      isChecked ? [...prev, memberId] : prev.filter(id => id !== memberId)
    )
  }, [])

  const goNext = useCallback(() => {
    setOffset(prev => prev + ITEMS_PER_PAGE)
  }, [])

  const goPrev = useCallback(() => {
    setOffset(prev => Math.max(0, prev - ITEMS_PER_PAGE))
  }, [])

  const handleSubmit = useCallback((formData) => {
    formData.append('batch_id', batch.id)
    formData.append('members', JSON.stringify(selectedMembers))
    formAction(formData)
  }, [batch.id, selectedMembers, formAction])

  return (
    <div className="min-h-screen w-full py-6 px-4 bg-background text-foreground">
      <MotionCard
        className="max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Remove Members</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members..."
                  className="pl-9"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <AnimatePresence mode="wait">
                {currentPageMembers.map((mem) => (
                  <motion.div
                    key={mem.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center space-x-3 p-2 border border-border rounded-md"
                  >
                    <Checkbox
                      id={mem.id}
                      checked={selectedMembers.includes(mem.id)}
                      onCheckedChange={(checked) => handleCheckboxChange(mem.id, checked)}
                    />
                    <Label htmlFor={mem.id} className="flex-grow text-sm cursor-pointer">
                      <span className="font-medium">{mem.mist_id}</span> - {mem.full_name}
                    </Label>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex justify-between items-center text-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={offset === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">
                {offset + 1} - {Math.min(offset + ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={offset + ITEMS_PER_PAGE >= filteredMembers.length}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <AnimatePresence>
              {state?.message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert variant={state?.success ? 'default' : 'destructive'}>
                    <AlertDescription>{state?.message}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <MotionButton
              type="submit"
              className="w-full"
              disabled={isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isPending ? 'Removing...' : 'Remove Selected'}
              <Minus className="ml-2 h-4 w-4" />
            </MotionButton>
          </form>
        </CardContent>
      </MotionCard>
    </div>
  )
}