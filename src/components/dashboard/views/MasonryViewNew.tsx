"use client";

import React from "react";
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Bookmark, Clock } from "lucide-react";
import { getIconComponent } from "./IconHelper";

// Magazine-style theme badge component
function ThemeBadge({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative group/badge inline-flex items-center">
            {/* Decorative line */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-[2px] bg-gradient-to-r from-amber-500 to-orange-400"></div>
            
            {/* Badge content */}
            <span className="relative px-3 py-1 text-[11px] font-bold tracking-[0.15em] uppercase
                text-stone-600 dark:text-stone-400
                bg-gradient-to-br from-stone-50 to-stone-100/50 
                dark:from-stone-800 dark:to-stone-800/50
                border border-stone-200/60 dark:border-stone-700/50
                rounded-full
                shadow-[0_1px_2px_rgba(0,0,0,0.02)]
                group-hover/badge:shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                group-hover/badge:border-amber-200/60 dark:group-hover/badge:border-amber-800/30
                transition-all duration-300">
                {children}
            </span>
        </div>
    );
}

// Magazine-style