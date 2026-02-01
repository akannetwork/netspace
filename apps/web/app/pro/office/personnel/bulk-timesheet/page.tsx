'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const MONTH_NAMES = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function BulkTimesheetPage() {
    const queryClient = useQueryClient();
    // Use fixed initial state or ensure hydration matches.
    // Using a predictable default for server/client match if needed, but 'now' is usually safe for month unless crossing midnight.
    // The issue is toLocaleString locale.
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year] = useState(now.getFullYear());
    const [isSaving, setIsSaving] = useState(false);

    // Dictionaries for pending updates
    // Key: "personnelId-date" (e.g. "uuid-2026-01-01")
    // Value: Timesheet Object
    const pendingUpdates = useRef<Record<string, any>>({});
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    // --- QUERIES ---
    const personnelQuery = useQuery({
        queryKey: ['personnel'],
        queryFn: async () => {
            const res = await api.get('/office/personnel?limit=100'); // Fetch enough for bulk view
            return res.data;
        }
    });

    // Handle different API response structures (Pagination wrapper vs Direct array)
    const rawPersonnel = personnelQuery.data as any;
    const personnelList = Array.isArray(rawPersonnel) ? rawPersonnel : (rawPersonnel?.data || []);

    const timesheetsQuery = useQuery({
        queryKey: ['timesheets-bulk', month, year], // Changed key to avoid conflict or forcing fresh
        queryFn: async () => {
            // Fetch Timesheets
            const res = await api.get(`/office/timesheets?month=${month}&year=${year}`);
            if (res.error) throw new Error(res.error);
            return res.data;
        }
    });

    const timesheetsRaw = timesheetsQuery.data as any;
    const timesheets = Array.isArray(timesheetsRaw) ? timesheetsRaw : (timesheetsRaw?.data || []);

    // Debug log (Client side only)
    if (typeof window !== 'undefined') {
        console.log('Bulk Timesheets Data:', timesheets);
    }

    // --- LOGIC ---
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleCellClick = (personId: string, day: number, currentStatus?: string, currentMultiplier?: number) => {
        // Cycle: Empty -> Present(1x) -> Present(2x) -> Leave -> Late -> Absent -> Present(1x)

        let nextStatus: 'present' | 'leave' | 'late' | 'absent' | undefined = 'present';
        let nextMultiplier = 1.0;

        if (!currentStatus) {
            // Empty -> 1x
            nextStatus = 'present';
            nextMultiplier = 1.0;
        } else if (currentStatus === 'present' && currentMultiplier === 1.0) {
            // 1x -> 2x
            nextStatus = 'present';
            nextMultiplier = 2.0;
        } else if (currentStatus === 'present' && currentMultiplier === 2.0) {
            // 2x -> Leave
            nextStatus = 'leave';
        } else if (currentStatus === 'leave') {
            // Leave -> Late
            nextStatus = 'late';
        } else if (currentStatus === 'late') {
            // Late -> Absent
            nextStatus = 'absent';
        } else if (currentStatus === 'absent') {
            // Absent -> Present (1x)
            nextStatus = 'present'; // Skip Empty, cycle to Present
            // WORKAROUND: Infinite cycle. Better UX than broken Delete.
        }

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const key = `${personId}-${dateStr}`;

        // Optimistic Update
        queryClient.setQueryData(['timesheets-bulk', month, year], (old: any) => {
            const oldData = Array.isArray(old) ? old : (old?.data || []);
            const newData = [...oldData];
            const idx = newData.findIndex(t => t.personnel_id === personId && t.date === dateStr);

            const newEntry = {
                personnel_id: personId,
                tenant_id: 'optimistic', // Placeholder
                date: dateStr,
                status: nextStatus,
                multiplier: nextMultiplier
            };

            if (idx >= 0) {
                newData[idx] = { ...newData[idx], ...newEntry };
            } else {
                newData.push(newEntry);
            }
            return newData;
        });

        // Queue for Batch Save
        pendingUpdates.current[key] = {
            personnel_id: personId,
            date: dateStr,
            status: nextStatus,
            multiplier: nextMultiplier
        };

        // Trigger Debounce
        triggerSave();
    };

    const triggerSave = () => {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        setIsSaving(true);

        saveTimeout.current = setTimeout(async () => {
            const updates = Object.values(pendingUpdates.current);
            pendingUpdates.current = {}; // Clear

            if (updates.length === 0) {
                setIsSaving(false);
                return;
            }

            try {
                // Send to Bulk API
                await api.post('/office/personnel/timesheets/bulk', updates);

                // Invalidate
                queryClient.invalidateQueries({ queryKey: ['timesheets-bulk'] });
                queryClient.invalidateQueries({ queryKey: ['timesheets'] }); // Individual headers
                queryClient.invalidateQueries({ queryKey: ['payroll'] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['personnel'] }); // Update Balances in List View

            } catch (e) {
                console.error('Bulk save failed', e);
                alert('Kaydetme hatası!');
            } finally {
                setIsSaving(false);
            }
        }, 1500);
    };


    return (
        <div className="p-6">
            {/* Saving Indicator */}
            <div className={`fixed bottom-0 left-0 right-0 flex z-50 items-center gap-2 bg-blue-500 justify-center px-3 py-2 transition-transform duration-300 ease-in-out ${isSaving ? 'translate-y-0' : 'translate-y-full'}`}>
                <span className="text-xs font-bold text-white">PUANTAJLAR İŞLENİYOR...</span>
            </div>

            <div className="bg-white rounded shadow p-4 overflow-x-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Toplu Puantaj Girişi</h1>

                    <div className="flex gap-2 items-center">
                        <button onClick={() => setMonth(m => m === 1 ? 12 : m - 1)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">&lt;</button>
                        <span className="font-bold w-32 text-center text-lg">{MONTH_NAMES[month - 1]} {year}</span>
                        <button onClick={() => setMonth(m => m === 12 ? 1 : m + 1)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">&gt;</button>
                    </div>
                </div>

                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="p-2 border bg-gray-50 text-left min-w-[200px]">Personel</th>
                            {daysArray.map(d => (
                                <th key={d} className="p-1 border bg-gray-50 w-8 text-center">{d}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {personnelList.map((person: any) => (
                            <tr key={person.id} className="hover:bg-gray-50 transition">
                                <td className="p-2 border font-medium">
                                    <div className="font-bold">{person.first_name} {person.last_name}</div>
                                    <div className="text-gray-400 text-[10px]">{person.role_name}</div>
                                </td>
                                {daysArray.map(d => {
                                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                                    // Robust Date Matching (Handle "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm...")
                                    const entry = timesheets.find((t: any) =>
                                        (t.personnel_id === person.id) &&
                                        (t.date === dateStr || t.date?.startsWith(dateStr))
                                    );

                                    let bgClass = 'bg-white hover:bg-gray-100';
                                    let content = '';

                                    if (entry) {
                                        if (entry.status === 'present') {
                                            bgClass = entry.multiplier > 1 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-green-500 text-white hover:bg-green-600';
                                            content = entry.multiplier > 1 ? '2X' : '1X';
                                        } else if (entry.status === 'leave') {
                                            bgClass = 'bg-blue-400 text-white hover:bg-blue-500';
                                            content = 'İZ';
                                        } else if (entry.status === 'late') {
                                            bgClass = 'bg-orange-400 text-white hover:bg-orange-500';
                                            content = 'GÇ';
                                        } else if (entry.status === 'absent') {
                                            bgClass = 'bg-red-400 text-white hover:bg-red-500';
                                            content = 'YK';
                                        }
                                    }

                                    return (
                                        <td key={d} className="border text-center p-0">
                                            <button
                                                onClick={() => handleCellClick(person.id, d, entry?.status, entry?.multiplier)}
                                                className={`w-full h-10 flex items-center justify-center font-bold transition-colors ${bgClass}`}
                                            >
                                                {content}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
