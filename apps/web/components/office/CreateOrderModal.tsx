'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';

interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    currency: string;
    quantity?: number;
    track_stock?: boolean;
}

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

import { useQueryClient } from '@tanstack/react-query';
import { PhoneInput } from '@/components/ui/PhoneInput';

export function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
    const { currentBranch } = useBranch();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [searchResults, setSearchResults] = useState<Product[]>([]);

    // Cart
    const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);

    // Customer Form
    const [customer, setCustomer] = useState({
        name: 'Walk-in Customer',
        email: 'walkin@store.com',
        phone: '',
        address: 'Store Pickup'
    });

    const [loading, setLoading] = useState(false);

    // Payment Options State
    const [isPayingNow, setIsPayingNow] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'check'>('cash');
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [accountId, setAccountId] = useState('');
    const [checkData, setCheckData] = useState({
        bank_name: '',
        check_number: '',
        due_date: new Date().toISOString().split('T')[0]
    });

    // Data
    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadProducts();
            // Reset state on open
            setCart([]);
            setCustomer({ name: 'Walk-in Customer', email: 'walkin@store.com', phone: '', address: 'Store Pickup' });
            setSearchTerm('');

            // Payment Defaults
            setIsPayingNow(false);
            setPaymentMethod('cash');
            setPaymentAmount('');
            setAccountId('');

            // Allow fetch accounts
            api.get('/office/finance/accounts').then(res => setAccounts(res.data || [])).catch(() => { });
        }
    }, [isOpen]);

    // Update payment amount default when cart total changes
    // Only if user hasn't typed manual amount (or if we want to auto-sync)
    // Let's auto-sync if paying full is default.
    useEffect(() => {
        if (!isOpen) return;
        const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
        if (total > 0 && isPayingNow && !paymentAmount) {
            setPaymentAmount(total.toFixed(2));
        }
    }, [cart, isPayingNow, isOpen]);

    // Search Filter
    useEffect(() => {
        if (!searchTerm) {
            setSearchResults(products);
        } else {
            const term = searchTerm.toLowerCase();
            setSearchResults(products.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.sku?.toLowerCase().includes(term)
            ));
        }
    }, [searchTerm, products]);


    async function loadProducts() {
        if (!currentBranch) return; // Wait for branch
        try {
            // Pass branch_id to get fresh stock data
            const res = await api.get(`/office/products?branch_id=${currentBranch.id}`);
            setProducts(res.data || []);
        } catch (err) {
            console.error(err);
        }
    }

    function addToCart(product: Product) {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing) {
                return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { product, quantity: 1 }];
        });
        setSearchTerm(''); // Clear search after adding
    }

    function removeFromCart(productId: string) {
        setCart(prev => prev.filter(i => i.product.id !== productId));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (cart.length === 0) return alert('Cart is empty');
        if (!currentBranch) return alert('No branch selected');

        setLoading(true);
        if (!currentBranch?.id) {
            alert('CRITICAL ERROR: Branch ID is missing on client side!');
            setLoading(false);
            return;
        }

        const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

        // Build Payload
        const payload: any = {
            customer,
            items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
            channel: 'store',
            branch_id: currentBranch.id
        };

        if (isPayingNow) {
            payload.payment_info = {
                method: paymentMethod,
                amount: parseFloat(paymentAmount || total.toString()),
                account_id: accountId || null,
            };

            if (paymentMethod === 'check') {
                payload.payment_info.check_info = checkData;
            }
        }

        try {
            await api.post('/office/orders', payload);

            alert('Order Created!');
            // Invalidate 'orders' query to refresh the list automatically
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
            await queryClient.invalidateQueries({ queryKey: ['products'] }); // Also update stock
            onClose();
        } catch (err: any) {
            alert('Failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    // ...

    if (!isOpen) return null;

    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex overflow-hidden">

                {/* Left: Product Selection */}
                <div className="w-1/2 p-6 border-r border-gray-100 flex flex-col bg-gray-50">
                    <h2 className="text-lg font-bold mb-4 text-gray-800">Select Products</h2>
                    <input
                        className="w-full p-3 border rounded shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                        placeholder="Search SKU or Name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {searchResults.map(p => (
                            <button
                                key={p.id}
                                onClick={() => addToCart(p)}
                                disabled={p.track_stock && (p.quantity || 0) <= 0}
                                className="w-full p-3 bg-white border rounded hover:border-indigo-500 text-left flex justify-between items-center group transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div>
                                    <div className="font-medium text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                                        <span>{p.sku}</span>
                                        {p.track_stock ? (
                                            <span className={`px-1 rounded ${(p.quantity || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                Stock: {p.quantity || 0}
                                            </span>
                                        ) : (
                                            <span className="bg-blue-100 text-blue-700 px-1 rounded">Unlimited</span>
                                        )}
                                    </div>
                                </div>
                                <div className="font-bold text-indigo-600 group-hover:scale-110 transition">
                                    {p.price} {p.currency}
                                </div>
                            </button>
                        ))}
                        {searchTerm && searchResults.length === 0 && (
                            <div className="text-center text-gray-400 mt-10">No products found</div>
                        )}
                        {!searchTerm && (
                            <div className="text-center text-gray-400 mt-10">Type to search products...</div>
                        )}
                    </div>
                </div>

                {/* Right: Cart & Checkout */}
                <div className="w-1/2 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Current Order</h2>
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold uppercase">
                            {currentBranch?.name}
                        </span>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto mb-6 border rounded bg-gray-50 p-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400">Cart is empty</div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map(item => (
                                    <div key={item.product.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
                                        <div>
                                            <div className="font-medium text-sm">{item.product.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {item.quantity} x {item.product.price}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold text-sm">
                                                {(item.quantity * item.product.price).toFixed(2)}
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                            >&times;</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6 grid grid-cols-2 gap-3">
                        <input
                            placeholder="Customer Name"
                            className="p-2 border rounded text-sm"
                            value={customer.name}
                            onChange={e => setCustomer({ ...customer, name: e.target.value })}
                        />
                        <PhoneInput
                            placeholder="Phone (Optional)"
                            value={customer.phone}
                            onChange={val => setCustomer({ ...customer, phone: val })}
                        />
                    </div>

                    {/* Payment Section */}
                    <div className="mb-4 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isPayingNow}
                                    onChange={e => {
                                        setIsPayingNow(e.target.checked);
                                        if (e.target.checked && !paymentAmount) {
                                            setPaymentAmount(total.toFixed(2));
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-gray-700">Receive Payment Now (Tahsilat)</span>
                            </label>
                            {isPayingNow && (
                                <input
                                    type="number"
                                    className="w-24 text-right p-1 border rounded text-sm font-bold"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    placeholder="Amount"
                                />
                            )}
                        </div>

                        {isPayingNow && (
                            <div className="bg-gray-50 p-3 rounded border animate-in slide-in-from-top-2">
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-gray-700'}`}
                                    >
                                        Cash/Bank
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('check')}
                                        className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold ${paymentMethod === 'check' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-gray-700'}`}
                                    >
                                        Cheque (Çek)
                                    </button>
                                </div>

                                {paymentMethod === 'check' ? (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <input
                                            placeholder="Bank Name"
                                            className="p-2 border rounded col-span-2"
                                            value={checkData.bank_name}
                                            onChange={e => setCheckData({ ...checkData, bank_name: e.target.value })}
                                        />
                                        <input
                                            placeholder="Check No"
                                            className="p-2 border rounded"
                                            value={checkData.check_number}
                                            onChange={e => setCheckData({ ...checkData, check_number: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="p-2 border rounded"
                                            value={checkData.due_date}
                                            onChange={e => setCheckData({ ...checkData, due_date: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <select
                                        className="w-full p-2 border rounded text-xs"
                                        value={accountId}
                                        onChange={e => setAccountId(e.target.value)}
                                    >
                                        <option value="">-- Select Cash/Bank Account --</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>


                    {/* Total & Action */}
                    <div className="mt-auto">
                        <div className="flex justify-between items-center mb-4 text-xl font-bold">
                            <span>Total:</span>
                            <span>{total.toFixed(2)} TRY</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={onClose}
                                className="px-4 py-3 rounded border text-gray-600 hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={cart.length === 0 || loading}
                                className="px-4 py-3 rounded bg-green-600 text-white hover:bg-green-700 font-bold disabled:opacity-50 flex justify-center items-center"
                            >
                                {loading ? 'Processing...' : 'Complete Sale'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
