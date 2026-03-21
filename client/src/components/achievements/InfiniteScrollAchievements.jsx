'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getAchievements } from '@/lib/action'
import AchievementCard from './achievementCard'
import { Loader2 } from 'lucide-react'

const LIMIT = 6

export default function InfiniteScrollAchievements({
    initialAchievements,
    totalCount,
    isAdmin,
}) {
    const [achievements, setAchievements] = useState(initialAchievements)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(
        initialAchievements.length < totalCount,
    )
    const [visibleCount, setVisibleCount] = useState(0)
    const sentinelRef = useRef(null)

    // Staggered reveal on mount
    useEffect(() => {
        const timer = setInterval(() => {
            setVisibleCount((prev) => {
                if (prev >= initialAchievements.length) {
                    clearInterval(timer)
                    return prev
                }
                return prev + 1
            })
        }, 60)
        return () => clearInterval(timer)
    }, [initialAchievements.length])

    const handleDeleteSuccess = useCallback((deletedId) => {
        setAchievements((prev) => prev.filter((item) => item.id !== deletedId))
    }, [])

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return
        setLoading(true)
        try {
            const currentOffset = achievements.length
            const more = await getAchievements(LIMIT, currentOffset)
            if (!Array.isArray(more) || more.length === 0) {
                setHasMore(false)
                return
            }
            setAchievements((prev) => {
                setVisibleCount(prev.length + more.length)
                return [...prev, ...more]
            })
            if (currentOffset + more.length >= totalCount || more.length < LIMIT) {
                setHasMore(false)
            }
        } catch {
            setHasMore(false)
        } finally {
            setLoading(false)
        }
    }, [loading, hasMore, achievements.length, totalCount])

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore()
            },
            { rootMargin: '200px' },
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMore])

    return (
        <div className="w-full space-y-8">
            {/* Count indicator */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white tracking-widest uppercase">
                    {achievements.length} / {totalCount} loaded
                </span>
                <div className="flex-1 h-px bg-white/[0.06]">
                    <div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${(achievements.length / totalCount) * 100}%` }}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {achievements.map((achievement, i) => (
                    <div
                        key={achievement.id}
                        className={`transition-all duration-500 ease-out ${
                            i < visibleCount
                                ? 'opacity-100 translate-y-0'
                                : 'opacity-0 translate-y-6'
                        }`}
                    >
                        <AchievementCard
                            achievement={achievement}
                            isAdmin={isAdmin}
                            onDeleteSuccess={handleDeleteSuccess}
                            index={i}
                        />
                    </div>
                ))}
            </div>

            <div ref={sentinelRef} className="h-1 w-full" />

            {/* Loader */}
            {loading && (
                <div className="flex flex-col justify-center items-center py-12 gap-3">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full border border-white/10" />
                        <Loader2 className="w-8 h-8 animate-spin text-violet-400 absolute inset-0" />
                    </div>
                    <span className="text-xs text-white/30 tracking-widest uppercase font-mono animate-pulse">Loading</span>
                </div>
            )}

            {/* End of list */}
            {!hasMore && achievements.length > 0 && (
                <div className="flex flex-col items-center gap-3 py-10">
                    <div className="flex items-center gap-4 w-full max-w-xs">
                        <div className="flex-1 h-px bg-white/[0.08]" />
                        <span className="text-[11px] font-mono text-white/40 tracking-widest uppercase">All caught up</span>
                        <div className="flex-1 h-px bg-white/[0.08]" />
                    </div>
                </div>
            )}
        </div>
    )
}