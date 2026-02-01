'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function TabNav() {
    const pathname = usePathname();
    const { user } = useAuth();
    const tenantUrl = user?.tenant_slug ? `http://${user.tenant_slug}.localhost:3000` : '#';

    const permissions = (user as any)?.permissions || {};
    const tenantFeatures = permissions._tenant_features || {}; // Default empty!
    const isSuperAdmin = (user as any)?.is_super_admin;

    const hasOfficeAccess =
        (permissions.can_inventory && tenantFeatures.inventory !== false) ||
        (permissions.can_finance && tenantFeatures.finance !== false) ||
        (permissions.can_orders && tenantFeatures.orders !== false) ||
        (permissions.can_personnel && tenantFeatures.personnel !== false) ||
        (permissions.can_depo && tenantFeatures.depo !== false) ||
        isSuperAdmin; // Super Admin still needs access to dashboard, but individual tabs are guarded below

    const tabs = [
        { name: 'OFFICE', href: '/office', show: hasOfficeAccess },
        { name: 'GO', href: '/go', show: (isSuperAdmin || permissions.can_go) && tenantFeatures.go },
        { name: 'PORTAL', href: '/portal', show: (isSuperAdmin || permissions.can_portal) && tenantFeatures.portal },
        { name: 'WEB', href: '/web', show: (isSuperAdmin || permissions.can_web) && tenantFeatures.web },
    ].filter(t => t.show);

    return (
        <div className="bg-white p-2 px-6 flex justify-between items-center space-x-1 overflow-x-auto">

            <div className="text-lg font-bold tracking-tight text-gray-900">HAUZE <span className="text-indigo-600">PRO</span></div>

            <div>
                {tabs.map((tab) => {
                    // Active logic: exact match for root, startsWith for modules
                    const isActive = tab.href === '/'
                        ? pathname === '/pro' || pathname === '/pro/'
                        : pathname.startsWith(tab.href);

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={`
              px-4 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
              ${isActive
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                        >
                            {tab.name}
                        </Link>
                    );
                })}
            </div>

            <div>
                <Link target='_blank' href={tenantUrl}>Siteye Git</Link>
                <div className="text-xs text-gray-400">v0.1.0</div>
            </div>

        </div>
    );
}
