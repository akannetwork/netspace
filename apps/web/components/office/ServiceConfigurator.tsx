
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

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

interface ServiceConfiguratorProps {
    productId: string;
    onAdd: (config: any, price: number, quantity: number) => void;
    onCancel: () => void;
}

export function ServiceConfigurator({ productId, onAdd, onCancel }: ServiceConfiguratorProps) {
    const [template, setTemplate] = useState<ServiceAttribute[]>([]);
    const [config, setConfig] = useState<Record<string, any>>({});
    const [quantity, setQuantity] = useState(1);
    const [priceResult, setPriceResult] = useState({ unitPrice: 0, totalPrice: 0 });
    const [loading, setLoading] = useState(true);

    // 1. Load Template
    useEffect(() => {
        async function load() {
            setLoading(true);
            const res = await api.get(`/office/services/${productId}/template`);
            if (res.data?.attributes) {
                setTemplate(res.data.attributes);
                // Initialize default config
                const initial: Record<string, any> = {};
                res.data.attributes.forEach((attr: any) => {
                    if (attr.type === 'select' && attr.options.length > 0) {
                        initial[attr.name] = attr.options[0].label;
                    } else if (attr.type === 'boolean') {
                        initial[attr.name] = false;
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
        if (Object.keys(config).length === 0) return;

        const timer = setTimeout(async () => {
            try {
                const res = await api.post(`/office/services/${productId}/calculate`, {
                    config,
                    quantity
                });
                if (res.data) {
                    setPriceResult(res.data);
                }
            } catch (err) {
                console.error('Calculation failed', err);
            }
        }, 300); // Debounce

        return () => clearTimeout(timer);
    }, [config, quantity, productId]);

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Hizmet detayları yükleniyor...</div>;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                <h2 className="text-xl font-bold text-gray-900 font-serif">Hizmet Konfigürasyonu</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Lütfen sipariş detaylarını belirtin</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {template.map((attr) => (
                        <div key={attr.id} className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                                {attr.name} {attr.is_required && <span className="text-red-500">*</span>}
                            </label>

                            {attr.type === 'select' && (
                                <select
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all bg-white font-medium"
                                    value={config[attr.name] || ''}
                                    onChange={(e) => setConfig({ ...config, [attr.name]: e.target.value })}
                                >
                                    {attr.options.map(opt => (
                                        <option key={opt.id} value={opt.label}>
                                            {opt.label} {opt.price_impact !== 0 && (
                                                ` (${opt.impact_type === 'percentage' ? '%' :
                                                    opt.impact_type === 'multiplier' ? 'x' :
                                                        opt.impact_type === 'per_unit' ? '+ ' : '+'} ${opt.price_impact}${opt.impact_type === 'per_unit' ? '/birim' : ''})`
                                            )}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {attr.type === 'number' && (
                                <input
                                    type="number"
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-mono"
                                    value={config[attr.name] || ''}
                                    onChange={(e) => setConfig({ ...config, [attr.name]: Number(e.target.value) })}
                                />
                            )}

                            {attr.type === 'boolean' && (
                                <div
                                    onClick={() => setConfig({ ...config, [attr.name]: !config[attr.name] })}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${config[attr.name] ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-100'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${config[attr.name] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'}`}>
                                        {config[attr.name] && '✓'}
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{attr.name} İstiyorum</span>
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">MİKTAR (ADET)</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-mono text-lg font-bold"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-end">
                    <div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Birim Fiyat</span>
                        <span className="text-xl font-bold text-gray-900">{priceResult.unitPrice.toLocaleString('tr-TR')} TL</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block mb-1">Toplam Tutar</span>
                        <span className="text-3xl font-black text-indigo-600">{priceResult.totalPrice.toLocaleString('tr-TR')} TL</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-white transition-all text-gray-500"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => onAdd(config, priceResult.totalPrice, quantity)}
                        className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                    >
                        Sepete Ekle
                    </button>
                </div>
            </div>
        </div>
    );
}
