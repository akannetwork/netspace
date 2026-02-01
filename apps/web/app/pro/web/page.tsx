'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function StudioPage() {
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const [localSettings, setLocalSettings] = useState<any>({
        site_title: '',
        logo_url: '',
        primary_color: '#4F46E5', // default
        hero_title: '',
        hero_description: ''
    });

    // 1. Fetch Settings
    const settingsQuery = useQuery({
        queryKey: ['studio', 'settings'],
        queryFn: async () => {
            const res = await api.get('/studio/settings');
            return res.data || {};
        }
    });

    // Sync local state when data loads
    useEffect(() => {
        if (settingsQuery.data) {
            setLocalSettings((prev: any) => ({ ...prev, ...settingsQuery.data }));
        }
    }, [settingsQuery.data]);

    // 2. Fetch Preview Products
    const productsQuery = useQuery({
        queryKey: ['studio', 'previewProducts'],
        queryFn: async () => {
            const res = await api.get('/office/products?limit=4'); // reuse products endpoint
            const list = res.data?.data || res.data || [];
            return list.slice(0, 4);
        }
    });

    const previewProducts = productsQuery.data || [];
    const loading = settingsQuery.isLoading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setMsg('');

        try {
            const res = await api.post('/studio/settings', localSettings);
            if (res.error) throw new Error(res.error);

            setMsg('Settings saved successfully!');
            await queryClient.invalidateQueries({ queryKey: ['studio', 'settings'] });

            setTimeout(() => setMsg(''), 3000);
        } catch (err: any) {
            setMsg('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setLocalSettings((prev: any) => ({ ...prev, [name]: value }));
    };

    if (loading) return <div className="p-8 text-gray-500">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Studio & Theme Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* SETTINGS FORM */}
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
                    <h2 className="text-lg font-bold border-b pb-2 mb-4">General Configuration</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Site Title</label>
                        <input
                            name="site_title"
                            value={localSettings.site_title || ''}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                            placeholder="My Awesome Store"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                        <input
                            name="logo_url"
                            value={localSettings.logo_url || ''}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                            placeholder="https://example.com/logo.png"
                        />
                        <p className="text-xs text-gray-400 mt-1">Paste an image URL here (Direct Upload coming soon).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                name="primary_color"
                                value={localSettings.primary_color || '#4F46E5'}
                                onChange={handleChange}
                                className="h-10 w-10 border p-1 rounded"
                            />
                            <input
                                name="primary_color"
                                value={localSettings.primary_color || ''}
                                onChange={handleChange}
                                className="flex-1 border p-2 rounded uppercase"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h3 className="font-bold mb-2">Homepage Hero</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hero Title</label>
                            <input
                                name="hero_title"
                                value={localSettings.hero_title || ''}
                                onChange={handleChange}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700">Hero Description</label>
                            <textarea
                                name="hero_description"
                                value={localSettings.hero_description || ''}
                                onChange={handleChange}
                                rows={2}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        {msg && <span className={`text-sm ${msg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</span>}
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>

                {/* LIVE PREVIEW (Simple Mockup) */}
                <div className="bg-gray-100 p-6 rounded border border-gray-200">
                    <h2 className="text-xs font-bold text-gray-400 uppercase mb-4 text-center">Live Preview (Mockup)</h2>

                    <div className="bg-white border rounded shadow-sm overflow-hidden min-h-[400px]">
                        {/* Mock Header */}
                        <div className="h-12 border-b flex items-center justify-between px-4">
                            <div className="font-bold text-lg" style={{ color: localSettings.primary_color }}>
                                {localSettings.logo_url ? <img src={localSettings.logo_url} alt="Logo" className="h-8 object-contain" /> : (localSettings.site_title || 'Site Name')}
                            </div>
                            <div className="flex gap-2 text-xs text-gray-500">
                                <span>Home</span>
                                <span>Shop</span>
                                <span>Cart</span>
                            </div>
                        </div>

                        {/* Mock Hero */}
                        <div className="bg-gray-50 p-8 text-center" style={{ backgroundColor: `${localSettings.primary_color}10` }}>
                            <h1 className="text-2xl font-bold mb-2 text-gray-800">{localSettings.hero_title || 'Welcome to our store'}</h1>
                            <p className="text-sm text-gray-600 max-w-xs mx-auto">{localSettings.hero_description || 'We sell the best products in town.'}</p>
                            <button
                                className="mt-4 px-4 py-2 text-white text-xs rounded"
                                style={{ backgroundColor: localSettings.primary_color }}
                            >
                                Shop Now
                            </button>
                        </div>

                        {/* Mock Products (REAL DATA) */}
                        <div className="p-4 grid grid-cols-2 gap-2">
                            {previewProducts.length === 0 ? (
                                <div className="col-span-2 text-xs text-gray-400 text-center py-4">No active products found.</div>
                            ) : previewProducts.map((p: any) => (
                                <div key={p.id} className="border rounded p-2">
                                    <div className="bg-gray-200 h-20 w-full mb-2 flex items-center justify-center text-xs text-gray-400">img</div>
                                    <div className="font-bold text-xs truncate">{p.name}</div>
                                    <div className="text-[10px] text-gray-500">{p.currency} {p.price}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
