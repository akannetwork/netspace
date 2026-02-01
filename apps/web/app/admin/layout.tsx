'use client';

import { useAuth } from '@/context/auth-context';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100 font-mono">

            {/* HEADER */}
            <header className="bg-black text-green-500 p-4 border-b border-green-700 flex justify-between items-center">
                <div className="text-lg font-bold">TERMINAL.HAUZE &gt; SYSTEM_ADMIN</div>
                <div className="flex items-center space-x-4">
                    <button onClick={logout} className="text-xs hover:text-red-500">[LOGOUT]</button>
                    <div className="text-xs">STATUS: ONLINE</div>
                </div>
            </header>

            {/* CONTENT */}
            <div className="flex">

                {/* SIDEBAR */}
                <aside className="w-48 bg-gray-900 text-gray-400 min-h-screen p-4 text-sm border-r border-gray-700">
                    <ul className="space-y-2">
                        <li className="text-white font-bold mb-2">/modules</li>
                        <li className="hover:text-white cursor-pointer">&gt; dashboard</li>
                        <li className="hover:text-white cursor-pointer">&gt; tenants</li>
                        <li className="hover:text-white cursor-pointer">&gt; users</li>
                        <li className="hover:text-white cursor-pointer">&gt; logs</li>
                    </ul>
                </aside>

                {/* MAIN */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>

        </div>
    );
}
