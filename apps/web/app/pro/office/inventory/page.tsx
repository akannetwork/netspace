
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/office/inventory/products');
    }, [router]);

    return (
        <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
    );
}
