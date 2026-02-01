'use client';

import ProductForm from '@/components/office/ProductForm';

export default function NewProductPage() {
    return (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
            <h1 className="text-xl font-bold mb-6">Create New Product</h1>
            <ProductForm />
        </div>
    );
}
