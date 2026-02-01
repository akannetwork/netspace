'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';
import { DataTable } from '@/components/ui/DataTable';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

/* 
  NOTE: This is a utilitarian implementation focused on functionality.
  Design is minimal as requested.
*/

interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    currency: string;
    unit?: string;
    product_type: 'product' | 'service';
    categories: { name: string } | null;
    channels: string[];
    is_active: boolean;
}

export default function ProductListPage() {
    const [activeType, setActiveType] = useState<'product' | 'material' | 'service'>('product');

    // Pagination State
    const [page, setPage] = useState(1);
    const LIMIT = 20; // Matches backend default

    // React Query
    const { data: queryData, isLoading, error, isRefetching } = useQuery({
        queryKey: ['products', activeType, page], // Cache key depends on type and page
        queryFn: async () => {
            const query = `/office/products?product_type=${activeType}&page=${page}&limit=${LIMIT}`;
            const res = await api.get(query);
            if (res.error) throw new Error(res.error);

            // Normalize Response
            const list = (Array.isArray(res.data) ? res.data : (res.data.data || [])) as Product[];
            const meta = res.data.meta || { total: list.length };

            return { list, meta };
        },
        placeholderData: keepPreviousData, // Keep showing previous page data while fetching new one
        staleTime: 30000, // 30 seconds fresh
    });

    const queryClient = useQueryClient();

    const products: Product[] = queryData?.list || [];
    const total = queryData?.meta?.total || 0;

    async function handleDelete(id: string) {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/office/products/${id}`);
            // Invalidate cache to refetch automatically
            queryClient.invalidateQueries({ queryKey: ['products'] });
        } catch (err) {
            alert('Failed to delete');
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Katalog</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Ürün, Malzeme ve Hizmet Tanımları</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                        {(['product', 'material', 'service'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => { setActiveType(t); setPage(1); }}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {t === 'product' ? 'Ürünler' : t === 'material' ? 'Malzemeler' : 'Hizmetler'}
                            </button>
                        ))}
                    </div>

                    <Link
                        href="/office/inventory/products/new"
                        className="bg-black text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-gray-800 transition-all shadow-lg active:scale-95 uppercase tracking-widest"
                    >
                        + YENİ EKLE
                    </Link>
                </div>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{(error as Error).message}</div>}

            <DataTable
                columns={[
                    { header: 'SKU', accessorKey: 'sku', className: 'font-mono text-xs' },
                    { header: 'Name', accessorKey: 'name', className: 'font-medium text-gray-900' },
                    { header: 'Category', render: (p) => <span className="text-gray-600">{p.categories?.name || '-'}</span> },
                    {
                        header: 'Price',
                        className: 'font-mono',
                        render: (p) => (
                            <span>
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: p.currency }).format(p.price)}
                                <span className="text-gray-400 text-xs ml-1">/ {p.unit || 'pcs'}</span>
                            </span>
                        )
                    },
                    {
                        header: 'Channels',
                        render: (p) => (
                            <div className="flex gap-1 flex-wrap w-32">
                                {p.channels?.map(c => (
                                    <span key={c} className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded border border-blue-200">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        )
                    },
                    {
                        header: 'Type',
                        render: (p) => (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${p.product_type === 'service' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {p.product_type === 'service' ? 'Hizmet' : 'Ürün'}
                            </span>
                        )
                    },
                    {
                        header: 'Status',
                        render: (p) => p.is_active ?
                            <span className="text-green-600 font-bold text-xs">Active</span> :
                            <span className="text-gray-400 font-bold text-xs">Inactive</span>
                    }
                ]}
                data={products}
                keyField="id"
                loading={isLoading || isRefetching}
                actions={(p) => (
                    <div className="flex gap-3">
                        {p.product_type === 'service' && (
                            <Link
                                href={`/office/inventory/products/${p.id}/attributes`}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-bold"
                            >
                                Özellikler
                            </Link>
                        )}
                        <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
                    </div>
                )}
                emptyMessage="No products found. Create one."
                pagination={{
                    current: page,
                    total: total,
                    limit: LIMIT,
                    onPageChange: (p) => setPage(p)
                }}
            />
        </div>
    );
}
