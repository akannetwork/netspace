'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RegisterPage() {
    const params = useParams();
    const router = useRouter();
    const tenantSlug = params.slug as string;

    // We might need a separate register function in AuthContext, or call API directly
    // For now, let's call API directly here or add register to AuthContext?
    // Let's call API directly as register is specific.

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_slug: tenantSlug,
                    name,
                    phone,
                    password
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Kayıt başarısız');

            // Optionally auto-login?
            // AuthContext usually handles session state.
            // If we want auto-login, we should save token to cookies/context.
            // For now, redirect to login page for simplicity or show success.
            // User requested "Register and Login", usually implies seamless.
            // But integrating with AuthContext requires updating access token there.
            // Let's redirect to login for now.

            // Redirect to login page (relative path keeps the subdomain clean)
            router.push(`/auth/login?registered=true`);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-mono p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Kayıt Ol</h2>
                    <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-bold">Müşteri Hesabı</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded mb-6 text-sm font-bold animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">AD SOYAD</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-700"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">TELEFON</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+90..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-700"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">ŞİFRE</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-700"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 shadow-lg transition-all transform hover:-translate-y-0.5"
                    >
                        {loading ? 'Kayıt Yapılıyor...' : 'KAYIT OL'}
                    </button>

                    <div className="text-center mt-4">
                        <a href={`/auth/login`} className="text-xs text-indigo-500 font-bold hover:underline">Zaten hesabın var mı? Giriş Yap</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
