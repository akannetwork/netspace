'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import ProductForm from '@/components/office/ProductForm';

export default function EditProductPage() {
    const params = useParams();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!params.id) return;
        setLoading(true);
        api.get(`/office/products/${params.id}`)
            .then(res => {
                if (res.data) setProduct(res.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!product) return <div className="p-8">Product not found.</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">Edit Product</h1>
                <span className="text-xs text-gray-500 font-mono">ID: {product.id}</span>
            </div>

            <ProductForm initialData={product} isEdit={true} />
        </div>
    );
}
