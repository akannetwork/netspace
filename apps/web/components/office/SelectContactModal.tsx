'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CreateContactModal } from './CreateContactModal';

interface Contact {
    id: string;
    name: string;
    phone?: string;
    type: string;
    balance: number;
}

interface SelectContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (contact: Contact) => void;
}

export function SelectContactModal({ isOpen, onClose, onSelect }: SelectContactModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadContacts();
            setSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredContacts(contacts);
            return;
        }
        const lower = searchTerm.toLowerCase();
        setFilteredContacts(contacts.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            c.phone?.includes(searchTerm)
        ));
    }, [searchTerm, contacts]);

    async function loadContacts() {
        setLoading(true);
        try {
            // Fetch all contacts (or search via API if huge, but client-side filter is faster for <1000)
            const res = await api.get('/office/contacts');
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setContacts(list);
            setFilteredContacts(list);
        } catch (err) {
            console.error('Failed to load contacts', err);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">Select Customer</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
                </div>

                <div className="p-4 space-y-4">
                    <input
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />

                    <div className="flex-1 overflow-y-auto min-h-[200px] border rounded bg-gray-50">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">Loading...</div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <p>No customer found.</p>
                                <button
                                    onClick={() => setIsCreateOpen(true)}
                                    className="mt-2 text-indigo-600 font-bold hover:underline"
                                >
                                    + Create New Customer
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {filteredContacts.map(contact => (
                                    <button
                                        key={contact.id}
                                        onClick={() => onSelect(contact)}
                                        className="w-full text-left p-3 hover:bg-indigo-50 flex justify-between items-center transition"
                                    >
                                        <div>
                                            <div className="font-bold text-gray-900">{contact.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {contact.phone || 'No Phone'} • <span className="uppercase">{contact.type}</span>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-mono font-bold ${contact.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {contact.balance.toFixed(2)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                    <span>{filteredContacts.length} results</span>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-3 py-1 bg-gray-900 text-white rounded hover:bg-black"
                    >
                        New Customer
                    </button>
                </div>
            </div>

            <CreateContactModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                    loadContacts();
                    setIsCreateOpen(false);
                }}
            />
        </div>
    );
}
