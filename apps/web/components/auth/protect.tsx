'use client';

import { useAuth } from '@/context/auth-context';

type Role = 'owner' | 'staff' | 'customer';

interface ProtectProps {
    children: React.ReactNode;
    roles?: Role[]; // Allowed roles
    fallback?: React.ReactNode;
}

export function Protect({ children, roles, fallback }: ProtectProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null; // Or a spinner
    }

    if (!user) {
        return fallback || null;
    }

    // If roles are specified, check if user has one of them
    // Assuming role comes from user object (auth context)
    // In our auth service, user.role is populated for 'pro' context.
    if (roles && roles.length > 0) {
        if (!user.role || !roles.includes(user.role as Role)) {
            return fallback || (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
                    Access Denied: You do not have permission to view this content.
                </div>
            );
        }
    }

    return <>{children}</>;
}
