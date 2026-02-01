'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function PublicSurveyPage() {
    const { token } = useParams();
    const [survey, setSurvey] = useState<any>(null);
    const [score, setScore] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchSurvey = async () => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            try {
                const res = await fetch(`${API_URL}/public/surveys/${token}`);
                if (!res.ok) throw new Error('Anket bulunamadı veya süresi dolmuş.');
                const data = await res.json();
                setSurvey(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSurvey();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (score === 0) {
            alert('Lütfen bir puan seçin.');
            return;
        }

        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        try {
            const res = await fetch(`${API_URL}/public/surveys/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, comment })
            });

            if (!res.ok) throw new Error('Gönderim başarısız oldu.');
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !submitted) return <div className="py-20 text-center font-mono">Yükleniyor...</div>;
    if (error) return <div className="py-20 text-center text-red-600 font-bold">{error}</div>;

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-green-50">
                <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Teşekkürler!</h1>
                    <p className="text-gray-500 font-medium">Geri bildiriminiz başarıyla alındı. Sizi daha iyi anlamamıza yardımcı olduğunuz için teşekkür ederiz.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-white">
            <div className="max-w-lg w-full bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl border border-gray-100">
                <div className="text-center mb-10">
                    <div className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">{survey?.tenants?.name}</div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Deneyiminiz Nasıldı?</h1>
                    <p className="text-gray-500 font-medium">Siparişinizle ilgili düşüncelerinizi merak ediyoruz.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Stars */}
                    <div className="flex justify-center gap-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setScore(s)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${score >= s ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                            >
                                ★
                            </button>
                        ))}
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">Yorumunuz (Opsiyonel)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Neyi sevdiniz veya neyi geliştirebiliriz?"
                            className="w-full p-4 bg-gray-50 border-0 rounded-2xl h-32 focus:ring-2 focus:ring-indigo-600 text-gray-900 font-medium"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg hover:bg-gray-800 transition-all shadow-xl disabled:opacity-50"
                    >
                        {loading ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
                    </button>
                </form>
            </div>

            <footer className="mt-12 text-gray-400 text-xs font-bold uppercase tracking-widest">
                Powered by Hauze XP
            </footer>
        </div>
    );
}
