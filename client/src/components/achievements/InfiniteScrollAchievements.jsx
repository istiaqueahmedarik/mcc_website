'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { getAchievements } from '@/lib/action'
import AchievementCard from './achievementCard'
import { Loader2 } from 'lucide-react'

const LIMIT = 6

const normalizeTags = (rawTags) => {
    if (Array.isArray(rawTags)) {
        return rawTags
            .map((tag) => {
                if (typeof tag === 'string') return tag.trim()
                if (typeof tag?.name === 'string') return tag.name.trim()
                if (typeof tag?.tag === 'string') return tag.tag.trim()
                return ''
            })
            .filter(Boolean)
    }

    if (typeof rawTags === 'string') {
        return rawTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
    }

    return []
}

const getAchievementTags = (achievement) =>
    normalizeTags(achievement?.tag_names ?? achievement?.tags ?? [])

export default function InfiniteScrollAchievements({
    initialAchievements,
    totalCount,
    isAdmin,
}) {
    const [achievements, setAchievements] = useState(initialAchievements)
    const [selectedTags, setSelectedTags] = useState([])
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

    const availableTags = useMemo(() => {
        return Array.from(
            new Set(
                achievements.flatMap((achievement) =>
                    getAchievementTags(achievement).map((tag) => tag.toUpperCase()),
                ),
            ),
        )
    }, [achievements])

    const filteredAchievements = useMemo(() => {
        if (selectedTags.length === 0) return achievements
        return achievements.filter((achievement) =>
            getAchievementTags(achievement)
                .map((tag) => tag.toUpperCase())
                .some((tag) => selectedTags.includes(tag)),
        )
    }, [achievements, selectedTags])

    useEffect(() => {
        setSelectedTags((prev) => prev.filter((tag) => availableTags.includes(tag)))
    }, [availableTags])

    const toggleTag = useCallback((tag) => {
        setSelectedTags((prev) =>
            prev.includes(tag)
                ? prev.filter((currentTag) => currentTag !== tag)
                : [...prev, tag],
        )
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
            {/* Tag filter */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[11px] font-mono text-white/50 tracking-widest uppercase">
                        Filter by tag
                    </span>
                </div>

                {availableTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedTags([])}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
                                selectedTags.length === 0
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                    : 'bg-white/[0.04] text-white/70 border border-white/10 hover:bg-white/[0.08]'
                            }`}
                        >
                            All
                        </button>
                        {availableTags.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                aria-pressed={selectedTags.includes(tag)}
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
                                    selectedTags.includes(tag)
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                        : 'bg-white/[0.04] text-white/70 border border-white/10 hover:bg-white/[0.08]'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Count indicator */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white tracking-widest uppercase">
                    {filteredAchievements.length}
                    {selectedTags.length === 0
                        ? ` / ${totalCount} loaded`
                        : ` matches ${selectedTags.length} selected tag${selectedTags.length > 1 ? 's' : ''}`}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]">
                    <div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700 ease-out rounded-full"
                        style={{
                            width: `${Math.min(
                                100,
                                ((selectedTags.length === 0
                                    ? achievements.length
                                    : filteredAchievements.length) /
                                    Math.max(totalCount, 1)) * 100,
                            )}%`,
                        }}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAchievements.map((achievement, i) => (
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

            {!loading && filteredAchievements.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/60">
                    No achievements found for this tag yet.
                </div>
            )}

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
            {!hasMore && filteredAchievements.length > 0 && (
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