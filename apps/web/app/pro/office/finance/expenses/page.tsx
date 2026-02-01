'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<any[]>([]); // For selecting payment source

    // Create Expense State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        description: '',
        amount: '',
        account_id: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [expRes, accRes] = await Promise.all([
                api.get('/office/finance/expenses'),
                api.get('/office/finance/accounts')
            ]);
            setExpenses(expRes.data.data);
            setAccounts(accRes.data);
        } catch (error) {
            toast.error('Giderler yüklenemedi');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (!createForm.description || !createForm.amount || !createForm.account_id) {
                return toast.error('Tüm alanları doldurunuz');
            }

            await api.post('/office/finance/transactions', {
                type: 'expense',
                account_id: createForm.account_id,
                amount: Number(createForm.amount),
                description: createForm.description,
                date: createForm.date
            });

            toast.success('Gider eklendi');
            setIsCreateOpen(false);
            setCreateForm({ description: '', amount: '', account_id: '', date: new Date().toISOString().split('T')[0] });
            loadData();
        } catch (err: any) {
            toast.error('Hata: ' + err.message);
        }
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Gider Yönetimi</h1>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="button button-primary"
                >
                    + Hızlı Gider Ekle
                </button>
            </div>

            {/* Expense List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Tarih</th>
                            <th className="px-6 py-4">Açıklama</th>
                            <th className="px-6 py-4">Ödeme Kaynağı</th>
                            <th className="px-6 py-4 text-right">Tutar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">Yükleniyor...</td></tr>
                        ) : expenses.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">Henüz gider eklenmemiş.</td></tr>
                        ) : (
                            expenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(exp.date).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{exp.description}</td>
                                    <td className="px-6 py-4 text-gray-500">{exp.finance_accounts?.name}</td>
                                    <td className="px-6 py-4 text-right font-bold text-red-600">-{formatCurrency(exp.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Hızlı Gider Girişi">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                        <input
                            type="text"
                            required
                            className="w-full border rounded-lg p-2 mt-1"
                            placeholder="Örn: Market Alışverişi, Taksi Fişi"
                            value={createForm.description}
                            onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tutar</label>
                        <input
                            type="number"
                            required
                            className="w-full border rounded-lg p-2 mt-1"
                            placeholder="0.00"
                            value={createForm.amount}
                            onChange={e => setCreateForm({ ...createForm, amount: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ödeme Yapılan Hesap</label>
                        <select
                            required
                            className="w-full border rounded-lg p-2 mt-1 bg-white"
                            value={createForm.account_id}
                            onChange={e => setCreateForm({ ...createForm, account_id: e.target.value })}
                        >
                            <option value="">-- Seçiniz --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tarih</label>
                        <input
                            type="date"
                            required
                            className="w-full border rounded-lg p-2 mt-1"
                            value={createForm.date}
                            onChange={e => setCreateForm({ ...createForm, date: e.target.value })}
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">İptal</button>
                        <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Kaydet</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
