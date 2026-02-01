'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ImageUpload } from './ImageUpload';
import { useQueryClient } from '@tanstack/react-query';

const UNITS = [
    { value: 'pcs', label: 'Adet' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'gr', label: 'Gram' },
    { value: 'm', label: 'Metre' },
    { value: 'm2', label: 'Metrekare' },
    { value: 'm3', label: 'Metreküp' },
    { value: 'l', label: 'Litre' },
    { value: 'box', label: 'Kutu/Koli' },
    { value: 'set', label: 'Takım' }
];

interface ProductFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function ProductForm({ initialData, isEdit = false }: ProductFormProps) {
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category_id: '',
        description: '',
        price: 0,
        cost_price: 0,
        image_url: '',
        currency: 'TRY',
        unit: 'pcs',
        channels: ['store'] as string[],
        is_active: true,
        track_stock: true,
        product_type: 'product' as 'product' | 'material' | 'service',
        pricing_model: 'standard',
        ...initialData
    });

    useEffect(() => {
        // Load categories based on type
        api.get(`/office/categories?type=${formData.product_type}`).then(res => {
            if (res.data) setCategories(res.data);
        });
    }, [formData.product_type]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleChannelToggle = (channel: string) => {
        setFormData((prev: any) => {
            const exists = prev.channels.includes(channel);
            if (exists) return { ...prev, channels: prev.channels.filter((c: string) => c !== channel) };
            return { ...prev, channels: [...prev.channels, channel] };
        });
    };

    const queryClient = useQueryClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.category_id) delete payload.category_id;

            let res;
            if (isEdit && initialData.id) {
                res = await api.put(`/office/products/${initialData.id}`, payload);
            } else {
                res = await api.post('/office/products', payload);
            }

            if (res.error) throw new Error(res.error);

            // Invalidate cache so the list updates immediately
            await queryClient.invalidateQueries({ queryKey: ['products'] });

            router.push('/office/inventory/products');
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Image */}

                <div className="md:col-span-1">
                    <ImageUpload
                        label="Product Image"
                        value={formData.image_url}
                        onChange={(url) => setFormData((p: any) => ({ ...p, image_url: url }))}
                    />
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input name="name" required value={formData.name} className="border p-2 w-full rounded" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">SKU</label>
                            <input name="sku" value={formData.sku} className="border p-2 w-full rounded" onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Kategori</label>
                            <select name="category_id" value={formData.category_id} className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold" onChange={handleChange}>
                                <option value="">Seçiniz...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Takip Birimi</label>
                            <select name="unit" className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold" value={formData.unit} onChange={handleChange}>
                                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col gap-4">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Kayıt Tipi</label>
                        <div className="flex bg-gray-200/50 p-1.5 rounded-2xl gap-1">
                            {(['product', 'material', 'service'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, product_type: type, category_id: '' })}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-tight ${formData.product_type === type ? 'bg-white shadow-lg text-indigo-600 scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {type === 'product' ? 'Ürün' : type === 'material' ? 'Malzeme' : 'Hizmet'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {formData.product_type === 'service' && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Fiyatlandırma Modeli</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'standard', label: 'Standart', desc: 'Birim Fiyat x Adet' },
                                        { id: 'area_based', label: 'Alan Bazlı', desc: 'G/Y x Birim Fiyat (m2)' },
                                        { id: 'piecewise', label: 'Kademeli', desc: 'Miktara göre değişen fiyat' }
                                    ].map(model => (
                                        <button
                                            key={model.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, pricing_model: model.id })}
                                            className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${formData.pricing_model === model.id ? 'border-indigo-600 bg-white shadow-lg' : 'border-white bg-transparent opacity-60 hover:opacity-100'
                                                }`}
                                        >
                                            <span className="text-xs font-black uppercase tracking-tight">{model.label}</span>
                                            <span className="text-[10px] text-gray-400 leading-tight">{model.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 flex justify-between items-center text-white group overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all"></div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-black uppercase tracking-tighter italic">Akıllı Fiyatlandırma</h3>
                                        <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Alpha</span>
                                    </div>
                                    <p className="text-indigo-100 text-[10px] font-medium uppercase tracking-widest max-w-[200px]">Birim, çarpan ve varyasyon bazlı kuralları yönetin.</p>
                                </div>
                                {isEdit ? (
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/office/inventory/products/${initialData.id}/attributes`)}
                                        className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs hover:bg-gray-100 transition-all shadow-lg active:scale-95 uppercase tracking-widest z-10"
                                    >
                                        Kuralları Yönet
                                    </button>
                                ) : (
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 text-right italic">Önce hizmeti<br />kaydedin</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Satış Fiyatı (TRY)</label>
                            <div className="relative">
                                <input name="price" type="number" step="0.01" value={formData.price} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-black text-xl" onChange={handleChange} />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black italic">₺</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Maliyet Fiyatı (TRY)</label>
                            <div className="relative">
                                <input name="cost_price" type="number" step="0.01" value={formData.cost_price} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-black text-xl" onChange={handleChange} />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black italic">₺</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" rows={3} value={formData.description} className="border p-2 w-full rounded" onChange={handleChange} />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="track_stock"
                            id="track_stock"
                            checked={formData.track_stock}
                            onChange={handleChange}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="track_stock" className="text-sm font-medium text-gray-700">Track Stock Quantity</label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sales Channels</label>
                        <div className="flex gap-4">
                            {['store', 'ecommerce', 'market'].map(ch => (
                                <label key={ch} className="flex items-center gap-2 border px-3 py-1 rounded bg-gray-50 cursor-pointer hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={formData.channels.includes(ch)}
                                        onChange={() => handleChannelToggle(ch)}
                                    />
                                    <span className="capitalize">{ch}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => router.back()} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    {loading ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
                </button>
            </div>
        </form >
    );
}
