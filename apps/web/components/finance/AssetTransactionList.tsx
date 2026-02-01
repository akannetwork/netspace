import { formatCurrency } from '@/lib/format';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Transaction {
    id: string;
    date: string;
    description: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
    amount: number;
    contacts?: { name: string };
}

interface AssetTransactionListProps {
    accountId: string;
    accountCurrency: string;
}

export function AssetTransactionList({ accountId, accountCurrency }: AssetTransactionListProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    useEffect(() => {
        loadTransactions();
    }, [accountId, page]);

    async function loadTransactions() {
        try {
            setLoading(true);
            const res = await api.get(`/office/finance/accounts/${accountId}/transactions?page=${page}&limit=${limit}`);
            setTransactions(res.data.data);
            setTotal(res.data.meta.total);
        } catch (error) {
            toast.error('Hareketler yüklenemedi');
        } finally {
            setLoading(false);
        }
    }

    // Helper for badges
    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'income': return <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">Gelir</span>;
            case 'expense': return <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium">Gider</span>;
            case 'transfer_in': return <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium">Transfer (Giriş)</span>;
            case 'transfer_out': return <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium">Transfer (Çıkış)</span>;
            default: return type;
        }
    };

    return (
        <div className="space-y-4">
            <div className="overflow-hidden border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-4 py-3">Tarih</th>
                            <th className="px-4 py-3">Açıklama</th>
                            <th className="px-4 py-3">İşlem Türü</th>
                            <th className="px-4 py-3 text-right">Tutar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-400">Yükleniyor...</td></tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-400">Kayıt bulunamadı.</td></tr>
                        ) : (
                            transactions.map(trx => (
                                <tr key={trx.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-600">
                                        {new Date(trx.date || '').toLocaleDateString('tr-TR')}
                                        <div className="text-xs text-gray-400">{new Date(trx.date || '').toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{trx.description || '-'}</div>
                                        {trx.contacts && <div className="text-xs text-gray-500">{trx.contacts.name}</div>}
                                    </td>
                                    <td className="px-4 py-3">{getTypeBadge(trx.type)}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${(trx.type === 'income' || trx.type === 'transfer_in') ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {(trx.type === 'income' || trx.type === 'transfer_in') ? '+' : '-'}
                                        {formatCurrency(trx.amount, accountCurrency)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Simple Pagination */}
            {total > limit && (
                <div className="flex justify-between items-center pt-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
                    >
                        Önceki
                    </button>
                    <span className="text-xs text-gray-500">{page} / {Math.ceil(total / limit)}</span>
                    <button
                        disabled={page * limit >= total}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
                    >
                        Sonraki
                    </button>
                </div>
            )}
        </div>
    );
}
