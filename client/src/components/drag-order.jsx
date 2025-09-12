"use client"

import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronUp, ChevronDown, Plus, X, Users, Award } from "lucide-react"

export default function DragOrder({
  candidates = [],
  name = "choices",
  max = 5,
  min = 2,
  initial = [],
  performance = {},
}) {
  const [available, setAvailable] = useState(() => candidates.filter((c) => !initial.includes(c)))
  const [selected, setSelected] = useState(() => initial.slice(0, max))

  const canAddMore = selected.length < max
  const canSubmit = selected.length >= min

  const memoizedPerformance = useMemo(() => performance, [performance])

  const addItem = useCallback(
    (u) => {
      if (!canAddMore) return
      setSelected((prev) => [...prev, u])
      setAvailable((prev) => prev.filter((x) => x !== u))
    },
    [canAddMore],
  )

  const removeItem = useCallback((u) => {
    setSelected((prev) => prev.filter((x) => x !== u))
    setAvailable((prev) => [...prev, u])
  }, [])

  const moveUp = useCallback((index) => {
    if (index === 0) return
    setSelected((prev) => {
      const next = [...prev]
        ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])

  const moveDown = useCallback((index) => {
    setSelected((prev) => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
        ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])

  const PerformanceStats = useMemo(() => {
    return ({ user }) => {
      const p = memoizedPerformance[user] || {}
      if (!p.totalSolved && !p.effectiveSolved) return null

      return (
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {p.effectiveSolved != null && (
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3" />
              <span>Eff: {p.effectiveSolved.toFixed(2)}</span>
            </div>
          )}
          {p.totalSolved != null && <span>Total: {p.totalSolved}</span>}
          {p.contestsAttended != null && <span>Contests: {p.contestsAttended}</span>}
        </div>
      )
    }
  }, [memoizedPerformance])

  return (
    <motion.div
      className="space-y-8 p-6 bg-background rounded-3xl shadow-sm border border-border/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <input type="hidden" name={name} value={selected.join(",")} />

      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Users className="w-6 h-6" />
          <h2 className="text-2xl font-semibold text-foreground">Team Selection</h2>
        </div>
        <p className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-2xl inline-block">
          Select at least {min} and at most {max} members for your team
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Available Members Section */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 text-lg font-medium text-foreground">
            <Plus className="w-5 h-5 text-primary" />
            Available Members
            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">{available.length}</span>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/30 shadow-sm min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {available.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Users className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">All members have been selected</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {available.map((u, index) => (
                    <motion.div
                      key={u}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, x: -100 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        type="button"
                        onClick={() => addItem(u)}
                        disabled={!canAddMore}
                        className="w-full text-left bg-background hover:bg-primary/5 border border-border hover:border-primary/30 rounded-2xl p-4 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {u}
                            </div>
                            <PerformanceStats user={u} />
                          </div>
                          <motion.div
                            className="text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            whileHover={{ rotate: 90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Plus className="w-5 h-5" />
                          </motion.div>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Selected Members Section */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 text-lg font-medium text-foreground">
            <Users className="w-5 h-5 text-primary" />
            Selected Team
            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {selected.length}/{max}
            </span>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/30 shadow-sm min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {selected.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Users className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">Tap members to add them to your team</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {selected.map((u, idx) => (
                    <motion.div
                      key={u}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, x: 100 }}
                      transition={{ duration: 0.3 }}
                      className="bg-primary/10 border border-primary/20 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium"
                            whileHover={{ scale: 1.1 }}
                          >
                            {idx + 1}
                          </motion.div>
                          <div>
                            <div className="font-medium text-foreground">{u}</div>
                            <PerformanceStats user={u} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {selected.length > 1 && (
                            <div className="flex flex-col">
                              <motion.button
                                type="button"
                                onClick={() => moveUp(idx)}
                                disabled={idx === 0}
                                className="p-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <ChevronUp className="w-4 h-4 text-primary" />
                              </motion.button>
                              <motion.button
                                type="button"
                                onClick={() => moveDown(idx)}
                                disabled={idx === selected.length - 1}
                                className="p-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <ChevronDown className="w-4 h-4 text-primary" />
                              </motion.button>
                            </div>
                          )}
                          <motion.button
                            type="button"
                            onClick={() => removeItem(u)}
                            className="text-destructive hover:text-destructive/80 p-2 rounded-full hover:bg-destructive/10 transition-colors ml-2"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {!canSubmit && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="inline-flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-2xl border border-destructive/20">
              <X className="w-4 h-4" />
              Please select at least {min} members to continue
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
