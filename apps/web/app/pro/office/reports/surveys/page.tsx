'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function SurveyReportPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await api.get('/office/surveys/report');
                setReports(res.data);
            } catch (err) {
                console.error('Failed to load reports', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const averageScore = reports.length > 0
        ? reports.reduce((acc, r) => acc + r.score, 0) / reports.length
        : 0;

    if (loading) return <div className="p-10 text-center font-mono uppercase font-black text-gray-400">Raporlar Yükleniyor...</div>;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter">SURVEY <span className="text-indigo-600">INSIGHTS</span></h1>
                    <p className="text-gray-500 font-medium">Müşteri memnuniyet analizleri ve geri bildirimler.</p>
                </div>
                <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl text-center min-w-[200px]">
                    <div className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">Ortalama Puan</div>
                    <div className="text-4xl font-black">{averageScore.toFixed(1)} <span className="text-xl">/ 5.0</span></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <div key={report.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 flex flex-col">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Müşteri</div>
                                <div className="font-bold text-gray-900">{report.contacts?.name || 'Anonim'}</div>
                            </div>
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <span key={s} className={`text-sm ${report.score >= s ? 'text-yellow-400' : 'text-gray-100'}`}>★</span>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-50 p-4 rounded-xl text-sm italic text-gray-700 border border-gray-100">
                            "{report.comment || 'Yorum bırakılmadı.'}"
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                            <div className="text-[10px] font-black text-gray-300 uppercase italic">
                                {new Date(report.completed_at).toLocaleDateString('tr-TR')}
                            </div>
                            <div className="text-[10px] font-black text-indigo-400 uppercase">
                                Sipariş #{report.order_id.split('-')[0]}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {reports.length === 0 && (
                <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase tracking-widest">Henüz tamamlanmış anket bulunmuyor.</p>
                </div>
            )}
        </div>
    );
}
