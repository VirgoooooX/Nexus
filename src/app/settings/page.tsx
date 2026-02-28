import { getSettings } from '@/app/actions/settingsActions';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { Settings } from 'lucide-react';

export const revalidate = 0;

export default async function SettingsPage() {
    const { categoriesOrder, promptTemplate, defaultLayout, readflowServerUrl, readflowSources } = await getSettings();

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-10 pb-24">
                <header className="flex items-end justify-between border-b-2 border-stone-900 pb-6 mb-10">
                    <div>
                        <p className="text-xs tracking-[0.35em] uppercase text-stone-500 mb-2 font-medium">
                            Nexus 引擎配置
                        </p>
                        <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-stone-900 flex items-center gap-3">
                            <Settings className="w-8 h-8 text-stone-400" /> 系统设置
                        </h1>
                    </div>
                </header>

                <SettingsForm
                    initialCategories={categoriesOrder}
                    initialPrompt={promptTemplate}
                    initialLayout={defaultLayout}
                    initialReadflowServerUrl={readflowServerUrl}
                    initialReadflowSources={readflowSources}
                />
            </main>
        </div>
    );
}
