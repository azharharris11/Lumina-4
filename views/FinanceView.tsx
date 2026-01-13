
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, FileText, PieChart, ArrowRightLeft, MinusCircle } from 'lucide-react';
import { FinanceViewProps, Account } from '../types';
import InvoiceModal from '../components/InvoiceModal';
import WhatsAppModal from '../components/WhatsAppModal';

import FinanceOverview from '../components/finance/FinanceOverview';
import FinanceInvoices from '../components/finance/FinanceInvoices';
import FinanceLedger from '../components/finance/FinanceLedger';
import FinanceAnalysis from '../components/finance/FinanceAnalysis';

import TransferModal from '../components/finance/modals/TransferModal';
import ExpenseModal from '../components/finance/modals/ExpenseModal';
import AccountModal from '../components/finance/modals/AccountModal';
import SettleModal from '../components/finance/modals/SettleModal';

const FinanceView: React.FC<FinanceViewProps> = ({ accounts, metrics, bookings, users, transactions = [], onTransfer, onRecordExpense, onSettleBooking, onDeleteTransaction, config, onAddAccount, onUpdateAccount }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVOICES' | 'EXPENSES' | 'LEDGER'>('OVERVIEW');
  
  // Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  // Settle State
  const [settleState, setSettleState] = useState<{ bookingId: string | null, amount: number, maxAmount: number, currentPaid: number, mode: 'PAYMENT' | 'REFUND' }>({
      bookingId: null, amount: 0, maxAmount: 0, currentPaid: 0, mode: 'PAYMENT'
  });

  // Misc Modals
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<any | null>(null);
  const [selectedBookingForWA, setSelectedBookingForWA] = useState<any | null>(null);

  const handleEditAccount = (acc: Account) => { setEditingAccount(acc); setShowAccountModal(true); };
  const handleOpenAddAccount = () => { setEditingAccount(null); setShowAccountModal(true); };
  
  const handleAccountSave = (data: Partial<Account>) => {
      if (editingAccount && onUpdateAccount) {
          onUpdateAccount({ ...editingAccount, ...data } as Account);
      } else if (onAddAccount && data.name) {
          onAddAccount({ 
              id: `acc-${Date.now()}`, 
              name: data.name!, 
              type: data.type as any, 
              balance: Number(data.balance), 
              accountNumber: data.accountNumber 
          } as Account);
      }
      setShowAccountModal(false);
  };

  const handleSettleConfirm = (amount: number, accountId: string) => {
      if (onSettleBooking && settleState.bookingId) {
          if (settleState.mode === 'PAYMENT') {
              if (amount <= 0) { alert("Please enter a valid positive amount."); return; }
              if (amount > settleState.maxAmount) { alert("Amount exceeds remaining balance!"); return; }
              onSettleBooking(settleState.bookingId, amount, accountId);
          } else {
              if (amount <= 0) { alert("Please enter a valid positive amount to refund."); return; }
              if (amount > settleState.currentPaid) { alert("Refund exceeds total paid amount."); return; }
              const sourceAccount = accounts.find(a => a.id === accountId);
              if (sourceAccount && sourceAccount.balance < amount) { alert(`Insufficient funds in ${sourceAccount.name}.`); return; }
              onSettleBooking(settleState.bookingId, -amount, accountId);
          }
          setSettleState({ bookingId: null, amount: 0, maxAmount: 0, currentPaid: 0, mode: 'PAYMENT' });
      }
  };

  const handleExportData = () => { 
      try { 
          const seen = new WeakSet();
          const replacer = (key: string, value: any) => {
              if (typeof value === 'object' && value !== null) {
                  if (seen.has(value)) {
                      return;
                  }
                  seen.add(value);
              }
              if (key === 'firestore' || key === '_key' || key === 'app' || key === 'delegate' || key.startsWith('_')) {
                  return undefined;
              }
              return value;
          };
          const dataToExport = { config: config, packages: [] /* Placeholder if needed */, timestamp: new Date().toISOString() }; 
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, replacer)); 
          const downloadAnchorNode = document.createElement('a'); 
          downloadAnchorNode.setAttribute("href", dataStr); 
          downloadAnchorNode.setAttribute("download", "lumina_backup.json"); 
          document.body.appendChild(downloadAnchorNode); 
          downloadAnchorNode.click(); 
          downloadAnchorNode.remove(); 
      } catch (e) { 
          console.error("Export Failed:", e); 
          alert("Failed to export data. See console."); 
      } 
  };

  const handleExportCSV = () => {
      if (!transactions || transactions.length === 0) {
          alert("No transaction data to export.");
          return;
      }

      try {
          // Define CSV Headers
          const headers = ["Date", "Description", "Type", "Category", "Amount", "Account", "Status", "Booking ID"];
          
          // Helper to find account name
          const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || id;

          // Convert transactions to rows
          const rows = transactions.map(t => [
              new Date(t.date).toLocaleDateString(),
              `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
              t.type,
              t.category,
              t.amount,
              getAccountName(t.accountId),
              t.status,
              t.bookingId || "-"
          ]);

          // Combine headers and rows
          const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
          
          // Create Blob and Download
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `Lumina_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } catch (e) {
          console.error("CSV Export Failed:", e);
          alert("Failed to export CSV.");
      }
  };

  const unpaidCount = bookings.filter(b => {
      const total = (b.price + ((b.items||[]).reduce((s,i)=>s+i.total,0) - b.price)) * (1 + (b.taxSnapshot || config.taxRate)/100);
      return (total - b.paidAmount) > 100 && b.status !== 'CANCELLED';
  }).length;

  return (
    <div className="space-y-4 lg:space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end shrink-0 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-white mb-1 lg:mb-2">Financial Hub</h1>
          <p className="text-lumina-muted text-sm">
              {config?.businessType === 'FREELANCE' ? "Master your business's cash flow." : "Master your studio's cash flow."}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:flex w-full lg:w-auto gap-3">
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center text-sm"
          >
            <MinusCircle className="w-4 h-4 mr-2" /> Expense
          </button>
          <button 
            onClick={() => setShowTransferModal(true)}
            className="bg-lumina-surface border border-lumina-highlight text-white hover:bg-lumina-highlight px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center text-sm"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfer
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-lumina-highlight text-white hover:brightness-110 px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center text-sm"
          >
            <FileText className="w-4 h-4 mr-2" /> Export CSV
          </button>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="sticky top-0 z-20 bg-lumina-base pt-2 pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 border-b border-lumina-highlight shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max pr-4">
            {[
                { id: 'OVERVIEW', label: 'Overview', icon: Wallet },
                { id: 'INVOICES', label: 'Invoices', icon: FileText, count: unpaidCount },
                { id: 'EXPENSES', label: 'Analysis', icon: PieChart },
                { id: 'LEDGER', label: 'Ledger', icon: ArrowRightLeft },
            ].map((tab) => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 lg:px-6 py-3 lg:py-2 font-bold text-sm transition-colors relative flex items-center whitespace-nowrap rounded-lg
                        ${activeTab === tab.id ? 'bg-lumina-surface text-white' : 'text-lumina-muted hover:text-white hover:bg-lumina-highlight/30'}`}
                >
                    <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-lumina-accent' : ''}`} />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-lumina-danger text-white text-[10px] rounded-full">{tab.count}</span>
                    )}
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div>
      <AnimatePresence mode="wait">
        
        {activeTab === 'OVERVIEW' && (
            <FinanceOverview 
                key="overview"
                accounts={accounts} 
                transactions={transactions} 
                onEditAccount={handleEditAccount} 
                onAddAccount={handleOpenAddAccount} 
            />
        )}

        {activeTab === 'INVOICES' && (
            <FinanceInvoices 
                key="invoices"
                bookings={bookings} 
                config={config} 
                accounts={accounts} 
                onSettle={(id, amt, max, paid, mode) => setSettleState({ bookingId: id, amount: amt, maxAmount: max, currentPaid: paid, mode })} 
                onInvoice={setSelectedBookingForInvoice} 
                onWhatsApp={setSelectedBookingForWA} 
            />
        )}

        {activeTab === 'LEDGER' && (
            <FinanceLedger 
                key="ledger"
                transactions={transactions} 
                accounts={accounts} 
                onDeleteTransaction={onDeleteTransaction} 
            />
        )}

        {activeTab === 'EXPENSES' && (
             <FinanceAnalysis key="expenses" transactions={transactions} />
        )}
        
      </AnimatePresence>
      </div>

      {/* Modals */}
      <TransferModal 
          isOpen={showTransferModal} 
          accounts={accounts} 
          onClose={() => setShowTransferModal(false)} 
          onTransfer={onTransfer}
      />

      <ExpenseModal
          isOpen={showExpenseModal}
          accounts={accounts}
          categories={config.expenseCategories || ['Other']}
          onClose={() => setShowExpenseModal(false)}
          onRecordExpense={onRecordExpense}
      />

      <AccountModal
          isOpen={showAccountModal}
          initialData={editingAccount}
          onClose={() => setShowAccountModal(false)}
          onSave={handleAccountSave}
      />

      <SettleModal
          isOpen={!!settleState.bookingId}
          bookingId={settleState.bookingId}
          mode={settleState.mode}
          currentPaid={settleState.currentPaid}
          maxAmount={settleState.maxAmount}
          accounts={accounts}
          onClose={() => setSettleState({ ...settleState, bookingId: null })}
          onConfirm={handleSettleConfirm}
      />

      <InvoiceModal isOpen={!!selectedBookingForInvoice} onClose={() => setSelectedBookingForInvoice(null)} booking={selectedBookingForInvoice} config={config} />
      <WhatsAppModal isOpen={!!selectedBookingForWA} onClose={() => setSelectedBookingForWA(null)} booking={selectedBookingForWA} config={config} />
    </div>
  );
};

export default FinanceView;
