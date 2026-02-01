'use client';

import { api } from '@/lib/api';
import { KPICard } from '@/components/dashboard/KPICard';
import { useQuery } from '@tanstack/react-query';
import {
    CurrencyDollarIcon,
    ShoppingBagIcon,
    CubeIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';

export default function DashboardPage() {

    // 1. Stats
    const statsQuery = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            const res = await api.get('/office/dashboard/stats');
            return res.data || {};
        }
    });

    // 2. Recent Orders
    const recentOrdersQuery = useQuery({
        queryKey: ['dashboard', 'recentOrders'],
        queryFn: async () => {
            const res = await api.get('/office/dashboard/recent-orders');
            return res.data || [];
        }
    });

    // 3. Low Stock (Client Side Branch Logic for URL)
    const lowStockQuery = useQuery({
        queryKey: ['dashboard', 'lowStock'],
        queryFn: async () => {
            const branchId = localStorage.getItem('hauze_branch_id') || '';
            const res = await api.get(`/office/dashboard/low-stock?branch_id=${branchId}`);
            return res.data || [];
        }
    });

    const stats = statsQuery.data;
    const recentOrders = recentOrdersQuery.data || [];
    const lowStock = lowStockQuery.data || [];
    const loading = statsQuery.isLoading;

    if (loading) return <div className="p-8">Loading dashboard...</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Total Revenue"
                    value={formatCurrency(stats?.totalRevenue || 0)}
                    icon={CurrencyDollarIcon}
                    color="green"
                    trend="+12%"
                    trendType="up"
                />
                <KPICard
                    title="Total Orders"
                    value={stats?.totalOrders}
                    icon={ShoppingBagIcon}
                    color="indigo"
                    trend="+5%"
                    trendType="up"
                />
                <KPICard
                    title="Active Products"
                    value={stats?.totalProducts}
                    icon={CubeIcon}
                    color="blue"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Orders */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
                        <span>Recent Orders</span>
                        <Link href="/office/orders" className="text-sm text-indigo-600 hover:underline">View All</Link>
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3">Order</th>
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentOrders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono">{order.order_number}</td>
                                        <td className="px-4 py-3">{order.customer_name}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(order.total_amount, order.currency)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs uppercase font-bold text-[10px]">
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Low Stock Alert */}
                <div className="bg-white rounded-lg shadow-sm border border-orange-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ExclamationTriangleIcon className="w-24 h-24 text-orange-500" />
                    </div>
                    <h2 className="text-lg font-bold mb-4 text-orange-800 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        Low Stock Alert
                    </h2>

                    {lowStock && lowStock.length === 0 ? (
                        <p className="text-gray-500">All stock levels are healthy.</p>
                    ) : (
                        <div className="space-y-3">
                            {lowStock?.map((p: any) => (
                                <div key={p.id} className="flex justify-between items-center bg-orange-50/50 p-3 rounded border border-orange-100">
                                    <div>
                                        <div className="font-medium text-gray-900">{p.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{p.sku}</div>
                                    </div>
                                    <div className="text-red-600 font-bold bg-white px-2 py-1 rounded shadow-sm text-sm">
                                        {p.quantity} Left
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
