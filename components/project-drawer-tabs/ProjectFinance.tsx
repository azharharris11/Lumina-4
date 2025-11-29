import React from 'react';
import { Booking, Transaction, StudioConfig } from '../../types';
import { DollarSign, FileText, TrendingUp, TrendingDown } from 'lucide-react';

interface ProjectFinanceProps {
    booking: Booking;
    transactions: Transaction[];
    onSettle: (mode: 'PAYMENT' | 'REFUND') => void;
    onViewInvoice: () => void;
    config: StudioConfig;
}

const ProjectFinance: React.FC<ProjectFinanceProps> = ({ booking, transactions, onSettle, onViewInvoice, config }) => {
    // Financial Calculations
    const applicableTaxRate = booking.taxSnapshot !== undefined ? booking.taxSnapshot : (config.taxRate || 0);
    
    // Calculate subtotal from items or fallback to legacy price
    const subtotal = booking.items && booking.items.length > 0 
        ? booking.items.reduce((s, i) => s + i.total, 0) 
        : booking.price;
    
    let discountAmount = 0;
    if (booking.discount) {
        discountAmount = booking.discount.type === 'PERCENT' ? subtotal * (booking.discount.value / 100) : booking.discount.value;
    }
    
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * (applicableTaxRate / 100);
    const totalAmount = taxableAmount + taxAmount;
    const balanceDue = totalAmount - booking.paidAmount;
    
    // Tolerance for float errors
    const isPaid = balanceDue <= 100; 

    const projectTransactions = transactions
        .filter(t => t.bookingId === booking.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-lumina-surface border border-lumina-highlight p-4 rounded-xl">
                    <p className="text-xs text-lumina-muted uppercase font-bold">Total Project Value</p>
                    <p className="text-xl text-white font-mono font-bold mt-1">Rp {totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-lumina-surface border border-lumina-highlight p-4 rounded-xl">
                    <p className="text-xs text-lumina-muted uppercase font-bold">Paid to Date</p>
                    <p className="text-xl text-emerald-400 font-mono font-bold mt-1">Rp {booking.paidAmount.toLocaleString()}</p>
                </div>
                <div className={`bg-lumina-surface border p-4 rounded-xl ${isPaid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                    <p className="text-xs text-lumina-muted uppercase font-bold">Balance Due</p>
                    <p className={`text-xl font-mono font-bold mt-1 ${isPaid ? 'text-emerald-500' : 'text-rose-500'}`}>
                        Rp {balanceDue.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-3">
                {!isPaid && (
                    <button 
                        onClick={() => onSettle('PAYMENT')} 
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        <DollarSign size={18} /> Record Payment
                    </button>
                )}
                {isPaid && (
                     <button 
                        onClick={() => onSettle('REFUND')} 
                        className="flex-1 py-3 bg-lumina-surface border border-lumina-highlight hover:bg-rose-500/10 hover:text-rose-500 text-lumina-muted font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <DollarSign size={18} /> Issue Refund
                    </button>
                )}
                <button 
                    onClick={onViewInvoice} 
                    className="flex-1 py-3 bg-lumina-surface border border-lumina-highlight hover:bg-lumina-highlight text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                    <FileText size={18} /> View Invoice
                </button>
            </div>

            {/* Breakdown */}
            <div className="bg-lumina-surface border border-lumina-highlight rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Financial Breakdown</h3>
                <div className="space-y-3 text-sm">
                    {/* Items */}
                    {(booking.items || [{id:'legacy', description: booking.package, quantity: 1, unitPrice: booking.price, total: booking.price}]).map((item) => (
                        <div key={item.id} className="flex justify-between text-lumina-muted">
                            <span>{item.description || 'Package Base Price'} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                            <span className="font-mono text-white">Rp {item.total.toLocaleString()}</span>
                        </div>
                    ))}
                    
                    {/* Discount */}
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                            <span>Discount {booking.discount?.type === 'PERCENT' ? `(${booking.discount.value}%)` : ''}</span>
                            <span className="font-mono">- Rp {discountAmount.toLocaleString()}</span>
                        </div>
                    )}

                    {/* Tax */}
                    <div className="flex justify-between text-lumina-muted border-b border-lumina-highlight pb-3">
                        <span>Tax ({applicableTaxRate}%)</span>
                        <span className="font-mono text-white">Rp {taxAmount.toLocaleString()}</span>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between text-white font-bold text-lg pt-2">
                        <span>Grand Total</span>
                        <span className="font-mono">Rp {totalAmount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Transactions */}
            <div className="bg-lumina-surface border border-lumina-highlight rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Transaction History</h3>
                {projectTransactions.length === 0 ? (
                    <p className="text-lumina-muted text-sm italic py-4 text-center">No transactions recorded yet.</p>
                ) : (
                    <div className="space-y-3">
                        {projectTransactions.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-3 bg-lumina-base/50 rounded-xl border border-lumina-highlight/30">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {t.type === 'INCOME' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{t.description}</p>
                                        <p className="text-[10px] text-lumina-muted">{new Date(t.date).toLocaleString()}</p>
                                    </div>
                                </div>
                                <span className={`font-mono font-bold text-sm ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {t.type === 'INCOME' ? '+' : '-'} Rp {t.amount.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectFinance;
