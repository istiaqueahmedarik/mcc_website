'use client'
import React from 'react'
import { Linkedin, ExternalLink, Briefcase, Trophy, Facebook, Mail, MapPin, Phone, User, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/**
 * Enhanced Alumni Member Card Component
 * Displays member details with social links (LinkedIn, Facebook, Email)
 * Features "View Profile" dialog for detailed information.
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
        facebook_url,
        email,
        phone,
        location,
        bio,
        highlight,
        batch,
        career_path
    } = member

    // Highlight search matches
    const highlightText = (text) => {
        if (!query || !text) return text
        const str = String(text)
        const idx = str.toLowerCase().indexOf(query.toLowerCase())
        if (idx === -1) return str
        return (
            <>
                {str.slice(0, idx)}
                <span className='bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded'>
                    {str.slice(idx, idx + query.length)}
                </span>
                {str.slice(idx + query.length)}
            </>
        )
    }

    // Default Card
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className={cn(
                    'group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer flex flex-col h-full',
                    highlight && 'ring-1 ring-primary/50 shadow-md',
                    className
                )}>
                    {highlight && (
                        <div className='absolute top-0 right-0 z-20'>
                            <div className='bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1'>
                                <Trophy className='h-3 w-3' />
                                Distinguished
                            </div>
                        </div>
                    )}

                    <div className='p-6 flex flex-col items-center text-center gap-4 flex-grow'>
                        {/* Profile Image */}
                        <div className="relative">
                            {image_url ? (
                                <img
                                    src={image_url}
                                    alt={name}
                                    className='w-32 h-32 rounded-full object-cover border-4 border-background shadow-sm group-hover:scale-105 transition-transform duration-300'
                                />
                            ) : (
                                <div className='w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-sm group-hover:scale-105 transition-transform duration-300'>
                                    <span className='text-5xl font-bold text-muted-foreground'>
                                        {name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            {batch && (
                                <Badge variant="secondary" className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs shadow-sm border bg-background pointer-events-none">
                                   Batch {batch}
                                </Badge>
                            )}
                        </div>

                        {/* Text Content */}
                        <div className='w-full space-y-2'>
                            <h3 className='font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors'>
                                {highlightText(name)}
                            </h3>
                            
                            {role && (
                                <div className='flex items-center justify-center gap-1.5'>
                                    <Trophy className='h-3.5 w-3.5 text-primary' />
                                    <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                                        {highlightText(role)}
                                    </span>
                                </div>
                            )}

                            {now && (
                                <div className='flex items-center justify-center gap-1.5 text-sm text-muted-foreground pt-1'>
                                    <Briefcase className='h-3.5 w-3.5 flex-shrink-0' />
                                    <p className='line-clamp-2 leading-snug'>
                                        {highlightText(now)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className='p-4 bg-muted/30 border-t flex items-center justify-between gap-3 mt-auto'>
                        <div className='flex items-center gap-2'>
                            {linkedin_url && <Linkedin className='h-4 w-4 text-muted-foreground hover:text-[#0077b5] transition-colors' />}
                            {facebook_url && <Facebook className='h-4 w-4 text-muted-foreground hover:text-[#1877F2] transition-colors' />}
                            {email && <Mail className='h-4 w-4 text-muted-foreground hover:text-red-500 transition-colors' />}
                        </div>
                        <span className='text-xs font-medium text-primary flex items-center gap-1 group-hover:underline decoration-primary/50 underline-offset-4'>
                            View Profile <ExternalLink className='h-3 w-3' />
                        </span>
                    </div>
                </div>
            </DialogTrigger>

            {/* Detailed View Dialog */}
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-xl">
                <div className="relative h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
                   <div className="absolute bottom-4 left-6 flex items-end gap-4 translate-y-1/2 z-10">
                        {image_url ? (
                            <img
                                src={image_url}
                                alt={name}
                                className='w-24 h-24 rounded-full object-cover border-4 border-background shadow-md bg-background'
                            />
                        ) : (
                            <div className='w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-md'>
                                <span className='text-3xl font-bold text-muted-foreground'>
                                    {name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                   </div>
                </div>
                
                <div className="pt-16 px-6 pb-6 flex-1 overflow-y-auto">
                    <DialogHeader className="mb-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                                <DialogTitle className="text-2xl font-bold">{name}</DialogTitle>
                                <DialogDescription className="text-base mt-2 flex flex-col gap-1.5">
                                    {now && <span className="flex items-center gap-2 text-foreground/80"><Briefcase className="h-4 w-4 text-muted-foreground" /> {now}</span>}
                                    {role && <span className="flex items-center gap-2 text-primary font-medium"><Trophy className="h-4 w-4" /> {role}</span>}
                                    {batch && <span className="flex items-center gap-2 text-muted-foreground"><GraduationCap className="h-4 w-4" /> Batch {batch}</span>}
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2 mt-2 md:mt-0">
                                {linkedin_url && (
                                    <Button size="icon" variant="outline" asChild className="h-9 w-9 rounded-full hover:bg-[#0077b5] hover:text-white hover:border-[#0077b5] transition-all">
                                        <a href={linkedin_url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                                            <Linkedin className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                {facebook_url && (
                                    <Button size="icon" variant="outline" asChild className="h-9 w-9 rounded-full hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all">
                                        <a href={facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                            <Facebook className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                {email && (
                                    <Button size="icon" variant="outline" asChild className="h-9 w-9 rounded-full hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
                                        <a href={`mailto:${email}`} aria-label="Email">
                                            <Mail className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            {bio && (
                                <section>
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                        <User className="h-4 w-4" /> About
                                    </h4>
                                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                                        {bio}
                                    </p>
                                </section>
                            )}

                            {career_path && career_path.length > 0 && (
                                <section>
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" /> Career Path
                                    </h4>
                                    <div className="space-y-4 relative pl-2 border-l-2 border-muted ml-1.5">
                                        {Array.isArray(career_path) ? career_path.map((item, i) => (
                                            <div key={i} className="relative pl-6 pb-4 last:pb-0">
                                                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-background bg-muted-foreground/30 ring-2 ring-background" />
                                                <p className="text-sm font-medium">{item}</p>
                                            </div>
                                        )) : (
                                            <div className="relative pl-6">
                                                 <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-background bg-muted-foreground/30 ring-2 ring-background" />
                                                <p className="text-sm pl-4">{String(career_path)}</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="space-y-6">
                            {(email || phone || location) && (
                                <section className="bg-muted/30 p-4 rounded-lg border text-sm space-y-3">
                                    <h4 className="font-semibold mb-1">Contact Details</h4>
                                    
                                    {email && (
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <a href={`mailto:${email}`} className="truncate hover:underline hover:text-primary transition-colors block flex-1 min-w-0">
                                                {email}
                                            </a>
                                        </div>
                                    )}
                                    
                                    {phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>{phone}</span>
                                        </div>
                                    )}
                                    
                                    {location && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <span>{location}</span>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}