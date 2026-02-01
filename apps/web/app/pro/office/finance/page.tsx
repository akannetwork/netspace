'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';
import { formatCurrency } from '@/lib/format';

export default function FinanceDashboard() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Finans Yönetimi</h1>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* 1. Alacaklar (Receivables) */}
                <Link href="/office/finance/receivables" className="group">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Alacaklar</h2>
                            <span className="p-2 bg-green-100 text-green-600 rounded-lg">
                                {/* Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm">Vadesi gelen cariler, çekler ve taksitler.</p>
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <span className="text-indigo-600 font-medium group-hover:underline">Detaylar &rarr;</span>
                        </div>
                    </div>
                </Link>

                {/* 2. Ödemeler (Payables) */}
                <Link href="/office/finance/payables" className="group">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Ödemeler</h2>
                            <span className="p-2 bg-red-100 text-red-600 rounded-lg">
                                {/* Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                </svg>
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm">Kredi kartı borçları, kira, maaş ve verilecek çekler.</p>
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <span className="text-indigo-600 font-medium group-hover:underline">Detaylar &rarr;</span>
                        </div>
                    </div>
                </Link>

                {/* 3. Giderler (Expenses) */}
                <Link href="/office/finance/expenses" className="group">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Giderler</h2>
                            <span className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                {/* Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                                </svg>
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm">Fatura, yakıt, yemek gibi işletme giderleri.</p>
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <span className="text-indigo-600 font-medium group-hover:underline">Detaylar &rarr;</span>
                        </div>
                    </div>
                </Link>

                {/* 4. Varlıklar (Assets) */}
                <Link href="/office/finance/assets" className="group">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Varlıklar</h2>
                            <span className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                {/* Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm">Kasa, Banka, POS, Çekler ve Kredi Kartları.</p>
                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <span className="text-indigo-600 font-medium group-hover:underline">Detaylar &rarr;</span>
                        </div>
                    </div>
                </Link>

            </div>

            {/* Placeholder for Quick Summary Dashboard */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
                <p>Buraya genel finansal özet (Nakit Akışı Grafiği, Günlük Durum vb.) gelecek.</p>
            </div>
        </div>
    );
}
