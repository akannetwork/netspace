
'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/format';
import { useBranch } from '@/context/branch-context';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { OrderDetailContent } from '@/components/office/OrderDetailContent';

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    total_amount: number;
    currency: string;
    status: string;
    channel: string;
    created_at: string;
    payment_status?: string;
    payment_method?: string;
}

export default function OrdersPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Pagination State (URL Driven)
    const page = Number(searchParams.get('page')) || 1;
    const LIMIT = 5;

    // View State (Local)
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    // Filter State
    const { currentBranch, branches } = useBranch();
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('');

    // Update URL helper
    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleViewOrder = (id: string) => {
        setSelectedOrderId(id);
    };

    // React Query
    const { data: queryData, isLoading, isRefetching } = useQuery({
        queryKey: ['orders', currentBranch?.id, page, selectedBranchFilter],
        queryFn: async () => {
            // Build query string
            let query = `/office/orders?page=${page}&limit=${LIMIT}`;
            const isCurrentBranchHQ = currentBranch && (currentBranch.type === 'hq' || currentBranch.type === 'headquarters' || (currentBranch as any).is_main);

            if (selectedBranchFilter) {
                query += `&branch_id=${selectedBranchFilter}`;

                // If filtering specifically by HQ, send flag
                if (isCurrentBranchHQ && selectedBranchFilter === currentBranch?.id) {
                    query += `&is_hq=true`;
                }
            } else {
                // No filter selected (Default View)
                // If I am HQ, I should see everything by default
                if (isCurrentBranchHQ) {
                    query += `&is_hq=true`;
                }
            }

            const res = await api.get(query);
            // Handle new response structure { data, meta }
            // Fallback for old structure if API not ready
            const list = (Array.isArray(res.data) ? res.data : res.data.data) as Order[];
            const meta = res.data.meta || { total: list.length };
            return { list, meta };
        },
        placeholderData: keepPreviousData,
        staleTime: 30000
    });

    const orders: Order[] = queryData?.list || [];
    const total = queryData?.meta?.total || 0;
    const loading = isLoading;

    // Reset pagination when filter changes
    const isMounted = useRef(false);
    useEffect(() => {
        if (isMounted.current) {
            handlePageChange(1);
        } else {
            isMounted.current = true;
        }
    }, [selectedBranchFilter]);

    if (loading && orders.length === 0) return <div className="p-8">Loading orders...</div>;

    return (
        <div className="p-6 min-w-0 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Orders Management</h1>
                <Link
                    href="/office/orders/service"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-100 animate-in fade-in slide-in-from-right-4 duration-500 hover:bg-indigo-700 transition-all"
                >
                    + Yeni Hizmet Siparişi
                </Link>
            </div>

            {/* Branch Filter UI
            {(branches.length > 1 || (currentBranch as any)?.type === 'hq') && (
                <div className="mb-4 flex gap-4">
                    <select
                        className="border rounded p-2 text-sm"
                        value={selectedBranchFilter}
                        onChange={e => setSelectedBranchFilter(e.target.value)}
                    >
                        <option value="">All Branches</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            )}
            */}

            <DataTable
                columns={[
                    { header: 'Order #', accessorKey: 'order_number', className: 'font-bold' },
                    {
                        header: 'Source',
                        render: (o) => {
                            let label = 'Unknown';
                            let colorClass = 'bg-gray-100 text-gray-800';

                            // Check channel
                            if (o.channel === 'pos' || o.channel === 'store') {
                                label = 'POS / STORE';
                                colorClass = 'bg-purple-100 text-purple-800';
                            } else if (o.channel === 'web') {
                                label = 'ONLINE STORE';
                                colorClass = 'bg-blue-100 text-blue-800';
                            } else if (o.channel === 'marketplace') {
                                label = 'MARKETPLACE';
                                colorClass = 'bg-orange-100 text-orange-800';
                            }

                            return (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
                                    {label}
                                </span>
                            )
                        }
                    },
                    {
                        header: 'Customer',
                        render: (o) => (
                            <div>
                                <div className="font-medium text-gray-900">{o.customer_name}</div>
                                <div className="text-xs text-gray-500">{o.customer_email}</div>
                            </div>
                        )
                    },
                    {
                        header: 'Total',
                        className: 'font-mono',
                        render: (o) => formatCurrency(o.total_amount, o.currency)
                    },
                    {
                        header: 'Payment',
                        render: (o) => (
                            <div className="flex flex-col">
                                <span className="text-sm font-medium capitalize">
                                    {(o.payment_method === 'credit_card' ? 'Kredi Kartı' :
                                        o.payment_method === 'cash' ? 'Nakit' :
                                            o.payment_method === 'check' ? 'Çek' :
                                                o.payment_method === 'eft' ? 'EFT / Havale' :
                                                    o.payment_method === 'credit' ? 'Veresiye / Cari' :
                                                        o.payment_method?.replace('_', ' ') || '-')}
                                </span>
                                <span className={`text-xs font-semibold ${o.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                                    {o.payment_status ? (
                                        o.payment_status === 'paid' ? 'ÖDENDİ' :
                                            o.payment_status === 'pending' ? 'BEKLİYOR' :
                                                o.payment_status.toUpperCase()
                                    ) : 'BEKLİYOR'}
                                </span>
                            </div>
                        )
                    },
                    {
                        header: 'Status',
                        render: (o) => (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${o.status === 'new' ? 'bg-blue-100 text-blue-800' : ''}
                                ${o.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : ''}
                                ${o.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' : ''}
                                ${o.status === 'delivered' ? 'bg-green-100 text-green-800' : ''}
                                ${o.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                            `}>
                                {o.status.toUpperCase()}
                            </span>
                        )
                    },
                    {
                        header: 'Tarih',
                        className: 'text-gray-500 text-sm',
                        render: (o) => new Date(o.created_at).toLocaleString()
                    }
                ]}
                data={orders}
                keyField="id"
                loading={loading || isRefetching}
                actions={(o) => (
                    <button
                        onClick={() => handleViewOrder(o.id)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                    >
                        View Details
                    </button>
                )}
                emptyMessage="No orders found."
                pagination={{
                    current: page,
                    total: total,
                    limit: LIMIT,
                    onPageChange: (p) => handlePageChange(p)
                }}
                className={loading ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}
            />

            <Modal
                isOpen={!!selectedOrderId}
                onClose={() => setSelectedOrderId(null)}
                title={selectedOrderId ? `Order Details` : ''}
                size="xl"
            >
                {selectedOrderId && (
                    <OrderDetailContent
                        orderId={selectedOrderId}
                    />
                )}
            </Modal>
        </div>
    );
}
