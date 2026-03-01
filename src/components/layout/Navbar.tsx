'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LayoutTemplate, Check } from "lucide-react";
import { updateSettings, getSettings } from '@/app/actions/settingsActions';

const VIEW_OPTIONS = [
    { id: 'masonry', label: 'Masonry', desc: '瀑布流 / 两列分布' },
    { id: 'classic', label: 'Classic', desc: '经典单列 / 精密仪轨' }
];

export function Navbar() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeLayout, setActiveLayout] = useState('classic');
    const [isVisible, setIsVisible] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);

    useEffect(() => {
        // Load initial setting
        getSettings().then(settings => {
            if (settings && settings.defaultLayout) {
                setActiveLayout(settings.defaultLayout);
            }
        });

        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);

        // Scroll listener for auto-hide navbar
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY.current) {
                setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const handleSwitchLayout = async (layoutId: string) => {
        setActiveLayout(layoutId);
        setIsDropdownOpen(false);
        // Save to DB
        await updateSettings({ defaultLayout: layoutId });
        // Force refresh to apply universally
        window.location.reload();
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-800/50 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
        >
            <div className="w-full flex h-16 items-center justify-between px-6 md:px-12 lg:px-16">
                <Link href="/" className="font-sans font-black text-xl tracking-tighter text-stone-900 dark:text-white flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-sm rotate-45"></div>
                    Nexus
                </Link>

                <div className="flex items-center gap-6 md:gap-8">
                    <div className="hidden sm:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.25em] text-stone-500 dark:text-stone-400 mr-2">
                        <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            日报
                        </Link>
                        <Link href="/events" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            事件追踪
                        </Link>
                        <Link href="/settings" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            系统设置
                        </Link>
                    </div>

                    <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 hidden sm:block"></div>

                    {/* View Switcher Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-600 dark:text-stone-400 transition-colors group outline-none"
                        >
                            <LayoutTemplate className="w-4 h-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">View</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-4 w-60 bg-white dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl">
                                <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-900 mb-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
                                        Interface Layout
                                    </p>
                                </div>
                                <div className="px-2 space-y-1">
                                    {VIEW_OPTIONS.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => handleSwitchLayout(option.id)}
                                            className={`w-full text-left px-3 py-3 rounded-xl flex items-start gap-4 transition-all duration-200 outline-none ${activeLayout === option.id ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-stone-50 dark:hover:bg-stone-900'}`}
                                        >
                                            <div className="mt-0.5 shrink-0 flex items-center justify-center">
                                                {activeLayout === option.id ? (
                                                    <div className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border border-stone-300 dark:border-stone-700" />
                                                )}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-black tracking-tight ${activeLayout === option.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-stone-900 dark:text-stone-200'}`}>
                                                    {option.label}
                                                </div>
                                                <div className="text-[11px] text-stone-500 dark:text-stone-500 mt-1 font-medium leading-snug">
                                                    {option.desc}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
