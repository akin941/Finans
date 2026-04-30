"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { addMonths, format, startOfMonth } from "date-fns";
import { BalanceChart } from "@/components/BalanceChart";
import { RecentTransactions, Transaction } from "@/components/RecentTransactions";
import { UpcomingPayments, Payment } from "@/components/UpcomingPayments";
import { DebtsOverview, Debt } from "@/components/DebtsOverview";
import { QuickActionBar } from "@/components/QuickActionBar";
import { BottomNav, NavItem } from "@/components/BottomNav";
import { WeekCalendar } from "@/components/WeekCalendar";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const supabase = createClient(
  "https://cvymnyaqeupwdpknbqlo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eW1ueWFxZXVwd2Rwa25icWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDYyNDcsImV4cCI6MjA5MzEyMjI0N30.3X2CyM4w1vCueZjpliiNgEOcn88zqFk5EmL8Y2to4xQ"
);

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export default function Home() {
  const [balance, setBalance] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [monthlyNet, setMonthlyNet] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [activeTab, setActiveTab] = useState<NavItem>('home');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadData() {
    setLoading(true);
    try {
      // Fetch Transactions
      const { data: transData } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      const mappedTransactions: Transaction[] = (transData || []).map(t => ({
        id: t.id,
        type: t.type,
        amount: Math.abs(t.amount),
        date: new Date(t.created_at),
        description: t.description || (t.type === 'income' ? 'Gelir' : 'Gider'),
        category: t.category || (t.type === 'income' ? 'Genel' : 'Harcama')
      }));
      setTransactions(mappedTransactions);

      const totalBalance = (transData || []).reduce((acc, t) => acc + Number(t.amount), 0);
      setBalance(totalBalance);

      // Calculate Monthly Net
      const now = new Date();
      const firstDayOfMonth = startOfMonth(now);
      const monthlyN = (transData || [])
        .filter(t => new Date(t.created_at) >= firstDayOfMonth)
        .reduce((acc, t) => acc + Number(t.amount), 0);
      setMonthlyNet(monthlyN);

      // Fetch ALL Installments to calculate sequence numbers
      const { data: allInstData } = await supabase
        .from("installments")
        .select(`
          *,
          debts (
            id,
            name,
            total_installments,
            banks (name)
          )
        `)
        .order("due_date", { ascending: true });

      // Group installments by debt to calculate installment number
      const installmentsByDebt: { [key: string]: any[] } = {};
      (allInstData || []).forEach(inst => {
        if (!installmentsByDebt[inst.debt_id]) installmentsByDebt[inst.debt_id] = [];
        installmentsByDebt[inst.debt_id].push(inst);
      });

      const mappedPayments: Payment[] = (allInstData || [])
        .filter(inst => inst.status !== 'paid') // Only show unpaid in UpcomingPayments
        .map(inst => {
          const debtInstallments = installmentsByDebt[inst.debt_id] || [];
          const installmentIndex = debtInstallments.findIndex(i => i.id === inst.id);
          
          return {
            id: inst.id,
            bank: inst.debts?.banks?.name ? `${inst.debts.banks.name} - ${inst.debts.name}` : inst.debts?.name || "Bilinmeyen Borç",
            amount: inst.amount - (inst.paid_amount || 0),
            dueDate: new Date(inst.due_date),
            status: inst.status === 'unpaid' ? 'pending' : (inst.status === 'overdue' ? 'overdue' : 'partial'),
            installmentNumber: installmentIndex !== -1 ? installmentIndex + 1 : undefined,
            totalInstallments: inst.debts?.total_installments
          };
        });
      setPayments(mappedPayments);

      // Fetch Debts with Banks
      const { data: debtData } = await supabase
        .from("debts")
        .select(`
          *,
          banks (name)
        `);

      const mappedDebts: Debt[] = (debtData || []).map(d => {
        const debtInsts = installmentsByDebt[d.id] || [];
        const paidInsts = debtInsts.filter(i => i.status === 'paid');
        const remainingInsts = debtInsts.filter(i => i.status !== 'paid');
        
        const totalPaid = paidInsts.reduce((acc, i) => acc + Number(i.amount), 0);
        const totalRemaining = remainingInsts.reduce((acc, i) => acc + Number(i.amount), 0);
        const lastDate = debtInsts.length > 0 ? new Date(Math.max(...debtInsts.map(i => new Date(i.due_date).getTime()))) : null;

        return {
          id: d.id,
          bank_id: d.bank_id,
          bank_name: d.banks?.name || "Diğer",
          name: d.name,
          remainingInstallments: remainingInsts.length,
          monthlyPayment: d.monthly_payment,
          totalRemaining: totalRemaining,
          totalDebt: totalPaid + totalRemaining,
          paidAmount: totalPaid,
          remainingInstallmentCount: remainingInsts.length,
          lastInstallmentDate: lastDate
        };
      });
      setDebts(mappedDebts);

      const totalD = mappedDebts.reduce((acc, d) => acc + d.totalRemaining, 0);
      setTotalDebt(totalD);

    } catch (error) {
      console.error("Data loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddTransaction = async (type: 'income' | 'expense', amount: number, description?: string) => {
    const value = type === 'income' ? amount : -amount;
    const { error } = await supabase.from("transactions").insert({
      type,
      amount: value,
      description: description || (type === 'income' ? 'Gelir' : 'Gider')
    });

    if (error) {
      showToast("İşlem kaydedilemedi: " + error.message, "error");
      return;
    }

    showToast("İşlem başarıyla eklendi");
    loadData();
  };

  const handleAddDebt = async (debt: {
    bank_id: string;
    name: string;
    monthly_payment: number;
    total_installments: number;
    next_due_date: string;
  }) => {
    // 1. Create Debt
    const { data: newDebt, error: debtError } = await supabase
      .from("debts")
      .insert({
        bank_id: debt.bank_id,
        name: debt.name,
        monthly_payment: debt.monthly_payment,
        total_installments: debt.total_installments,
        next_due_date: debt.next_due_date
      })
      .select()
      .single();

    if (debtError) {
      showToast("Borç kaydedilemedi: " + debtError.message, "error");
      throw debtError;
    }

    // 2. Auto-create Installments
    const installments = [];
    const startDate = new Date(debt.next_due_date);

    for (let i = 0; i < debt.total_installments; i++) {
      const dueDate = addMonths(startDate, i);
      installments.push({
        debt_id: newDebt.id,
        amount: debt.monthly_payment,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'unpaid'
      });
    }

    const { error: instError } = await supabase
      .from("installments")
      .insert(installments);

    if (instError) {
      showToast("Taksitler oluşturulamadı: " + instError.message, "error");
    }

    showToast("Borç başarıyla kaydedildi");
    loadData();
  };

  const handlePayInstallment = async (id: string, amount: number) => {
    const { data: transData, error: balError } = await supabase.from("transactions").select("amount");
    if (balError) {
      showToast("Bakiye kontrol edilemedi", "error");
      return;
    }

    const currentBalance = (transData || []).reduce((acc, t) => acc + Number(t.amount), 0);

    if (currentBalance < amount) {
      showToast("Yetersiz bakiye. Lütfen önce bakiye ekleyin.", "error");
      return;
    }

    const { error: rpcError } = await supabase.rpc("pay_installment", {
      p_installment_id: id,
      p_amount: amount
    });
  
    if (rpcError) {
      showToast("Ödeme sırasında hata oluştu: " + rpcError.message, "error");
      return;
    }

    const { error: transError } = await supabase.from("transactions").insert({
      type: 'expense',
      amount: -amount,
      description: "Taksit ödemesi",
      category: "debt_payment"
    });

    if (transError) {
      console.error("Transaction record could not be created:", transError.message);
    }
  
    showToast("Ödeme başarılı");
    loadData();
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) {
      showToast("İşlem silinemedi: " + error.message, "error");
      return;
    }

    showToast("İşlem geri alındı");
    loadData();
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    let dbAmount = updates.amount !== undefined ? updates.amount : transaction.amount;
    if (transaction.type !== 'income') {
      dbAmount = -Math.abs(dbAmount);
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        amount: dbAmount,
        description: updates.description,
        category: updates.category
      })
      .eq("id", id);

    if (error) {
      showToast("İşlem güncellenemedi: " + error.message, "error");
      return;
    }

    showToast("İşlem güncellendi");
    loadData();
  };

  return (
    <main className="min-h-screen bg-black pb-32 relative overflow-x-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-white" /> : <AlertCircle className="w-5 h-5 text-white" />}
          <span className="text-white font-bold text-sm whitespace-nowrap">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 p-1 hover:bg-black/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-8 space-y-8">
        {/* Header / Calendar */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Finansal Durum</h1>
              <p className="text-zinc-500 text-sm">Hoş geldin, Akın</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Akin" alt="Avatar" />
            </div>
          </div>
          <WeekCalendar payments={payments} />
        </section>

        {/* Balance & Chart */}
        <section className="grid grid-cols-1 gap-4">
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl">
             <div className="text-zinc-500 text-sm mb-1">Toplam Kullanılabilir Bakiye</div>
             <div className="text-4xl font-black text-white tracking-tight">₺{balance.toLocaleString()}</div>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                <span className={`px-2 py-0.5 rounded-full ${monthlyNet >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {monthlyNet >= 0 ? '+' : '-'}₺{Math.abs(monthlyNet).toLocaleString()} bu ay
                </span>
             </div>
          </div>
          <BalanceChart 
            currentCash={balance} 
            currentDebt={totalDebt} 
            monthlyNet={monthlyNet}
          />
        </section>

        {/* Quick Actions */}
        <QuickActionBar 
          onAddIncome={(amt, desc) => handleAddTransaction('income', amt, desc)}
          onAddExpense={(amt, desc) => handleAddTransaction('expense', amt, desc)}
        />

        {/* Upcoming Payments */}
        <section>
          <UpcomingPayments 
            payments={payments} 
            onPayment={handlePayInstallment} 
          />
        </section>

        {/* Debts Overview */}
        <section>
          <DebtsOverview debts={debts} onAddDebt={handleAddDebt} />
        </section>

        {/* Recent Transactions */}
        <section>
          <RecentTransactions 
            transactions={transactions} 
            onUndo={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
          />
        </section>
      </div>

      <BottomNav active={activeTab} onNavigate={setActiveTab} />
    </main>
  );
}
