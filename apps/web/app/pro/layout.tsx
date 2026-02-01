'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { TabNav } from './components/TabNav';

export default function ProRootLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/auth/login');
            return;
        }

        if (!isLoading && user) {
            // URL Permission Check
            const permissions = user.permissions || {};
            const isSuperAdmin = user.is_super_admin;

            const hasOfficeAccess = isSuperAdmin ||
                permissions.can_inventory || permissions.can_finance || permissions.can_orders ||
                permissions.can_personnel || permissions.can_depo;

            if (pathname.startsWith('/office') && !hasOfficeAccess) router.push('/');
            if (pathname.startsWith('/go') && !(isSuperAdmin || permissions.can_go)) router.push('/');
            if (pathname.startsWith('/portal') && !(isSuperAdmin || permissions.can_portal)) router.push('/');
            if (pathname.startsWith('/web') && !(isSuperAdmin || permissions.can_web)) router.push('/');
        }
    }, [isLoading, user, router, pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) return null; // Avoid flashing content before redirect

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-mono">

            {/* Top Navigation Global for Pro Panel */}
            <header className="bg-white border-b sticky top-0 z-50">
                <TabNav />
            </header>

            {/* Main Content Area */}
            <main className="flex-1">
                {children}
            </main>

        </div>
    );
}
