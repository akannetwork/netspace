'use client';

import { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
    noPadding?: boolean;
    footer?: React.ReactNode;
    className?: string;
    contentClassName?: string;
    enableDetents?: boolean; // New prop
    position?: 'right' | 'center'; // New prop
}

import { createPortal } from 'react-dom';

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    noPadding = false,
    footer,
    className = '',
    contentClassName = '',
    enableDetents = false, // Default to standard behavior
    position = 'right'
}: ModalProps) {
    // ... (state) ...
    const modalRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // ... (rest of the state and effects remain same, I will carefully target replacement for getTransformStyle and classNames)

    // ... NOTE: I need to be careful not to overwrite the whole file. 
    // I will replace specific chunks.


    // Animation & Gesture State
    const touchStart = useRef<number | null>(null);
    const touchCurrent = useRef<number | null>(null);
    const isDragging = useRef(false);
    const ignoreBackdropClick = useRef(false);

    // Snap State (Mobile Only logic)
    // 0 = Full Open. Positive values = pixels down from top.
    const [snapOffset, setSnapOffset] = useState(0);
    const snapOffsetRef = useRef(0); // Mutable ref for drag calculations

    // Detect Mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Entry / Exit Logic
    useEffect(() => {
        if (isOpen) {
            setSnapOffset(0);
            snapOffsetRef.current = 0;
            ignoreBackdropClick.current = false;
            setShouldRender(true);

            // Use setTimeout to ensure the browser paints the "closed" state (opacity 0) 
            // before switching to "open" state. Double RAF is sometimes too fast or optimized out.
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Lock Body Scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Cleanup Global Listeners
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, []);


    // --- Drag Logic ---

    const handleDragStart = (clientY: number) => {
        if (!isMobile) return;
        isDragging.current = true;
        ignoreBackdropClick.current = false; // Reset potential block
        touchStart.current = clientY;

        if (modalRef.current) {
            modalRef.current.style.transition = 'none';
        }

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
    };

    const handleDragMove = (clientY: number) => {
        if (!isMobile || !isDragging.current || touchStart.current === null) return;

        const diff = clientY - touchStart.current;
        // Check if actually moving to flag backdrop click ignore
        if (Math.abs(diff) > 5) ignoreBackdropClick.current = true;

        touchCurrent.current = clientY;

        // Current visual position = Last Snap Point + Drag Difference
        const currentPos = snapOffsetRef.current + diff;

        // Resistance if pulling up past 0 (Rubber banding)
        let visualPos = currentPos;
        if (currentPos < 0) {
            visualPos = currentPos * 0.3; // 30% movement factor for resistance
        }

        if (modalRef.current) {
            modalRef.current.style.transform = `translateY(${visualPos}px)`;
        }
    };

    const handleDragEnd = () => {
        if (!isMobile || !isDragging.current || touchStart.current === null || touchCurrent.current === null) {
            cleanupDrag();
            return;
        }

        const diff = touchCurrent.current - touchStart.current;
        const finalPos = snapOffsetRef.current + diff;
        const windowHeight = window.innerHeight;
        const halfPoint = windowHeight * 0.4; // 40% down (60% visible)
        // Adjust close threshold based on mode
        const closeThreshold = enableDetents ? windowHeight * 0.8 : 150; // Standard: 150px drag closes

        let targetSnap = 0; // Default to Full Open

        if (enableDetents) {
            // --- Detents Mode Logic ---
            // Decision Logic
            // If we are closer to Half than Full?
            // Using simple distance checks
            const distToFull = Math.abs(finalPos - 0);
            const distToHalf = Math.abs(finalPos - halfPoint);
            // const distToClose = Math.abs(finalPos - windowHeight); // Not used directly in this logic path

            // Velocity/Direction heuristic could be added here, but position-based is robust for now.
            if (finalPos > closeThreshold) {
                // Very far down -> Close
                animateToClose();
                return;
            } else if (distToFull < distToHalf) {
                // Closer to Top -> Snap Full
                targetSnap = 0;
            } else {
                // Closer to Half -> Snap Half
                targetSnap = halfPoint;

                // Check if user dragged UP from half significantly?
                if (snapOffsetRef.current === halfPoint && diff < -50) targetSnap = 0;
                // Check if user dragged DOWN from zero significantly?
                if (snapOffsetRef.current === 0 && diff > 100) targetSnap = halfPoint;
                // Check if user dragged DOWN from half significantly -> Close
                if (snapOffsetRef.current === halfPoint && diff > 100) {
                    animateToClose();
                    return;
                }
            }
        } else {
            // --- Standard Mode Logic ---
            // If dragged down enough (>150px or threshold), close. Else snap back to 0.
            if (finalPos > closeThreshold) {
                animateToClose();
                return;
            } else {
                targetSnap = 0;
            }
        }

        // Apply Snap Animation
        if (modalRef.current) {
            modalRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            modalRef.current.style.transform = `translateY(${targetSnap}px)`;
        }

        // Update State
        setSnapOffset(targetSnap);
        snapOffsetRef.current = targetSnap;

        cleanupDrag();
    };

    const animateToClose = () => {
        if (modalRef.current) {
            modalRef.current.style.transition = 'transform 0.2s ease-in';
            modalRef.current.style.transform = 'translateY(100%)';
        }
        cleanupDrag();
        setTimeout(onClose, 200);
    };

    const cleanupDrag = () => {
        isDragging.current = false;
        touchStart.current = null;
        touchCurrent.current = null;
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);

        // Reset click ignore after a short delay to allow click event to fire/be blocked
        setTimeout(() => {
            ignoreBackdropClick.current = false;
        }, 100);
    };

    // Event Wrappers
    const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.targetTouches[0].clientY);
    const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e.targetTouches[0].clientY);
    const handleTouchEnd = () => handleDragEnd();
    const handleMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientY);
    const handleGlobalMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const handleGlobalMouseUp = () => handleDragEnd();


    if (!shouldRender) return null;

    const sizeClasses = {
        sm: 'md:max-w-sm',
        md: 'md:max-w-md',
        lg: 'md:max-w-lg',
        xl: 'md:max-w-xl',
        '2xl': 'md:max-w-2xl',
        '4xl': 'md:max-w-4xl',
        '6xl': 'md:max-w-6xl',
        full: 'md:max-w-[100vw]',
    };

    // Dynamic Styles for JS Animation
    const overlayStyle: React.CSSProperties = {
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: isVisible ? 'auto' : 'none',
    };

    // Base Transform Style (when not dragging)
    const getTransformStyle = () => {
        if (isMobile) {
            // Mobile: Bottom Sheet logic
            if (isDragging.current) return undefined;
            return {
                transform: isVisible ? `translateY(${snapOffset}px)` : 'translateY(100%)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            };
        } else {
            // Desktop Logic
            if (position === 'center') {
                return {
                    transform: isVisible ? 'scale(1)' : 'scale(0.95)',
                    opacity: isVisible ? 1 : 0,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                };
            }
            // Desktop: Right Drawer
            return {
                transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            };
        }
    };

    // Use Portal to escape stacking contexts
    return createPortal(
        <div
            className={`globalModal ${position === 'center' ? 'modal-center' : ''}`}
            style={overlayStyle}
            onClick={(e) => {
                if (ignoreBackdropClick.current) return;
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={modalRef}
                className={`modalContent ${sizeClasses[size]} ${className}`}
                style={{
                    ...getTransformStyle(),
                    // Remove CSS Animation property completely to avoid conflicts
                    animation: 'none'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
            >
                {/* Mobile Handle */}
                <div className="modalHandle" onClick={() => {
                    // Use smooth animation for click-to-close on handle
                    if (!ignoreBackdropClick.current) animateToClose();
                }}>
                    <div className="mobile-handle"></div>
                </div>

                {/* Header */}
                {title && (
                    <div className="modalHeader">
                        <h3>{title}</h3>
                    </div>
                )}

                {/* Content */}
                <div className={`${noPadding ? '' : 'p-6'} modalBody overflow-y-auto flex-1 ${contentClassName}`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="modalFooter">
                        {footer}
                    </div>
                )}

                {/* Fallback Close (Desktop Only) */}
                {!title && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10 hidden md:block"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}
