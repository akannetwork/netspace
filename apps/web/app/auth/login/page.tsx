'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';

export default function LoginPage() {
    const { verifyOtp } = useAuth();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [tenant, setTenant] = useState('');
    const [context, setContext] = useState('hauze');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Pass empty string for OTP, and provide Password + Tenant
            await verifyOtp(phone, '', context, password, tenant);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-mono">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Hauze Pro Panel</h2>
                    <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-bold">Giriş Yap</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded mb-6 text-sm font-bold animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">

                    {/* Tenant Slug Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">MAĞAZA ADI (TENANT)</label>
                        <input
                            type="text"
                            value={tenant}
                            onChange={(e) => setTenant(e.target.value)}
                            placeholder="ör: hauze"
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-700 placeholder-gray-400"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">TELEFON</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+90555..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-700 placeholder-gray-400"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">ŞİFRE</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-700 placeholder-gray-400"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">GİRİŞ TİPİ</label>
                        <select
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-700"
                        >
                            <option value="pro">Pro (B2B Panel)</option>
                            <option value="hauze">Global (Hauze)</option>
                            <option value="portal">Personel Portalı</option>
                            <option value="admin">Admin (Terminal)</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
                    >
                        {loading ? 'Giriş Yapılıyor...' : 'GİRİŞ YAP'}
                    </button>

                    <div className="text-center">
                        <a href="#" className="text-xs text-indigo-500 font-bold hover:underline">Şifremi Unuttum</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
