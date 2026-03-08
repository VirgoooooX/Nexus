'use client';

import { useState } from 'react';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { PromptSettingsForm } from '@/components/settings/PromptSettingsForm';
import { ReadflowAdminPanel } from '@/components/admin/ReadflowAdminPanel';
import { Settings, Rss, TerminalSquare } from 'lucide-react';
import type { PromptConfig } from '@/lib/promptConfig';

interface AdminSettingsTabsProps {
    settingsProps: {
        initialCategories: string[];
        initialPrompt: string;
        initialLayout: string;
        initialReadflowServerUrl: string;
        initialDigestScheduleEnabled: boolean;
        initialDigestScheduleTime: string;
        initialPromptConfig: PromptConfig;
    };
    readflowServerUrl: string;
}

export function AdminSettingsTabs({ settingsProps, readflowServerUrl }: AdminSettingsTabsProps) {
    const [activeTab, setActiveTab] = useState<'settings' | 'prompt' | 'readflow'>('settings');

    return (
        <div className="space-y-8">
            {/* Tab Navigation */}
            <nav className="flex flex-wrap gap-1 bg-stone-100 p-1 rounded-lg w-fit">
                <button type="button" onClick={() => setActiveTab('settings')}
                    className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'settings' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                    <Settings className="w-3.5 h-3.5" /> 系统设置
                </button>
                <button type="button" onClick={() => setActiveTab('prompt')}
                    className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'prompt' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                    <TerminalSquare className="w-3.5 h-3.5" /> 系统指令 (Prompt)
                </button>
                <button type="button" onClick={() => setActiveTab('readflow')}
                    className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'readflow' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                    <Rss className="w-3.5 h-3.5" /> Readflow 数据源
                </button>
            </nav>

            {/* Tab Content */}
            {activeTab === 'settings' && <SettingsForm {...settingsProps} />}
            {activeTab === 'prompt' && <PromptSettingsForm {...settingsProps} />}
            {activeTab === 'readflow' && <ReadflowAdminPanel readflowServerUrl={readflowServerUrl} />}
        </div>
    );
}
