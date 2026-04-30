"use client";

import { MoreVertical, Building2, Plus, ChevronDown, CreditCard, Calendar, Hash, Edit2, FileText } from 'lucide-react';
import { useState } from 'react';
import { AddDebtModal } from './AddDebtModal';
import { EditDebtModal } from './EditDebtModal';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export interface Debt {
  id: string;
  bank_id: string;
  bank_name: string; // From join
  name: string; // Debt description
  description: string;
  remainingInstallments: number;
  monthlyPayment: number;
  totalRemaining: number;
  totalDebt: number;
  paidAmount: number;
  remainingInstallmentCount: number;
  lastInstallmentDate: Date | null;
  totalInstallments: number;
  nextDueDate: string;
}

interface BankGroup {
  bank_name: string;
  debts: Debt[];
  totalRemaining: number;
}

export function DebtsOverview({ 
  debts, 
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt 
}: { 
  debts: Debt[];
  onAddDebt: (debt: any) => Promise<void>;
  onUpdateDebt: (id: string, debt: any) => Promise<void>;
  onDeleteDebt: (id: string) => Promise<void>;
}) {
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Group debts by bank
  const groupedDebts = debts.reduce((acc: BankGroup[], debt) => {
    const existingGroup = acc.find(g => g.bank_name === debt.bank_name);
    if (existingGroup) {
      existingGroup.debts.push(debt);
      existingGroup.totalRemaining += debt.totalRemaining;
    } else {
      acc.push({
        bank_name: debt.bank_name,
        debts: [debt],
        totalRemaining: debt.totalRemaining
      });
    }
    return acc;
  }, []);

  const toggleBank = (bankName: string) => {
    setExpandedBank(expandedBank === bankName ? null : bankName);
    setExpandedDebt(null);
  };

  const toggleDebt = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedDebt(expandedDebt === id ? null : id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm uppercase tracking-wide text-zinc-500">Bankalara Göre Borçlar</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Borç Ekle
        </button>
      </div>

      <AddDebtModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={onAddDebt} 
      />

      {editingDebt && (
        <EditDebtModal
          isOpen={!!editingDebt}
          onClose={() => setEditingDebt(null)}
          debt={editingDebt}
          onUpdate={onUpdateDebt}
          onDelete={onDeleteDebt}
        />
      )}

      <div className="space-y-3">
        {groupedDebts.length === 0 ? (
          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 border-dashed text-center">
            <Building2 className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Kayıtlı borç bulunamadı.</p>
          </div>
        ) : (
          groupedDebts.map((group) => (
            <div key={group.bank_name} className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
              {/* Bank Header */}
              <button
                onClick={() => toggleBank(group.bank_name)}
                className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/10 rounded-2xl p-3">
                    <Building2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white text-lg">{group.bank_name}</div>
                    <div className="text-xs text-zinc-500">{group.debts.length} Borç Kaydı</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Toplam Kalan</div>
                    <div className="text-xl font-black text-red-400">₺{group.totalRemaining.toLocaleString()}</div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform duration-300 ${expandedBank === group.bank_name ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Individual Debts List */}
              {expandedBank === group.bank_name && (
                <div className="border-t border-zinc-800 bg-black/20 divide-y divide-zinc-800 animate-in slide-in-from-top-2 duration-300">
                  {group.debts.map((debt) => (
                    <div key={debt.id} className="p-4">
                      <button 
                        onClick={(e) => toggleDebt(e, debt.id)}
                        className="w-full flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                          <div className="text-left">
                            <div className="text-sm font-semibold text-zinc-200">{debt.name}</div>
                            <div className="text-[10px] text-zinc-500">{debt.remainingInstallments} Taksit • ₺{debt.monthlyPayment}/ay</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">₺{debt.totalRemaining.toLocaleString()}</div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-zinc-700 transition-transform ${expandedDebt === debt.id ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded Debt Details */}
                      {expandedDebt === debt.id && (
                        <div className="mt-4 space-y-3 pb-2 animate-in fade-in duration-300">
                          {/* Description */}
                          {debt.description && (
                            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <FileText className="w-3 h-3 text-zinc-500" />
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Açıklama</div>
                              </div>
                              <div className="text-xs text-zinc-300 leading-relaxed italic">
                                "{debt.description}"
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {/* Row 1 */}
                            <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                              <div className="flex items-center gap-1.5 mb-1">
                                <CreditCard className="w-3 h-3 text-zinc-500" />
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Toplam Borç</div>
                              </div>
                              <div className="text-sm font-bold text-white">₺{debt.totalDebt.toLocaleString()}</div>
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Plus className="w-3 h-3 text-emerald-500" />
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Ödenen</div>
                              </div>
                              <div className="text-sm font-bold text-emerald-500">₺{debt.paidAmount.toLocaleString()}</div>
                            </div>

                            {/* Row 2 */}
                            <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Hash className="w-3 h-3 text-zinc-500" />
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Kalan Taksit</div>
                              </div>
                              <div className="text-sm font-bold text-white">
                                {debt.remainingInstallmentCount > 0 ? `${debt.remainingInstallmentCount} Taksit` : 'Taksit yok'}
                              </div>
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Calendar className="w-3 h-3 text-zinc-500" />
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Son Taksit</div>
                              </div>
                              <div className="text-sm font-bold text-zinc-300">
                                {debt.lastInstallmentDate ? format(debt.lastInstallmentDate, 'd MMM yyyy', { locale: tr }) : '-'}
                              </div>
                            </div>
                          </div>

                          {/* Edit Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDebt(debt);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700/50 transition-all active:scale-95"
                          >
                            <Edit2 className="w-3 h-3" />
                            Borcu Düzenle
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
