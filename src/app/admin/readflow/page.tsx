import { getSettings } from '@/app/actions/settingsActions';
import { ReadflowAdminPanel } from '@/components/admin/ReadflowAdminPanel';

export const revalidate = 0;

export default async function AdminReadflowPage() {
  const { readflowServerUrl } = await getSettings();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-24">
        <ReadflowAdminPanel readflowServerUrl={readflowServerUrl} />
      </main>
    </div>
  );
}

