'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    phone: string;
    role?: string;
    tenant_id?: string;
    tenant_slug?: string;
    is_super_admin?: boolean;
    permissions?: {
        can_office?: boolean;
        can_inventory?: boolean;
        can_finance?: boolean;
        can_orders?: boolean;
        can_personnel?: boolean;
        can_depo?: boolean;
        can_go?: boolean;
        can_portal?: boolean;
        can_web?: boolean;
        _tenant_features?: {
            office?: boolean;
            inventory?: boolean;
            finance?: boolean;
            orders?: boolean;
            personnel?: boolean;
            go?: boolean;
            portal?: boolean;
            web?: boolean;
        };
        [key: string]: any;
    };
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (phone: string, context: string) => Promise<any>;
    verifyOtp: (phone: string, otp: string, context: string, password?: string, tenant_slug?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    verifyOtp: async () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const refreshSession = async (refreshToken: string) => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        try {
            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!res.ok) throw new Error('Refresh failed');
            return await res.json();
        } catch (error) {
            console.error('[AuthContext] Refresh error:', error);
            throw error;
        }
    };

    useEffect(() => {
        // Initial check - hydration from local storage or memory
        const storedUser = localStorage.getItem('hauze_user');
        const storedRefreshToken = localStorage.getItem('refresh_token');

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));

                // Attempt proactive refresh
                if (storedRefreshToken) {
                    refreshSession(storedRefreshToken)
                        .then(data => {
                            console.log('[AuthContext] Session refreshed.');
                            setUser(data.user);
                            localStorage.setItem('hauze_user', JSON.stringify(data.user));
                            if (data.access_token) localStorage.setItem('access_token', data.access_token);
                            if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                        })
                        .catch(() => {
                            // If refresh fails, we might want to logout or just keep using stale data until it expires?
                            // For now, keep stale data but maybe log it.
                            console.warn('[AuthContext] Could not refresh session on mount.');
                        });
                }

            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (phone: string, context: string) => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, context }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }

        return await res.json();
    };

    const verifyOtp = async (phone: string, otp: string, context: string, password?: string, tenant_slug?: string) => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp, context, password, tenant_slug }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Verification failed');
        }

        const data = await res.json();

        // Store tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('hauze_user', JSON.stringify(data.user)); // Cache user info

        setUser(data.user);

        // Redirect logic
        if (context === 'portal') router.push('/portal');
        else if (context === 'pro') router.push('/');
        else if (context === 'admin') router.push('/admin');
        else router.push('/');
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('hauze_user');
        setUser(null);
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, verifyOtp, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
