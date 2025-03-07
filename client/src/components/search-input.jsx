"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"


export function SearchInput({ placeholder = "Search...", value, onChange, className = "" }) {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-8 h-9"
            />
        </div>
    )
}

