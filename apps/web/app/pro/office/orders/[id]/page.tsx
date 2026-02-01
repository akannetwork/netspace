'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatPhone } from '@/lib/format';
import { AddTransactionModal } from '@/components/office/AddTransactionModal';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    useEffect(() => {
        loadOrder();
    }, []);

    const loadOrder = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/office/orders/${params.id}`);
            if (res.data) {
                setOrder(res.data);
            } else {
                setOrder(null);
            }
        } catch (err) {
            console.error('Frontend Load Order Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (status: string) => {
        if (!confirm(`Mark order as ${status}?`)) return;
        setUpdating(true);
        try {
            const res = await api.put(`/office/orders/${params.id}/status`, { status });
            if (res.data) {
                setOrder((prev: any) => ({ ...prev, status: res.data.status }));
            }
        } catch (err) {
            alert('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };



    if (loading) return <div className="p-8">Loading order...</div>;
    if (!order) return <div className="p-8">Order not found.</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
                <button onClick={() => router.back()} className="text-gray-600 hover:underline">Back to List</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Items */}
                    <div className="bg-white rounded shadow p-6">
                        <h2 className="font-bold mb-4">Items</h2>
                        <div className="space-y-4">
                            {order.order_items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center border-b pb-4 last:border-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">Img</div>
                                        <div>
                                            <div className="font-medium">{item.title}</div>
                                            <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                                        </div>
                                    </div>
                                    <div className="font-medium">
                                        {item.price}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t">
                            <span>Total</span>
                            <span>{order.currency} {order.total_amount}</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status Actions */}
                    <div className="bg-white rounded shadow p-6">
                        <h2 className="font-bold mb-4">Status</h2>
                        <div className="mb-4">
                            <span className={`px-2 py-1 text-sm font-semibold rounded-full uppercase
                                ${order.status === 'new' ? 'bg-blue-100 text-blue-800' : ''}
                                ${order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : ''}
                                ${order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' : ''}
                                ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''}
                            `}>
                                {order.status}
                            </span>
                        </div>

                        <div className="space-y-2">
                            {order.status === 'new' && (
                                <button onClick={() => updateStatus('processing')} disabled={updating} className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 text-sm">
                                    Prepare Order
                                </button>
                            )}
                            {order.status === 'processing' && (
                                <button onClick={() => updateStatus('shipped')} disabled={updating} className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 text-sm">
                                    Mark as Shipped
                                </button>
                            )}
                            {order.status === 'shipped' && (
                                <button onClick={() => updateStatus('delivered')} disabled={updating} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm">
                                    Mark as Delivered
                                </button>
                            )}
                            <button onClick={() => updateStatus('cancelled')} disabled={updating} className="w-full border border-red-200 text-red-600 py-2 rounded hover:bg-red-50 text-sm">
                                Cancel Order
                            </button>
                        </div>
                    </div>

                    {/* Customer */}
                    <div className="bg-white rounded shadow p-6">
                        <h2 className="font-bold mb-4">Customer</h2>
                        <div className="text-sm space-y-2">
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-gray-600">{order.customer_email}</p>
                            <p>{formatPhone(order.customer_phone)}</p>
                            <div className="mt-2 border-t pt-2">
                                <span className="text-xs text-gray-400 uppercase">Shipping Address</span>
                                <p className="mt-1">{order.shipping_address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-white rounded shadow p-6">
                        <h2 className="font-bold mb-4">Payment</h2>
                        <div className="space-y-4">
                            <div>
                                <span className="text-xs text-gray-400 uppercase">Method</span>
                                <div className="font-medium capitalize">{order.payment_method?.replace('_', ' ') || '-'}</div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 uppercase">Status</span>
                                <div className={`font-bold mt-1 ${order.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                                    {order.payment_status ? order.payment_status.toUpperCase() : 'PENDING'}
                                </div>
                            </div>

                            {order.payment_status !== 'paid' && (
                                <div className="pt-4 border-t">
                                    <button
                                        onClick={() => setIsTransactionModalOpen(true)}
                                        className="w-full bg-emerald-600 text-white rounded py-2 font-medium hover:bg-emerald-700 transition"
                                    >
                                        Add Payment / Tahsilat Ekle
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <AddTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    loadOrder(); // Refresh order status
                    setIsTransactionModalOpen(false);
                }}
                contactId={order.contact_id}
                contactName={order.customer_name}
                orderId={order.id}
            />
        </div>
    );
}
