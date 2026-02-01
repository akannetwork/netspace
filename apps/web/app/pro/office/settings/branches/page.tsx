
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Branch {
    id: string;
    name: string;
    type: string;
    address?: string;
    phone?: string;
    is_active: boolean;
}

export default function BranchesPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [form, setForm] = useState({ name: '', type: 'store', address: '', phone: '', is_active: true });

    // 1. Fetch Branches
    const branchesQuery = useQuery({
        queryKey: ['settings-branches'],
        queryFn: async () => {
            const res = await api.get('/office/branches');
            if (res.error) throw new Error(res.error);
            return res.data as Branch[];
        }
    });

    const branches = branchesQuery.data || [];
    const isLoading = branchesQuery.isLoading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingBranch) {
                await api.put(`/office/branches/${editingBranch.id}`, form);
                toast.success('Şube güncellendi');
            } else {
                await api.post('/office/branches', form);
                toast.success('Şube başarıyla oluşturuldu');
            }
            setIsModalOpen(false);
            setEditingBranch(null);
            setForm({ name: '', type: 'store', address: '', phone: '', is_active: true });
            queryClient.invalidateQueries({ queryKey: ['settings-branches'] });
            // Also invalidate general branch context if necessary
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        } catch (err: any) {
            toast.error(err.message || 'İşlem başarısız');
        }
    }

    async function handleEdit(branch: Branch) {
        setEditingBranch(branch);
        setForm({
            name: branch.name,
            type: branch.type,
            address: branch.address || '',
            phone: branch.phone || '',
            is_active: branch.is_active
        });
        setIsModalOpen(true);
    }

    async function handleDelete(id: string) {
        if (!confirm('Bu şubeyi silmek istediğinize emin misiniz? Bu işlem stok verilerini etkileyebilir.')) return;
        try {
            await api.delete(`/office/branches/${id}`);
            toast.success('Şube silindi');
            queryClient.invalidateQueries({ queryKey: ['settings-branches'] });
        } catch (err: any) {
            toast.error(err.message || 'Silme başarısız');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 font-serif tracking-tight">Şube Yönetimi</h1>
                <button
                    onClick={() => {
                        setEditingBranch(null);
                        setForm({ name: '', type: 'store', address: '', phone: '', is_active: true });
                        setIsModalOpen(true);
                    }}
                    className="button fit-content button-primary h-10 px-4 flex items-center gap-2"
                >
                    + Yeni Şube Ekle
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <DataTable
                    columns={[
                        { header: 'Şube Adı', accessorKey: 'name', className: 'font-bold text-gray-900' },
                        {
                            header: 'Tip',
                            accessorKey: 'type',
                            render: (b) => (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${b.type === 'hq' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {b.type === 'hq' ? 'Merkez' : 'Mağaza/Depo'}
                                </span>
                            )
                        },
                        { header: 'Telefon', accessorKey: 'phone' },
                        {
                            header: 'Durum',
                            render: (b) => (
                                <span className={b.is_active ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                    {b.is_active ? 'Aktif' : 'Pasif'}
                                </span>
                            )
                        },
                        {
                            header: 'İşlemler',
                            render: (b) => (
                                <div className="flex justify-end gap-3 text-[10px] font-black uppercase tracking-widest">
                                    <button onClick={() => handleEdit(b)} className="text-indigo-600 hover:text-indigo-800">Düzenle</button>
                                    <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:text-red-800">Sil</button>
                                </div>
                            )
                        }
                    ]}
                    data={branches}
                    keyField="id"
                    loading={isLoading}
                    emptyMessage="Henüz şube Tanımlanmamış."
                />
            </div>

            {/* Branch Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 font-serif">
                                {editingBranch ? 'Şubeyi Düzenle' : 'Yeni Şube Ekle'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Şube Adı</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Tip</label>
                                    <select
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                    >
                                        <option value="store">Mağaza</option>
                                        <option value="warehouse">Depo</option>
                                        <option value="hq">Merkez Ofis</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Telefon</label>
                                    <input
                                        type="tel"
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Adres</label>
                                    <textarea
                                        rows={2}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                        value={form.address}
                                        onChange={e => setForm({ ...form, address: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={form.is_active}
                                        onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer">Bu şube aktif olarak kullanılsın</label>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                                >
                                    {editingBranch ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
