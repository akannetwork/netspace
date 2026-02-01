'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { CreateRecurringModal } from '@/components/finance/CreateRecurringModal';

export default function PayablesPage() {
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('creditors');
    const [loading, setLoading] = useState(true);

    const [creditors, setCreditors] = useState<any[]>([]);
    const [recurring, setRecurring] = useState<any[]>([]);
    const [checks, setChecks] = useState<any[]>([]);
    const [isRecurringCreateOpen, setIsRecurringCreateOpen] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    async function loadAll() {
        try {
            setLoading(true);
            const [statsRes, credRes, recurRes, checksRes] = await Promise.all([
                api.get('/office/finance/payables/stats'),
                api.get('/office/finance/payables/creditors?limit=50'),
                api.get('/office/finance/payables/recurring'),
                api.get('/office/finance/payables/checks')
            ]);

            setStats(statsRes.data);
            setCreditors(credRes.data.data);
            setRecurring(recurRes.data);
            setChecks(checksRes.data);
        } catch (error) {
            toast.error('Veriler yüklenemedi');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Ödeme Yönetimi</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                    <p className="text-sm font-medium text-gray-500 uppercase">Toplam Borç Yükü</p>
                    <p className="text-3xl font-black text-red-900 mt-2">
                        {stats ? formatCurrency(stats.totalPayable) : '-'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 uppercase">Satıcı Bakiyeleri</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        {stats ? formatCurrency(stats.currentAccountDebt) : '-'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 uppercase">Verilen Çekler</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        {stats ? formatCurrency(stats.checksIssued) : '-'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 uppercase">Kredi Kartı Borcu</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        {stats ? formatCurrency(stats.creditCardDebt) : '-'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('creditors')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'creditors' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Satıcılar (Borçlu)
                    </button>
                    <button
                        onClick={() => setActiveTab('recurring')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'recurring' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Düzenli Ödemeler
                    </button>
                    <button
                        onClick={() => setActiveTab('checks')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'checks' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Verilen Çekler
                    </button>
                </nav>
            </div>

            {/* Content Tab: Creditors */}
            {activeTab === 'creditors' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Firma Adı</th>
                                <th className="px-6 py-4">Tip</th>
                                <th className="px-6 py-4 text-right">Bakiye (Alacaklı)</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {creditors.map(d => (
                                <tr key={d.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{d.name}</td>
                                    <td className="px-6 py-4 text-gray-500 capitalize">{d.type}</td>
                                    {/* Display as Positive for readability in Payables context */}
                                    <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(Math.abs(d.balance))}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 hover:underline font-medium text-xs">Ödeme Yap</button>
                                    </td>
                                </tr>
                            ))}
                            {creditors.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Borçlu olduğunuz cari yok</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Content Tab: Recurring */}
            {activeTab === 'recurring' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Tanımlı Ödemeler</h3>
                        <button onClick={() => setIsRecurringCreateOpen(true)} className="text-xs button bg-white border">+ Yeni Tanım Ekle</button>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Ödeme Adı</th>
                                <th className="px-6 py-4">Periyot</th>
                                <th className="px-6 py-4">Sonraki Ödeme</th>
                                <th className="px-6 py-4 text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recurring.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {r.name}
                                        {r.contacts && <div className="text-xs text-gray-500">{r.contacts.name}</div>}
                                    </td>
                                    <td className="px-6 py-4 capitalize">{r.recurrence_period} ({r.day_of_month}. gün)</td>
                                    <td className="px-6 py-4">{r.next_due_date ? new Date(r.next_due_date).toLocaleDateString('tr-TR') : '-'}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">{r.amount ? formatCurrency(r.amount) : 'Değişken'}</td>
                                </tr>
                            ))}
                            {recurring.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Düzenli ödeme tanımı yok</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Content Tab: Outgoing Checks */}
            {activeTab === 'checks' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Vade Tarihi</th>
                                <th className="px-6 py-4">Kime (Cari)</th>
                                <th className="px-6 py-4">Banka</th>
                                <th className="px-6 py-4 text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {checks.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {new Date(c.due_date).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4">{c.contacts?.name}</td>
                                    <td className="px-6 py-4">{c.bank_name}</td>
                                    <td className="px-6 py-4 text-right font-bold">{formatCurrency(c.amount)}</td>
                                </tr>
                            ))}
                            {checks.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Verilen çek bulunamadı</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}


            <CreateRecurringModal
                isOpen={isRecurringCreateOpen}
                onClose={() => setIsRecurringCreateOpen(false)}
                onSuccess={loadAll}
            />
        </div >
    );
}
