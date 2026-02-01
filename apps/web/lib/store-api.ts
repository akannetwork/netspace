import { API_URL } from './api';

export async function getStoreSettings(slug: string) {
    try {
        const res = await fetch(`${API_URL}/public/store/${slug}`, {
            next: { revalidate: 60 }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error('Failed to fetch store settings', error);
        return null;
    }
}

export async function getStoreProducts(slug: string) {
    try {
        const res = await fetch(`${API_URL}/public/store/${slug}/products`, {
            next: { revalidate: 60 }
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error('Failed to fetch products', error);
        return [];
    }
}
export async function getStoreServices(slug: string) {
    try {
        const res = await fetch(`${API_URL}/public/store/${slug}/services`, {
            next: { revalidate: 60 }
        });
        if (!res.ok) return [];
        return await res.json();
    } catch (error) {
        console.error('Failed to fetch services', error);
        return [];
    }
}
