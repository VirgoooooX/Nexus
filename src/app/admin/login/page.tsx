import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export const revalidate = 0;

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center px-6 py-16">
      <AdminLoginForm />
    </div>
  );
}

