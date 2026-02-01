'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/format';

import Link from 'next/link';

interface Personnel {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    status: string;
    role_name: string;
    balance: number;
    salary_type: string;
    base_salary: number;
    daily_rate: number;
}

export default function PersonnelPage() {
    const { currentBranch } = useBranch();
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role_id: '', // Optional for now
        salary_type: 'monthly',
        base_salary: '',
        daily_rate: ''
    });

    const { data, isLoading } = useQuery({
        queryKey: ['personnel', currentBranch?.id],
        enabled: !!currentBranch,
        queryFn: async () => {
            const res = await api.get(`/office/personnel?branch_id=${currentBranch?.id}`);
            return res.data || [];
        }
    });

    const personnel = (data || []) as Personnel[];
    const loading = isLoading;

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            await api.post('/office/personnel', {
                branch_id: currentBranch?.id,
                ...formData
            });
            setShowAddForm(false);
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                role_id: '',
                salary_type: 'monthly',
                base_salary: '',
                daily_rate: ''
            });
            queryClient.invalidateQueries({ queryKey: ['personnel'] });
        } catch (err) {
            alert('Failed to create personnel');
        }
    }

    if (!currentBranch) return <div>Please select a branch.</div>;
    const columns: Column<Personnel>[] = [
        { header: 'Name', render: (p) => <span className="font-medium">{p.first_name} {p.last_name}</span> },
        { header: 'Email', accessorKey: 'email' },
        { header: 'Phone', accessorKey: 'phone' },
        { header: 'Role', accessorKey: 'role_name', className: 'text-gray-500' },
        {
            header: 'Salary Model',
            render: (p) => (
                <div className="text-xs">
                    <span className="capitalize font-semibold">{p.salary_type || 'Monthly'}</span>
                    <div className="text-gray-500">
                        {p.base_salary > 0 && `Fix: ${p.base_salary} `}
                        {p.daily_rate > 0 && `Daily: ${p.daily_rate}`}
                    </div>
                </div>
            )
        },
        {
            header: 'Balance',
            render: (p) => (
                <span className={`font-bold ${p.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(p.balance || 0)}
                </span>
            )
        },
        {
            header: 'Status',
            render: (p) => (
                <span className={`px-2 py-1 rounded text-xs ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {p.status}
                </span>
            )
        },
        {
            header: 'Actions',
            render: (p) => (
                <Link href={`/office/personnel/${p.id}`} className="text-indigo-600 hover:underline text-sm font-medium">Manage</Link>
            )
        }
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Personnel</h1>
                    <p className="text-sm text-gray-500">Managing staff for: <span className="font-semibold text-indigo-600">{currentBranch.name}</span></p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/office/personnel/bulk-timesheet"
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition flex items-center"
                    >
                        Toplu Puantaj Gir
                    </Link>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                    >
                        Yeni Personel Ekle
                    </button>
                </div>
            </div>

            {/* Add Personnel Modal */}
            <Modal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                title="Yeni Personel Ekle"
                size="lg"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Vazgeç
                        </button>
                        <button
                            form="add-personnel-form"
                            type="submit"
                            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                        >
                            Kaydet
                        </button>
                    </>
                }
            >
                <form id="add-personnel-form" onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        placeholder="Ad (First Name)"
                        className="p-2 border rounded"
                        value={formData.first_name}
                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                        required
                    />
                    <input
                        placeholder="Soyad (Last Name)"
                        className="p-2 border rounded"
                        value={formData.last_name}
                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                        required
                    />
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">E-Posta</label>
                        <input
                            placeholder="Email"
                            type="email"
                            className="p-2 border rounded"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <PhoneInput
                            value={formData.phone}
                            onChange={val => setFormData({ ...formData, phone: val })}
                        />
                    </div>

                    {/* Salary Config */}
                    <div className="md:col-span-2 border-t pt-4 mt-2">
                        <h3 className="text-sm font-semibold mb-2 text-gray-700">Maaş & Ücret Yapılandırması</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <select
                                className="p-2 border rounded"
                                value={formData.salary_type}
                                onChange={e => setFormData({ ...formData, salary_type: e.target.value })}
                            >
                                <option value="monthly">Aylık Maaş</option>
                                <option value="daily">Günlük Yevmiye</option>
                                <option value="hybrid">Hibrit (Maaş + Yevmiye)</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Baz Maaş (Fix)"
                                className="p-2 border rounded"
                                value={formData.base_salary}
                                onChange={e => setFormData({ ...formData, base_salary: e.target.value })}
                            />
                            <input
                                type="number"
                                placeholder="Günlük Ücret"
                                className="p-2 border rounded"
                                value={formData.daily_rate}
                                onChange={e => setFormData({ ...formData, daily_rate: e.target.value })}
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            <DataTable
                columns={columns}
                data={personnel}
                keyField="id"
                loading={loading}
                emptyMessage="No personnel found in this branch."
            />
        </div>
    );
}
