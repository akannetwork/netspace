'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function TenantLoginPage() {
    const { verifyOtp } = useAuth();
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tenantSlug = params.slug as string;
    const isRegistered = searchParams.get('registered') === 'true';

    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Use 'hauze' context or similar? 
            // Actually context for customer... maybe 'customer'? 
            // Or just 'hauze' (Global/Default)?
            // The backend verifyOtp doesn't strictly enforce context logic for customers except tenant finding.
            // If tenant_slug is provided, backend authentication works.
            // Let's us 'customer' as context just in case we need to differentiate.
            await verifyOtp(phone, '', 'customer', password, tenantSlug);

            // Redirect to home or account page
            router.push(`/`);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-mono p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Giriş Yap</h2>
                    <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-bold">Müşteri Hesabı</p>
                </div>

                {isRegistered && (
                    <div className="bg-green-50 border border-green-100 text-green-700 p-3 rounded mb-6 text-sm font-bold">
                        Kayıt başarılı! Lütfen giriş yapın.
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded mb-6 text-sm font-bold animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
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
                        {loading ? 'Giriş Yapılıyor...' : 'GİRİŞ YAP'}
                    </button>

                    <div className="text-center mt-4">
                        <a href={`/auth/register`} className="text-xs text-indigo-500 font-bold hover:underline">Hesabın yok mu? Kayıt Ol</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
