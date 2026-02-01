
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        { name: 'Kullanıcı Yönetimi', href: '/office/settings/users' },
        { name: 'Şube Yönetimi', href: '/office/settings/branches' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-1 bg-gray-200/50 p-1 rounded-xl w-fit">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${isActive
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.name}
                        </Link>
                    );
                })}
            </div>
            <div>
                {children}
            </div>
        </div>
    );
}
