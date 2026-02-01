
import { getStoreServices } from '@/lib/store-api';
import Link from 'next/link';
import Image from 'next/image';

export default async function ServicesPage({ params }: { params: { slug: string } }) {
    const services = await getStoreServices(params.slug);

    return (
        <div className="container mx-auto px-6 py-16">
            <div className="max-w-4xl mx-auto text-center mb-16">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight uppercase italic">
                    Hizmet Teklifi Al
                </h1>
                <p className="text-lg text-gray-500 font-medium">
                    İhtiyacınıza uygun hizmeti seçin ve anında özelleştirilmiş fiyat teklifi alın.
                </p>
            </div>

            {services.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase tracking-widest">Şu an aktif hizmet bulunmamaktadır.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service: any) => (
                        <Link
                            key={service.id}
                            href={`/services/${service.id}`}
                            className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-xl hover:shadow-2xl transition-all flex flex-col"
                        >
                            <div className="aspect-[16/10] bg-gray-100 relative overflow-hidden">
                                {service.image_url ? (
                                    <Image
                                        src={service.image_url}
                                        alt={service.name}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 012 2v2H4v-2a2 2 0 012-2z" /></svg>
                                    </div>
                                )}
                                <div className="absolute top-4 right-4">
                                    <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">
                                        Teklif Al
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 flex-1 flex flex-col">
                                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter italic">
                                    {service.name}
                                </h3>
                                <p className="text-gray-500 text-sm line-clamp-2 mb-6 flex-1">
                                    {service.description || 'Bu hizmet için detaylı bilgi ve fiyat teklifi almak için tıklayın.'}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                        BAŞLAYAN FİYAT
                                    </span>
                                    <span className="text-lg font-black text-gray-900">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: service.currency }).format(service.price)}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
