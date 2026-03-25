"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Linkedin, Pencil, Trash2 } from "lucide-react";
import { SiCodeforces } from "react-icons/si";

function avatarFallback(name) {
  return String(name || "A").trim().charAt(0).toUpperCase() || "A";
}

export default function AlumniMemberCard({ member, canEdit = false, onEdit, onDelete }) {
  const {
    name,
    image_url,
    designation,
    company_name,
    batch,
    batch_year,
    position_in_club,
    club_position_year,
    linkedin_url,
    cf_handle,
  } = member;

  const headline = [designation, company_name].filter(Boolean).join(" @ ");
  const cfUrl = cf_handle ? `https://codeforces.com/profile/${cf_handle}` : "";

  return (
    <div className="group relative flex flex-col rounded-lg border border-border/50 bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-border/80">
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

      <div className="flex items-start gap-4">
        {image_url ? (
          <img src={image_url} alt={name} className="h-14 w-14 rounded-full border border-border/50 object-cover shadow-sm" />
        ) : (
          <div className="h-14 w-14 rounded-full border border-border/50 bg-muted/50 flex items-center justify-center text-base font-medium text-muted-foreground shadow-sm">
            {avatarFallback(name)}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold text-base leading-tight tracking-tight text-foreground/90">{name}</div>
          
          {(designation || company_name) && (
            <div className="text-xs font-medium text-muted-foreground/80 line-clamp-2">
              {designation && <span className="text-foreground/80">{designation}</span>}
              {designation && company_name && <span> @ </span>}
              {company_name && <span>{company_name}</span>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1.5">
             {(batch || batch_year) && (
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

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
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
