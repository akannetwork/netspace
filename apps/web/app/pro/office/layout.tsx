'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBranch } from '@/context/branch-context';
import { useAuth } from '@/context/auth-context';
import { useState, useEffect } from 'react';
import { POSModal } from '@/components/office/POSModal';
import { AddTransactionModal } from '@/components/office/AddTransactionModal'; // Import

function OfficeSidebar() {
    const pathname = usePathname();

    const { user } = useAuth();
    const permissions = (user as any)?.permissions || {};
    const isSuperAdmin = (user as any)?.is_super_admin;

    const tenantFeatures = permissions._tenant_features || {
        office: true, // Default to true if not present for safety? Or false? 
        // Migration sets default true for safety.
        inventory: true, finance: true, orders: true, personnel: true
    };

    const tabs = [
        { name: 'Dashboard', href: '/office', icon: 'ChartBarIcon', show: true },
        {
            name: 'ENVANTER',
            href: '/office/inventory',
            icon: 'CubeIcon',
            show: (permissions.can_inventory || isSuperAdmin) && tenantFeatures.inventory,
            children: [
                { name: 'Ürünler ve Hizmetler', href: '/office/inventory/products' },
                { name: 'Kategoriler', href: '/office/inventory/categories' },
                { name: 'Stok Yönetimi', href: '/office/inventory/stock' },
            ]
        },
        {
            name: 'Finance',
            href: '/office/finance',
            icon: 'BanknotesIcon',
            show: (permissions.can_finance || isSuperAdmin) && tenantFeatures.finance,
            children: [
                { name: 'Hareketler', href: '/office/finance' },
                { name: 'Contacts', href: '/office/finance/contacts' },
                { name: 'Kasalar / Bankalar', href: '/office/finance/accounts' },
            ]
        },
        { name: 'Orders', href: '/office/orders', icon: 'ShoppingBagIcon', show: (permissions.can_orders || isSuperAdmin) && tenantFeatures.orders },
        { name: 'Personnel', href: '/office/personnel', icon: 'UserGroupIcon', show: (permissions.can_personnel || isSuperAdmin) && tenantFeatures.personnel },
        { name: 'Settings', href: '/office/settings', icon: 'CogIcon', show: isSuperAdmin },
    ].filter(tab => tab.show);

    return (
        <aside className="w-64 bg-white text-gray-900 min-h-screen flex flex-col border-r border-gray-100 shadow-sm">
            <div className="p-8">
                <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic italic">HAUZE</h1>
                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em] mt-1">Office Control</p>
            </div>

            <nav className="flex-1 px-4 space-y-6">
                <div>
                    <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Main Menu</p>
                    <div className="space-y-1">
                        {tabs.map((tab) => {
                            const isActive = tab.href === '/office'
                                ? pathname === '/office'
                                : pathname.startsWith(tab.href);

                            return (
                                <div key={tab.href}>
                                    <Link
                                        href={tab.children ? tab.children[0].href : tab.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-tight ${isActive
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        {tab.name}
                                    </Link>

                                    {tab.children && isActive && (
                                        <div className="mt-2 ml-4 pl-4 border-l-2 border-indigo-100 space-y-1">
                                            {tab.children.map(child => {
                                                const isChildActive = pathname === child.href;
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={`block px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isChildActive
                                                            ? 'text-indigo-600 bg-indigo-50'
                                                            : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {child.name}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </nav>

            <div className="p-6">
                <Link href="/" className="block text-[10px] font-black text-center text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                    &larr; Site Dashboard
                </Link>
            </div>
        </aside>
    );
}

function OfficeHeader() {
    const { currentBranch, branches, setBranch } = useBranch();
    const { user, logout } = useAuth();
    const permissions = (user as any)?.permissions || {};
    const isSuperAdmin = (user as any)?.is_super_admin;

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    return (
        <>
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">

                {/* Branch Selector */}
                <div className="flex items-center gap-3">
                    {branches.length > 1 && (
                        <>
                            <span className="text-xs font-bold text-gray-500 uppercase">Current Branch:</span>
                            <select
                                className="border border-gray-300 rounded px-3 py-1 text-sm bg-gray-50 text-gray-800 outline-none focus:border-indigo-500"
                                value={currentBranch?.id || ''}
                                onChange={(e) => {
                                    const branch = branches.find(b => b.id === e.target.value);
                                    if (branch) setBranch(branch);
                                }}
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.type.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </>
                    )}

                    {/* Quick Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                        {(permissions.can_finance || isSuperAdmin) && (
                            <button
                                onClick={() => setIsTransactionModalOpen(true)}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 transition shadow-sm text-sm font-medium"
                            >
                                <span>+ Hızlı İşlem</span>
                            </button>
                        )}
                        {(permissions.can_orders || isSuperAdmin) && (
                            <button
                                onClick={() => setIsOrderModalOpen(true)}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition shadow-sm text-sm font-medium"
                            >
                                <span>+ Quick Sale</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* User Actions */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{user?.role || 'User'}</div>
                        <div className="text-xs text-gray-500">{(user as any)?.email}</div>
                    </div>
                    <button
                        onClick={logout}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Quick Sale / POS Modal */}
            <POSModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
            />

            <AddTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    setIsTransactionModalOpen(false);
                }}
            />
        </>
    );
}

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter(); // Use from next/navigation
    // Note: useRouter from next/navigation needs to be imported if not present. 
    // imports at top: import { usePathname } from 'next/navigation'; -> I need to add useRouter too.

    // Gating Logic
    useEffect(() => {
        if (isLoading) return;
        if (!user) return;

        const features = (user as any)?.permissions?._tenant_features || {};
        const isSuperAdmin = (user as any)?.is_super_admin;

        console.log('[OfficeLayout Guard] Checking Access:', {
            path: pathname,
            features,
            isSuperAdmin,
            userRole: user.role
        });

        // REMOVED: Super Admin bypass. Even Super Admins shouldn't access disabled features.
        // if (isSuperAdmin) {
        //     console.log('[OfficeLayout Guard] Super Admin - Bypass');
        //     return;
        // }

        // Define Rules
        const rules = [
            { path: '/office/inventory', feature: features.inventory, name: 'inventory' },
            { path: '/office/finance', feature: features.finance, name: 'finance' },
            { path: '/office/orders', feature: features.orders, name: 'orders' },
            { path: '/office/personnel', feature: features.personnel, name: 'personnel' },
            // Add more if needed. sub-paths are covered by startswith check below.
        ];

        for (const rule of rules) {
            if (pathname.startsWith(rule.path)) {
                console.log(`[OfficeLayout Guard] Matched Rule: ${rule.name} (Enabled: ${rule.feature})`);
                // STRICT CHECK: Block if feature is FALSE or UNDEFINED (unless defaulting logic is applied before)
                if (!rule.feature) {
                    console.warn(`[OfficeLayout Guard] Access Denied to ${rule.name}. Redirecting...`);
                    router.push('/office');
                    break;
                }
            }
        }
    }, [pathname, user, isLoading]);

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            <OfficeSidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <OfficeHeader />
                <main className="flex-1 p-6 overflow-x-auto overflow-y-auto">
                    <div className="min-w-0 w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
