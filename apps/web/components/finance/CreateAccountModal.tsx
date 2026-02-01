import { Modal } from '@/components/ui/Modal';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CreateAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultType?: string;
}

export function CreateAccountModal({ isOpen, onClose, onSuccess, defaultType = 'cash' }: CreateAccountModalProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState(defaultType);
    const [currency, setCurrency] = useState('TRY');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name) return toast.error('Hesap adı giriniz');

        try {
            setLoading(true);
            await api.post('/office/finance/accounts', {
                name,
                type,
                currency
            });
            toast.success('Hesap oluşturuldu');
            setName('');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Hata oluştu');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Yeni Hesap Oluştur">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Hesap Adı</label>
                    <input
                        type="text"
                        className="w-full border rounded-lg p-2 mt-1"
                        placeholder="Örn: Merkez Kasa, Garanti Bankası..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Hesap Türü</label>
                    <select
                        className="w-full border rounded-lg p-2 mt-1 bg-white"
                        value={type}
                        onChange={e => setType(e.target.value)}
                    >
                        <option value="cash">Nakit Kasa</option>
                        <option value="bank">Banka Hesabı</option>
                        <option value="pos">POS Hesabı (Bloke)</option>
                        <option value="credit_card">Kredi Kartı</option>
                        <option value="check_account">Çek Hesabı</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Para Birimi</label>
                    <select
                        className="w-full border rounded-lg p-2 mt-1 bg-white"
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                    >
                        <option value="TRY">Türk Lirası (TRY)</option>
                        <option value="USD">Amerikan Doları (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="GBP">Sterlin (GBP)</option>
                    </select>
                </div>

                <div className="pt-4 flex justify-end gap-2 text-sm">
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
                        {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
