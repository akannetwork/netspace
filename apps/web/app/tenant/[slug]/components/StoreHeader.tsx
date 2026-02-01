'use client';

import Link from 'next/link';
import { useCart } from '@/context/cart-context';

export function StoreHeader({ settings, siteTitle }: { settings: any, siteTitle: string }) {
    const { cartCount } = useCart();

    // Fallback styles
    const primaryColor = settings?.primary_color || '#000000';
    const logoUrl = settings?.logo_url;

    return (
        <header className="bg-white border-b sticky top-0 z-40">
            <div className="container mx-auto px-6 h-20 flex justify-between items-center">

                {/* Logo */}
                <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
                    {logoUrl ? (
                        <img src={logoUrl} alt={siteTitle} className="h-10 object-contain" />
                    ) : (
                        <span style={{ color: primaryColor }}>{siteTitle}</span>
                    )}
                </Link>

                {/* Nav */}
                <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-700">
                    <Link href="/" className="hover:text-black transition-colors">Ana Sayfa</Link>
                    <Link href="/products" className="hover:text-black transition-colors">Katalog</Link>
                    {settings?.has_services && (
                        <Link
                            href="/services"
                            className="text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:brightness-110 active:scale-95"
                            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}20` }}
                        >
                            Teklif Al
                        </Link>
                    )}
                    <Link href="/about" className="hover:text-black transition-colors">Hakkımızda</Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center space-x-6">
                    <button className="text-gray-600 hover:text-black">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>

                    <Link href="/checkout" className="text-gray-600 hover:text-black relative">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                        {cartCount > 0 && (
                            <span
                                className="absolute -top-1 -right-1 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>
        </header>
    );
}
