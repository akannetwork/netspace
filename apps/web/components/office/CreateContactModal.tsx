'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Modal } from '@/components/ui/Modal';

interface CreateContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateContactModal({ isOpen, onClose, onSuccess }: CreateContactModalProps) {
    const { } = useBranch();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        type: 'customer',
        name: '',
        email: '',
        phone: '',
        tax_id: '',
        address: '',
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        console.log('Submitting Contact Form:', formData);

        // Remove personnel_id if it exists in state remnants (cleanliness)
        const payload = { ...formData };
        // @ts-ignore
        delete payload.personnel_id;

        try {
            const res = await api.post('/office/contacts', payload);
            console.log('Create Contact Response:', res);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Create Contact Error:', err);
            alert('Failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Yeni Cari"
            size="lg"
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="submit"
                        form="create-contact-form"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Contact'}
                    </button>
                </>
            }
        >
            <form id="create-contact-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        className="w-full border rounded p-2 bg-white"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                        <option value="customer">Customer (Müşteri)</option>
                        <option value="supplier">Supplier (Tedarikçi)</option>
                        <option value="subcontractor">Subcontractor (Taşeron)</option>
                        <option value="personnel">Personnel (Personel)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name / Title</label>
                    <input
                        required
                        className="w-full border rounded p-2"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Name or Company Title"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (Optional)</label>
                        <input
                            className="w-full border rounded p-2"
                            value={formData.tax_id}
                            onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                            placeholder="TCKN / VKN"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                        <input
                            type="email"
                            className="w-full border rounded p-2"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <PhoneInput
                        value={formData.phone}
                        onChange={val => setFormData({ ...formData, phone: val })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                        className="w-full border rounded p-2"
                        rows={3}
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>
            </form>
        </Modal>
    );
}
