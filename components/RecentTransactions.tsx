"use client";

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownLeft, CreditCard, MoreVertical, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EditTransactionModal } from './EditTransactionModal';

export type TransactionType = 'income' | 'expense' | 'debt_payment';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  category: string;
  related_installment_id?: string;
}

export function RecentTransactions({ 
  transactions, 
  onUndo,
  onUpdate
}: { 
  transactions: Transaction[],
  onUndo?: (id: string) => Promise<void>,
  onUpdate?: (id: string, updates: Partial<Transaction>) => Promise<void>
}) {
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const handleClose = () => setShowMenu(null);
    if (showMenu) {
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('click', handleClose);
    }
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('click', handleClose);
    };
  }, [showMenu]);

  const toggleExpand = (id: string) => {
    setExpandedTransaction(expandedTransaction === id ? null : id);
    setShowMenu(null);
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (showMenu === id) {
      setShowMenu(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4, // 4px gap
        left: rect.right - 120, // Align right with 120px width
      });
      setShowMenu(id);
    }
  };
  const getTransactionStyle = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          text: 'text-emerald-400',
          icon: ArrowDownLeft,
        };
      case 'expense':
        return {
          bg: 'bg-red-500/10 border-red-500/20',
          text: 'text-red-400',
          icon: ArrowUpRight,
        };
      case 'debt_payment':
        return {
          bg: 'bg-orange-500/10 border-orange-500/20',
          text: 'text-orange-400',
          icon: CreditCard,
        };
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {transactions.map((transaction) => {
          const style = getTransactionStyle(transaction.type);
          const Icon = style.icon;
          const isExpanded = expandedTransaction === transaction.id;

          return (
            <div
              key={transaction.id}
              className={`rounded-xl border ${style.bg} overflow-hidden`}
            >
              <button
                onClick={() => toggleExpand(transaction.id)}
                className="w-full flex items-start justify-between p-3.5 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`rounded-lg p-2 ${style.bg}`}>
                    <Icon className={`w-4 h-4 ${style.text}`} />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <div className={`text-sm font-medium text-white leading-tight ${isExpanded ? '' : 'truncate'}`}>
                      {transaction.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-[9px] text-zinc-500 uppercase font-black tracking-tight">
                        {format(transaction.date, 'd MMM yyyy', { locale: tr })}
                      </div>
                      {transaction.category && (
                        <div className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-zinc-700/50">
                          {transaction.category}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4 pt-0.5">
                  <div className={`text-lg font-bold whitespace-nowrap ${style.text}`}>
                    {transaction.type === 'income' ? `+₺${transaction.amount}` : `-₺${transaction.amount}`}
                  </div>
                  <button
                    onClick={(e) => toggleMenu(transaction.id, e)}
                    className="relative text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  >
                    <MoreVertical className="w-4 h-4" />
                    {showMenu === transaction.id && (
                      <div 
                        className="fixed bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 py-1 z-[100] min-w-[120px]"
                        style={{ 
                          top: `${menuPosition.top}px`, 
                          left: `${menuPosition.left}px` 
                        }}
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTransaction(transaction);
                            setShowMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 transition-colors"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onUndo?.(transaction.id);
                            setShowMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                        >
                          İşlemi Geri Al
                        </button>
                      </div>
                    )}
                  </button>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 pt-1 bg-zinc-800/20 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-zinc-500">Açıklama</div>
                      <div className="text-white">{transaction.description}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Kategori</div>
                      <div className="text-white">{transaction.category}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Tarih</div>
                      <div className="text-white">{format(transaction.date, 'd MMMM yyyy', { locale: tr })}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Tutar</div>
                      <div className={`font-semibold ${style.text}`}>
                        {transaction.type === 'income' ? `+₺${transaction.amount}` : `-₺${transaction.amount}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingTransaction && (
        <EditTransactionModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          transaction={editingTransaction}
          onUpdate={onUpdate || (async () => {})}
        />
      )}
    </div>
  );
}
