'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatPhone } from '@/lib/format';
import { AddTransactionModal } from '@/components/office/AddTransactionModal';

export default function ContactDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [contact, setContact] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [contactRes, txRes] = await Promise.all([
                api.get(`/office/contacts/${params.id}`),
                api.get(`/office/contacts/${params.id}/transactions`)
            ]);
            setContact(contactRes.data);
            setTransactions(txRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Loading contact...</div>;
    if (!contact) return <div className="p-8">Contact not found.</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-white border-2
                         ${contact.type === 'customer' ? 'border-green-200 text-green-700' : ''}
                         ${contact.type === 'supplier' ? 'border-blue-200 text-blue-700' : ''}
                         ${contact.type === 'personnel' ? 'border-purple-200 text-purple-700' : ''}
                    `}>
                        {contact.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{contact.name}</h1>
                        <span className="text-sm text-gray-500 uppercase font-semibold">{contact.type}</span>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Current Balance</div>
                    <div className={`text-3xl font-bold ${contact.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(contact.balance)}
                    </div>
                    <div className="text-xs font-bold mt-1">
                        {contact.balance < 0 ? <span className="text-red-600">[ALACAKLI]</span> : (contact.balance > 0 ? <span className="text-green-600">[BORÇLU]</span> : <span className="text-gray-400">[BAKİYE SIFIR]</span>)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Contact Info</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-gray-500 text-xs uppercase">Phone</label>
                                <div className="font-medium">{formatPhone(contact.phone) || '-'}</div>
                            </div>
                            <div>
                                <label className="block text-gray-500 text-xs uppercase">Email</label>
                                <div className="font-medium">{contact.email || '-'}</div>
                            </div>
                            <div>
                                <label className="block text-gray-500 text-xs uppercase">Tax ID</label>
                                <div className="font-medium">{contact.tax_id || '-'}</div>
                            </div>
                            <div>
                                <label className="block text-gray-500 text-xs uppercase">Address</label>
                                <div className="text-gray-700 whitespace-pre-line">
                                    {contact.address
                                        ? (typeof contact.address === 'object'
                                            ? (contact.address as any).address || JSON.stringify(contact.address)
                                            : contact.address)
                                        : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Actions</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setIsTransactionModalOpen(true)}
                                className="w-full py-2 px-4 bg-gray-900 text-white rounded hover:bg-black transition text-sm font-medium"
                            >
                                Add Manual Transaction
                            </button>
                            <button className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition text-sm font-medium">
                                Edit Contact
                            </button>
                            <button
                                onClick={() => router.push('/office/finance/contacts')}
                                className="w-full py-2 px-4 text-gray-500 hover:text-gray-900 transition text-sm"
                            >
                                Back to List
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content: Transactions */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="font-bold text-lg">Transaction History</h2>
                            <span className="text-sm text-gray-500">{transactions.length} Records</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                                <span className="block text-xs text-gray-400">
                                                    {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <div className="font-medium">{tx.category?.toUpperCase()}</div>
                                                <div className="text-gray-500">{tx.description || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase
                                                    ${tx.type === 'debit' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                                                `}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold
                                                ${tx.type === 'debit' ? 'text-red-600' : 'text-green-600'}
                                            `}>
                                                {tx.type === 'debit' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {transactions.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    No transactions found.
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
                    loadData();
                    // Optionally refresh global context if balance is global
                }}
                contactId={contact.id}
                contactName={contact.name}
            />
        </div>
    );
}
