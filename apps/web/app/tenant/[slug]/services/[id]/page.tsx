
import { getStoreServices, getStoreSettings } from '@/lib/store-api';
import { PublicServiceConfigurator } from '../components/PublicServiceConfigurator';
import Link from 'next/link';

export default async function ServiceQuotePage({ params }: { params: { slug: string, id: string } }) {
    const services = await getStoreServices(params.slug);
    const settings = await getStoreSettings(params.slug);
    const service = services.find((s: any) => s.id === params.id);

    if (!service) {
        return (
            <div className="container mx-auto px-6 py-20 text-center">
                <h1 className="text-2xl font-black uppercase italic text-gray-400">Hizmet Bulunamadı</h1>
                <Link href="/services" className="text-indigo-600 font-bold mt-4 inline-block underline">Hizmetlere Geri Dön</Link>
            </div>
        );
    }

    const primaryColor = settings?.primary_color || '#4F46E5';

    return (
        <div className="bg-gray-50/50 min-h-screen">
            <div className="container mx-auto px-6 py-12 md:py-20">
                <div className="mb-12">
                    <Link
                        href="/services"
                        className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors flex items-center gap-2"
                    >
                        ← Tüm Hizmetler
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-4">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic max-w-2xl leading-none">
                                {service.name}
                            </h1>
                            <p className="text-gray-500 font-medium mt-4 max-w-xl">
                                {service.description || 'Hizmet seçeneklerini belirleyerek anında fiyat teklifi alabilirsiniz.'}
                            </p>
                        </div>
                        <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">BAŞLAYAN FİYAT</span>
                            <span className="text-2xl font-black text-gray-900">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: service.currency }).format(service.price)}
                            </span>
                        </div>
                    </div>
                </div>

                <PublicServiceConfigurator
                    productId={service.id}
                    primaryColor={primaryColor}
                />
            </div>
        </div>
    );
}
