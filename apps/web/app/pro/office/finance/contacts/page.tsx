'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
// import { DataTable } from '@/components/ui/DataTable';
import { DataTable } from '@/components/ui/DataTable';
import { CreateContactModal } from '@/components/office/CreateContactModal';
import { formatCurrency, formatPhone } from '@/lib/format';
import Link from 'next/link';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

interface Contact {
    id: string;
    tenant_id: string;
    type: 'customer' | 'supplier' | 'subcontractor' | 'personnel';
    name: string;
    email?: string;
    phone?: string;
    tax_id?: string;
    address?: any;
    balance: number;
    created_at: string;
}

export default function ContactsPage() {
    const queryClient = useQueryClient();

    // Tab State
    const [activeTab, setActiveTab] = useState('all');

    // Pagination State
    const [page, setPage] = useState(1);
    const LIMIT = 20;

    // Reset pagination when tab changes
    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // React Query
    const { data: queryData, isLoading, isRefetching } = useQuery({
        queryKey: ['contacts', activeTab, page],
        queryFn: async () => {
            let query = `/office/contacts?page=${page}&limit=${LIMIT}`;
            if (activeTab !== 'all') {
                query += `&type=${activeTab}`;
            }

            const res = await api.get(query);
            if (res.error) throw new Error(res.error);

            // Handle Response
            const list = (Array.isArray(res.data) ? res.data : res.data.data) as Contact[];
            const meta = res.data.meta || { total: list.length };

            return { list, meta };
        },
        placeholderData: keepPreviousData,
        staleTime: 30000,
    });

    const contacts: Contact[] = queryData?.list || [];
    const total = queryData?.meta?.total || 0;

    const tabs = [
        { id: 'all', label: 'All Contacts' },
        { id: 'customer', label: 'Customers' },
        { id: 'supplier', label: 'Suppliers' },
        { id: 'subcontractor', label: 'Subcontractors' },
        { id: 'personnel', label: 'Personnel' },
    ];

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Contacts (Cari Hesaplar)</h1>
                    <p className="text-gray-500">Manage customers, suppliers, and personnel.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                    <span>+ New Contact</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 space-x-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* DataTable */}
            <DataTable
                columns={[
                    {
                        header: 'Type',
                        render: (c) => (
                            <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase
                                ${c.type === 'customer' ? 'bg-green-100 text-green-800' : ''}
                                ${c.type === 'supplier' ? 'bg-blue-100 text-blue-800' : ''}
                                ${c.type === 'personnel' ? 'bg-purple-100 text-purple-800' : ''}
                                ${c.type === 'subcontractor' ? 'bg-orange-100 text-orange-800' : ''}
                            `}>
                                {c.type}
                            </span>
                        )
                    },
                    {
                        header: 'Name',
                        render: (c) => (
                            <div>
                                <div className="text-sm font-medium text-gray-900">{c.name}</div>
                                {c.tax_id && <div className="text-xs text-gray-400">Tax ID: {c.tax_id}</div>}
                            </div>
                        )
                    },
                    {
                        header: 'Contact Info',
                        render: (c) => (
                            <div className="text-sm text-gray-600">
                                <div>{c.email}</div>
                                <div>{formatPhone(c.phone || '')}</div>
                            </div>
                        )
                    },
                    {
                        header: 'Balance',
                        className: 'text-right',
                        render: (c) => (
                            <div className="flex flex-col items-end">
                                <span className={c.balance < 0 ? 'text-red-600 font-bold' : (c.balance > 0 ? 'text-green-600 font-bold' : 'text-gray-500')}>
                                    {formatCurrency(c.balance)}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-gray-400">
                                    {c.balance < 0 ? '[ALACAKLI]' : (c.balance > 0 ? '[BORÇLU]' : '-')}
                                </span>
                            </div>
                        )
                    }
                ]}
                data={contacts}
                keyField="id"
                loading={isLoading || isRefetching}
                actions={(c) => (
                    <Link href={`/office/finance/contacts/${c.id}`} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded text-sm">
                        View
                    </Link>
                )}
                emptyMessage="No contacts found."
                pagination={{
                    current: page,
                    total: total,
                    limit: LIMIT,
                    onPageChange: (p) => setPage(p)
                }}
            />

            <CreateContactModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={async () => {
                    await queryClient.invalidateQueries({ queryKey: ['contacts'] });
                    setIsCreateModalOpen(false);
                }}
            />
        </div>
    );
}
