'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, CheckCircle2, AlertCircle, Clock, Receipt, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface Installment {
    id: string;
    enrollment_id: string;
    installment_number: number;
    value: number;
    due_date: string;
    status: 'pending' | 'overdue' | 'paid' | 'cancelled';
    paid_at?: string;
    billing_url?: string;
    pix_qr_code?: string;
    gateway_integration_id?: string;
    original_value?: number;
    description?: string; // Sometimes used for extra info
    category?: string;
    discount_value?: number;
    negotiation_date?: string;
    negotiation_notes?: string;
    metadata?: {
        description?: string;
        category?: string;
        pix_key?: string;
    };
}

interface InstallmentListProps {
    items: Installment[];
    onItemClick: (item: Installment) => void;
    emptyMessage?: string;
}

export const InstallmentList = ({ items, onItemClick, emptyMessage = "Nenhuma fatura encontrada." }: InstallmentListProps) => {

    if (items.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium text-sm">{emptyMessage}</p>
            </div>
        );
    }

    const getEffectiveStatus = (item: Installment) => {
        if (item.status === 'paid' || item.status === 'cancelled') return item.status;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Add time to due_date to avoid timezone issues, assume end of day or noon
        const dueDate = new Date(item.due_date + 'T12:00:00');
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) return 'overdue';
        return item.status;
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const config = {
            overdue: { label: 'Em Atraso', class: 'text-red-600 bg-red-50 border-red-100', icon: AlertCircle },
            pending: { label: 'Aberto', class: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
            paid: { label: 'Pago', class: 'text-green-600 bg-green-50 border-green-100', icon: CheckCircle2 },
            cancelled: { label: 'Cancelado', class: 'text-gray-600 bg-gray-50 border-gray-100', icon: FileText }
        };
        const s = config[status as keyof typeof config] || config.pending;
        const Icon = s.icon;

        return (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${s.class}`}>
                <Icon size={12} />
                {s.label}
            </span>
        );
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(val);
    };

    return (
        <div className="space-y-3">
            {items.map((item, index) => {
                const effectiveStatus = getEffectiveStatus(item);
                const isOverdue = effectiveStatus === 'overdue';
                const isPaid = effectiveStatus === 'paid';
                const dueDate = new Date(item.due_date + 'T12:00:00');

                return (
                    <div
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className={clsx(
                            "relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer bg-white group hover:shadow-md",
                            isOverdue
                                ? "border-red-200 shadow-sm shadow-red-500/10 ring-1 ring-red-100"
                                : "border-slate-100 hover:border-brand-200"
                        )}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                    isPaid ? "bg-green-50 text-green-600" :
                                        isOverdue ? "bg-red-50 text-red-600" :
                                            "bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600"
                                )}>
                                    {isPaid ? <Receipt size={20} /> : <FileText size={20} />}
                                </div>

                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-900 text-base tracking-tight group-hover:text-brand-600 transition-colors">
                                        Mensalidade {item.installment_number}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        Vento: {format(dueDate, 'dd/MM/yyyy')}
                                    </p>
                                </div>
                            </div>

                            <StatusBadge status={effectiveStatus} />
                        </div>

                        <div className="mt-4 flex items-end justify-between">
                            <div className="space-y-0.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Valor</span>
                                <span className={clsx(
                                    "text-xl font-bold tracking-tight",
                                    isOverdue ? "text-red-600" : "text-slate-900"
                                )}>
                                    {formatCurrency(item.value)}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {isPaid ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Pago</span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {item.paid_at ? format(new Date(item.paid_at), 'dd/MM/yyyy') : '-'}
                                        </span>
                                    </div>
                                ) : (
                                    <button className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-[10px] font-bold hover:bg-brand-700 transition-all active:scale-95">
                                        Pagar
                                        <ChevronRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
