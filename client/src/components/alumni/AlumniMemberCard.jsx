'use client'
import React from 'react'
import { Linkedin, ExternalLink, Briefcase, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Enhanced Alumni Member Card Component
 * Displays member details with social links (LinkedIn only)
 * Features centered large profile image and full position visibility
 * 
 * Props:
 * @param {object} member - Alumni member data
 * @param {string} member.name - Full name
 * @param {string} member.role - Role in MCC (e.g., "PRESIDENT", "VICE PRESIDENT")
 * @param {string} member.now - Current position/company (fully visible)
 * @param {string} member.image_url - Profile image URL (displays as large circular image)
 * @param {string} member.linkedin_url - LinkedIn profile URL (optional)
 * @param {string} member.bio - Short biography (optional)
 * @param {boolean} member.highlight - Whether to highlight this card (e.g., for presidents)
 * @param {string} query - Search query for highlighting matched text (optional)
 * @param {string} variant - Card style variant: "default" | "compact" | "detailed"
 */
export default function AlumniMemberCard({
    member,
    query = '',
    variant = 'default',
    className
}) {
    const {
        name,
        role,
        now,
        image_url,
        linkedin_url,
        bio,
        highlight
    } = member

    // Highlight search matches
    const highlightText = (text) => {
        if (!query || !text) return text
        const idx = text.toLowerCase().indexOf(query.toLowerCase())
        if (idx === -1) return text
        return (
            <>
                {text.slice(0, idx)}
                <span className='bg-[hsl(var(--alumni-gold)/0.25)] px-0.5 rounded'>
                    {text.slice(idx, idx + query.length)}
                </span>
                {text.slice(idx + query.length)}
            </>
        )
    }

    const hasLinks = linkedin_url

    if (variant === 'compact') {
        return (
            <div className={cn(
                'group relative overflow-hidden rounded-lg border border-border/60 bg-card p-4 transition-all hover:shadow-lg hover:border-[hsl(var(--alumni-gold)/0.5)]',
                highlight && 'ring-1 ring-[hsl(var(--alumni-gold))]/50',
                className
            )}>
                <div className='relative z-10 flex items-start gap-3'>
                    {image_url ? (
                        <img
                            src={image_url}
                            alt={name}
                            className='w-16 h-16 rounded-full object-cover border-2 border-border/60 group-hover:border-[hsl(var(--alumni-gold)/0.5)] transition-colors flex-shrink-0'
                        />
                    ) : (
                        <div className='w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--alumni-royal)/0.3)] to-[hsl(var(--alumni-gold)/0.2)] border-2 border-border/60 flex items-center justify-center flex-shrink-0'>
                            <span className='text-xl font-bold text-[hsl(var(--alumni-gold))]'>
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div className='flex-1 min-w-0'>
                        <h3 className='font-semibold text-base leading-snug truncate alumni-name group-hover:drop-shadow-sm transition-all'>
                            {highlightText(name)}
                        </h3>
                        {role && (
                            <span className='text-[10px] tracking-wider text-muted-foreground/70 uppercase'>
                                {highlightText(role)}
                            </span>
                        )}
                        {now && (
                            <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                                {highlightText(now)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Hover glow effect */}
                <div className='absolute -top-12 -right-10 w-40 h-40 opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none'
                    style={{ background: 'radial-gradient(circle at center, hsl(var(--alumni-gold)/0.55), transparent 70%)' }}
                />
            </div>
        )
    }

    return (
        <div className={cn(
            'group relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:shadow-xl hover:border-[hsl(var(--alumni-gold)/0.5)]',
            highlight && 'ring-2 ring-[hsl(var(--alumni-gold))]/50 shadow-lg',
            className
        )}>
            {/* Background glow effect */}
            <div className='absolute -top-12 -right-10 w-48 h-48 opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none'
                style={{ background: 'radial-gradient(circle at center, hsl(var(--alumni-gold)/0.4), transparent 70%)' }}
            />

            {/* Highlight badge for distinguished members */}
            {highlight && (
                <div className='absolute top-0 right-0 z-20'>
                    <div className='bg-[hsl(var(--alumni-gold))] text-black text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1'>
                        <Trophy className='h-3 w-3' />
                        Distinguished
                    </div>
                </div>
            )}

            <div className='relative z-10 p-6 space-y-4'>
                {/* Header with image and basic info - Centered layout with LARGER profile */}
                <div className='flex flex-col items-center text-center gap-3'>
                    {image_url ? (
                        <img
                            src={image_url}
                            alt={name}
                            className='w-40 h-40 rounded-full object-cover border-3 border-border/60 group-hover:border-[hsl(var(--alumni-gold)/0.5)] transition-colors'
                        />
                    ) : (
                        <div className='w-40 h-40 rounded-full bg-gradient-to-br from-[hsl(var(--alumni-royal)/0.3)] to-[hsl(var(--alumni-gold)/0.2)] border-3 border-border/60 flex items-center justify-center'>
                            <span className='text-5xl font-bold text-[hsl(var(--alumni-gold))]'>
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}

                    <div className='w-full'>
                        <h3 className='font-bold text-xl leading-tight alumni-name group-hover:drop-shadow-sm transition-all'>
                            {highlightText(name)}
                        </h3>
                        {role && (
                            <div className='flex items-center justify-center gap-1.5 mt-2'>
                                <Trophy className='h-3.5 w-3.5 text-[hsl(var(--alumni-gold))]' />
                                <span className='text-xs tracking-wider text-muted-foreground/80 uppercase font-medium'>
                                    {highlightText(role)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Current position */}
                {now && (
                    <div className='flex items-start gap-2 text-sm bg-[hsl(var(--alumni-royal-fade)/0.3)] rounded-lg p-3'>
                        <Briefcase className='h-4 w-4 text-[hsl(var(--alumni-gold))] mt-0.5 flex-shrink-0' />
                        <p className='text-muted-foreground leading-relaxed text-left'>
                            {highlightText(now)}
                        </p>
                    </div>
                )}

                {/* Bio */}
                {bio && variant === 'detailed' && (
                    <p className='text-xs text-muted-foreground/80 leading-relaxed border-l-2 border-border/40 pl-3'>
                        {highlightText(bio)}
                    </p>
                )}

                {/* Social links - LinkedIn only */}
                {hasLinks && (
                    <div className='flex items-center justify-center gap-2 pt-2 border-t border-border/40'>
                        {linkedin_url && (
                            <a
                                href={linkedin_url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[hsl(var(--alumni-royal-fade)/0.6)] hover:bg-[hsl(var(--alumni-royal)/0.3)] text-xs font-medium transition-colors group/link'
                                aria-label={`${name}'s LinkedIn profile`}
                            >
                                <Linkedin className='h-4 w-4' />
                                <span>LinkedIn</span>
                                <ExternalLink className='h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity' />
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
