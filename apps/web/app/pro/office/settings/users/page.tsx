
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBranch } from '@/context/branch-context';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

interface PermissionFlags {
    can_inventory: boolean;
    can_finance: boolean;
    can_orders: boolean;
    can_personnel: boolean;
    can_depo: boolean;
    can_go: boolean;
    can_portal: boolean;
    can_web: boolean;
    can_office: boolean;
}

interface UserMembership extends PermissionFlags {
    id: string;
    user_id: string;
    role: string;
    is_super_admin: boolean;
    created_at: string;
    personnel_id: string | null;
    authorized_branches: string[];
    permission_personnel?: {
        name: string;
        type: string;
    };
    users: {
        phone: string;
        email?: string;
    };
}

interface PersonnelCandidate {
    id: string;
    name: string;
    phone: string;
    email: string;
    type: string;
}

export default function UsersPage() {
    const queryClient = useQueryClient();
    const { branches } = useBranch();

    // Modals
    const { user } = useAuth();
    const permissions = (user as any)?.permissions || {};
    const isSuperAdmin = (user as any)?.is_super_admin;
    const canOffice = permissions.can_office || isSuperAdmin;
    const tenantFeatures = permissions._tenant_features || {
        office: true, inventory: true, finance: true, orders: true, personnel: true
    };
    const router = useRouter();

    useEffect(() => {
        if (!user) return;
        if (!canOffice) {
            router.push('/office');
        }
    }, [user, canOffice]);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Forms
    const [createForm, setCreateForm] = useState({
        personnel_id: '',
        password: '',
        permissions: {
            can_inventory: false,
            can_finance: false,
            can_orders: false,
            can_personnel: false,
            can_depo: false,
            can_go: false,
            can_portal: false,
            can_web: false,
            can_office: false,
        } as PermissionFlags,
        authorized_branches: [] as string[]
    });

    const [editingUser, setEditingUser] = useState<UserMembership | null>(null);

    // 1. Fetch Users
    const usersQuery = useQuery({
        queryKey: ['tenant-users'],
        queryFn: async () => {
            console.log('[UsersPage] Fetching users...');
            const res = await api.get('/office/users');
            if (res.error) {
                console.error('[UsersPage] Error fetching users:', res.error);
                throw new Error(res.error);
            }
            console.log('[UsersPage] Fetched users:', res.data);
            return res.data as UserMembership[];
        }
    });

    // 2. Fetch Candidates (only when modal opens potentially, but simpler here)
    const candidatesQuery = useQuery({
        queryKey: ['personnel-candidates'],
        queryFn: async () => {
            const res = await api.get('/office/personnel/users-candidates');
            if (res.error) throw new Error(res.error);
            return res.data as PersonnelCandidate[];
        },
        enabled: isCreateModalOpen
    });

    const users = usersQuery.data || [];
    const candidates = candidatesQuery.data || [];
    const isLoading = usersQuery.isLoading;

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();

        // VALİDASYON: En az bir yetki ve bir şube
        const hasPermission = Object.values(createForm.permissions).some(Boolean);
        if (!hasPermission) {
            toast.error('En az bir modül yetkisi seçmelisiniz.');
            return;
        }

        if (createForm.authorized_branches.length === 0) {
            toast.error('En az bir şube yetkisi seçmelisiniz.');
            return;
        }

        try {
            const res = await api.post('/office/users/from-personnel', createForm);
            if (res.error) throw new Error(res.error);

            toast.success('Kullanıcı başarıyla oluşturuldu');
            setIsCreateModalOpen(false);
            setCreateForm({
                personnel_id: '',
                password: '',
                permissions: {
                    can_inventory: false, can_finance: false, can_orders: false,
                    can_personnel: false, can_depo: false, can_go: false,
                    can_portal: false, can_web: false, can_office: false,
                },
                authorized_branches: []
            });
            queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
            queryClient.invalidateQueries({ queryKey: ['personnel-candidates'] });
        } catch (err: any) {
            toast.error(err.message || 'Oluşturma başarısız');
        }
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!editingUser) return;
        try {
            const res = await api.put(`/office/users/${editingUser.id}`, {
                permissions: {
                    can_inventory: editingUser.can_inventory,
                    can_finance: editingUser.can_finance,
                    can_orders: editingUser.can_orders,
                    can_personnel: editingUser.can_personnel,
                    can_depo: editingUser.can_depo,
                    can_go: editingUser.can_go,
                    can_portal: editingUser.can_portal,
                    can_web: editingUser.can_web,
                    can_office: editingUser.can_office,
                },
                authorized_branches: editingUser.authorized_branches
            });

            if (res.error) throw new Error(res.error);

            toast.success('Yetkiler güncellendi');
            setIsEditModalOpen(false);
            setEditingUser(null);
            queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
        } catch (err: any) {
            toast.error(err.message || 'Güncelleme başarısız');
        }
    }

    async function handleRemove(membershipId: string) {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/office/users/${membershipId}`);
            toast.success('Kullanıcı silindi');
            queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
            queryClient.invalidateQueries({ queryKey: ['personnel-candidates'] });
        } catch (err: any) {
            toast.error(err.message || 'Silme başarısız');
        }
    }

    const togglePerm = (key: keyof PermissionFlags, setFn: any, current: any) => {
        let newPerms = { ...current.permissions };
        const newVal = !newPerms[key];
        newPerms[key] = newVal;

        // Logic: Office Hierarchy
        const officeSubPerms = ['can_inventory', 'can_finance', 'can_orders', 'can_personnel', 'can_depo'];

        if (key === 'can_office') {
            // Toggle all children
            officeSubPerms.forEach(p => {
                newPerms[p as keyof PermissionFlags] = newVal;
            });
        } else if (officeSubPerms.includes(key as string)) {
            // If turning ON a child, ensure Office is ON
            if (newVal) {
                newPerms.can_office = true;
            } else {
                // If turning OFF a child, check if any other child is ON. If not, maybe turn off Office?
                // User said: "Alt sekmelerden hiç biri seçilmediyse ofis de kapansın."
                const anyChildActive = officeSubPerms.some(p => newPerms[p as keyof PermissionFlags]);
                if (!anyChildActive) {
                    newPerms.can_office = false;
                }
            }
        }

        setFn({ ...current, permissions: newPerms });
    };

    const toggleEditPerm = (key: keyof PermissionFlags) => {
        if (!editingUser) return;
        let newPerms = { ...editingUser };
        const newVal = !newPerms[key];
        (newPerms as any)[key] = newVal; // Update flat state

        // Logic: Office Hierarchy
        const officeSubPerms = ['can_inventory', 'can_finance', 'can_orders', 'can_personnel', 'can_depo'];

        if (key === 'can_office') {
            // Toggle all children
            officeSubPerms.forEach(p => {
                (newPerms as any)[p] = newVal;
            });
        } else if (officeSubPerms.includes(key as string)) {
            if (newVal) {
                newPerms.can_office = true;
            } else {
                const anyChildActive = officeSubPerms.some(p => (newPerms as any)[p]);
                if (!anyChildActive) {
                    newPerms.can_office = false;
                }
            }
        }

        setEditingUser(newPerms);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 font-serif tracking-tight">Kullanıcı Yönetimi</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="button button-primary fit-content h-10 px-4 flex items-center gap-2"
                >
                    + Personelden Kullanıcı Ekle
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <DataTable
                    columns={[
                        {
                            header: 'Personel / Kullanıcı',
                            render: (m) => (
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-900">
                                        {m.permission_personnel?.name || m.users.phone}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {m.permission_personnel?.type || 'Harici'} • {m.users.email || m.users.phone}
                                    </span>
                                </div>
                            )
                        },
                        {
                            header: 'Yetkili Şubeler',
                            render: (m) => (
                                <div className="text-xs max-w-[200px] flex flex-wrap gap-1">
                                    {m.is_super_admin ? (
                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">TÜM ŞUBELER</span>
                                    ) : m.authorized_branches?.length > 0 ? (
                                        m.authorized_branches.map(bId => {
                                            const b = branches.find(br => br.id === bId);
                                            return b ? (
                                                <span key={bId} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                    {b.name}
                                                </span>
                                            ) : null;
                                        })
                                    ) : (
                                        <span className="text-red-500 italic">Yetki Yok</span>
                                    )}
                                </div>
                            )
                        },
                        {
                            header: 'Erişim İzinleri',
                            render: (m) => (
                                <div className="flex flex-wrap gap-1 max-w-[400px]">
                                    {m.is_super_admin && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">SÜPER ADMIN</span>}

                                    {/* Office Group */}
                                    {m.can_office && (
                                        <div className="flex flex-wrap gap-1 p-1 border border-blue-100 rounded bg-blue-50/50">
                                            <span className="text-[10px] font-bold text-blue-800 mr-1">OFFICE:</span>
                                            {m.can_inventory && <span className="bg-white text-blue-700 px-1 rounded border shadow-sm text-[10px]">ENV</span>}
                                            {m.can_finance && <span className="bg-white text-emerald-700 px-1 rounded border shadow-sm text-[10px]">FİN</span>}
                                            {m.can_orders && <span className="bg-white text-indigo-700 px-1 rounded border shadow-sm text-[10px]">SİP</span>}
                                            {m.can_personnel && <span className="bg-white text-pink-700 px-1 rounded border shadow-sm text-[10px]">PER</span>}
                                            {m.can_depo && <span className="bg-white text-orange-700 px-1 rounded border shadow-sm text-[10px]">DEP</span>}
                                        </div>
                                    )}

                                    {m.can_go && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">GO</span>}
                                    {m.can_portal && <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold">PORTAL</span>}
                                    {m.can_web && <span className="bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded text-[10px] font-bold">WEB</span>}
                                </div>
                            )
                        },
                        {
                            header: 'İşlemler',
                            render: (m) => (
                                <div className="flex justify-end gap-2">
                                    <button
                                        disabled={m.is_super_admin}
                                        onClick={() => {
                                            setEditingUser(m);
                                            setIsEditModalOpen(true);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-widest disabled:opacity-30"
                                    >
                                        DÜZENLE
                                    </button>
                                    <button
                                        disabled={m.is_super_admin}
                                        onClick={() => handleRemove(m.id)}
                                        className="text-red-600 hover:text-red-800 text-xs font-bold uppercase tracking-widest disabled:opacity-30"
                                    >
                                        SİL
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    data={users}
                    keyField="id"
                    loading={isLoading}
                    emptyMessage="Henüz kullanıcı yok."
                />
            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900 font-serif">Personelden Kullanıcı Oluştur</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">PERSONEL SEÇİMİ</label>
                                    <select
                                        required
                                        className="w-full border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={createForm.personnel_id}
                                        onChange={e => setCreateForm({ ...createForm, personnel_id: e.target.value })}
                                    >
                                        <option value="">Personel Seçiniz...</option>
                                        {candidates.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.type}) - {c.phone}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">* Sadece kullanıcı hesabı olmayan personeller listelenir.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ŞİFRE BELİRLE</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Şifre"
                                        className="w-full border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={createForm.password}
                                        onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <label className="block text-xs font-bold text-gray-500 mb-2">ERİŞİM YETKİLERİ</label>
                            <div className="space-y-4">
                                {/* Office Group */}
                                <div className="border rounded-lg p-3 bg-gray-50/50">
                                    <label className="flex items-center gap-2 mb-3 cursor-pointer" title={!tenantFeatures.office ? "Paket yükseltin" : ""}>
                                        <input
                                            type="checkbox"
                                            checked={createForm.permissions.can_office}
                                            onChange={() => togglePerm('can_office', setCreateForm, createForm)}
                                            disabled={!tenantFeatures.office}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                        />
                                        <span className={`text-sm font-bold ${!tenantFeatures.office ? 'text-gray-400' : 'text-gray-900'}`}>[ OFFICE ] MODÜLLERİ</span>
                                    </label>

                                    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 pl-6 transition-all ${!createForm.permissions.can_office ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {[
                                            { k: 'can_finance', f: 'finance' },
                                            { k: 'can_orders', f: 'orders' },
                                            { k: 'can_inventory', f: 'inventory' },
                                            { k: 'can_personnel', f: 'personnel' },
                                            { k: 'can_depo', f: 'inventory' }
                                        ].map(item => {
                                            const isEnabled = tenantFeatures[item.f as keyof typeof tenantFeatures];
                                            return (
                                                <label key={item.k} className={`flex items-center gap-2 p-1.5 bg-white border rounded hover:border-indigo-300 cursor-pointer ${!isEnabled ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''}`} title={!isEnabled ? "Paket yükseltin" : ""}>
                                                    <input
                                                        type="checkbox"
                                                        checked={createForm.permissions[item.k as keyof PermissionFlags]}
                                                        onChange={() => togglePerm(item.k as keyof PermissionFlags, setCreateForm, createForm)}
                                                        disabled={!isEnabled}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-xs font-bold text-gray-600">{item.k.replace('can_', '').toUpperCase()}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Other Modules */}
                                <div className="flex gap-4">
                                    {[
                                        { k: 'can_go', f: 'go' },
                                        { k: 'can_portal', f: 'portal' },
                                        { k: 'can_web', f: 'web' }
                                    ].map(item => {
                                        const isEnabled = tenantFeatures[item.f as keyof typeof tenantFeatures];
                                        return (
                                            <label key={item.k} className={`flex items-center gap-2 px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer shadow-sm ${!isEnabled ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''}`} title={!isEnabled ? "Paket yükseltin" : ""}>
                                                <input
                                                    type="checkbox"
                                                    checked={createForm.permissions[item.k as keyof PermissionFlags]}
                                                    onChange={() => togglePerm(item.k as keyof PermissionFlags, setCreateForm, createForm)}
                                                    disabled={!isEnabled}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs font-bold text-gray-700 uppercase">[ {item.k.replace('can_', '')} ]</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">YETKİLİ SAYILAN ŞUBELER</label>
                                <div className="grid grid-cols-2 gap-2 border p-3 rounded-lg max-h-40 overflow-y-auto">
                                    {branches.map(b => (
                                        <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={createForm.authorized_branches.includes(b.id)}
                                                onChange={() => {
                                                    const current = createForm.authorized_branches;
                                                    const updated = current.includes(b.id)
                                                        ? current.filter(id => id !== b.id)
                                                        : [...current, b.id];
                                                    setCreateForm({ ...createForm, authorized_branches: updated });
                                                }}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700">{b.name} <span className="text-xs text-gray-400">({b.type})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-bold hover:bg-gray-50">İptal</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Kullanıcı Oluştur</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900 font-serif">Yetkileri Düzenle: {editingUser.permission_personnel?.name}</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-6">

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">ERİŞİM YETKİLERİ</label>
                                <div className="space-y-4">
                                    {/* Office Group */}
                                    <div className="border rounded-lg p-3 bg-gray-50/50">
                                        <label className="flex items-center gap-2 mb-3 cursor-pointer" title={!tenantFeatures.office ? "Paket yükseltin" : ""}>
                                            <input
                                                type="checkbox"
                                                checked={editingUser.can_office}
                                                onChange={() => toggleEditPerm('can_office')}
                                                disabled={!tenantFeatures.office}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                            />
                                            <span className={`text-sm font-bold ${!tenantFeatures.office ? 'text-gray-400' : 'text-gray-900'}`}>[ OFFICE ] MODÜLLERİ</span>
                                        </label>

                                        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 pl-6 transition-all ${!editingUser.can_office ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {[
                                                { k: 'can_finance', f: 'finance' },
                                                { k: 'can_orders', f: 'orders' },
                                                { k: 'can_inventory', f: 'inventory' },
                                                { k: 'can_personnel', f: 'personnel' },
                                                { k: 'can_depo', f: 'inventory' }
                                            ].map(item => {
                                                const isEnabled = tenantFeatures[item.f as keyof typeof tenantFeatures];
                                                return (
                                                    <label key={item.k} className={`flex items-center gap-2 p-1.5 bg-white border rounded hover:border-indigo-300 cursor-pointer ${!isEnabled ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''}`} title={!isEnabled ? "Paket yükseltin" : ""}>
                                                        <input
                                                            type="checkbox"
                                                            checked={(editingUser as any)[item.k]}
                                                            onChange={() => toggleEditPerm(item.k as keyof PermissionFlags)}
                                                            disabled={!isEnabled}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-xs font-bold text-gray-600">{item.k.replace('can_', '').toUpperCase()}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Other Modules */}
                                    <div className="flex gap-4">
                                        {[
                                            { k: 'can_go', f: 'go' },
                                            { k: 'can_portal', f: 'portal' },
                                            { k: 'can_web', f: 'web' }
                                        ].map(item => {
                                            const isEnabled = tenantFeatures[item.f as keyof typeof tenantFeatures];
                                            return (
                                                <label key={item.k} className={`flex items-center gap-2 px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer shadow-sm ${!isEnabled ? 'opacity-50 bg-gray-100 cursor-not-allowed' : ''}`} title={!isEnabled ? "Paket yükseltin" : ""}>
                                                    <input
                                                        type="checkbox"
                                                        checked={(editingUser as any)[item.k]}
                                                        onChange={() => toggleEditPerm(item.k as keyof PermissionFlags)}
                                                        disabled={!isEnabled}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-xs font-bold text-gray-700 uppercase">[ {item.k.replace('can_', '')} ]</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">YETKİLİ SAYILAN ŞUBELER</label>
                                <div className="grid grid-cols-2 gap-2 border p-3 rounded-lg max-h-40 overflow-y-auto">
                                    {branches.map(b => (
                                        <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingUser.authorized_branches?.includes(b.id)}
                                                onChange={() => {
                                                    const current = editingUser.authorized_branches || [];
                                                    const updated = current.includes(b.id)
                                                        ? current.filter(id => id !== b.id)
                                                        : [...current, b.id];
                                                    setEditingUser({ ...editingUser, authorized_branches: updated });
                                                }}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700">{b.name} <span className="text-xs text-gray-400">({b.type})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-bold hover:bg-gray-50">İptal</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Değişiklikleri Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
