"use client";

import { format, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MoreVertical, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { PaymentConfirmModal } from './PaymentConfirmModal';

export type PaymentStatus = 'pending' | 'partial' | 'overdue' | 'completed';

export interface Payment {
  id: string;
  bank: string;
  amount: number;
  dueDate: Date;
  status: PaymentStatus;
  installmentNumber?: number;
  totalInstallments?: number;
}

export function UpcomingPayments({ 
  payments,
  onPayment 
}: { 
  payments: Payment[],
  onPayment: (id: string, amount: number) => void 
}) {
  const [customAmount, setCustomAmount] = useState<{ [key: string]: string }>({});
  const [showCustomInput, setShowCustomInput] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAll, setShowAll] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string; amount: number; bank: string }>({
    isOpen: false,
    id: '',
    amount: 0,
    bank: '',
  });

  const monthPayments = payments.filter(payment => {
    return payment.dueDate.getMonth() === currentMonth.getMonth() &&
           payment.dueDate.getFullYear() === currentMonth.getFullYear();
  });

  const overduePayments = monthPayments.filter(p => p.status === 'overdue');
  const regularPayments = monthPayments.filter(p => p.status !== 'overdue' && p.status !== 'completed');

  const displayedPayments = showAll ? regularPayments : regularPayments.slice(0, 3);

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending': return 'bg-zinc-800 text-zinc-400';
      case 'partial': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'overdue': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
  };

  const handlePayClick = (id: string, amount: number, bank: string) => {
    setConfirmModal({ isOpen: true, id, amount, bank });
  };

  const handleConfirmPayment = () => {
    onPayment(confirmModal.id, confirmModal.amount);
    setConfirmModal({ isOpen: false, id: '', amount: 0, bank: '' });
    setShowCustomInput(null);
    setCustomAmount(prev => ({ ...prev, [confirmModal.id]: '' }));
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderPaymentCard = (payment: Payment) => (
    <div key={payment.id} className="bg-zinc-900 rounded-xl p-4 shadow-lg border border-zinc-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="bg-zinc-800 rounded-lg p-2">
            <CreditCard className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <div className="font-semibold text-white">{payment.bank}</div>
            <div className="text-2xl font-bold text-white mt-1">₺{payment.amount}</div>
            <div className="text-xs text-zinc-500 mt-1">
              Son ödeme {format(payment.dueDate, 'd MMM', { locale: tr })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex flex-col items-center justify-center min-w-[60px] px-2 py-1 rounded-lg ${getStatusColor(payment.status)}`}>
            <span className="text-xs font-bold leading-tight">
              {payment.installmentNumber && payment.totalInstallments 
                ? `${payment.installmentNumber} / ${payment.totalInstallments}`
                : payment.installmentNumber ? `${payment.installmentNumber}.` : 'Borç'}
            </span>
            <span className="text-[9px] uppercase tracking-tighter font-medium opacity-80 leading-none mt-0.5">Taksit</span>
          </div>
          <button
            onClick={() => setShowCustomInput(showCustomInput === payment.id ? null : payment.id)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showCustomInput === payment.id ? (
        <div className="flex gap-2 mt-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Özel tutar"
            value={customAmount[payment.id] || ''}
            onChange={(e) => setCustomAmount(prev => ({ ...prev, [payment.id]: e.target.value }))}
            className="flex-1 bg-zinc-800 text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            onClick={() => {
              const amount = parseFloat(customAmount[payment.id]);
              if (amount > 0) handlePayClick(payment.id, amount, payment.bank);
            }}
            disabled={!customAmount[payment.id] || parseFloat(customAmount[payment.id]) <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all"
          >
            Öde
          </button>
        </div>
      ) : (
        <button
          onClick={() => handlePayClick(payment.id, payment.amount, payment.bank)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 font-semibold transition-all active:scale-95"
        >
          ₺{payment.amount} Öde
        </button>
      )}
    </div>
  );

  const totalMonthly = monthPayments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <>
      <PaymentConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: '', amount: 0, bank: '' })}
        onConfirm={handleConfirmPayment}
        amount={confirmModal.amount}
        bankName={confirmModal.bank}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm uppercase tracking-wide text-zinc-500">Yaklaşan Ödemeler</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white min-w-[80px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: tr })}
            </span>
            <button
              onClick={goToNextMonth}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Monthly Summary Card */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-lg animate-in fade-in slide-in-from-top-1 duration-500">
          <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Bu Ay Toplam Ödeme</div>
          <div className={`text-2xl font-black ${totalMonthly > 0 ? 'text-emerald-500' : 'text-zinc-600'}`}>
            {totalMonthly > 0 ? `₺${totalMonthly.toLocaleString()}` : 'Ödeme yok'}
          </div>
        </div>

        {overduePayments.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-red-400 px-1">Gecikmiş Ödemeler</div>
            {overduePayments.map(renderPaymentCard)}
          </div>
        )}

        {displayedPayments.map(renderPaymentCard)}

        {regularPayments.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl py-3 font-semibold transition-all border border-zinc-800"
          >
            {showAll ? 'Daha Az Göster' : `Daha Fazla Göster (${regularPayments.length - 3})`}
          </button>
        )}
      </div>
    </>
  );
}
