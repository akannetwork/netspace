'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'personnel')) {
            // If logged in as pro but trying to see portal, maybe allow? 
            // But usually portal is for personnel context.
            // For now, if not personnel, redirect to login if not logged in at all.
            if (!user) router.push('/auth/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div className="p-10 text-center font-mono">Loading Portal...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-indigo-900 text-white py-4 px-6 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-900 font-black">H</div>
                    <div className="font-bold tracking-tight text-lg">PERSONEL PORTALI</div>
                </div>
                <div className="text-xs font-medium opacity-80 bg-white/10 px-3 py-1 rounded-full">
                    {user?.phone}
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
                {children}
            </main>

            <footer className="py-6 text-center text-gray-400 text-xs border-t">
                Hauze Personnel Portal &copy; 2026. All rights reserved.
            </footer>
        </div>
    );
}
