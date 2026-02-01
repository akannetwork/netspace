'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

export default function PortalDashboard() {
    const { logout } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [p, s, l] = await Promise.all([
                    api.get('/portal/profile'),
                    api.get('/portal/summary'),
                    api.get('/portal/ledger')
                ]);
                setProfile(p.data);
                setSummary(s.data);
                setLedger(l.data || []);
            } catch (err) {
                console.error('Failed to load portal data', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="py-20 text-center">Loading Data...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Profile Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Hoş Geldin, {profile?.name}</h1>
                    <p className="text-gray-500 font-medium">{profile?.department || 'Genel'} • {profile?.role || 'Personel'}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Güncel Bakiye</div>
                    <div className={`text-3xl font-black ${profile?.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.abs(profile?.balance || 0).toLocaleString('tr-TR')} ₺
                        <span className="text-sm ml-1 font-bold text-gray-400">
                            {profile?.balance < 0 ? '(Alacak)' : '(Borç)'}
                        </span>
                    </div>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                    <div className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Bu Ay Kazanç</div>
                    <div className="text-3xl font-black">
                        {summary?.total_earnings?.toLocaleString('tr-TR')} ₺
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Çalışılan Gün</div>
                    <div className="text-3xl font-black text-gray-900">
                        {summary?.days_worked || 0} GÜN
                    </div>
                </div>
            </div>

            {/* Ledger & Timesheets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ledger Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h2 className="font-black text-gray-900">Hesap Hareketleri</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-6 py-3">Tarih</th>
                                    <th className="px-6 py-3 text-right">Tutar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm font-medium">
                                {ledger.slice(0, 10).map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900">{tx.description}</div>
                                            <div className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</div>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${tx.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                                            {tx.type === 'debit' ? '-' : '+'}{Number(tx.amount).toLocaleString('tr-TR')} ₺
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Timesheets List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h2 className="font-black text-gray-900">Puantaj Kayıtları (Bu Ay)</h2>
                    </div>
                    <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                        {summary?.personnel && Array.from({ length: 31 }, (_, i) => {
                            const date = new Date();
                            date.setDate(i + 1);
                            // Mocking or filtering from summary data if available
                            return null;
                        })}
                        {/* Simplified list of recent timesheets */}
                        {ledger.filter(t => t.category === 'salary').slice(0, 15).map(t => (
                            <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <div className="text-sm font-bold text-gray-800">{t.description.split(': ')[1]}</div>
                                    <div className="text-[10px] font-black text-indigo-600">{t.amount} ₺ Alacak</div>
                                </div>
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Onaylandı</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
