"use client";

import { X } from 'lucide-react';

interface PaymentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  bankName: string;
}

export function PaymentConfirmModal({ isOpen, onClose, onConfirm, amount, bankName }: PaymentConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Ödeme Onayı</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-zinc-300 mb-6">
          <span className="font-bold text-emerald-400">₺{amount}</span> {bankName} ödemesini yapmak istiyor musun?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 font-semibold transition-all"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-semibold transition-all"
          >
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
}
