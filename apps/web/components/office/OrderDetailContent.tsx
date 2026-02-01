'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import { AddTransactionModal } from '@/components/office/AddTransactionModal';

interface OrderDetailContentProps {
    orderId: string;
}

export function OrderDetailContent({ orderId }: OrderDetailContentProps) {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    useEffect(() => {
        if (orderId) {
            loadOrder();
        }
    }, [orderId]);

    const loadOrder = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/office/orders/${orderId}`);
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
            const res = await api.put(`/office/orders/${orderId}/status`, { status });
            if (res.data) {
                setOrder((prev: any) => ({ ...prev, status: res.data.status }));
            }
        } catch (err) {
            alert('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!order) {
        return <div className="text-center p-8 text-gray-500">Order not found.</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header / Title could be handled by Modal Title prop, but we can put content here too */}

            {/* Items */}
            <div className="bg-white rounded shadow p-4 border border-gray-100">
                <h3 className="font-bold mb-3 text-sm uppercase text-gray-400">Items</h3>
                <div className="space-y-3">
                    {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">IMG</div>
                                <div>
                                    <div className="font-medium text-sm">{item.title}</div>
                                    <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                                    {item.configuration && (
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            {Object.entries(item.configuration).map(([k, v]) => (
                                                <span key={k} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">
                                                    {k}: {String(v)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="font-medium text-sm">
                                {item.price}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between font-bold text-base mt-3 pt-3 border-t">
                    <span>Total</span>
                    <span>{order.currency} {order.total_amount}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Actions */}
                <div className="bg-white rounded shadow p-4 border border-gray-100">
                    <h3 className="font-bold mb-3 text-sm uppercase text-gray-400">Workflow</h3>
                    <div className="mb-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded uppercase
                            ${order.status === 'new' ? 'bg-blue-100 text-blue-800' : ''}
                            ${order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' : ''}
                            ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''}
                            ${order.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                            Current: {order.status}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {order.status === 'new' && (
                            <button onClick={() => updateStatus('processing')} disabled={updating} className="w-full bg-yellow-500 text-white py-1.5 rounded hover:bg-yellow-600 text-xs font-medium">
                                Prepare Order
                            </button>
                        )}
                        {order.status === 'processing' && (
                            <button onClick={() => updateStatus('shipped')} disabled={updating} className="w-full bg-indigo-600 text-white py-1.5 rounded hover:bg-indigo-700 text-xs font-medium">
                                Mark as Shipped
                            </button>
                        )}
                        {order.status === 'shipped' && (
                            <button onClick={() => updateStatus('delivered')} disabled={updating} className="w-full bg-green-600 text-white py-1.5 rounded hover:bg-green-700 text-xs font-medium">
                                Mark as Delivered
                            </button>
                        )}
                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button onClick={() => updateStatus('cancelled')} disabled={updating} className="w-full border border-red-200 text-red-600 py-1.5 rounded hover:bg-red-50 text-xs font-medium">
                                Cancel Order
                            </button>
                        )}
                    </div>
                </div>

                {/* Customer Info */}
                <div className="bg-white rounded shadow p-4 border border-gray-100">
                    <h3 className="font-bold mb-3 text-sm uppercase text-gray-400">Customer</h3>
                    <div className="text-sm space-y-1">
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-gray-600 text-xs">{order.customer_email}</p>
                        <p className="text-xs">{formatPhone(order.customer_phone)}</p>
                        <div className="mt-2 border-t pt-2">
                            <span className="text-[10px] text-gray-400 uppercase">Shipping Address</span>
                            <p className="mt-1 text-xs text-gray-600">{order.shipping_address || 'No address provided'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded shadow p-4 border border-gray-100">
                <h3 className="font-bold mb-3 text-sm uppercase text-gray-400">Payment & Billing</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Method</span>
                        <span className="text-sm font-medium capitalize">{order.payment_method?.replace('_', ' ') || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className={`text-sm font-bold ${order.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                            {order.payment_status ? order.payment_status.toUpperCase() : 'PENDING'}
                        </span>
                    </div>

                    {order.payment_status !== 'paid' && (
                        <div className="pt-3 border-t">
                            <button
                                onClick={() => setIsTransactionModalOpen(true)}
                                className="w-full bg-emerald-600 text-white rounded py-2 font-medium hover:bg-emerald-700 transition text-sm flex items-center justify-center gap-2"
                            >
                                <span>Add Payment</span>
                                <span className="opacity-75">/ Tahsilat Ekle</span>
                            </button>
                        </div>
                    )}

                    {/* Survey Link Generation */}
                    <div className="pt-3 border-t">
                        <button
                            onClick={async () => {
                                try {
                                    const res = await api.post('/office/surveys/generate', { order_id: order.id });
                                    const token = res.data.token;
                                    const url = `${window.location.origin}/survey/${token}`;
                                    await navigator.clipboard.writeText(url);
                                    alert('Survey link copied to clipboard!');
                                } catch (err) {
                                    alert('Failed to generate survey link');
                                }
                            }}
                            className="w-full bg-indigo-50 text-indigo-700 rounded py-2 font-bold hover:bg-indigo-100 transition text-sm"
                        >
                            Anket Linki Oluştur / Kopyala
                        </button>
                    </div>
                </div>
            </div>

            {/* Nested Modals */}
            <AddTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    loadOrder();
                    setIsTransactionModalOpen(false);
                }}
                contactId={order.contact_id}
                contactName={order.customer_name}
                orderId={order.id}
            />
        </div>
    );
}
