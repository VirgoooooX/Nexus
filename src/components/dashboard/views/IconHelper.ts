"use client";

import {
    Cpu, Globe, Briefcase, Newspaper, Gamepad2, Trophy,
    Sparkles, Heart, Film, Music, BookOpen, Zap, Rocket,
    Shield, TrendingUp, Users, MessageSquare, Radio,
    LucideIcon
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
    cpu: Cpu,
    globe: Globe,
    briefcase: Briefcase,
    newspaper: Newspaper,
    gamepad: Gamepad2,
    trophy: Trophy,
    sparkles: Sparkles,
    heart: Heart,
    film: Film,
    music: Music,
    book: BookOpen,
    zap: Zap,
    rocket: Rocket,
    shield: Shield,
    trending: TrendingUp,
    users: Users,
    message: MessageSquare,
    radio: Radio,
};

export function getIconComponent(iconName: string): LucideIcon {
    if (!iconName) return Newspaper;
    const key = iconName.toLowerCase().replace(/[-_\s]/g, '');
    for (const [mapKey, icon] of Object.entries(ICON_MAP)) {
        if (key.includes(mapKey)) return icon;
    }
    return Newspaper;
}
