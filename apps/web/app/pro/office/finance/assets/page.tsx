'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AssetAccountList } from '@/components/finance/AssetAccountList';
import { CreateAccountModal } from '@/components/finance/CreateAccountModal';
import { AssetTransactionList } from '@/components/finance/AssetTransactionList';
import { TransferModal } from '@/components/finance/TransferModal';
import { toast } from 'sonner';

export default function AssetsPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('cash');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<any>(null);

    // Initial Load
    useEffect(() => {
        loadAccounts();
    }, []);

    async function loadAccounts() {
        try {
            setLoading(true);
            const res = await api.get('/office/finance/accounts');
            setAccounts(res.data);
        } catch (e: any) {
            toast.error('Hesaplar yüklenemedi');
        } finally {
            setLoading(false);
        }
    }

    const tabs = [
        { id: 'cash', label: 'Kasalar' },
        { id: 'bank', label: 'Bankalar' },
        { id: 'pos', label: 'POS Hesapları' },
        { id: 'credit_card', label: 'Kredi Kartları' },
        { id: 'check_account', label: 'Çek Hesapları' },
    ];

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Varlık Yönetimi</h1>
                    <p className="text-gray-500 text-sm mt-1">Nakit, Banka ve Diğer Varlık Hesaplarınız</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsTransferOpen(true)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
                    >
                        <span>⇄ Transfer Yap</span>
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="button button-primary"
                    >
                        + Yeni Hesap Ekle
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
            ) : (
                <AssetAccountList
                    accounts={accounts}
                    type={activeTab}
                    onRefresh={loadAccounts}
                    onSelect={(acc) => setSelectedAccount(acc)}
                />
            )}

            {/* Modals */}
            <CreateAccountModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={loadAccounts}
                defaultType={activeTab}
            />

            <TransferModal
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
                onSuccess={loadAccounts}
                accounts={accounts}
            />

            {selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedAccount(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedAccount.name}</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Güncel Bakiye: <span className="font-bold text-gray-900">{selectedAccount.balance} {selectedAccount.currency}</span>
                                </p>
                            </div>
                            <button onClick={() => setSelectedAccount(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            <AssetTransactionList accountId={selectedAccount.id} accountCurrency={selectedAccount.currency} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
