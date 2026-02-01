'use client';

import { useCart } from '@/context/cart-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CheckoutPage({ params }: { params: { slug: string } }) {
    const { items, cartTotal, clearCart } = useCart();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const handleChange = (e: any) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                slug: params.slug,
                customer: form,
                items: items.map(i => ({ product_id: i.id, quantity: i.quantity }))
            };

            const res = await fetch(`${API_URL}/public/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Checkout failed');
            }

            const order = await res.json();
            alert(`Order Placed Successfully! Order #: ${order.order_number}`);
            clearCart();
            // Redirect to home or success
            router.push(`/?order_success=${order.order_number}`);

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return <div className="p-10 text-center">Your cart is empty.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Order Summary */}
            <div className="bg-gray-50 p-6 rounded">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                <div className="space-y-4">
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between border-b pb-2">
                            <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                            </div>
                            <div className="font-medium">
                                {item.currency} {(item.price * item.quantity).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between font-bold text-lg mt-6 pt-4 border-t">
                    <span>Total</span>
                    <span>{items[0]?.currency} {cartTotal.toFixed(2)}</span>
                </div>
            </div>

            {/* Checkout Form */}
            <div>
                <h2 className="text-xl font-bold mb-6">Shipping Details</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input name="name" required className="w-full border p-2 rounded" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input name="email" type="email" required className="w-full border p-2 rounded" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input name="phone" className="w-full border p-2 rounded" onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <textarea name="address" required rows={3} className="w-full border p-2 rounded" onChange={handleChange} />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-3 rounded font-bold hover:bg-gray-800 disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Processing...' : `Pay ${items[0]?.currency} ${cartTotal.toFixed(2)}`}
                    </button>
                </form>
            </div>
        </div>
    );
}
