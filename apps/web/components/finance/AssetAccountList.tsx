import { formatCurrency } from '@/lib/format';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Account {
    id: string;
    name: string;
    type: string;
    currency: string;
    balance: number;
}

interface AssetAccountListProps {
    accounts: Account[];
    type: string;
    onRefresh: () => void;
    onSelect: (account: Account) => void;
}

export function AssetAccountList({ accounts, type, onRefresh, onSelect }: AssetAccountListProps) {
    const [loading, setLoading] = useState(false);

    async function handleDelete(id: string) {
        if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;

        try {
            setLoading(true);
            await api.delete(`/office/finance/accounts/${id}`);
            toast.success('Hesap silindi');
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || 'Silinemedi');
        } finally {
            setLoading(false);
        }
    }

    const filtered = accounts.filter(a => a.type === type);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(acc => (
                <div key={acc.id} className="bg-white border hover:border-indigo-300 transition-colors rounded-xl p-5 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">{acc.name}</h3>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">{acc.currency}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex bg-gray-50 rounded-lg p-1 border">
                            <button onClick={() => handleDelete(acc.id)} className="p-1 hover:text-red-500 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className={`text-2xl font-black ${acc.balance < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                            {formatCurrency(acc.balance, acc.currency)}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Güncel Bakiye</p>
                    </div>

                    <div className="mt-4 pt-4 border-t w-full">
                        <button
                            onClick={() => onSelect(acc)}
                            className="w-full py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-600 text-sm font-bold rounded-lg transition-colors"
                        >
                            Hareketleri Gör
                        </button>
                    </div>
                </div>
            ))}

            {/* Empty State / Add New Placeholder (handled by parent usually, but we can have empty msg) */}
            {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                    Bu kategoride hesap bulunamadı.
                </div>
            )}
        </div>
    );
}
