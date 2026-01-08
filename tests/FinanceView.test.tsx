
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import FinanceView from '../views/FinanceView';
import { Account, Booking, Transaction, StudioConfig, MonthlyMetric } from '../types';

// Mock Recharts
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    AreaChart: () => <div>Mocked AreaChart</div>,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

// Mock Framer Motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, whileHover, whileTap, initial, animate, exit, transition, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockAccounts: Account[] = [
    { id: 'acc1', name: 'Bank BCA', type: 'BANK', balance: 5000000, accountNumber: '1234567890', ownerId: 'user1' },
    { id: 'acc2', name: 'Cash Register', type: 'CASH', balance: 100000, ownerId: 'user1' }
];

const mockConfig: StudioConfig = {
    name: 'Test Studio',
    taxRate: 11,
} as any;

const mockProps = {
    accounts: mockAccounts,
    metrics: [] as MonthlyMetric[],
    bookings: [] as Booking[],
    users: [],
    transactions: [] as Transaction[],
    onTransfer: vi.fn(),
    onRecordExpense: vi.fn(),
    onSettleBooking: vi.fn(),
    onDeleteTransaction: vi.fn(),
    config: mockConfig,
    onAddAccount: vi.fn(),
    onUpdateAccount: vi.fn(),
};

describe('FinanceView', () => {
    it('renders the header correctly', () => {
        render(<FinanceView {...mockProps} />);
        expect(screen.getByText('Financial Hub')).toBeInTheDocument();
        expect(screen.getByText("Master your studio's cash flow.")).toBeInTheDocument();
    });

    it('renders the accounts in Overview tab', () => {
        render(<FinanceView {...mockProps} />);
        expect(screen.getByText('Bank BCA')).toBeInTheDocument();
        // Match approximate currency format or parts of it
        expect(screen.getByText(/Rp\s*5\.000\.000/)).toBeInTheDocument();
        expect(screen.getByText('Cash Register')).toBeInTheDocument();
    });

    it('renders the Add New Account button', () => {
        render(<FinanceView {...mockProps} />);
        expect(screen.getByText('Add New Account')).toBeInTheDocument();
    });

    it('opens account modal when Add New Account is clicked', () => {
        render(<FinanceView {...mockProps} />);
        const addButton = screen.getByText('Add New Account');
        fireEvent.click(addButton);
        expect(screen.getByText('Add Account')).toBeInTheDocument();
    });
});
