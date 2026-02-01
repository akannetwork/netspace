'use client';

import { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: any) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    isOpen: boolean;
    toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Load from local storage
    useEffect(() => {
        const stored = localStorage.getItem('hauze_cart');
        if (stored) setItems(JSON.parse(stored));
    }, []);

    // Save to local storage
    useEffect(() => {
        localStorage.setItem('hauze_cart', JSON.stringify(items));
    }, [items]);

    const addToCart = (product: any) => {
        setItems(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, {
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                currency: product.currency,
                quantity: 1
            }];
        });
        setIsOpen(true);
    };

    const removeFromCart = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const clearCart = () => {
        setItems([]);
    };

    const cartTotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const toggleCart = () => setIsOpen(!isOpen);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, cartTotal, cartCount, isOpen, toggleCart }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
};
