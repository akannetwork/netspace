'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/format';

import { useRouter } from 'next/navigation';
import { AddTransactionModal } from '@/components/office/AddTransactionModal';

export default function PersonnelDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const router = useRouter();
    const { currentBranch } = useBranch();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'info' | 'timesheet' | 'financial'>('timesheet');

    // Date State for Timesheet & Payroll
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year] = useState(new Date().getFullYear());

    // Transaction Pagination State
    const [trxPage] = useState(1);
    const [trxLimit] = useState(10);

    // UI Loading State
    const [isSaving, setIsSaving] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    // --- QUERIES ---

    // 1. Personnel Info
    const personnelQuery = useQuery({
        queryKey: ['personnel', id],
        queryFn: async () => {
            const res = await api.get(`/office/personnel/${id}`);
            if (res.error) throw new Error(res.error);
            return res.data;
        }
    });

    // 2. Timesheets
    const timesheetQuery = useQuery({
        queryKey: ['timesheets', id, month, year],
        queryFn: async () => {
            const res = await api.get(`/office/personnel/${id}/timesheets?month=${month}&year=${year}`);
            if (res.error) throw new Error(res.error);
            return res.data || [];
        }
    });

    // 3. Payroll Summary
    const payrollQuery = useQuery({
        queryKey: ['payroll', id, month, year],
        queryFn: async () => {
            const res = await api.get(`/office/personnel/${id}/payroll?month=${month}&year=${year}`);
            if (res.error) throw new Error(res.error);
            return res.data;
        }
    });

    // 4. Transactions
    const transactionsQuery = useQuery({
        queryKey: ['transactions', id, trxPage, trxLimit],
        queryFn: async () => {
            // Use the reliable Contact endpoint (Personnel are Contacts)
            const res = await api.get(`/office/contacts/${id}/transactions`);
            if (res.error) throw new Error(res.error);

            // Client-side pagination shim to match DataTable expectation
            const allData = res.data || [];
            const total = allData.length;
            const from = (trxPage - 1) * trxLimit;
            const to = from + trxLimit;
            const sliced = allData.slice(from, to);

            return {
                data: sliced,
                meta: {
                    total,
                    page: trxPage,
                    limit: trxLimit,
                    totalPages: Math.ceil(total / trxLimit)
                }
            };
        },
        placeholderData: (previousData: any) => previousData
    });

    const person = personnelQuery.data;
    const timesheets = timesheetQuery.data || [];
    const payroll = payrollQuery.data;

    // --- ACTIONS ---

    // Debounce Timers
    // Debounce Timers
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);
    const pendingUpdates = useRef<Record<string, any>>({});

    // --- ACTIONS ---

    function handleTimesheetClick(day: number) {
        if (!currentBranch) return;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Optimistic Update Helper
        const updateCache = (newEntry: any | null) => {
            queryClient.setQueryData(['timesheets', id, month, year], (old: any[]) => {
                const list = old ? [...old] : [];
                const idx = list.findIndex((t: any) => t.date === dateStr);
                if (newEntry) {
                    if (idx >= 0) list[idx] = newEntry;
                    else list.push(newEntry);
                } else if (idx >= 0) {
                    list.splice(idx, 1);
                }
                return list;
            });
        };

        // Find current status from Cache (not props, to be safe with rapid updates)
        const currentList = queryClient.getQueryData(['timesheets', id, month, year]) as any[] || [];
        const currentEntry = currentList.find((t: any) => t.date === dateStr);

        // Cycle Logic: Empty -> Present(1x) -> Present(2x) -> Leave -> Late -> Absent -> Empty
        let newStatus = 'present';
        let newMultiplier = 1.0;
        let action: 'upsert' | 'delete' = 'upsert';

        if (currentEntry) {
            const mult = Number(currentEntry.multiplier || 1);
            if (currentEntry.status === 'present' && mult < 1.5) {
                newStatus = 'present';
                newMultiplier = 2.0; // 2X
            } else if (currentEntry.status === 'present' && mult >= 1.5) {
                newStatus = 'leave';
            } else if (currentEntry.status === 'leave') {
                newStatus = 'late';
            } else if (currentEntry.status === 'late') {
                newStatus = 'absent';
            } else if (currentEntry.status === 'absent') {
                action = 'delete';
            }
        }

        // Apply Optimistic Update
        const optimisticEntry = action === 'delete' ? null : {
            id: currentEntry?.id || 'temp-id', // Use existing ID or temp
            personnel_id: id,
            date: dateStr,
            status: newStatus,
            multiplier: newMultiplier,
            created_at: new Date().toISOString() // Fake timestamp
        };
        updateCache(optimisticEntry);

        // Debounce API Call (Global Batch)
        pendingUpdates.current[dateStr] = {
            action,
            status: newStatus,
            multiplier: newMultiplier
        };

        if (saveTimeout.current) clearTimeout(saveTimeout.current);

        setIsSaving(true);
        saveTimeout.current = setTimeout(async () => {
            const updates = { ...pendingUpdates.current };
            pendingUpdates.current = {}; // Clear pending immediately

            try {
                // Execute all updates in parallel
                await Promise.all(Object.entries(updates).map(async ([date, data]: [string, any]) => {
                    if (data.action === 'delete') {
                        await api.delete(`/office/personnel/${id}/timesheets?date=${date}`);
                    } else {
                        await api.post('/office/personnel/timesheets', {
                            personnel_id: id,
                            date: date,
                            status: data.status,
                            multiplier: data.multiplier
                        });
                    }
                }));

                // Sync everything once after batch success
                queryClient.invalidateQueries({ queryKey: ['timesheets'] });
                queryClient.invalidateQueries({ queryKey: ['payroll'] });
                queryClient.invalidateQueries({ queryKey: ['personnel'] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['timesheets-bulk'] }); // Update Bulk View
            } catch (e) {
                console.error('Batch update failed', e);
                queryClient.invalidateQueries({ queryKey: ['timesheets'] }); // Revert on error
            } finally {
                setIsSaving(false);
            }
        }, 1500); // 1.5s Global Delay (Wait for user to stop clicking)
    }

    // handlePayment removed (replaced by Global Modal)

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this personnel? This action is irreversible and will delete all timesheets and transactions.')) return;

        try {
            await api.delete(`/office/personnel/${id}`);
            router.push('/office/personnel');
        } catch (e) {
            console.error(e);
            alert('Failed to delete personnel');
        }
    }


    if (personnelQuery.isLoading) return <div className="p-8">Loading...</div>;
    if (personnelQuery.isError) {
        const err = personnelQuery.error as any;
        return (
            <div className="p-8 text-red-600">
                <h2 className="text-xl font-bold">Error Loading Personnel</h2>
                <p>ID: {id}</p>
                <div className="bg-red-50 p-4 rounded mt-4 text-sm font-mono whitespace-pre-wrap">
                    <p><strong>Message:</strong> {err.message}</p>
                    {err.response && (
                        <>
                            <p><strong>Status:</strong> {err.response.status}</p>
                            <p><strong>Data:</strong> {JSON.stringify(err.response.data, null, 2)}</p>
                        </>
                    )}
                </div>
            </div>
        );
    }
    if (!person) return <div className="p-8">Personnel not found (Data is null) - ID: {id}</div>;

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (

        <div>
            {/* Saving Indicator - Slide Up/Down Animation */}
            <div className={`fixed bottom-0 left-0 right-0 flex z-50 items-center gap-2 bg-blue-500 justify-center px-3 py-2 transition-transform duration-300 ease-in-out ${isSaving ? 'translate-y-0' : 'translate-y-full'}`}>
                <span className="text-xs font-bold text-white">PUANTAJLAR İŞLENİYOR...</span>
            </div>

            <div className="max-w-6xl mx-auto space-y-6 relative">


                {/* Header */}
                <div className="bg-white p-6 rounded shadow flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {person.first_name} {person.last_name}
                            <span className={`text-xs px-2 py-1 rounded ${person.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 px'}`}>{person.status}</span>
                        </h1>
                        <div className="text-gray-500 mt-1 flex gap-4 text-sm">
                            <span>{person.phone}</span>
                            <span>{person.email}</span>
                            <span className="capitalize">{person.role_name}</span>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                        <div>
                            <div className="text-sm text-gray-500">Current Balance</div>
                            <div className={`text-2xl font-bold ${person.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(person.balance)}
                            </div>
                        </div>
                        <button
                            onClick={handleDelete}
                            className="text-xs text-red-600 underline hover:text-red-800"
                        >
                            Delete Personnel
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b">
                    <button onClick={() => setActiveTab('info')} className={`pb-2 px-1 ${activeTab === 'info' ? 'border-b-2 border-indigo-600 font-bold' : 'text-gray-500'}`}>Info</button>
                    <button onClick={() => setActiveTab('timesheet')} className={`pb-2 px-1 ${activeTab === 'timesheet' ? 'border-b-2 border-indigo-600 font-bold' : 'text-gray-500'}`}>Puantaj (Timesheet)</button>
                    <button onClick={() => setActiveTab('financial')} className={`pb-2 px-1 ${activeTab === 'financial' ? 'border-b-2 border-indigo-600 font-bold' : 'text-gray-500'}`}>Financials</button>
                </div>

                {/* TIMESHEET TAB */}
                {activeTab === 'timesheet' && (
                    <div className="bg-white p-6 rounded shadow">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex gap-2 items-center">
                                <button onClick={() => setMonth(m => m === 1 ? 12 : m - 1)} className="p-1 hover:bg-gray-100 rounded">&lt;</button>
                                <span className="font-bold w-32 text-center">{new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}</span>
                                <button onClick={() => setMonth(m => m === 12 ? 1 : m + 1)} className="p-1 hover:bg-gray-100 rounded">&gt;</button>
                            </div>

                            <div className="flex gap-4 text-xs">
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Vari (1x)</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-600 rounded"></div> 2X</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded"></div> İzinli</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-400 rounded"></div> Geç</span>
                                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded"></div> Yok</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2 mb-2 text-center font-bold text-gray-500 text-sm">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {daysArray.map(d => {
                                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const entry = timesheets.find((t: any) => t.date === dateStr);

                                let bgClass = 'bg-gray-50 border-gray-200';
                                let text = d.toString();

                                if (entry) {
                                    if (entry.status === 'present') {
                                        bgClass = entry.multiplier > 1 ? 'bg-purple-600 text-white border-purple-700' : 'bg-green-500 text-white border-green-600';
                                        text = entry.multiplier > 1 ? '2X' : d.toString();
                                    } else if (entry.status === 'leave') bgClass = 'bg-blue-400 text-white border-blue-500';
                                    else if (entry.status === 'late') bgClass = 'bg-orange-400 text-white border-orange-500';
                                    else if (entry.status === 'absent') bgClass = 'bg-red-400 text-white border-red-500';
                                }

                                return (
                                    <button
                                        key={d}
                                        onClick={() => handleTimesheetClick(d)}
                                        className={`h-16 rounded border flex items-center justify-center text-lg font-bold transition hover:opacity-80 ${bgClass}`}
                                    >
                                        {text}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Summary Footer */}
                        <div className="mt-8 border-t pt-4">
                            <h3 className="font-bold mb-2">Payroll Preview</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="p-3 bg-gray-50 rounded">
                                    <div className="text-gray-500">Working Days</div>
                                    <div className="font-bold text-lg">{payroll?.days_worked || 0}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <div className="text-gray-500">Daily Rate</div>
                                    <div className="font-bold text-lg">{formatCurrency(payroll?.daily_rate || 0)}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                    <div className="text-gray-500">Base Salary</div>
                                    <div className="font-bold text-lg">{formatCurrency(payroll?.base_salary || 0)}</div>
                                </div>
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded">
                                    <div className="text-indigo-600">Estimate Total</div>
                                    <div className="font-bold text-xl text-indigo-700">{formatCurrency(payroll?.total_earnings || 0)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FINANCIALS TAB */}
                {activeTab === 'financial' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Contact Info */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Contact Info</h3>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <label className="block text-gray-500 text-xs uppercase">Phone</label>
                                        <div className="font-medium">{person.phone || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 text-xs uppercase">Email</label>
                                        <div className="font-medium">{person.email || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 text-xs uppercase">Tax ID</label>
                                        <div className="font-medium">{person.tax_id || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 text-xs uppercase">Address</label>
                                        <div className="text-gray-700 whitespace-pre-line">{person.address ? (typeof person.address === 'string' ? person.address : JSON.stringify(person.address)) : '-'}</div>
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

                                    <p className="text-xs text-gray-400 mt-2 text-center">
                                        Use "Add Transaction" for Salaries, Advances, and Expenses.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Transaction History */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="font-bold text-lg">Transaction History</h2>
                                    <span className="text-sm text-gray-500">{(transactionsQuery.data as any)?.meta?.total || 0} Records</span>
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
                                            {((transactionsQuery.data as any)?.data || []).map((tx: any) => (
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
                                    {(!transactionsQuery.data || (transactionsQuery.data as any).data?.length === 0) && (
                                        <div className="p-8 text-center text-gray-500">
                                            No transactions found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="bg-white p-6 rounded shadow">
                        <pre className="text-xs bg-gray-50 p-4 rounded">{JSON.stringify(person, null, 2)}</pre>
                    </div>
                )}
            </div>

            <AddTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['transactions'] });
                    queryClient.invalidateQueries({ queryKey: ['personnel'] });
                }}
                contactId={person.id}
                contactName={`${person.first_name} ${person.last_name}`}
            />
        </div >
    );
}
