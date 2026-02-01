'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function CategoryPage() {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeType, setActiveType] = useState<'product' | 'material' | 'service'>('product');

    const { data, isLoading } = useQuery({
        queryKey: ['categories', activeType],
        queryFn: async () => {
            const res = await api.get(`/office/categories?type=${activeType}`);
            return res.data || [];
        }
    });

    const categories = data || [];

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/office/categories', { name, type: activeType });
            setName('');
            await queryClient.invalidateQueries({ queryKey: ['categories'] });
        } catch (err) {
            alert('Failed to add category');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete category?')) return;
        try {
            await api.delete(`/office/categories/${id}`);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        } catch (err) {
            alert('Failed delete');
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-12">
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-4xl font-black text-gray-900 italic tracking-tighter uppercase">Categories</h1>

                <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
                    <button
                        onClick={() => setActiveType('product')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeType === 'product' ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        ÜRÜNLER
                    </button>
                    <button
                        onClick={() => setActiveType('material')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeType === 'material' ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        MALZEMELER
                    </button>
                    <button
                        onClick={() => setActiveType('service')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeType === 'service' ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        HİZMETLER
                    </button>
                </div>
            </div>

            <form onSubmit={handleAdd} className="flex gap-4 mb-12 bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                <input
                    className="bg-gray-50 border-0 p-4 rounded-2xl flex-1 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder={`${activeType.toUpperCase()} Kategori Adı...`}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
                <button disabled={loading} className="bg-black text-white px-10 rounded-2xl font-black text-sm hover:bg-gray-800 transition-all shadow-lg active:scale-95">
                    {loading ? 'EKLENİYOR...' : 'EKLE'}
                </button>
            </form>

            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-20 text-center font-black text-gray-300 italic animate-pulse">KATEGORİLER YÜKLENİYOR...</div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {categories.map((c: any) => (
                            <li key={c.id} className="p-6 flex justify-between items-center group hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <span className="font-bold text-gray-800">{c.name}</span>
                                </div>
                                <button onClick={() => handleDelete(c.id)} className="text-pink-400 font-bold text-xs opacity-0 group-hover:opacity-100 hover:text-pink-600 transition-all uppercase tracking-widest">SİL</button>
                            </li>
                        ))}
                        {categories.length === 0 && (
                            <li className="p-20 text-center">
                                <div className="text-gray-300 font-black italic mb-2 uppercase tracking-widest">Henüz Kategori Yok</div>
                                <p className="text-gray-400 text-sm font-medium italic">Bu bölüme ait ilk kategoriyi yukarıdaki formdan oluşturun.</p>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}
