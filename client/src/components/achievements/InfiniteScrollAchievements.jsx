'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getAchievements } from '@/lib/action'
import AchievementCard from './achievementCard'
import { Loader2 } from 'lucide-react'

const LIMIT = 5

export default function InfiniteScrollAchievements({
    initialAchievements,
    totalCount,
    isAdmin,
}) {
    const [achievements, setAchievements] = useState(initialAchievements)
    const [offset, setOffset] = useState(initialAchievements.length)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(
        initialAchievements.length < totalCount,
    )
    const sentinelRef = useRef(null)

    const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)

    try {
        const currentOffset = achievements.length // ✅ ALWAYS correct

        const more = await getAchievements(LIMIT, currentOffset)

        if (!Array.isArray(more) || more.length === 0) {
            setHasMore(false)
            return
        }

        setAchievements((prev) => [...prev, ...more])

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
                if (entries[0].isIntersecting) {
                    loadMore()
                }
            },
            { rootMargin: '200px' },
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMore])

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {achievements.map((achievement, index) => (
                    <AchievementCard
                        key={index}
                        achievement={achievement}
                        isAdmin={isAdmin}
                    />
                ))}
            </div>

            {/* Sentinel element for IntersectionObserver */}
            <div ref={sentinelRef} className="h-1 w-full" />

            {loading && (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
            )}

            {!hasMore && achievements.length > 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                    End of the page
                </p>
            )}
        </div>
    )
}
