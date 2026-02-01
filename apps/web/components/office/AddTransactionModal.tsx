'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contactId?: string;
    contactName?: string;
    orderId?: string; // Pre-selected order
}

export function AddTransactionModal({ isOpen, onClose, onSuccess, contactId: propContactId, contactName: propContactName, orderId: propOrderId }: AddTransactionModalProps) {
    const [loading, setLoading] = useState(false);

    // Global Mode Logic
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const activeContactId = propContactId || selectedContact?.id;
    const activeContactName = propContactName || selectedContact?.name;

    const [accounts, setAccounts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        type: 'credit',
        amount: '',
        description: '',
        category: 'collection',
        order_id: '',
        account_id: ''
    });

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'check'>('cash');
    const [checkData, setCheckData] = useState({
        bank_name: '',
        check_number: '',
        due_date: new Date().toISOString().split('T')[0] // Default to today
    });

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedContact(null);
            setSearchTerm('');
            setSearchResults([]);
            setPaymentMethod('cash');
            setCheckData({ bank_name: '', check_number: '', due_date: new Date().toISOString().split('T')[0] });
        } else {
            // Initialize with props
            if (propOrderId) {
                setFormData(prev => ({
                    ...prev,
                    order_id: propOrderId,
                    type: 'credit', // Default to collection for orders
                    category: 'collection'
                }));
            }

            // Auto-resolve contact if ID is missing but Name is provided
            if (!propContactId && propContactName) {
                // Set search term immediately
                setSearchTerm(propContactName);

                // Try to find exact match
                const findContact = async () => {
                    try {
                        const res = await api.get(`/office/contacts?search=${encodeURIComponent(propContactName)}`);
                        const matches = res.data?.data || [];
                        // Find exact match or falls back to search results
                        const exact = matches.find((c: any) => c.name.toLowerCase() === propContactName.toLowerCase());
                        if (exact) {
                            setSelectedContact(exact);
                        } else {
                            setSearchResults(matches);
                        }
                    } catch (e) {
                        console.error('Auto-resolve contact failed', e);
                    }
                }
                findContact();
            }
        }
    }, [isOpen, propOrderId, propContactId, propContactName]);
    // Fetch accounts and orders
    useEffect(() => {
        if (!isOpen) return;

        // Fetch Accounts
        api.get('/office/finance/accounts').then(res => setAccounts(res.data || [])).catch(() => { });

        // Fetch Orders if contact selected
        if (activeContactId && formData.type === 'credit') {
            api.get(`/office/orders?contact_id=${activeContactId}&payment_status=pending`).then(res => setOrders(res.data?.data || [])).catch(() => { });
        } else {
            setOrders([]);
        }
    }, [isOpen, activeContactId, formData.type]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!activeContactId) return;

        setLoading(true);
        try {
            const payload: any = {
                contact_id: activeContactId,
                type: formData.type,
                amount: parseFloat(formData.amount),
                description: formData.description,
                category: formData.type === 'debit' ? 'adjustment' : 'collection',
                order_id: formData.order_id || null,
            };

            // Payment Logic
            if (formData.type === 'credit') {
                if (paymentMethod === 'check') {
                    payload.check_info = {
                        bank_name: checkData.bank_name,
                        check_number: checkData.check_number,
                        due_date: checkData.due_date
                    };
                    payload.description = `${payload.description || 'Check Payment'} - ${checkData.bank_name} #${checkData.check_number}`;
                } else {
                    payload.account_id = formData.account_id || null;
                }
            } else {
                // For Debit, usually just account (outgoing payment)
                payload.account_id = formData.account_id || null;
            }

            await api.post('/office/contacts/transactions', payload);
            onSuccess();
            onClose();
        } catch (err: any) {
            alert('Failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    // Search Effect
    useEffect(() => {
        if (!searchTerm) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await api.get(`/office/contacts?search=${searchTerm}`);
                setSearchResults(res.data?.data || []);
            } catch (error) {
                console.error('Search failed', error);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
            <div className="pb-4">
                {!activeContactId ? (
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search Contact</label>
                            <input
                                autoFocus
                                className="w-full border rounded p-2"
                                placeholder="Type name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {searchResults.length > 0 && (
                            <ul className="border rounded max-h-60 overflow-y-auto divide-y">
                                {searchResults.map(c => (
                                    <li key={c.id}
                                        onClick={() => setSelectedContact(c)}
                                        className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between"
                                    >
                                        <span>{c.name}</span>
                                        <span className="text-xs text-gray-400">{c.type}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {searchTerm && searchResults.length === 0 && (
                            <p className="text-sm text-gray-500 text-center">No contacts found.</p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Selected Contact Header */}
                        <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between items-center">
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Contact</div>
                                <div className="font-semibold text-gray-900">{activeContactName}</div>
                            </div>
                            {!propContactId && (
                                <button onClick={() => setSelectedContact(null)} className="text-sm text-blue-600 hover:text-blue-800">
                                    Change
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Type Selector */}
                            <div className="flex gap-4 p-1 bg-gray-100 rounded-lg select-none mb-4">
                                <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${formData.type === 'credit' ? 'bg-white shadow-sm font-medium text-green-700' : 'text-gray-500 hover:bg-gray-200'}`}>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        checked={formData.type === 'credit'}
                                        onChange={() => setFormData({ ...formData, type: 'credit' })}
                                    />
                                    Tahsilat (Giriş)
                                </label>
                                <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${formData.type === 'debit' ? 'bg-white shadow-sm font-medium text-red-700' : 'text-gray-500 hover:bg-gray-200'}`}>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        checked={formData.type === 'debit'}
                                        onChange={() => setFormData({ ...formData, type: 'debit' })}
                                    />
                                    Tediye (Çıkış)
                                </label>
                            </div>
                            {
                                formData.type === 'credit' && (
                                    <div className="bg-gray-50 p-3 rounded border">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('cash')}
                                                className={`flex-1 py-1.5 px-3 rounded text-sm ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-gray-700'}`}
                                            >
                                                Cash / Bank
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('check')}
                                                className={`flex-1 py-1.5 px-3 rounded text-sm ${paymentMethod === 'check' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-gray-700'}`}
                                            >
                                                Cheque (Çek)
                                            </button>
                                        </div>
                                    </div>
                                )
                            }

                            {/* Dynamics: Account vs Check Info */}
                            {
                                formData.type === 'credit' && paymentMethod === 'check' ? (
                                    <div className="space-y-3 p-3 border rounded bg-yellow-50/50">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Bank Name</label>
                                            <input
                                                required
                                                className="w-full border rounded p-2 text-sm"
                                                placeholder="e.g. Garanti, Is Bankasi"
                                                value={checkData.bank_name}
                                                onChange={e => setCheckData({ ...checkData, bank_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Cheque No</label>
                                                <input
                                                    required
                                                    className="w-full border rounded p-2 text-sm"
                                                    placeholder="1234567"
                                                    value={checkData.check_number}
                                                    onChange={e => setCheckData({ ...checkData, check_number: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date (Vade)</label>
                                                <input
                                                    type="date"
                                                    required
                                                    className="w-full border rounded p-2 text-sm"
                                                    value={checkData.due_date}
                                                    onChange={e => setCheckData({ ...checkData, due_date: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-yellow-700">
                                            * Çek "Portföy" durumunda kaydedilecek ve cari bakiyeden düşülecektir.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kasa / Banka Hesabı</label>
                                        <select
                                            className="w-full p-2 border rounded"
                                            value={formData.account_id}
                                            onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                                        >
                                            <option value="">-- Hesap Seçiniz --</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            }

                            {/* Order Selection - Only shows for Credit (Collection) */}
                            {
                                formData.type === 'credit' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Link to Order (Optional)
                                            {orders.length === 0 && <span className="text-gray-400 font-normal ml-2 text-xs">(No pending orders found)</span>}
                                        </label>
                                        <select
                                            className="w-full border rounded p-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                            value={formData.order_id}
                                            disabled={orders.length === 0}
                                            onChange={e => {
                                                const oId = e.target.value;
                                                const order = orders.find(o => o.id === oId);
                                                if (order) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        order_id: oId,
                                                        amount: order.total_amount || prev.amount,
                                                        description: prev.description || `Ödeme #${order.order_number}`
                                                    }));
                                                } else {
                                                    setFormData(prev => ({ ...prev, order_id: '' }));
                                                }
                                            }}
                                        >
                                            <option value="">-- Genel Tahsilat (Siparişe Bağlama) --</option>
                                            {orders.map(o => (
                                                <option key={o.id} value={o.id}>
                                                    #{o.order_number} - {formatCurrency(o.total_amount)} ({o.payment_status})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            }

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full border rounded p-2"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full border rounded p-2"
                                    rows={2}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="e.g. Opening Balance, Cash Payment, etc."
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-4 py-2 text-white rounded disabled:opacity-50 ${formData.type === 'debit' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                >
                                    {loading ? 'Processing...' : 'Save Transaction'}
                                </button>
                            </div>
                        </form >
                    </>
                )
                }
            </div >
        </Modal >
    );
}
