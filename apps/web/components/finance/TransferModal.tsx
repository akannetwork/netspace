import { Modal } from '@/components/ui/Modal';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    accounts: any[]; // List of available accounts
}

export function TransferModal({ isOpen, onClose, onSuccess, accounts }: TransferModalProps) {
    const [loading, setLoading] = useState(false);

    const [fromAccount, setFromAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [description, setDescription] = useState('');

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setFromAccount('');
            setToAccount('');
            setAmount('');
            setDescription('');
        }
    }, [isOpen]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!fromAccount || !toAccount) {
            return toast.error('Lütfen kaynak ve hedef hesapları seçiniz');
        }
        if (fromAccount === toAccount) {
            return toast.error('Aynı hesaba transfer yapılamaz');
        }
        if (!amount || Number(amount) <= 0) {
            return toast.error('Geçerli bir tutar giriniz');
        }

        try {
            setLoading(true);
            await api.post('/office/finance/transfer', {
                fromAccountId: fromAccount,
                toAccountId: toAccount,
                amount: Number(amount),
                description: description || 'Hesaplar Arası Transfer'
            });
            toast.success('Transfer başarılı');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Transfer başarısız');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Para Transferi / Virman">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kaynak Hesap (Gönderen)</label>
                        <select
                            className="w-full border rounded-lg p-2 mt-1 bg-white"
                            value={fromAccount}
                            onChange={e => setFromAccount(e.target.value)}
                        >
                            <option value="">-- Seçiniz --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.balance} {acc.currency})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hedef Hesap (Alan)</label>
                        <select
                            className="w-full border rounded-lg p-2 mt-1 bg-white"
                            value={toAccount}
                            onChange={e => setToAccount(e.target.value)}
                        >
                            <option value="">-- Seçiniz --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.currency})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Tutar</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            className="w-full border rounded-lg p-2 mt-1"
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                        />
                        {/* We could show currency symbol if Account selected, but let's keep simple */}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                    <input
                        type="text"
                        className="w-full border rounded-lg p-2 mt-1"
                        placeholder="Örn: Kasa Gün Sonu Devri"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition disabled:opacity-50"
                    >
                        {loading ? 'Transferi Tamamla' : 'Transfer Yap'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
