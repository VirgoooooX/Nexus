import { CreateEventForm } from '@/components/events/CreateEventForm';
import { Suspense } from 'react';

export default function NewEventPage() {
    return (
        <div className="min-h-screen bg-stone-50 pt-10 pb-24">
            <main className="max-w-2xl mx-auto px-5 sm:px-8">
                <Suspense fallback={<div className="text-sm text-stone-500">加载中...</div>}>
                    <CreateEventForm />
                </Suspense>
            </main>
        </div>
    );
}
