'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import { AddTransactionModal } from '@/components/office/AddTransactionModal';

interface OrderDetailDrawerProps {
    orderId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function OrderDetailDrawer({ orderId, isOpen, onClose }: OrderDetailDrawerProps) {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen && orderId) {
            loadOrder();
        } else {
            setOrder(null);
        }
    }, [isOpen, orderId]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer Panel */}
            <div className="relative z-50 w-full max-w-2xl bg-gray-50 h-full shadow-2xl flex flex-col transform transition-transform duration-300">

                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-white border-b sticky top-0 z-10">
                    <h2 className="text-lg font-bold">
                        {order ? `Order ${order.order_number}` : 'Loading...'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : !order ? (
                        <div className="text-center p-8 text-gray-500">Order not found.</div>
                    ) : (
                        <>
                            {/* Items */}
                            <div className="bg-white rounded shadow p-4">
                                <h3 className="font-bold mb-3 text-sm uppercase text-gray-400">Items</h3>
                                <div className="space-y-3">
                                    {order.order_items?.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">IMG</div>
                                                <div>
                                                    <div className="font-medium text-sm">{item.title}</div>
                                                    <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
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
                                <div className="bg-white rounded shadow p-4">
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
                                <div className="bg-white rounded shadow p-4">
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
                            <div className="bg-white rounded shadow p-4">
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
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Nested Modals */}
            {order && (
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
            )}
        </div>
    );
}
