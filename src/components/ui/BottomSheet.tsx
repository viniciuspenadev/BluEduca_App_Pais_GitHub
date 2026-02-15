'use client';

import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clsx } from 'clsx';


interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: React.ReactNode;
    footer?: React.ReactNode;
    fullHeight?: boolean;
}

export const BottomSheet = ({ isOpen, onClose, children, title, footer, fullHeight }: BottomSheetProps) => {
    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.y > 100) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{
                            type: 'spring',
                            damping: 45,
                            stiffness: 400,
                            mass: 1
                        }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0}
                        onDragEnd={handleDragEnd}
                        style={{ maxHeight: '85vh' }}
                        className={`relative w-full max-w-2xl bg-white rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden ${fullHeight ? 'h-[85vh]' : 'h-fit'}`}
                    >
                        {/* Drag Indicator (Exact Boletim Pattern) */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

                        {/* Header (Fixed) */}
                        <div className="px-8 pt-2 pb-6 flex items-start justify-between shrink-0 border-b border-slate-50">
                            <div className="flex-1 pt-1">
                                {typeof title === 'string' ? (
                                    <h2 className="text-xl font-bold text-slate-800 leading-tight">{title}</h2>
                                ) : (
                                    title
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0 ml-4 active:scale-95"
                            >
                                <ChevronDown size={24} />
                            </button>
                        </div>

                        {/* Scrollable Content (Bulletproof Scroll) */}
                        <div className="flex-1 overflow-y-auto p-8 pt-6 min-h-0 overscroll-contain">
                            {children}
                        </div>

                        {/* Footer (Fixed) */}
                        {footer && (
                            <div className="p-8 pt-2 pb-10 shrink-0 bg-white border-t border-slate-50">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
