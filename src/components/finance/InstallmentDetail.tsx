'use client';

import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { Installment } from './InstallmentList';
import { Copy, Share2, FileText, CheckCircle2, Barcode, ExternalLink, Handshake } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InstallmentDetailProps {
    isOpen: boolean;
    onClose: () => void;
    installment: Installment | null;
}

export const InstallmentDetail = ({ isOpen, onClose, installment }: InstallmentDetailProps) => {
    const [copied, setCopied] = useState<string | null>(null);
    const [isBoletoModalOpen, setIsBoletoModalOpen] = useState(false);

    // Fallback copy logic included for robust mobile support
    const handleCopy = (text: string, type: 'pix' | 'barcode') => {
        const doCopy = () => {
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(doCopy).catch(err => {
                console.error('Clipboard failed', err);
                fallbackCopy(text, type);
            });
        } else {
            fallbackCopy(text, type);
        }
    };

    const fallbackCopy = (text: string, type: 'pix' | 'barcode') => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch (e) {
            console.error(e);
        }
    };

    const handleShare = async () => {
        if (!installment?.billing_url) return;

        const shareData = {
            title: 'Fatura Escolar',
            text: 'Segue o link para pagamento da fatura escolar:',
            url: installment.billing_url
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`, '_blank');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const formatCurrency = (val?: number) => {
        if (val === undefined) return '';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(val);
    };

    const StatusBadge = ({ item }: { item: Installment }) => {
        // Simple badge logic replia from list
        return null; // Implemented inline or simple
    };

    if (!installment) return null;

    const isPaid = installment.status === 'paid';

    return (
        <>
            <BottomSheet
                isOpen={isOpen && !isBoletoModalOpen}
                onClose={onClose}
                title={`${installment.metadata?.category || 'Fatura'} ${installment.installment_number}`}
            >
                <div className="space-y-6 pb-12">

                    {/* Status Header */}
                    <div className={`
                        p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2
                        ${isPaid ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-700'}
                    `}>
                        <span className="text-sm font-medium opacity-80">Valor Total</span>
                        <h2 className="text-4xl font-bold tracking-tight">{formatCurrency(installment.value)}</h2>

                        <div className="flex items-center gap-2 text-sm font-bold bg-white/50 px-3 py-1 rounded-full">
                            {isPaid ? (
                                <>
                                    <CheckCircle2 size={16} />
                                    <span>PAGO</span>
                                </>
                            ) : (
                                <>
                                    <span>Vencimento: {format(new Date(installment.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Metadata List - Matching Original Layout */}
                    <div className="space-y-0 text-sm">
                        {installment.metadata?.description && (
                            <div className="flex justify-between py-3 border-b border-gray-100">
                                <span className="text-gray-500">Descrição</span>
                                <span className="font-bold text-gray-900">{installment.metadata.description}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-3 border-b border-gray-100">
                            <span className="text-gray-500">Mês de Referência</span>
                            <span className="font-bold text-gray-900 capitalize">
                                {format(new Date(installment.due_date + 'T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                        </div>
                        {installment.original_value && installment.original_value !== installment.value && (
                            <div className="flex justify-between py-3 border-b border-gray-100">
                                <span className="text-gray-500">Valor Original</span>
                                <span className="font-medium text-gray-400 line-through">{formatCurrency(installment.original_value)}</span>
                            </div>
                        )}
                        {(installment.discount_value || 0) > 0 && (
                            <div className="flex justify-between py-3 border-b border-gray-100">
                                <span className="text-green-600 font-medium">Desconto</span>
                                <span className="font-bold text-green-600">- {formatCurrency(installment.discount_value!)}</span>
                            </div>
                        )}
                        {installment.negotiation_date && (
                            <div className="flex justify-between py-3 border-b border-gray-100 bg-amber-50 -mx-6 px-6">
                                <span className="text-amber-800 font-bold flex items-center gap-2">
                                    <Handshake size={16} /> Renegociação
                                </span>
                                <span className="font-medium text-amber-700">
                                    {format(new Date(installment.negotiation_date), 'dd/MM/yyyy')}
                                </span>
                            </div>
                        )}
                    </div>


                    {/* Actions (Only if not paid) */}
                    {!isPaid && (
                        <div className="flex gap-3 pt-2">
                            {installment.billing_url && (
                                <button
                                    className="flex-1 h-14 bg-brand-600 text-white rounded-2xl text-base font-bold flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-95 transition-all shadow-lg shadow-brand-200"
                                    onClick={() => setIsBoletoModalOpen(true)}
                                >
                                    <Barcode className="w-5 h-5" />
                                    Pagar
                                </button>
                            )}

                            {installment.metadata?.pix_key && (
                                <button
                                    onClick={() => handleCopy(installment.metadata!.pix_key!, 'pix')}
                                    className={`
                                        flex-1 h-14 border-2 rounded-2xl text-base font-bold flex items-center justify-center gap-2 active:scale-95 transition-all
                                        ${copied === 'pix' ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-gray-700 hover:border-gray-300'}
                                    `}
                                >
                                    {copied === 'pix' ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    {copied === 'pix' ? 'Copiado!' : 'Copiar PIX'}
                                </button>
                            )}
                        </div>
                    )}

                </div>
            </BottomSheet>

            {/* Boleto Viewer Modal */}
            <Modal
                isOpen={isBoletoModalOpen}
                onClose={() => setIsBoletoModalOpen(false)}
                title="Fatura Digital"
                size="xl"
                footer={
                    <div className="flex justify-between w-full items-center">
                        <span className="text-xs text-gray-500 hidden sm:block">Problemas na visualização?</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleShare}
                                className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" /> Compartilhar
                            </button>
                            <button
                                onClick={() => window.open(installment.billing_url || '', '_blank')}
                                className="flex-1 sm:flex-none px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-bold hover:bg-brand-100 flex items-center justify-center gap-2"
                            >
                                Abrir Externo <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                }
            >
                <div className="w-full h-[65vh] bg-gray-100 relative">
                    {installment.billing_url ? (
                        <iframe
                            src={installment.billing_url}
                            className="w-full h-full border-0"
                            title="Boleto Invoice"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            URL do boleto indisponível
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};
