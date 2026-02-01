'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-context';

// Simple interface for Branch
interface Branch {
    id: string;
    name: string;
    type: 'hq' | 'store' | 'warehouse' | 'headquarters';
}

interface BranchContextType {
    currentBranch: Branch | null;
    setBranch: (branch: Branch) => void;
    branches: Branch[];
    isLoading: boolean;
}

const BranchContext = createContext<BranchContextType>({
    currentBranch: null,
    setBranch: () => { },
    branches: [],
    isLoading: true,
});

export const useBranch = () => useContext(BranchContext);

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { user, isLoading: isAuthLoading } = useAuth();

    // Fetch branches on mount or when user changes
    useEffect(() => {
        async function fetchBranches() {
            if (isAuthLoading || !user) return; // Wait for auth

            try {
                // Fetch real branches from API
                const { api } = await import('@/lib/api');
                const res = await api.get('/office/branches');

                if (res.data && res.data.length > 0) {
                    let filteredBranches = res.data;

                    const isSuperAdmin = (user as any)?.is_super_admin;
                    const authorizedIds = (user as any)?.authorized_branches || [];

                    if (!isSuperAdmin) {
                        filteredBranches = res.data.filter((b: any) => authorizedIds.includes(b.id));
                    }

                    setBranches(filteredBranches);

                    // Try to load last selected from localStorage
                    const savedId = localStorage.getItem('hauze_branch_id');
                    const savedBranch = filteredBranches.find((b: any) => b.id === savedId);

                    setCurrentBranch(savedBranch || filteredBranches[0]);
                }
            } catch (error) {
                console.error('Failed to load branches', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchBranches();
    }, [user, isAuthLoading]);

    const setBranch = (branch: Branch) => {
        setCurrentBranch(branch);
        localStorage.setItem('hauze_branch_id', branch.id);
    };

    return (
        <BranchContext.Provider value={{ currentBranch, setBranch, branches, isLoading }}>
            {children}
        </BranchContext.Provider>
    );
}
