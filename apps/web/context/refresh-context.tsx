'use client';

import React, { createContext, useContext, useEffect } from 'react';

type Listener = () => void;

interface RefreshContextType {
    trigger: (key: string) => void;
    subscribe: (key: string, listener: Listener) => () => void;
}

const RefreshContext = createContext<RefreshContextType>({
    trigger: () => { },
    subscribe: () => () => { },
});

export const useRefreshContext = () => useContext(RefreshContext);

// Hook helper
export function useRefresh(key: string, callback: () => void) {
    const { subscribe } = useRefreshContext();

    useEffect(() => {
        return subscribe(key, callback);
    }, [key, callback, subscribe]);
}

export function RefreshProvider({ children }: { children: React.ReactNode }) {
    // Use Ref for listeners to avoid re-renders when components subscribe/unsubscribe
    const listenersRef = React.useRef<Map<string, Set<Listener>>>(new Map());

    const subscribe = React.useCallback((key: string, listener: Listener) => {
        if (!listenersRef.current.has(key)) {
            listenersRef.current.set(key, new Set());
        }
        listenersRef.current.get(key)!.add(listener);

        // Cleanup
        return () => {
            const set = listenersRef.current.get(key);
            if (set) {
                set.delete(listener);
                if (set.size === 0) {
                    listenersRef.current.delete(key);
                }
            }
        };
    }, []);

    const trigger = React.useCallback((key: string) => {
        const set = listenersRef.current.get(key);
        if (set) {
            set.forEach(l => l());
        }
    }, []);

    return (
        <RefreshContext.Provider value={{ trigger, subscribe }}>
            {children}
        </RefreshContext.Provider>
    );
}
