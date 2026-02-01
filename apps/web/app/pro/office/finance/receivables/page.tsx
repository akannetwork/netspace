'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { useQuery } from '@tanstack/react-query';

export default function ReceivablesPage() {
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('debtors');

    const [debtors, setDebtors] = useState<any[]>([]);
    const [installments, setInstallments] = useState<any[]>([]);
    const [checks, setChecks] = useState<any[]>([]);

    // Payment Modal State
    const [paymentModal, setPaymentModal] = useState<{ open: boolean; installment: any | null }>({ open: false, installment: null });
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        payment_method: 'cash' as 'cash' | 'credit_card' | 'eft' | 'check',
        account_id: '',
        description: '',
        check_info: {
            bank_name: '',
            check_number: '',
            due_date: ''
        }
    });
    const [paymentLoading, setPaymentLoading] = useState(false);

    // Fetch Finance Accounts
    const { data: accounts } = useQuery({
        queryKey: ['finance-accounts'],
        queryFn: async () => {
            const res = await api.get('/office/finance/accounts');
            return res.data || [];
        }
    });

    async function loadData() {
        try {
            const [datesData, debtorsData, installmentsData, checksData] = await Promise.all([
                api.get('/office/finance/receivables/stats'),
                api.get('/office/finance/receivables/debtors'),
                api.get('/office/finance/receivables/installments'),
                api.get('/office/finance/checks?status=pending,portfolio')
            ]);

            setStats(datesData.data);
            setDebtors(debtorsData.data?.data || []);
            setInstallments(installmentsData.data || []);
            setChecks(checksData.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Veriler yüklenemedi');
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function openPaymentModal(installment: any) {
        setPaymentForm({
            amount: installment.remaining_amount,
            payment_method: 'cash',
            account_id: '',
            description: `Taksit Ödemesi (${installment.contacts?.name || 'Müşteri'})`,
            check_info: {
                bank_name: '',
                check_number: '',
                due_date: ''
            }
        });
        setPaymentModal({ open: true, installment });
    }

    async function handlePayment() {
        if (!paymentModal.installment) return;
        if (paymentForm.amount <= 0) {
            return toast.error('Ödeme tutarı 0\'dan büyük olmalı');
        }
        if (paymentForm.payment_method !== 'check' && !paymentForm.account_id) {
            return toast.error('Kasa/Banka seçiniz');
        }
        if (paymentForm.payment_method === 'check') {
            if (!paymentForm.check_info.bank_name || !paymentForm.check_info.check_number || !paymentForm.check_info.due_date) {
                return toast.error('Çek bilgilerini eksiksiz doldurun');
            }
        }

        setPaymentLoading(true);
        try {
            await api.post(`/office/finance/installments/${paymentModal.installment.id}/pay`, paymentForm);
            toast.success('Taksit ödemesi alındı!');
            setPaymentModal({ open: false, installment: null });
            loadData(); // Refresh data
        } catch (err: any) {
            toast.error(err.message || 'Ödeme başarısız');
        } finally {
            setPaymentLoading(false);
        }
    }

    const filteredAccounts = (accounts || []).filter((a: any) => {
        if (paymentForm.payment_method === 'cash') return a.type === 'cash';
        if (paymentForm.payment_method === 'credit_card') return a.type === 'pos';
        if (paymentForm.payment_method === 'eft') return a.type === 'bank';
        return true;
    });

    function getStatusBadge(status: string) {
        switch (status) {
            case 'paid':
                return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Ödendi</span>;
            case 'partial':
                return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Kısmi</span>;
            case 'overdue':
                return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Gecikmiş</span>;
            default:
                return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Bekliyor</span>;
        }
    }

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Alacak Yönetimi</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                    <p className="text-sm font-medium text-gray-500 uppercase">Toplam Alacak</p>
                    <p className="text-3xl font-black text-indigo-900 mt-2">
                        {stats ? formatCurrency(stats.totalReceivable) : '-'}
                    </p>
                    <p className="text-xs text-indigo-400 mt-1">Cari + Çekler</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 uppercase">Açık Cari Bakiyeler</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        {stats ? formatCurrency(stats.currentAccountDebt) : '-'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 uppercase">Portföydeki Çekler</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                        {stats ? formatCurrency(stats.checkPortfolio) : '-'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('debtors')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'debtors' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Borçlu Cariler
                    </button>
                    <button
                        onClick={() => setActiveTab('installments')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'installments' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Taksit Takvimi
                    </button>
                    <button
                        onClick={() => setActiveTab('checks')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'checks' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Çek Portföyü
                    </button>
                </nav>
            </div>

            {/* Content Tab: Debtors */}
            {activeTab === 'debtors' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Cari Adı</th>
                                <th className="px-6 py-4">Tip</th>
                                <th className="px-6 py-4 text-right">Bakiye (Borç)</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {debtors.map(d => (
                                <tr key={d.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <Link href={`/pro/office/contacts/${d.id}`}>{d.name}</Link>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 capitalize">{d.type}</td>
                                    <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(d.balance)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/pro/office/contacts/${d.id}`} className="text-indigo-600 hover:underline font-medium text-xs">Tahsilat Ekle</Link>
                                    </td>
                                </tr>
                            ))}
                            {debtors.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Kayıt Yok</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Content Tab: Installments */}
            {activeTab === 'installments' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Vade Tarihi</th>
                                <th className="px-6 py-4">Cari</th>
                                <th className="px-6 py-4 text-right">Kalan Tutar</th>
                                <th className="px-6 py-4 text-center">Durum</th>
                                <th className="px-6 py-4 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {installments.map(i => {
                                const dueDate = new Date(i.due_date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                dueDate.setHours(0, 0, 0, 0);
                                const isOverdue = dueDate < today;
                                const isDueToday = dueDate.getTime() === today.getTime();

                                return (
                                    <tr key={i.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isDueToday ? 'bg-yellow-50' : ''}`}>
                                        <td className={`px-6 py-4 font-medium ${isOverdue ? 'text-red-600' : isDueToday ? 'text-yellow-700' : 'text-gray-900'}`}>
                                            {new Date(i.due_date).toLocaleDateString('tr-TR')}
                                            {isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Gecikmiş</span>}
                                            {isDueToday && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Bugün</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/pro/office/contacts/${i.contact_id}`}>{i.contacts?.name}</Link>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold">{formatCurrency(i.remaining_amount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(i.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {i.status !== 'paid' && (
                                                <button
                                                    onClick={() => openPaymentModal(i)}
                                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition"
                                                >
                                                    Ödeme Al
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {installments.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Vadesi gelen taksit yok</td></tr>}

                        </tbody>
                    </table>
                </div>
            )}

            {/* Content Tab: Checks */}
            {activeTab === 'checks' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Vade Tarihi</th>
                                <th className="px-6 py-4">Cari</th>
                                <th className="px-6 py-4">Banka</th>
                                <th className="px-6 py-4">Açıklama</th>
                                <th className="px-6 py-4 text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {checks.map(c => {
                                const dueDate = new Date(c.due_date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                dueDate.setHours(0, 0, 0, 0);
                                const isOverdue = dueDate < today;
                                const isDueToday = dueDate.getTime() === today.getTime();

                                return (
                                    <tr key={c.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isDueToday ? 'bg-yellow-50' : ''}`}>
                                        <td className={`px-6 py-4 font-medium ${isOverdue ? 'text-red-600' : isDueToday ? 'text-yellow-700' : 'text-gray-900'}`}>
                                            {new Date(c.due_date).toLocaleDateString('tr-TR')}
                                            {isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Gecikmiş</span>}
                                            {isDueToday && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Bugün</span>}
                                        </td>
                                        <td className="px-6 py-4">{c.contacts?.name}</td>
                                        <td className="px-6 py-4">{c.bank_name}</td>
                                        <td className="px-6 py-4 text-gray-500 text-xs max-w-[200px] truncate">{c.notes || '-'}</td>
                                        <td className="px-6 py-4 text-right font-bold">{formatCurrency(c.amount)}</td>
                                    </tr>
                                );
                            })}
                            {checks.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Portföyde çek yok</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Payment Modal */}
            <Modal
                isOpen={paymentModal.open}
                onClose={() => setPaymentModal({ open: false, installment: null })}
                title="Taksit Ödemesi Al"
            >
                <div className="space-y-4">
                    {/* Installment Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                            <strong>Müşteri:</strong> {paymentModal.installment?.contacts?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                            <strong>Vade:</strong> {paymentModal.installment?.due_date && new Date(paymentModal.installment.due_date).toLocaleDateString('tr-TR')}
                        </p>
                        <p className="text-sm text-gray-600">
                            <strong>Kalan Tutar:</strong> {formatCurrency(paymentModal.installment?.remaining_amount || 0)}
                        </p>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Tutarı</label>
                        <input
                            type="number"
                            value={paymentForm.amount}
                            onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            max={paymentModal.installment?.remaining_amount || 0}
                        />
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { value: 'cash', label: 'Nakit' },
                                { value: 'credit_card', label: 'Kart' },
                                { value: 'eft', label: 'EFT' },
                                { value: 'check', label: 'Çek' }
                            ].map(m => (
                                <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => setPaymentForm({ ...paymentForm, payment_method: m.value as any, account_id: '' })}
                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${paymentForm.payment_method === m.value
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Account Selection (if not check) */}
                    {paymentForm.payment_method !== 'check' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kasa / Banka</label>
                            <select
                                value={paymentForm.account_id}
                                onChange={e => setPaymentForm({ ...paymentForm, account_id: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            >
                                <option value="">Seçiniz...</option>
                                {filteredAccounts.map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Check Details (if check) */}
                    {paymentForm.payment_method === 'check' && (
                        <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Banka Adı</label>
                                <input
                                    type="text"
                                    value={paymentForm.check_info.bank_name}
                                    onChange={e => setPaymentForm({
                                        ...paymentForm,
                                        check_info: { ...paymentForm.check_info, bank_name: e.target.value }
                                    })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    placeholder="Örn: Garanti Bankası"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Çek Numarası</label>
                                <input
                                    type="text"
                                    value={paymentForm.check_info.check_number}
                                    onChange={e => setPaymentForm({
                                        ...paymentForm,
                                        check_info: { ...paymentForm.check_info, check_number: e.target.value }
                                    })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    placeholder="Örn: 123456"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vade Tarihi</label>
                                <input
                                    type="date"
                                    value={paymentForm.check_info.due_date}
                                    onChange={e => setPaymentForm({
                                        ...paymentForm,
                                        check_info: { ...paymentForm.check_info, due_date: e.target.value }
                                    })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                        <input
                            type="text"
                            value={paymentForm.description}
                            onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handlePayment}
                        disabled={paymentLoading}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
                    >
                        {paymentLoading ? 'İşleniyor...' : 'Ödemeyi Kaydet'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
