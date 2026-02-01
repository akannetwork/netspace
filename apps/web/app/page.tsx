'use client';

import { useAuth } from '@/context/auth-context';

export default function LandingPage() {
    const { user, logout, isLoading } = useAuth();

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <header className="bg-white py-4 px-6 flex justify-between items-center shadow-sm">
                <div className="text-2xl font-black italic text-indigo-600">HAUZE</div>
                <div className="space-x-4 flex items-center">
                    {!isLoading && user ? (
                        <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-sm font-semibold text-gray-700">Hi, {user.phone}</span>
                            <div className="h-4 w-px bg-gray-300 mx-1"></div>
                            <button onClick={logout} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wide">Logout</button>
                        </div>
                    ) : (
                        <a href="/auth/login" className="font-medium text-gray-600 hover:text-indigo-600">Login</a>
                    )}
                    <a href="#" className="font-medium text-gray-600 hover:text-indigo-600">Features</a>
                    <a href="#" className="font-medium text-gray-600 hover:text-indigo-600">Pricing</a>
                    <a href="#" className="px-5 py-2 bg-black text-white rounded-full font-bold text-sm hover:bg-gray-800">Start Selling</a>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-white to-indigo-50">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
                    Your Brand. <br />
                    <span className="text-indigo-600">Everything else is us.</span>
                </h1>
                <p className="text-xl text-gray-500 mb-10 max-w-2xl">
                    The ultimate white-label marketplace infrastructure.
                    Manage B2B, B2C, and Multi-tenant commerce in one synchronized heartbeat.
                </p>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="p-4 bg-white rounded-lg shadow border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Localhost Test</span>
                        <div className="space-y-2 text-left text-sm">
                            <div>🛍️ <span className="font-mono bg-gray-100 px-1">http://tenant1.localhost:3000</span></div>
                            <div>🏢 <span className="font-mono bg-gray-100 px-1">http://pro.localhost:3000</span></div>
                            <div>🖥️ <span className="font-mono bg-gray-100 px-1">http://terminal.localhost:3000</span></div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-6 text-center text-gray-400 text-sm">
                Hauze Inc. &copy; 2026. All systems operational.
            </footer>
        </div>
    );
}
