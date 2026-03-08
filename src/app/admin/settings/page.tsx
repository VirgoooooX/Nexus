import { getSettings } from '@/app/actions/settingsActions';
import { AdminSettingsTabs } from '@/components/admin/AdminSettingsTabs';
import { Settings } from 'lucide-react';
import { adminLogout } from '@/app/admin/actions/adminAuthActions';

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const { categoriesOrder, promptTemplate, defaultLayout, readflowServerUrl, digestScheduleEnabled, digestScheduleTime, promptCfg } = await getSettings();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 pb-24">
        <header className="flex items-center justify-between border-b border-stone-200 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">管理后台</h1>
              <p className="text-xs text-stone-400 mt-0.5">Nexus 系统配置与数据源管理</p>
            </div>
          </div>
          <form action={adminLogout}>
            <button
              type="submit"
              className="text-xs font-bold text-stone-500 hover:text-stone-900 px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
              退出登录
            </button>
          </form>
        </header>

        <AdminSettingsTabs
          settingsProps={{
            initialCategories: categoriesOrder,
            initialPrompt: promptTemplate,
            initialLayout: defaultLayout,
            initialReadflowServerUrl: readflowServerUrl,
            initialDigestScheduleEnabled: digestScheduleEnabled,
            initialDigestScheduleTime: digestScheduleTime,
            initialPromptConfig: promptCfg,
          }}
          readflowServerUrl={readflowServerUrl}
        />
      </main>
    </div>
  );
}
