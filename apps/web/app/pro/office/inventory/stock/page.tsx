'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';
import { DataTable } from '@/components/ui/DataTable';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

interface StockEntry {
    product_id: string;
    branch_id: string;
    quantity: number;
}

interface Product {
    id: string;
    name: string;
    sku: string;
}

export default function InventoryPage() {
    const { currentBranch } = useBranch();
    const queryClient = useQueryClient();

    // Tabs State
    const [activeType, setActiveType] = useState<'product' | 'material'>('product');

    // Pagination State
    const [page, setPage] = useState(1);
    const LIMIT = 20;

    // 1. Products Query (Paginated)
    const productsQuery = useQuery({
        queryKey: ['products', activeType, page, LIMIT], // Generic product list, not branch dependent (definitions)
        queryFn: async () => {
            const res = await api.get(`/office/products?product_type=${activeType}&page=${page}&limit=${LIMIT}`);
            if (res.error) throw new Error(res.error);
            const list = (Array.isArray(res.data) ? res.data : (res.data.data || [])) as Product[];
            const meta = res.data.meta || { total: list.length };
            return { list, meta };
        },
        placeholderData: keepPreviousData,
        staleTime: 60000 // 1 min (Products don't change often)
    });

    // 2. Inventory Query (Stock Levels for Branch)
    // TODO: Ideally populate this inside the product list on backend, or fetch stock for specific IDs
    const inventoryQuery = useQuery({
        queryKey: ['inventory', currentBranch?.id],
        enabled: !!currentBranch,
        queryFn: async () => {
            const res = await api.get(`/office/inventory?branch_id=${currentBranch?.id}`);
            return (res.data || []) as StockEntry[];
        },
        staleTime: 10000 // 10 secs (Stock changes often)
    });

    const products = productsQuery.data?.list || [];
    const total = productsQuery.data?.meta?.total || 0;
    const stocks = inventoryQuery.data || [];

    const isLoading = productsQuery.isLoading || inventoryQuery.isLoading || productsQuery.isRefetching;

    async function updateStock(productId: string, newQty: number) {
        if (!currentBranch) return;
        try {
            await api.post('/office/inventory/adjust', {
                branch_id: currentBranch.id,
                product_id: productId,
                quantity: newQty
            });

            // Invalidate inventory cache to refresh numbers
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        } catch (err) {
            alert('Failed to update stock');
        }
    }

    if (!currentBranch) return <div className="p-8">Please select a branch from header.</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Envanter: <span className="text-indigo-600">{currentBranch.name}</span></h1>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveType('product')}
                        className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeType === 'product' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        ÜRÜNLER
                    </button>
                    <button
                        onClick={() => setActiveType('material')}
                        className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeType === 'material' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        MALZEMELER
                    </button>
                </div>
            </div>

            <DataTable
                columns={[
                    { header: 'SKU', accessorKey: 'sku', className: 'font-mono text-xs' },
                    { header: 'Product', accessorKey: 'name', className: 'font-medium' },
                    {
                        header: 'Current Stock',
                        render: (p) => {
                            const stockEntry = stocks.find(s => s.product_id === p.id);
                            const qty = stockEntry ? stockEntry.quantity : 0;
                            return (
                                <span className={`font-bold ${qty < 5 ? 'text-red-500' : 'text-green-600'}`}>
                                    {qty}
                                </span>
                            );
                        }
                    },
                    {
                        header: 'Adjust',
                        render: (p) => {
                            const stockEntry = stocks.find(s => s.product_id === p.id);
                            const qty = stockEntry ? stockEntry.quantity : 0;
                            return (
                                <div className="flex items-center gap-2 justify-end">
                                    <button
                                        onClick={() => updateStock(p.id, qty - 1)}
                                        className="w-8 h-8 rounded bg-gray-100 border hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600"
                                    >-</button>
                                    <button
                                        onClick={() => {
                                            const val = prompt('Enter new stock quantity:', qty.toString());
                                            if (val !== null && val !== '') updateStock(p.id, parseInt(val));
                                        }}
                                        className="text-xs text-indigo-600 font-semibold underline px-2 hover:text-indigo-800"
                                    >
                                        Set
                                    </button>
                                    <button
                                        onClick={() => updateStock(p.id, qty + 1)}
                                        className="w-8 h-8 rounded bg-gray-100 border hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600"
                                    >+</button>
                                </div>
                            );
                        }
                    }
                ]}
                data={products}
                keyField="id"
                loading={isLoading}
                emptyMessage="No products found. Add products first."
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
