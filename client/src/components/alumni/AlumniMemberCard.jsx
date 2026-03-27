"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Linkedin, Pencil, Star, Trash2 } from "lucide-react";
import { SiCodeforces } from "react-icons/si";
import { useEffect, useState } from "react";

function avatarFallback(name) {
  return String(name || "A").trim().charAt(0).toUpperCase() || "A";
}

function BorderBeam({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "hsl(var(--primary))",
  colorTo = "hsl(var(--primary) / 0.2)",
  delay = 0,
}) {
  return (
    <div
      style={{
        "--size": size,
        "--duration": duration,
        "--anchor": anchor,
        "--border-width": borderWidth,
        "--color-from": colorFrom,
        "--color-to": colorTo,
        "--delay": `-${delay}s`,
      }}
      className={`pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))] ${className}`}
    />
  );
}

export default function AlumniMemberCard({ member, canEdit = false, onEdit, onDelete, index = 0 }) {
  const {
    name,
    image_url,
    designation,
    company_name,
    batch,
    position_in_club,
    club_position_year,
    linkedin_url,
    cf_handle,
    highlight,
  } = member;

  const headline = [designation, company_name].filter(Boolean).join(" @ ");
  const cfUrl = cf_handle ? `https://codeforces.com/profile/${cf_handle}` : "";

  // Staggered glow effect - each card glows at different intervals
  const [isGlowing, setIsGlowing] = useState(false);
  
  useEffect(() => {
    // Stagger start: each card starts its cycle with a delay based on index
    const startDelay = (index % 9) * 400; // Stagger by 400ms, cycle through 9 cards
    const glowDuration = 2000; // Glow stays on for 2 seconds
    const cycleDuration = 6000; // Full cycle is 6 seconds
    
    const startTimeout = setTimeout(() => {
      setIsGlowing(true);
      
      // Set up the repeating cycle
      const interval = setInterval(() => {
        setIsGlowing(true);
        setTimeout(() => setIsGlowing(false), glowDuration);
      }, cycleDuration);
      
      // Turn off initial glow after duration
      setTimeout(() => setIsGlowing(false), glowDuration);
      
      return () => clearInterval(interval);
    }, startDelay);
    
    return () => clearTimeout(startTimeout);
  }, [index]);

  return (
    <div className={`group relative flex flex-col rounded-lg border bg-card p-3 shadow-sm transition-all duration-500 hover:shadow-md overflow-hidden ${
      isGlowing 
        ? 'border-primary/50 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]' 
        : 'border-border/50 hover:border-border/80'
    }`}>
      <div className="pointer-events-none absolute inset-0 alumni-card-angled-glow opacity-60" />
      <div className="pointer-events-none absolute inset-0 alumni-card-sweep-glow" />

      {/* Border beam effect when glowing */}
      {isGlowing && (
        <BorderBeam 
          size={100} 
          duration={2} 
          delay={0}
          colorFrom="hsl(var(--primary))"
          colorTo="hsl(var(--primary) / 0.1)"
        />
      )}
      
      {canEdit && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit?.(member)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete?.(member)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex items-start gap-3">
        {image_url ? (
          <img src={image_url} alt={name} className="h-20 w-20 rounded-full border border-border/50 object-cover shadow-sm shrink-0" />
        ) : (
          <div className="h-20 w-20 rounded-full border border-border/50 bg-muted/50 flex items-center justify-center text-lg font-medium text-muted-foreground shadow-sm shrink-0">
            {avatarFallback(name)}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-base leading-tight tracking-tight text-foreground/90">{name}</div>
            {highlight && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />}
          </div>
          
          {(designation || company_name) && (
            <div className="text-xs font-medium text-muted-foreground/80 line-clamp-2">
              {designation && <span className="text-foreground/80">{designation}</span>}
              {designation && company_name && <span> @ </span>}
              {company_name && <span>{company_name}</span>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1.5">
             {batch && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium bg-secondary/50 text-secondary-foreground hover:bg-secondary/60">
                {batch}
              </Badge>
            )}
            {position_in_club && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border-primary/20 text-primary hover:bg-primary/5 hover:text-primary">
                {position_in_club} {club_position_year && `'${String(club_position_year).slice(-2)}`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/40 pt-2.5">
        {linkedin_url && (
          <a 
            href={linkedin_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-muted-foreground hover:text-[#0077B5] transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        )}
        {cfUrl && (
          <a 
            href={cfUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-muted-foreground hover:text-[#1f8dd6] transition-colors"
            aria-label="Codeforces"
          >
            <SiCodeforces className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
