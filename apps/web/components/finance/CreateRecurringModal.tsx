
import { Modal } from '@/components/ui/Modal';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CreateRecurringModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateRecurringModal({ isOpen, onClose, onSuccess }: CreateRecurringModalProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [day, setDay] = useState('1');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/office/finance/payables/recurring', {
                name,
                type: 'expense',
                recurrence_period: period,
                day_of_month: Number(day),
                amount: amount ? Number(amount) : null,
                next_due_date: startDate, // Initial next due date
                active: true
            });
            toast.success('Düzenli ödeme tanımlandı');
            onSuccess();
            onClose();
            setName('');
            setAmount('');
        } catch (error: any) {
            toast.error(error.message || 'Hata oluştu');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Düzenli Ödeme Tanımla">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Ödeme Adı</label>
                    <input
                        type="text"
                        required
                        placeholder="Örn: Kira, Elektrik, Personel Maaşı..."
                        className="w-full border rounded-lg p-2 mt-1"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tutar (Opsiyonel)</label>
                    <input
                        type="number"
                        placeholder="Değişken ise boş bırakın"
                        className="w-full border rounded-lg p-2 mt-1"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">Sabit bir tutar ise giriniz.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Periyot</label>
                        <select
                            className="w-full border rounded-lg p-2 mt-1 bg-white"
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                        >
                            <option value="monthly">Aylık</option>
                            <option value="weekly">Haftalık</option>
                            <option value="yearly">Yıllık</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Günü</label>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            required
                            className="w-full border rounded-lg p-2 mt-1"
                            value={day}
                            onChange={e => setDay(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Başlangıç (İlk Ödeme)</label>
                    <input
                        type="date"
                        required
                        className="w-full border rounded-lg p-2 mt-1"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </div>
                <div className="pt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">İptal</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
