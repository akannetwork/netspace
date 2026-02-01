'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function AdminPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTenant, setEditingTenant] = useState<any>(null);

    // Form State
    const [form, setForm] = useState({
        name: '',
        slug: '',
        owner_name: '',
        owner_phone: '',
        owner_email: '',
        subscription_features: {
            office: true,
            inventory: true,
            finance: true,
            orders: true,
            personnel: true,
            go: false,
            portal: false,
            web: false
        }
    });

    const fetchTenants = async () => {
        setLoading(true);
        const res = await api.get('/platform/tenants');
        if (res.data) setTenants(res.data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm(`Create Tenant "${form.name}"?`)) return;

        const res = await api.post('/platform/tenants', form);
        if (res.error) {
            alert('Error: ' + res.error);
        } else {
            alert('Tenant Created Successfully!');
            setForm({
                name: '', slug: '', owner_name: '', owner_phone: '', owner_email: '',
                subscription_features: { office: true, inventory: true, finance: true, orders: true, personnel: true, go: false, portal: false, web: false }
            });
            fetchTenants();
        }
    };

    const handleUpdateTenant = async (id: string, updates: any) => {
        const res = await api.put(`/platform/tenants/${id}`, updates);
        if (res.error) {
            alert('Update failed');
        } else {
            setEditingTenant(null);
            fetchTenants(); // Refresh
        }
    };

    const handleDeleteTenant = async (id: string, name: string) => {
        // Double confirmation for safety
        if (!confirm(`DANGER: Are you sure you want to PERMANENTLY delete tenant "${name}"?\n\nThis will delete:\n- All users\n- All branch data\n- All storage files\n\nThere is no undo.`)) return;
        if (!confirm(`Please confirm again: DELETE "${name}"?`)) return;

        setLoading(true);
        const res = await api.delete(`/platform/tenants/${id}`);
        if (res.error) {
            alert('Delete failed: ' + res.error);
        } else {
            alert('Tenant Deleted Successfully.');
            fetchTenants();
        }
        setLoading(false);
    };

    const toggleFeature = (key: string) => {
        setForm(prev => ({
            ...prev,
            subscription_features: {
                ...prev.subscription_features,
                [key]: !(prev.subscription_features as any)[key]
            }
        }));
    };

    return (
        <div className="p-10 font-sans bg-gray-50 min-h-screen text-gray-900">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-red-700">Master Admin Terminal</h1>
                <p className="text-gray-600">terminal.netspace.tr / terminal.localhost</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Creation Form */}
                <div className="bg-white p-6 rounded shadow lg:col-span-1">
                    <h2 className="text-xl font-bold mb-4">Create New Tenant</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Store Name</label>
                            <input
                                type="text"
                                className="w-full border p-2 rounded"
                                placeholder="Store Name (e.g. My Cafe)"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700">Slug (Subdomain)</label>
                            <input
                                type="text"
                                className="w-full border p-2 rounded"
                                placeholder="slug (e.g. mycafe)"
                                value={form.slug}
                                onChange={e => setForm({ ...form, slug: e.target.value })}
                                required
                            />
                        </div>
                        <div className="pt-4 border-t">
                            <h3 className="font-bold text-sm mb-2">Initial Owner</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full border p-2 rounded mb-2"
                                    placeholder="Owner Name"
                                    value={form.owner_name}
                                    onChange={e => setForm({ ...form, owner_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Phone</label>
                                <input
                                    type="text"
                                    className="w-full border p-2 rounded mb-2"
                                    placeholder="+905..."
                                    value={form.owner_phone}
                                    onChange={e => setForm({ ...form, owner_phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Email (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full border p-2 rounded"
                                    placeholder="owner@example.com"
                                    value={form.owner_email}
                                    onChange={e => setForm({ ...form, owner_email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h3 className="font-bold text-sm mb-2">Features (Plan)</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.keys(form.subscription_features).map(key => (
                                    <label key={key} className="flex items-center gap-2 text-xs uppercase font-bold cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(form.subscription_features as any)[key]}
                                            onChange={() => toggleFeature(key)}
                                        />
                                        {key}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">
                            Create Tenant
                        </button>
                    </form>
                </div>

                {/* Tenants List */}
                <div className="bg-white p-6 rounded shadow lg:col-span-2">
                    <h2 className="text-xl font-bold mb-4">Existing Tenants ({tenants.length})</h2>
                    {loading ? <p>Loading...</p> : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 text-left">Slug</th>
                                        <th className="p-2 text-left">Name</th>
                                        <th className="p-2 text-left">Features</th>
                                        <th className="p-2 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tenants.map(t => (
                                        <tr key={t.id} className="border-b hover:bg-gray-50">
                                            <td className="p-2 font-mono text-blue-600">
                                                <a href={`http://${t.slug}.localhost:3000`} target="_blank" rel="noreferrer" className="underline">
                                                    {t.slug}
                                                </a>
                                            </td>
                                            <td className="p-2 font-bold">{t.name}</td>
                                            <td className="p-2 text-xs">
                                                {t.subscription_features && Object.entries(t.subscription_features).map(([k, v]) => (
                                                    v ? <span key={k} className="inline-block bg-green-100 text-green-800 px-1 rounded mr-1 mb-1">{k}</span> : null
                                                ))}
                                            </td>
                                            <td className="p-2 flex gap-2">
                                                <button
                                                    onClick={() => setEditingTenant(t)}
                                                    className="bg-gray-200 hover:bg-gray-300 p-2 rounded-full text-gray-700 transition"
                                                    title="Edit Tenant"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTenant(t.id, t.name)}
                                                    className="bg-red-50 hover:bg-red-200 p-2 rounded-full text-red-600 transition"
                                                    title="Delete Tenant"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Edit Modal */}
                {editingTenant && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">Edit Tenant: {editingTenant.name}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold">Features</label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {['office', 'inventory', 'finance', 'orders', 'personnel', 'go', 'portal', 'web'].map(key => {
                                            const isActive = editingTenant.subscription_features?.[key];
                                            return (
                                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isActive || false}
                                                        onChange={() => {
                                                            setEditingTenant({
                                                                ...editingTenant,
                                                                subscription_features: {
                                                                    ...editingTenant.subscription_features,
                                                                    [key]: !isActive
                                                                }
                                                            });
                                                        }}
                                                    />
                                                    <span className="uppercase text-xs font-bold">{key}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        onClick={() => setEditingTenant(null)}
                                        className="px-4 py-2 text-gray-600 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleUpdateTenant(editingTenant.id, { subscription_features: editingTenant.subscription_features })}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded font-bold"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
