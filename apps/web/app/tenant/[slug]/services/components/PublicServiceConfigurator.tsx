
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ServiceAttribute {
    id: string;
    name: string;
    type: 'select' | 'boolean' | 'number' | 'text';
    is_required: boolean;
    options: {
        id: string;
        label: string;
        price_impact: number;
        impact_type: 'fixed' | 'percentage' | 'multiplier' | 'per_unit';
    }[];
}

interface PublicServiceConfiguratorProps {
    productId: string;
    primaryColor: string;
}

export function PublicServiceConfigurator({ productId, primaryColor }: PublicServiceConfiguratorProps) {
    const [template, setTemplate] = useState<ServiceAttribute[]>([]);
    const [config, setConfig] = useState<Record<string, any>>({});
    const [quantity, setQuantity] = useState(1);
    const [priceResult, setPriceResult] = useState({ unitPrice: 0, totalPrice: 0 });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [contact, setContact] = useState({ name: '', phone: '', email: '', note: '' });

    // 1. Load Template
    useEffect(() => {
        async function load() {
            setLoading(true);
            const res = await api.get(`/public/services/${productId}/template`, { skipAuth: true });
            if (res.data?.attributes) {
                setTemplate(res.data.attributes);
                const initial: Record<string, any> = {};
                res.data.attributes.forEach((attr: any) => {
                    if (attr.type === 'select' && attr.options.length > 0) {
                        initial[attr.name] = attr.options[0].label;
                    } else if (attr.type === 'boolean') {
                        initial[attr.name] = false;
                    } else if (attr.type === 'number') {
                        initial[attr.name] = attr.min_value || 0;
                    }
                });
                setConfig(initial);
            }
            setLoading(false);
        }
        load();
    }, [productId]);

    // 2. Real-time Price Calculation
    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                // Sanitize config a bit before sending
                const cleanConfig = { ...config };
                Object.keys(cleanConfig).forEach(key => {
                    if (typeof cleanConfig[key] === 'number' && isNaN(cleanConfig[key])) {
                        cleanConfig[key] = 0;
                    }
                });

                const res = await api.post(`/public/services/${productId}/calculate`, {
                    config: cleanConfig,
                    quantity
                }, { skipAuth: true });
                if (res.data) setPriceResult(res.data);
            } catch (err) {
                console.error('Calculation failed', err);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [config, quantity, productId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Note: Creating a Quote request as an Order with 'new' status
            // In a real production app, we would use a dedicated 'quotes' or 'leads' table
            // But for this MVP, we leverage the existing order infrastructure.
            const payload = {
                items: [{
                    product_id: productId,
                    quantity,
                    unit_price: priceResult.unitPrice,
                    total_price: priceResult.totalPrice,
                    config_json: config,
                    is_service: true
                }],
                customer_info: contact,
                source: 'web_quote',
                status: 'new',
                payment_status: 'unpaid'
            };

            const res = await api.post('/public/checkout', payload, { skipAuth: true });
            if (res.error) throw new Error(res.error);

            toast.success('Teklif talebiniz başarıyla alındı! En kısa sürede sizinle iletişime geçeceğiz.');
            setContact({ name: '', phone: '', email: '', note: '' });
        } catch (err: any) {
            toast.error('Talep iletilemedi: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-12 text-center font-black text-gray-300 animate-pulse uppercase tracking-[0.2em]">Konfigüratör Yükleniyor...</div>;

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Configuration */}
            <div className="lg:col-span-7 space-y-10">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-100 border border-gray-50 space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black italic" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>1</div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Hizmet Seçenekleri</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {template.map((attr) => (
                            <div key={attr.id} className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                    {attr.name} {attr.is_required && <span className="text-red-500">*</span>}
                                </label>

                                {attr.type === 'select' && (
                                    <select
                                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 outline-none focus:bg-white transition-all font-bold text-gray-800"
                                        style={{ focusBorderColor: primaryColor } as any}
                                        value={config[attr.name] || ''}
                                        onChange={(e) => setConfig({ ...config, [attr.name]: e.target.value })}
                                    >
                                        {attr.options.map(opt => (
                                            <option key={opt.id} value={opt.label}>
                                                {opt.label} {opt.price_impact !== 0 && ` (${opt.impact_type === 'multiplier' ? 'x' : '+'} ${opt.price_impact})`}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {attr.type === 'number' && (
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 outline-none focus:bg-white transition-all font-black"
                                        style={{ focusBorderColor: primaryColor } as any}
                                        value={config[attr.name] || ''}
                                        onChange={(e) => setConfig({ ...config, [attr.name]: Number(e.target.value) })}
                                    />
                                )}

                                {attr.type === 'boolean' && (
                                    <div
                                        onClick={() => setConfig({ ...config, [attr.name]: !config[attr.name] })}
                                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${config[attr.name] ? 'bg-white' : 'border-gray-50 bg-gray-50 text-gray-400'}`}
                                        style={config[attr.name] ? { borderColor: primaryColor } : {}}
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${config[attr.name] ? 'text-white' : 'border-gray-300'}`} style={config[attr.name] ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>
                                            {config[attr.name] && '✓'}
                                        </div>
                                        <span className="text-sm font-black uppercase italic">{attr.name}</span>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">MİKTAR</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 outline-none focus:bg-white transition-all font-black text-xl"
                                style={{ focusBorderColor: primaryColor } as any}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-100 border border-gray-50 space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-gray-600 font-black italic" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>2</div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">İletişim Bilgileriniz</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">AD SOYAD / FİRMA</label>
                            <input required value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 outline-none focus:bg-white transition-all font-bold" style={{ focusBorderColor: primaryColor } as any} />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">TELEFON</label>
                            <input required value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 outline-none focus:bg-white transition-all font-bold" style={{ focusBorderColor: primaryColor } as any} />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NOTLAR / ÖZEL İSTEKLER</label>
                            <textarea rows={3} value={contact.note} onChange={e => setContact({ ...contact, note: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 outline-none focus:bg-white transition-all font-bold" style={{ focusBorderColor: primaryColor } as any} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Price & Summary */}
            <div className="lg:col-span-5">
                <div className="sticky top-8 space-y-6">
                    <div className="rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group" style={{ backgroundColor: primaryColor, boxShadow: `0 20px 40px -10px ${primaryColor}40` }}>
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>

                        <div className="relative z-10 space-y-8">
                            <div className="pb-8 border-b border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 block mb-2">TAHMİNİ BİRİM FİYAT</span>
                                <div className="text-4xl font-black italic tracking-tighter">
                                    {priceResult.unitPrice.toLocaleString('tr-TR')} <span className="text-xl">TL</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">TOPLAM TUTAR</span>
                                    <div className="text-5xl font-black italic tracking-tighter leading-none">
                                        {priceResult.totalPrice.toLocaleString('tr-TR')} <span className="text-2xl">TL</span>
                                    </div>
                                </div>
                                <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest text-right">* Fiyatlar vergi ve kargo hariç tahmini tutarlardır.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-white py-6 rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                                style={{ color: primaryColor }}
                            >
                                {submitting ? 'GÖNDERİLİYOR...' : 'TEKLİF TALEBİ GÖNDER'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4">
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-50 pb-4">Nasıl Çalışır?</h4>
                        <div className="space-y-4 pt-2">
                            {[
                                { t: 'Konfigüre Et', d: 'Seçenekleri ihtiyacınıza göre belirleyin.' },
                                { t: 'Teklif Al', d: 'Bilgilerinizi girin ve talebinizi iletin.' },
                                { t: 'Onay & Üretim', d: 'Talebiniz incelenir ve sipariş süreci başlar.' }
                            ].map((step, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black" style={{ color: primaryColor }}>{idx + 1}</div>
                                    <div className="flex-1">
                                        <div className="text-xs font-black text-gray-800 uppercase tracking-tight">{step.t}</div>
                                        <p className="text-[10px] text-gray-400 font-medium">{step.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
