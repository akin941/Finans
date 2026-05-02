"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { addMonths, format, startOfMonth, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { BalanceChart } from "@/components/BalanceChart";
import { RecentTransactions, Transaction } from "@/components/RecentTransactions";
import { UpcomingPayments, Payment } from "@/components/UpcomingPayments";
import { DebtsOverview, Debt } from "@/components/DebtsOverview";
import { QuickActionBar } from "@/components/QuickActionBar";
import { BottomNav, NavItem } from "@/components/BottomNav";
import { WeekCalendar } from "@/components/WeekCalendar";
import { ProfessionalPieChart } from "@/components/AnalyticsCharts";
import { CheckCircle2, AlertCircle, X, CreditCard, ChevronRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { VoiceInputModal } from "@/components/VoiceInputModal";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDebtsModal, setShowDebtsModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(false);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [dashboardDate, setDashboardDate] = useState<Date>(new Date());
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [expenseTimeRange, setExpenseTimeRange] = useState<'month' | 'all'>('month');
  const [expenseSelectedDate, setExpenseSelectedDate] = useState<Date>(new Date());
  
  // Voice Input States
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const { isRecording, startRecording, stopRecording, stopStream } = useVoiceRecorder();

  useEffect(() => {
    console.log("App mounted, loading data...");
    loadData();
    return () => stopStream(); // Cleanup mic on unmount
  }, [stopStream]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadData() {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        category: t.category || (t.type === 'income' ? 'Genel' : 'Harcama'),
        related_installment_id: t.related_installment_id
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
          id,
          amount,
          due_date,
          status,
          paid_amount,
          debt_id,
          debts (
            id,
            name,
            total_installments,
            banks (
              id,
              name
            )
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
          
          const paymentDueDate = new Date(inst.due_date);
          const isOverdue = paymentDueDate < today && inst.status !== 'paid';

          const debt = Array.isArray(inst.debts) ? inst.debts[0] : inst.debts;
          const bank = Array.isArray(debt?.banks) ? debt?.banks[0] : debt?.banks;
          
          const bankName = bank?.name || "Bilinmeyen Banka";
          const debtName = debt?.name || "Borç";

          return {
            id: inst.id,
            bank: `${bankName} - ${debtName}`,
            amount: inst.amount - (inst.paid_amount || 0),
            dueDate: paymentDueDate,
            status: isOverdue ? 'overdue' : (inst.status === 'partial' ? 'partial' : 'pending'),
            installmentNumber: installmentIndex !== -1 ? installmentIndex + 1 : undefined,
            totalInstallments: debt?.total_installments
          };
        });
      setPayments(mappedPayments);

      const totalDebtAmount = (allInstData || [])
        .filter(inst => inst.status !== 'paid')
        .reduce((acc, inst) => acc + (inst.amount - (inst.paid_amount || 0)), 0);
      setTotalDebt(totalDebtAmount);

      const { data: debtData } = await supabase
        .from("debts")
        .select(`
          *,
          banks (
            id,
            name
          )
        `);

      const mappedDebts: Debt[] = (debtData || []).map(d => {
        const debtInsts = installmentsByDebt[d.id] || [];
        const paidInsts = debtInsts.filter(i => i.status === 'paid');
        const remainingInsts = debtInsts.filter(i => i.status !== 'paid');
        
        const totalPaid = paidInsts.reduce((acc, i) => acc + Number(i.amount), 0);
        const totalRemaining = remainingInsts.reduce((acc, i) => acc + Number(i.amount), 0);
        const lastDate = debtInsts.length > 0 ? new Date(Math.max(...debtInsts.map(i => new Date(i.due_date).getTime()))) : null;

        const bank = Array.isArray(d.banks) ? d.banks[0] : d.banks;

        return {
          id: d.id,
          bank_id: d.bank_id,
          bank_name: bank?.name || "Banka Belirtilmemiş",
          name: d.name,
          description: d.description || "",
          remainingInstallments: remainingInsts.length,
          monthlyPayment: d.monthly_payment,
          totalRemaining: totalRemaining,
          totalDebt: totalPaid + totalRemaining,
          paidAmount: totalPaid,
          remainingInstallmentCount: remainingInsts.length,
          lastInstallmentDate: lastDate,
          totalInstallments: d.total_installments,
          nextDueDate: d.next_due_date
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

  const handleAddTransaction = async (type: 'income' | 'expense', amount: number, description?: string, category?: string) => {
    const value = type === 'income' ? amount : -amount;
    const { error } = await supabase.from("transactions").insert({
      type,
      amount: value,
      description: description || (type === 'income' ? 'Gelir' : 'Gider'),
      category: category || 'Diğer'
    });

    if (error) {
      showToast("İşlem kaydedilemedi: " + error.message, "error");
      return;
    }

    showToast("İşlem başarıyla eklendi");
    loadData();
  };

  const handleVoiceConfirm = (data: { type: 'income' | 'expense', amount: number, category: string, description: string }) => {
    handleAddTransaction(data.type, data.amount, data.description, data.category);
    setIsVoiceModalOpen(false);
    setVoiceResult(null); // Clear result after confirm
  };

  const toggleVoiceRecording = async () => {
    if (voiceStatus === 'recording') {
      stopRecording();
      return;
    }

    if (voiceStatus === 'processing') return;

    try {
      setVoiceError(null);
      setVoiceResult(null);
      setVoiceStatus('recording');
      
      const recordingPromise = await startRecording();
      const blob = await recordingPromise;
      
      setVoiceStatus('processing');
      
      const formData = new FormData();
      formData.append('audio', blob);

      const res = await fetch('/api/voice', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sesli işlem başarısız");

      setVoiceResult(data);
      setIsVoiceModalOpen(true);
      setVoiceStatus('idle');
    } catch (err: any) {
      if (err.message !== "Kayıt iptal edildi.") {
        setVoiceError(err.message);
        setIsVoiceModalOpen(true);
      }
      setVoiceStatus('idle');
      stopStream();
    }
  };

  const handleAddDebt = async (debt: {
    bank_id: string;
    name: string;
    description?: string;
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
        description: debt.description,
        monthly_payment: debt.monthly_payment,
        total_installments: debt.total_installments,
        remaining_installments: debt.total_installments,
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

  const handleUpdateDebt = async (id: string, updates: {
    bank_id: string;
    name: string;
    description?: string;
    monthly_payment: number;
    total_installments: number;
    next_due_date: string;
  }) => {
    try {
      // 1. Delete all existing installments
      const { error: deleteError } = await supabase
        .from("installments")
        .delete()
        .eq("debt_id", id);

      if (deleteError) throw deleteError;

      // 2. Create NEW installments
      const installments = [];
      const startDate = new Date(updates.next_due_date);

      for (let i = 0; i < updates.total_installments; i++) {
        const dueDate = addMonths(startDate, i);
        installments.push({
          debt_id: id,
          amount: updates.monthly_payment,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          status: 'unpaid'
        });
      }

      const { error: instError } = await supabase
        .from("installments")
        .insert(installments);

      if (instError) throw instError;

      // 3. Update Debt
      const { error: debtError } = await supabase
        .from("debts")
        .update({
          bank_id: updates.bank_id,
          name: updates.name,
          description: updates.description,
          monthly_payment: updates.monthly_payment,
          total_installments: updates.total_installments,
          remaining_installments: updates.total_installments,
          next_due_date: updates.next_due_date
        })
        .eq("id", id);

      if (debtError) throw debtError;

      showToast("Borç başarıyla güncellendi");
      loadData();
    } catch (error: any) {
      showToast("Güncelleme hatası: " + error.message, "error");
    }
  };

  const handleDeleteDebt = async (id: string) => {
    try {
      const { error } = await supabase
        .from("debts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showToast("Borç silindi");
      loadData();
    } catch (error: any) {
      showToast("Silme hatası: " + error.message, "error");
    }
  };

  const handlePayInstallment = async (id: string, amount: number) => {
    // 1. Balance Check
    if (balance < amount) {
      showToast("Yetersiz bakiye", "error");
      return;
    }

    try {
      // 2. Fetch installment details for description
      const { data: inst } = await supabase
        .from('installments')
        .select(`
          due_date,
          debts (
            name,
            total_installments,
            banks (name)
          )
        `)
        .eq('id', id)
        .single();

      // Find installment number for description
      const debtInstallments = (await supabase
        .from('installments')
        .select('id')
        .eq('debt_id', (await supabase.from('installments').select('debt_id').eq('id', id).single()).data?.debt_id)
        .order('due_date', { ascending: true })).data || [];
      
      const instIndex = debtInstallments.findIndex(i => i.id === id);
      const instNumber = instIndex !== -1 ? instIndex + 1 : '?';
      
      const debt = inst?.debts?.[0];
      const bankName = debt?.banks?.[0]?.name || 'Bilinmeyen Banka';
      const debtName = debt?.name || 'Borç';
      const totalInst = debt?.total_installments || '?';
      const detailedDesc = `${bankName} - ${debtName} (${instNumber}/${totalInst} taksit)`;

      // 3. Create Transaction FIRST
      const { error: transError } = await supabase.from("transactions").insert({
        type: 'expense',
        amount: -amount,
        description: detailedDesc,
        category: "debt_payment",
        related_installment_id: id
      });

      if (transError) {
        console.error("Transaction insert failed:", transError);
        showToast("İşlem kaydı oluşturulamadı: " + transError.message, "error");
        return;
      }

      // 4. ONLY THEN call pay_installment
      const { error: rpcError } = await supabase.rpc("pay_installment", {
        p_installment_id: id,
        p_amount: amount
      });
    
      if (rpcError) {
        showToast("Taksit güncellenemedi (İşlem kaydedildi): " + rpcError.message, "error");
        await loadData();
        return;
      }

      showToast("Ödeme başarılı");
      await loadData();
      
    } catch (error: any) {
      showToast("Bir hata oluştu: " + error.message, "error");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      // 1. Get transaction details
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return;

      // 2. Rollback installment if needed
      if (transaction.related_installment_id) {
        const { data: inst } = await supabase
          .from('installments')
          .select('*')
          .eq('id', transaction.related_installment_id)
          .single();

        if (inst) {
          const newPaidAmount = Math.max(0, (inst.paid_amount || 0) - transaction.amount);
          let newStatus = 'partial';
          if (newPaidAmount <= 0) {
            newStatus = 'unpaid';
          } else if (newPaidAmount < inst.amount) {
            newStatus = 'partial';
          } else {
            newStatus = 'paid';
          }

          const { error: instError } = await supabase
            .from('installments')
            .update({
              paid_amount: newPaidAmount,
              status: newStatus
            })
            .eq('id', transaction.related_installment_id);

          if (instError) throw instError;
        }
      }

      // 3. Delete transaction
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showToast("İşlem geri alındı");
      loadData();
    } catch (error: any) {
      showToast("Geri alma hatası: " + error.message, "error");
    }
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
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-500">
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
          <WeekCalendar 
            payments={payments} 
            selectedDate={selectedDate || undefined}
            onDateSelect={(date) => {
              if (selectedDate && isSameDay(selectedDate, date)) {
                setSelectedDate(null);
              } else {
                setSelectedDate(date);
              }
            }}
          />

          {selectedDate && (
            <div className="mt-6 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm uppercase tracking-wide text-zinc-500">
                  {format(selectedDate, 'd MMMM', { locale: tr })} - Günlük Ödemeler
                </h3>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-zinc-500 hover:text-white text-xs font-medium transition-colors"
                >
                  Kapat
                </button>
              </div>
              
              <div className="space-y-3">
                {payments?.filter(p => format(p.dueDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                  payments
                    ?.filter(p => format(p.dueDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
                    .map(payment => (
                      <div key={payment.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-zinc-800 rounded-lg p-2">
                            <CreditCard className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{payment.bank}</div>
                            <div className="text-xs text-zinc-500">
                              {payment.installmentNumber && payment.totalInstallments 
                                ? `${payment.installmentNumber} / ${payment.totalInstallments} Taksit` 
                                : 'Ödeme'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">₺{payment.amount.toLocaleString()}</div>
                          <button 
                            onClick={() => handlePayInstallment(payment.id, payment.amount)}
                            className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wider mt-1"
                          >
                            Hızlı Öde
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="bg-zinc-900/50 rounded-xl py-8 text-center border border-zinc-800/50 border-dashed">
                    <p className="text-zinc-500 text-sm italic">Bu gün ödeme yok</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Assets Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Toplam Varlık</p>
              <h2 className="text-2xl font-black text-white">₺{balance.toLocaleString()}</h2>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions (Input area) */}
        <QuickActionBar 
          onAddIncome={(amt, desc, cat) => handleAddTransaction('income', amt, desc, cat)}
          onAddExpense={(amt, desc, cat) => handleAddTransaction('expense', amt, desc, cat)}
        />

        {/* Professional Analytics Chart (Current Month Only) */}
        <section className="animate-in fade-in duration-700">
          <ProfessionalPieChart transactions={transactions.filter(t => 
            t.type === 'expense' && 
            t.date.getMonth() === new Date().getMonth() && 
            t.date.getFullYear() === new Date().getFullYear()
          )} />
        </section>

        {/* Collapsible Overdue Section */}
        {payments?.filter(p => p.status === 'overdue').length > 0 && (
          <section className="animate-in slide-in-from-top-2 duration-500">
            <button 
              onClick={() => setIsOverdueExpanded(!isOverdueExpanded)}
              className="w-full flex items-center justify-between bg-zinc-900 border border-red-500/20 rounded-2xl p-5 shadow-lg group transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute inset-0" />
                  <div className="w-3 h-3 rounded-full bg-red-500 relative" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm uppercase tracking-widest text-red-400 font-black">Gecikmiş Borçlar</h3>
                  <div className="text-xs text-zinc-500 mt-0.5">Toplam {payments.filter(p => p.status === 'overdue').length} gecikmiş taksit</div>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className="text-lg font-black text-white">₺{payments.filter(p => p.status === 'overdue').reduce((acc, p) => acc + p.amount, 0).toLocaleString()}</div>
                <div className={`text-zinc-500 group-hover:text-white transition-transform duration-300 ${isOverdueExpanded ? 'rotate-180' : ''}`}>
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
            </button>

            {isOverdueExpanded && (
              <div className="mt-3 space-y-3 animate-in slide-in-from-top-4 duration-300">
                {payments
                  ?.filter(p => p.status === 'overdue')
                  .map(payment => (
                    <div key={payment.id} className="bg-zinc-900/50 border border-red-500/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-500/10 rounded-lg p-2 text-red-500">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{payment.bank}</div>
                          <div className="text-[10px] text-red-400/70 font-black uppercase tracking-wider">
                            {format(payment.dueDate, 'd MMMM', { locale: tr })} Gecikmiş
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-white tracking-tight">₺{payment.amount.toLocaleString()}</div>
                        <button 
                          onClick={() => handlePayInstallment(payment.id, payment.amount)}
                          className="text-[10px] text-red-500 hover:text-red-400 font-black uppercase tracking-widest mt-1"
                        >
                          Öde
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}
        {/* Debt Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Toplam Borç</p>
              <h2 className="text-2xl font-black text-red-500">₺{totalDebt.toLocaleString()}</h2>
            </div>
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>

        {/* Collapsible Upcoming Payments */}
        <section className="animate-in slide-in-from-top-2 duration-500">
          <button 
            onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
            className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg group transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/10 text-emerald-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold">Yaklaşan Ödemeler</div>
                <div className="text-xs text-zinc-500">{payments.filter(p => p.status !== 'completed' && p.status !== 'overdue').length} bekleyen taksit</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">
                {isUpcomingExpanded ? 'Gizle' : 'Göster'}
              </span>
              <div className={`text-zinc-600 group-hover:text-white transition-transform duration-300 ${isUpcomingExpanded ? 'rotate-180' : ''}`}>
                <ChevronRight className="w-5 h-5 rotate-90" />
              </div>
            </div>
          </button>

          {isUpcomingExpanded && (
            <div className="mt-4 animate-in slide-in-from-top-4 duration-300">
              <UpcomingPayments 
                payments={payments} 
                onPayment={handlePayInstallment} 
              />
            </div>
          )}
        </section>

        {/* Debts Overview Modal Trigger */}
        <section>
          <button 
            onClick={() => setShowDebtsModal(true)}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl p-5 border border-zinc-800 shadow-lg flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/10 text-emerald-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold">Borçları Gör</div>
                <div className="text-xs text-zinc-500">Toplam {debts.length} aktif borç kaydı</div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-zinc-600 group-hover:text-white transition-colors" />
          </button>
        </section>

        {/* Recent Transactions & Full View Trigger */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm uppercase tracking-wide text-zinc-500">Son İşlemler</h3>
            <button 
              onClick={() => setShowTransactionsModal(true)}
              className="text-xs font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider"
            >
              Tüm İşlemler
            </button>
          </div>
          <RecentTransactions 
            transactions={transactions.slice(0, 5)} 
            onUndo={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
          />
        </section>
          </div>
        )}

        {activeTab === 'expense' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-white">Giderler</h1>
              <p className="text-zinc-500 text-sm mt-1">Harcama analizi ve geçmişi</p>
            </div>

            {/* Time Range Filter */}
            <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800">
              <button 
                onClick={() => setExpenseTimeRange('month')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${expenseTimeRange === 'month' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                Bu Ay
              </button>
              <button 
                onClick={() => setExpenseTimeRange('all')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${expenseTimeRange === 'all' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                Tüm Zamanlar
              </button>
            </div>

            {/* Month Navigation (Only for month mode) */}
            {expenseTimeRange === 'month' && (
              <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg">
                <button 
                  onClick={() => setExpenseSelectedDate(addMonths(expenseSelectedDate, -1))}
                  className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div className="text-sm font-black text-white uppercase tracking-widest">
                  {format(expenseSelectedDate, 'MMMM yyyy', { locale: tr })}
                </div>
                <button 
                  onClick={() => setExpenseSelectedDate(addMonths(expenseSelectedDate, 1))}
                  className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Category Summary List */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-black px-1">Kategori Bazlı Gider</h3>
              <div className="space-y-2">
                {Object.entries(
                  transactions
                    .filter(t => {
                      if (t.type !== 'expense') return false;
                      if (expenseTimeRange === 'all') return true;
                      return t.date.getMonth() === expenseSelectedDate.getMonth() && 
                             t.date.getFullYear() === expenseSelectedDate.getFullYear();
                    })
                    .reduce((acc, t) => {
                      const cat = t.category || 'Diğer';
                      acc[cat] = (acc[cat] || 0) + t.amount;
                      return acc;
                    }, {} as { [key: string]: number })
                )
                .sort((a, b) => b[1] - a[1])
                .map(([name, amount]) => (
                  <button 
                    key={name}
                    onClick={() => setDrilldownCategory(drilldownCategory === name ? null : name)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${drilldownCategory === name ? 'bg-zinc-100 border-white text-black' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                  >
                    <span className="text-sm font-black uppercase tracking-wide">{name}</span>
                    <span className="text-sm font-black">₺{amount.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction List (Drilldown or Filtered) */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-black px-1">
                {drilldownCategory ? `${drilldownCategory} Detayları` : 'İşlem Geçmişi'}
              </h3>
              <RecentTransactions 
                transactions={transactions.filter(t => {
                  if (t.type !== 'expense') return false;
                  if (drilldownCategory && t.category !== drilldownCategory) return false;
                  if (expenseTimeRange === 'all') return true;
                  return t.date.getMonth() === expenseSelectedDate.getMonth() && 
                         t.date.getFullYear() === expenseSelectedDate.getFullYear();
                })} 
                onUndo={handleDeleteTransaction}
                onUpdate={handleUpdateTransaction}
              />
            </div>

            {/* Bottom Summary */}
            <div className="bg-zinc-950 border-t border-zinc-800 p-6 -mx-4 mt-8">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 font-black uppercase tracking-widest">Toplam Gider</span>
                <span className="text-2xl font-black text-red-500">
                  ₺{transactions
                    .filter(t => {
                      if (t.type !== 'expense') return false;
                      if (expenseTimeRange === 'all') return true;
                      return t.date.getMonth() === expenseSelectedDate.getMonth() && 
                             t.date.getFullYear() === expenseSelectedDate.getFullYear();
                    })
                    .reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-12">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-white">Gelirler</h1>
              <p className="text-zinc-500 text-sm mt-1">Tüm gelir hareketlerin</p>
            </div>

            {/* Summaries */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                <div className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Bu Ay</div>
                <div className="text-xl font-black text-emerald-500">
                  ₺{transactions
                    .filter(t => t.type === 'income' && t.date.getMonth() === new Date().getMonth())
                    .reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                <div className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Tüm Zamanlar</div>
                <div className="text-xl font-black text-white">
                  ₺{transactions
                    .filter(t => t.type === 'income')
                    .reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Income History */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-black px-1">Geçmiş Gelirler</h3>
              <div className="space-y-8">
                {Object.entries(
                  (transactions || [])
                    .filter(t => t.type === 'income')
                    .reduce((acc, t) => {
                      const month = format(t.date, 'MMMM yyyy', { locale: tr });
                      if (!acc[month]) acc[month] = [];
                      acc[month].push(t);
                      return acc;
                    }, {} as { [key: string]: Transaction[] })
                ).map(([month, monthTrans]) => (
                  <div key={month} className="space-y-4">
                    <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-black opacity-60 px-1">{month}</h3>
                    <RecentTransactions 
                      transactions={monthTrans} 
                      onUndo={handleDeleteTransaction}
                      onUpdate={handleUpdateTransaction}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debts Modal */}
      {showDebtsModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end justify-center sm:items-center">
          <div className="w-full max-w-md bg-zinc-950 border-t border-x sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <h2 className="text-xl font-bold text-white">Banka Borçları</h2>
              <button 
                onClick={() => setShowDebtsModal(false)}
                className="bg-zinc-900 p-2 rounded-xl text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <DebtsOverview 
                debts={debts} 
                onAddDebt={handleAddDebt} 
                onUpdateDebt={handleUpdateDebt}
                onDeleteDebt={handleDeleteDebt}
              />
            </div>
          </div>
        </div>
      )}

      {/* All Transactions Modal */}
      {showTransactionsModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end justify-center sm:items-center">
          <div className="w-full max-w-md bg-zinc-950 border-t border-x sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[90vh] animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <h2 className="text-xl font-bold text-white">Tüm İşlemler</h2>
              <button 
                onClick={() => setShowTransactionsModal(false)}
                className="bg-zinc-900 p-2 rounded-xl text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar pb-12">
              {/* Monthly Summary Section */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="text-[10px] uppercase font-black text-emerald-500 tracking-widest mb-1">Bu Ay Gelir</div>
                  <div className="text-lg font-black text-emerald-400">₺{transactions
                    .filter(t => t.type === 'income' && t.date.getMonth() === new Date().getMonth())
                    .reduce((acc, t) => acc + t.amount, 0).toLocaleString()}</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <div className="text-[10px] uppercase font-black text-red-500 tracking-widest mb-1">Bu Ay Gider</div>
                  <div className="text-lg font-black text-red-400">₺{transactions
                    .filter(t => t.type === 'expense' && t.date.getMonth() === new Date().getMonth())
                    .reduce((acc, t) => acc + t.amount, 0).toLocaleString()}</div>
                </div>
              </div>

              {Object.entries(
                (transactions || []).reduce((acc, t) => {
                  const month = format(t.date, 'MMMM yyyy', { locale: tr });
                  if (!acc[month]) acc[month] = [];
                  acc[month].push(t);
                  return acc;
                }, {} as { [key: string]: Transaction[] })
              ).map(([month, monthTrans]) => (
                <div key={month} className="space-y-4">
                  <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-black px-2">{month}</h3>
                  <div className="space-y-2">
                    <RecentTransactions 
                      transactions={monthTrans} 
                      onUndo={handleDeleteTransaction}
                      onUpdate={handleUpdateTransaction}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav 
        active={activeTab} 
        onNavigate={setActiveTab} 
        onVoiceClick={toggleVoiceRecording}
        voiceState={voiceStatus}
      />

      <VoiceInputModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => {
          setIsVoiceModalOpen(false);
          setVoiceResult(null);
          setVoiceError(null);
        }}
        onConfirm={handleVoiceConfirm}
        initialData={voiceResult}
        error={voiceError}
      />
    </main>
  );
}
