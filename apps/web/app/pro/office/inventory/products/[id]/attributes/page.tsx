
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';

export default function ServiceAttributesPage() {
    const { id } = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [selectedAttrId, setSelectedAttrId] = useState<string | null>(null);

    const [attrForm, setAttrForm] = useState({ name: '', type: 'select', is_required: true, order_index: 0 });
    const [optionForm, setOptionForm] = useState({ label: '', price_impact: 0, impact_type: 'fixed' });

    // 1. Fetch Template (Attributes + Product Info)
    const { data: template, isLoading } = useQuery({
        queryKey: ['service-template', id],
        queryFn: async () => {
            const res = await api.get(`/office/services/${id}/template`);
            if (res.error) throw new Error(res.error);
            return res.data;
        }
    });

    const attributes = template?.attributes || [];
    const product = template?.product || {};

    async function handleAddAttribute(e: React.FormEvent) {
        e.preventDefault();
        try {
            await api.post(`/office/services/${id}/attributes`, attrForm);
            toast.success('Özellik eklendi');
            setIsAttrModalOpen(false);
            setAttrForm({ name: '', type: 'select', is_required: true, order_index: attributes.length });
            queryClient.invalidateQueries({ queryKey: ['service-template', id] });
        } catch (err: any) {
            toast.error(err.message || 'Hata oluştu');
        }
    }

    async function handleAddOption(e: React.FormEvent) {
        e.preventDefault();
        try {
            await api.post(`/office/services/attributes/${selectedAttrId}/options`, optionForm);
            toast.success('Seçenek/Kural eklendi');
            setIsOptionModalOpen(false);
            setOptionForm({ label: '', price_impact: 0, impact_type: 'fixed' });
            queryClient.invalidateQueries({ queryKey: ['service-template', id] });
        } catch (err: any) {
            toast.error(err.message || 'Hata oluştu');
        }
    }

    async function handleDeleteAttr(attrId: string) {
        if (!confirm('Bu özelliği ve tüm seçeneklerini silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/office/services/attributes/${attrId}`);
            toast.success('Özellik silindi');
            queryClient.invalidateQueries({ queryKey: ['service-template', id] });
        } catch (err: any) {
            toast.error('Silme işlemi başarısız');
        }
    }

    async function handleDeleteOption(optionId: string) {
        try {
            await api.delete(`/office/services/options/${optionId}`);
            toast.success('Seçenek silindi');
            queryClient.invalidateQueries({ queryKey: ['service-template', id] });
        } catch (err: any) {
            toast.error('Silme işlemi başarısız');
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header Area */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100/20 border border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">{product.name || 'Hizmet Kuralları'}</h1>
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Akıllı Fiyat</span>
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Baz Fiyat: <span className="text-indigo-600">{product.price} {product.unit === 'pcs' ? 'TL/Adet' : 'TL'}</span></p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAttrModalOpen(true)}
                    className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-gray-800 transition-all shadow-xl active:scale-95 uppercase tracking-widest flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    YENİ ÖZELLİK EKLE
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
            ) : attributes.length === 0 ? (
                <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2.5rem] p-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic mb-2">Henüz kural tanımlanmamış</h2>
                    <p className="text-gray-400 text-sm font-medium max-w-sm mx-auto">Bu hizmet için fiyatı etkileyen seçenekler veya kurallar eklemek için yukarıdaki butonu kullanın.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {attributes.map((attr: any) => (
                        <div key={attr.id} className="group bg-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all border border-gray-100 overflow-hidden flex flex-col">
                            <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center group-hover:bg-white transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${attr.type === 'select' ? 'bg-blue-100 text-blue-600' :
                                            attr.type === 'number' ? 'bg-amber-100 text-amber-600' :
                                                attr.type === 'boolean' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {attr.type.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-gray-900 uppercase tracking-tight">{attr.name}</h3>
                                            {attr.is_required && <span className="text-[8px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded tracking-widest uppercase">Zorunlu</span>}
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{attr.type === 'select' ? 'Seçmeli Liste' : attr.type === 'number' ? 'Sayısal Giriş' : attr.type === 'boolean' ? 'Onay Kutusu' : 'Metin Alanı'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDeleteAttr(attr.id)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 flex-1 space-y-3">
                                {attr.options?.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4 italic">Kural Tanımlanmamış</p>
                                        <button
                                            onClick={() => { setSelectedAttrId(attr.id); setOptionForm({ ...optionForm, label: attr.name + (attr.type === 'number' ? ' Birim Fiyat' : '') }); setIsOptionModalOpen(true); }}
                                            className="text-[10px] font-black uppercase tracking-widest py-2 px-4 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                                        >
                                            + {attr.type === 'number' ? 'KURAL EKLE' : 'SEÇENEK EKLE'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {attr.options.map((opt: any) => (
                                            <div key={opt.id} className="group/opt flex justify-between items-center p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-800 text-sm">{opt.label}</span>
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{opt.impact_type} ETKİ</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl ${opt.price_impact >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {opt.price_impact > 0 ? '+' : ''}
                                                        {opt.impact_type === 'multiplier' ? `x${opt.price_impact}` : opt.impact_type === 'percentage' ? `%${opt.price_impact}` : `${opt.price_impact} TL`}
                                                        {opt.impact_type === 'per_unit' && ' / birim'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteOption(opt.id)}
                                                        className="opacity-0 group-hover/opt:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {attr.type === 'select' && (
                                            <button
                                                onClick={() => { setSelectedAttrId(attr.id); setIsOptionModalOpen(true); }}
                                                className="w-full py-3 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-black text-gray-400 hover:border-indigo-200 hover:text-indigo-600 transition-all uppercase tracking-widest"
                                            >
                                                + SEÇENEK EKLE
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Components */}
            {isAttrModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-10 transform scale-100 transition-all border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Yeni Özellik</h2>
                            <button onClick={() => setIsAttrModalOpen(false)} className="text-gray-400 hover:text-gray-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleAddAttribute} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Özellik Adı</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Örn: Oda Sayısı, Alan (m2), Malzeme Tipi..."
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                                    value={attrForm.name}
                                    onChange={e => setAttrForm({ ...attrForm, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Giriş Tipi</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['select', 'number', 'boolean', 'text'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setAttrForm({ ...attrForm, type: t })}
                                            className={`py-4 rounded-2xl font-black text-xs uppercase tracking-tight transition-all border-2 ${attrForm.type === t ? 'bg-black text-white border-black shadow-lg scale-[1.02]' : 'bg-gray-50 text-gray-400 border-gray-50 hover:bg-gray-100'}`}
                                        >
                                            {t === 'select' ? 'Seçmeli' : t === 'number' ? 'Sayısal' : t === 'boolean' ? 'Onay Kutusu' : 'Metin'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                                <input
                                    type="checkbox"
                                    id="req"
                                    checked={attrForm.is_required}
                                    onChange={e => setAttrForm({ ...attrForm, is_required: e.target.checked })}
                                    className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black"
                                />
                                <label htmlFor="req" className="text-xs font-black text-gray-600 uppercase tracking-widest cursor-pointer">Bu alan zorunlu olsun</label>
                            </div>
                            <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest mt-4">
                                ÖZELLİĞİ OLUŞTUR
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isOptionModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-10 transform scale-100 transition-all border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Kural Tanımla</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Seçenek veya Fiyat Hesaplama Kuralı</p>
                            </div>
                            <button onClick={() => setIsOptionModalOpen(false)} className="text-gray-400 hover:text-gray-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <form onSubmit={handleAddOption} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kural/Seçenek Etiketi</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Örn: 300gr Kuşe, Ekstra Kat Fiyatı..."
                                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                                    value={optionForm.label}
                                    onChange={e => setOptionForm({ ...optionForm, label: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Etki Değeri</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-black text-xl"
                                        value={optionForm.price_impact}
                                        onChange={e => setOptionForm({ ...optionForm, price_impact: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">HESAPLAMA Türü</label>
                                    <select
                                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold appearance-none"
                                        value={optionForm.impact_type}
                                        onChange={e => setOptionForm({ ...optionForm, impact_type: e.target.value as any })}
                                    >
                                        <option value="fixed">Sabit TL</option>
                                        <option value="percentage">Yüzde (%)</option>
                                        <option value="per_unit">Birimle Çarp (+ x Adet)</option>
                                        <option value="multiplier">Çarpan (x Kat)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div className="text-[10px] font-bold text-indigo-900 leading-relaxed uppercase">
                                    {optionForm.impact_type === 'fixed' && 'Seçilen değer toplam fiyata doğrudan eklenir.'}
                                    {optionForm.impact_type === 'percentage' && 'Seçilen değer ara toplam üzerinden yüzde olarak hesaplanır.'}
                                    {optionForm.impact_type === 'per_unit' && 'Girilen değer, kullanıcının girdiği adet/sayı ile çarpılarak eklenir.'}
                                    {optionForm.impact_type === 'multiplier' && 'Tüm ara toplam bu değer ile çarpılarak final birim fiyatı belirlenir.'}
                                </div>
                            </div>

                            <button type="submit" className="w-full py-6 bg-black text-white rounded-3xl font-black text-sm shadow-xl hover:bg-gray-800 transition-all uppercase tracking-widest mt-4">
                                KURALI KAYDET
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

