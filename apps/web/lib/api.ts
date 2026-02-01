export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type FetchOptions = RequestInit & {
    skipAuth?: boolean;
};

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
    const { skipAuth, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (token && !skipAuth) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Ensure JSON content type if body is present and not FormData
    if (fetchOptions.body && typeof fetchOptions.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Inject Branch Context safely
    if (typeof window !== 'undefined') {
        const branchId = localStorage.getItem('hauze_branch_id');
        if (branchId) {
            headers.set('x-branch-id', branchId);
        }
    }

    const config = {
        ...fetchOptions,
        headers,
    };

    let res = await fetch(`${API_URL}${endpoint}`, config);

    // Handle 401 - Refresh Token Logic
    if (res.status === 401 && !skipAuth) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            try {
                const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);

                    // Retry original request with new token
                    headers.set('Authorization', `Bearer ${data.access_token}`);
                    res = await fetch(`${API_URL}${endpoint}`, { ...fetchOptions, headers });
                } else {
                    // Refresh failed - logout
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/'; // Force logout
                    return res; // Return original 401
                }
            } catch (err) {
                console.error('Token refresh failed', err);
                localStorage.removeItem('access_token');
                window.location.href = '/';
            }
        } else {
            // No refresh token available, meaning session is dead
            console.error('API Error: 401 with no refresh token. Token might be missing.');
            // localStorage.removeItem('access_token'); // Clean up
            // window.location.href = '/'; // Force logout
        }
    }

    return res;
}

// Keep old helper for compatibility if needed, using new core
export async function fetchHealth() {
    try {
        const res = await apiFetch('/health', { skipAuth: true, cache: 'no-store' } as any);
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    } catch (error) {
        return { status: 'error', message: 'API unreachable' };
    }
}

// Convenience wrapper
export const api = {
    get: async (endpoint: string, options: FetchOptions = {}) => {
        const res = await apiFetch(endpoint, options);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            return { error: err.message || res.statusText, status: res.status };
        }
        return { data: await res.json() };
    },
    post: async (endpoint: string, body: any, options: FetchOptions = {}) => {
        const res = await apiFetch(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            return { error: err.message || res.statusText, status: res.status };
        }
        return { data: await res.json() };
    },
    put: async (endpoint: string, body: any) => {
        const res = await apiFetch(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            return { error: err.message || res.statusText, status: res.status };
        }
        return { data: await res.json() };
    },
    delete: async (endpoint: string) => {
        const res = await apiFetch(endpoint, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            return { error: err.message || res.statusText, status: res.status };
        }
        return { data: { success: true } };
    }
};
