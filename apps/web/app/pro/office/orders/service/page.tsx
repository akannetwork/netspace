
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';
import { ServiceConfigurator } from '@/components/office/ServiceConfigurator';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface CartItem {
    id: string; // unique cart id
    product_id: string;
    name: string;
    config: any;
    price: number;
    quantity: number;
}

export default function ServiceOrderPage() {
    const { currentBranch } = useBranch();
    const router = useRouter();

    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [configuringProduct, setConfiguringProduct] = useState<any>(null);

    // 1. Fetch Services
    const servicesQuery = useQuery({
        queryKey: ['services-list'],
        queryFn: async () => {
            const res = await api.get('/office/products?product_type=service');
            if (res.error) throw new Error(res.error);
            return (res.data || []) as any[];
        }
    });

    // 2. Fetch Contacts
    const contactsQuery = useQuery({
        queryKey: ['contacts-lite'],
        queryFn: async () => {
            const res = await api.get('/office/contacts?limit=100');
            if (res.error) throw new Error(res.error);
            return (res.data || []) as any[];
        }
    });

    const services = Array.isArray(servicesQuery.data) ? servicesQuery.data : (servicesQuery.data as any)?.data || [];
    const contacts = Array.isArray(contactsQuery.data) ? contactsQuery.data : (contactsQuery.data as any)?.data || [];

    function addToCart(config: any, price: number, quantity: number) {
        const newItem: CartItem = {
            id: Math.random().toString(36).substr(2, 9),
            product_id: configuringProduct.id,
            name: configuringProduct.name,
            config,
            price,
            quantity
        };
        setCart([...cart, newItem]);
        setConfiguringProduct(null);
        toast.success(`${configuringProduct.name} sepete eklendi`);
    }

    async function submitOrder() {
        if (!selectedContact) return toast.error('Lütfen bir müşteri seçin');
        if (cart.length === 0) return toast.error('Sepetiniz boş');

        try {
            const res = await api.post('/office/orders', {
                contact_id: selectedContact.id,
                branch_id: currentBranch?.id,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price / item.quantity, // unit price
                    title: item.name,
                    configuration: item.config
                })),
                status: 'new'
            });

            if (res.error) throw new Error(res.error);

            toast.success('Hizmet siparişi başarıyla oluşturuldu');
            router.push('/pro/office/orders');
        } catch (err: any) {
            toast.error(err.message || 'Sipariş oluşturulamadı');
        }
    }

    const totalCartPrice = cart.reduce((sum, item) => sum + item.price, 0);

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex gap-6">
            {/* Left: Selection */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Müşteri Seçimi</label>
                    <select
                        className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold"
                        value={selectedContact?.id || ''}
                        onChange={(e) => setSelectedContact(contacts.find((c: any) => c.id === e.target.value))}
                    >
                        <option value="">İsim veya Telefon ile Seç...</option>
                        {contacts.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                    </select>
                </div>

                <div className="bg-white flex-1 p-6 rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Hizmet Kataloğu</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
                        {services.map((s: any) => (
                            <div
                                key={s.id}
                                onClick={() => setConfiguringProduct(s)}
                                className="group p-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50/20 cursor-pointer transition-all flex flex-col items-center text-center gap-2"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-indigo-100 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </div>
                                <span className="font-bold text-gray-800 text-sm leading-tight">{s.name}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Özelleştir</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Cart */}
            <div className="w-96 flex flex-col gap-6">
                <div className="bg-gray-900 text-white flex-1 p-6 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative border border-gray-800">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -z-10"></div>

                    <h3 className="text-xl font-bold font-serif mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">🛒</span>
                        Sipariş Sepeti
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-6">
                                <span className="text-4xl mb-4">✨</span>
                                <p className="text-sm font-bold uppercase tracking-widest">Sepetiniz Boş</p>
                                <p className="text-xs mt-2 italic">Soldan bir hizmet seçerek başlayın</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl group hover:bg-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-sm text-indigo-400">{item.name}</span>
                                        <button
                                            onClick={() => setCart(cart.filter(i => i.id !== item.id))}
                                            className="text-white/30 hover:text-red-400"
                                        >×</button>
                                    </div>
                                    <div className="text-[10px] text-white/50 space-y-0.5">
                                        {Object.entries(item.config).map(([k, v]) => (
                                            <div key={k}>{k}: <span className="text-white/80 font-bold">{String(v)}</span></div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex justify-between items-end border-t border-white/10 pt-3">
                                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{item.quantity} ADET</span>
                                        <span className="font-black text-white">{item.price.toLocaleString('tr-TR')} TL</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-black uppercase tracking-widest opacity-50">TOPLAM</span>
                            <span className="text-3xl font-black">{totalCartPrice.toLocaleString('tr-TR')} TL</span>
                        </div>
                        <button
                            onClick={submitOrder}
                            disabled={cart.length === 0}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                        >
                            Siparişi Tamamla
                        </button>
                    </div>
                </div>
            </div>

            {/* Configurator Modal */}
            {configuringProduct && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-4xl h-[90vh]">
                        <ServiceConfigurator
                            productId={configuringProduct.id}
                            onAdd={addToCart}
                            onCancel={() => setConfiguringProduct(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
