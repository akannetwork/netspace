'use client';

import { useCart } from '@/context/cart-context';

export function AddToCartButton({ product }: { product: any }) {
    const { addToCart } = useCart();

    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(product);
            }}
            className="absolute bottom-2 right-2 bg-white text-black p-2 rounded-full shadow hover:bg-black hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Add to Cart"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
    );
}
