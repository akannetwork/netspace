import { getStoreSettings, getStoreProducts } from '@/lib/store-api';
import Link from 'next/link';
import { AddToCartButton } from './components/AddToCartButton';

export default async function TenantPage({ params }: { params: { slug: string } }) {
    const settings = await getStoreSettings(params.slug);
    const products = await getStoreProducts(params.slug);

    // Fallback content
    const heroTitle = settings?.hero_title || 'Welcome to our store';
    const heroDesc = settings?.hero_description || 'Check out our latest collection.';
    const primaryColor = settings?.primary_color || '#4F46E5';

    return (
        <div className="font-sans">
            {/* Hero Section */}
            <section className="relative bg-gray-50 py-20 px-6">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
                        {heroTitle}
                    </h1>
                    <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                        {heroDesc}
                    </p>
                    <button
                        className="text-white px-8 py-3 rounded-full font-medium transition-opacity hover:opacity-90 shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Shop Now
                    </button>
                </div>
            </section>

            {/* Featured Products */}
            <section className="py-20 px-6">
                <div className="container mx-auto">
                    <div className="flex justify-between items-end mb-10">
                        <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
                        <Link href="/products" className="text-sm font-medium hover:underline text-gray-600">View All &rarr;</Link>
                    </div>

                    {products.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded border border-dashed text-gray-500">
                            <p className="mb-2">No products found.</p>
                            <small>Products added in the Office panel will appear here.</small>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {products.map((product: any) => (
                                <Link key={product.id} href={`/product/${product.id}`} className="group block">
                                    <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                                        {/* Placeholder for Product Image */}
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                            No Image
                                        </div>
                                        {/* Add to Cart Button */}
                                        <AddToCartButton product={product} />
                                    </div>
                                    <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        {product.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {product.currency} {product.price}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
