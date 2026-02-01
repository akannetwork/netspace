import { getStoreSettings } from '@/lib/store-api';
import Link from 'next/link';
import { CartProvider } from '@/context/cart-context';
import { StoreHeader } from './components/StoreHeader';

export default async function TenantLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const settings = await getStoreSettings(params.slug);

    // Default fallback styles
    const primaryColor = settings?.primary_color || '#000000';
    const siteTitle = settings?.site_title || params.slug.toUpperCase();

    return (
        <CartProvider>
            <div className="min-h-screen flex flex-col font-sans">
                {/* Announcement Bar */}
                <div className="text-white text-xs text-center py-2 px-4" style={{ backgroundColor: primaryColor }}>
                    Welcome to our store!
                </div>

                {/* Client Header */}
                <StoreHeader settings={settings} siteTitle={siteTitle} />

                <main className="flex-1">
                    {children}
                </main>

                <footer className="bg-white border-t py-16 mt-10">
                    <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="font-bold mb-4">{siteTitle}</div>
                            <p className="text-sm text-gray-500">Premium products for your lifestyle.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm mb-4">Shop</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><Link href="#">New Arrivals</Link></li>
                                <li><Link href="#">Best Sellers</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm mb-4">Help</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><Link href="#">Shipping</Link></li>
                                <li><Link href="#">Returns</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm mb-4">Stay Connected</h4>
                            <div className="flex space-x-4">
                                {/* Social Icons */}
                            </div>
                        </div>
                    </div>
                    <div className="container mx-auto px-6 mt-12 pt-8 border-t text-center text-gray-400 text-xs">
                        &copy; {new Date().getFullYear()} {siteTitle}. Powered by Hauze.
                    </div>
                </footer>
            </div>
        </CartProvider>
    );
}
