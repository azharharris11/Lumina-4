import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  StudioConfig, Booking, Asset, Client, Account, Package, Transaction, Notification,
  OnboardingData, MonthlyMetric, BookingTask, ProjectStatus
} from '../types';
import { STUDIO_CONFIG } from '../data';
import { db, functions } from '../firebase';
import {
  collection, doc, onSnapshot, query, where, limit,
  setDoc, updateDoc, writeBatch, getDoc, deleteDoc, runTransaction, getDocs
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from './AuthContext';

interface StudioContextType {
  config: StudioConfig;
  bookings: Booking[];
  assets: Asset[];
  clients: Client[];
  accounts: Account[];
  packages: Package[];
  transactions: Transaction[];
  notifications: Notification[];
  metrics: MonthlyMetric[];
  loadingData: boolean;
  users: any[];

  // Actions
  updateConfig: (newConfig: StudioConfig) => Promise<void>;
  addBooking: (booking: Booking, paymentDetails?: { amount: number, accountId: string }) => Promise<void>;
  updateBooking: (booking: Booking) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;

  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  addAsset: (asset: Asset) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  addTransaction: (data: { description: string; amount: number; category: string; accountId: string; bookingId?: string, isRecurring?: boolean, receiptUrl?: string, submittedBy?: string, recipientId?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  settleBooking: (bookingId: string, amount: number, accountId: string) => Promise<void>;
  transferFunds: (fromId: string, toId: string, amount: number) => Promise<void>;

  // Package Actions
  addPackage: (pkg: Package) => Promise<void>;
  updatePackage: (pkg: Package) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;

  // User Actions (Team)
  addUser: (user: any) => Promise<void>;
  updateUser: (user: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // Account Actions
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  completeOnboarding: (data: OnboardingData) => Promise<void>;
  triggerAutomation: (status: ProjectStatus, bookingId?: string) => Promise<void>;
  addNotification: (notif: Partial<Notification>) => void;
  dismissNotification: (id: string) => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

// Blacklist of reserved system subdomains
const RESERVED_SUBDOMAINS = ['www', 'app', 'admin', 'api', 'mail', 'support', 'staging', 'test', 'login', 'signup', 'register'];

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [config, setConfig] = useState<StudioConfig>(STUDIO_CONFIG);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<MonthlyMetric[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Notification Helper
  const addNotification = (notif: Partial<Notification>) => {
    const newNotif: Notification = {
        id: `n-${Date.now()}`,
        title: notif.title || 'Notification',
        message: notif.message || '',
        time: new Date().toISOString(),
        read: false,
        type: notif.type || 'INFO',
        link: notif.link
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 5000);
  };

  const dismissNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!currentUser) {
        setLoadingData(false);
        return;
    }

    setLoadingData(true);
    const ownerId = currentUser.id; // Or currentUser.ownerId if we had team logic fully

    // 1. Listen to Studio Config
    const unsubConfig = onSnapshot(doc(db, "studios", ownerId), (doc) => {
        if (doc.exists()) {
            setConfig(doc.data() as StudioConfig);
        }
    });

    // 2. Listen to Collections
    // Security Fix: Always filter by ownerId to ensure data isolation
    
    const qBookings = query(collection(db, "bookings"), where("ownerId", "==", ownerId));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
        setBookings(snapshot.docs.map(d => d.data() as Booking));
    }, (error) => {
        console.error("Bookings Listen Error:", error);
    });

    const qAssets = query(collection(db, "assets"), where("ownerId", "==", ownerId));
    const unsubAssets = onSnapshot(qAssets, (snapshot) => {
        setAssets(snapshot.docs.map(d => d.data() as Asset));
    }, (error) => {
        console.error("Assets Listen Error:", error);
    });

    const qClients = query(collection(db, "clients"), where("ownerId", "==", ownerId));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
        setClients(snapshot.docs.map(d => d.data() as Client));
    }, (error) => {
        console.error("Clients Listen Error:", error);
    });

    const qAccounts = query(collection(db, "accounts"), where("ownerId", "==", ownerId));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
        setAccounts(snapshot.docs.map(d => d.data() as Account));
    }, (error) => {
        console.error("Accounts Listen Error:", error);
    });

    const qPackages = query(collection(db, "packages"), where("ownerId", "==", ownerId));
    const unsubPackages = onSnapshot(qPackages, (snapshot) => {
        setPackages(snapshot.docs.map(d => d.data() as Package));
    }, (error) => {
        console.error("Packages Listen Error:", error);
    });

    const qTransactions = query(collection(db, "transactions"), where("ownerId", "==", ownerId));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
        setTransactions(snapshot.docs.map(d => d.data() as Transaction));
    }, (error) => {
        console.error("Transactions Listen Error:", error);
    });

    // Users: Fetch self using doc() to comply with security rules
    // Rule: match /users/{userId} allow read: if isOwner(userId)
    const userDocRef = doc(db, "users", ownerId);
    const unsubUsers = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setUsers([docSnap.data()]);
        } else {
            setUsers([]);
        }
    }, (error) => {
        console.error("Users Listen Error:", error);
    });

    setLoadingData(false);

    return () => {
        unsubConfig();
        unsubBookings();
        unsubAssets();
        unsubClients();
        unsubAccounts();
        unsubPackages();
        unsubTransactions();
        unsubUsers();
    };
  }, [currentUser]);

  // --- ACTIONS ---

  const updateConfig = async (newConfig: StudioConfig) => {
      if(!currentUser) return;

      // Check if subdomain is being changed
      if (newConfig.site.subdomain && newConfig.site.subdomain !== config.site.subdomain) {
          try {
              const claimFn = httpsCallable(functions, 'claimSubdomain');
              await claimFn({ subdomain: newConfig.site.subdomain });
              // Note: The function updates Firestore, but we update local state too for immediate UI feedback
          } catch (e: any) {
              console.error("Subdomain Claim Failed:", e);
              // Extract nice message from Firebase Error
              const msg = e.message || 'Failed to claim subdomain.';
              throw new Error(msg);
          }
      }

      // Update the rest of the config directly (allowed by security rules)
      await setDoc(doc(db, "studios", currentUser.id), newConfig, { merge: true });
      setConfig(newConfig);
  };

  const addBooking = async (newBooking: Booking, paymentDetails?: { amount: number, accountId: string }) => {
      if (!currentUser) return;

      const selectedPackage = packages.find(p => p.name === newBooking.package);
      let autoTasks: BookingTask[] = [];

      if (selectedPackage && selectedPackage.defaultTasks) {
          autoTasks = selectedPackage.defaultTasks.map((title, idx) => ({
              id: `t-${Date.now()}-${idx}`,
              title: title,
              completed: false
          }));
      }

      // Prepare payload for Cloud Function
      const bookingPayload = {
          ...newBooking,
          tasks: autoTasks.length > 0 ? autoTasks : newBooking.tasks
      };

      try {
          const createBookingFn = httpsCallable(functions, 'createBooking');

          await createBookingFn({
              booking: { ...bookingPayload, ownerId: currentUser.id },
              paymentDetails: paymentDetails
          });

          // Sync to Calendar is now handled by the backend function automatically if connected.
          
          addNotification({ type: 'SUCCESS', title: 'Booking Created', message: `${newBooking.clientName} scheduled.` });
      } catch (e: any) {
          console.error("Add Booking Failed:", e);
          const msg = e.message || 'Unknown error occurred';
          addNotification({ type: 'ERROR', title: 'Booking Failed', message: msg });
          throw e;
      }
  };

  const updateBooking = async (b: Booking) => {
      if (!currentUser) return;
      const oldBooking = bookings.find(old => old.id === b.id);
      let bookingToSave = { ...b, ownerId: currentUser.id }; // Force ownerId

      if (oldBooking && oldBooking.status !== b.status) {
          // Find matching automation rule from Settings
          const automation = config.workflowAutomations?.find(a => a.triggerStatus === b.status);

          if (automation && automation.tasks && automation.tasks.length > 0) {
              const newTasks: BookingTask[] = automation.tasks.map((t, idx) => ({
                  id: `at-${Date.now()}-${idx}`,
                  title: t,
                  completed: false
              }));

              bookingToSave.tasks = [...(bookingToSave.tasks || []), ...newTasks];

              addNotification({
                  type: 'INFO',
                  title: 'Workflow Automation',
                  message: `Added ${newTasks.length} tasks for ${b.status} stage.`
              });
          }
      }

      await setDoc(doc(db, "bookings", b.id), bookingToSave);
  };

  // ... (manual trigger omitted for brevity, no changes needed there)

  const deleteBooking = async (id: string) => {
      try {
          const relatedTransactions = transactions.filter(t => t.bookingId === id);
          const batch = writeBatch(db);

          // 1. Reverse Financial Impact on Accounts
          relatedTransactions.forEach(t => {
              const account = accounts.find(a => a.id === t.accountId);
              if (account) {
                  const accountRef = doc(db, "accounts", account.id);
                  // If it was income, we subtract. If expense, we add back.
                  const adjustment = t.type === 'INCOME' ? -t.amount : t.amount;
                  batch.update(accountRef, { balance: account.balance + adjustment });
              }
              batch.delete(doc(db, "transactions", t.id));
          });

          // 2. Delete the booking itself
          batch.delete(doc(db, "bookings", id));
          await batch.commit();

          addNotification({ type: 'SUCCESS', title: 'Deleted', message: 'Booking and related financial records removed.' });
      } catch (e) {
          console.error("Delete failed", e);
          addNotification({ type: 'ERROR', title: 'Error', message: 'Failed to delete booking.' });
      }
  };

  const addClient = async (client: Client) => {
      if(!currentUser) return;
      await setDoc(doc(db, "clients", client.id), { ...client, ownerId: currentUser.id });
  };

  const updateClient = async (client: Client) => {
      if(!currentUser) return;
      // Force ownerId to ensure it doesn't get lost on update
      await setDoc(doc(db, "clients", client.id), { ...client, ownerId: currentUser.id });
  };

  const deleteClient = async (id: string) => {
      try {
          await deleteDoc(doc(db, "clients", id));
          addNotification({ type: 'SUCCESS', title: 'Deleted', message: 'Client record removed.' });
      } catch (e) {
          console.error("Delete client failed", e);
          addNotification({ type: 'ERROR', title: 'Error', message: 'Failed to delete client.' });
      }
  };

  const addAsset = async (asset: Asset) => {
      if(!currentUser) return;
      await setDoc(doc(db, "assets", asset.id), { ...asset, ownerId: currentUser.id });
  };

  const updateAsset = async (asset: Asset) => {
      if(!currentUser) return;
      // Force ownerId
      await setDoc(doc(db, "assets", asset.id), { ...asset, ownerId: currentUser.id });
  };

  const deleteAsset = async (id: string) => {
      const asset = assets.find(a => a.id === id);
      if (asset && asset.status === 'IN_USE') {
          throw new Error(`Cannot delete '${asset.name}'. It is currently marked as IN USE.`);
      }
      try {
          await deleteDoc(doc(db, "assets", id));
          addNotification({ type: 'SUCCESS', title: 'Deleted', message: 'Asset removed from inventory.' });
      } catch (e) {
          addNotification({ type: 'ERROR', title: 'Error', message: 'Failed to delete asset.' });
      }
  };

  const addTransaction = async (data: { description: string; amount: number; category: string; accountId: string; bookingId?: string, isRecurring?: boolean, receiptUrl?: string, submittedBy?: string, recipientId?: string }) => {
      if(!currentUser) return;

      try {
          const processFn = httpsCallable(functions, 'processTransaction');
          await processFn({
              type: 'EXPENSE',
              amount: data.amount,
              accountId: data.accountId,
              category: data.category,
              description: data.description,
              bookingId: data.bookingId,
              date: new Date().toISOString(),
              ownerId: currentUser.id
          });

          addNotification({ type: 'SUCCESS', title: 'Expense Recorded', message: `Rp ${data.amount.toLocaleString()} processed.` });
      } catch (e: any) {
          console.error("Expense Transaction Failed", e);
          addNotification({ type: 'ERROR', title: 'Error', message: e.message || 'Failed to record expense.' });
      }
  };

  const deleteTransaction = async (id: string) => {
      const trans = transactions.find(t => t.id === id);
      if (!trans) return;

      try {
          const batch = writeBatch(db);
          
          // 1. Reverse Account Balance
          const account = accounts.find(a => a.id === trans.accountId);
          if (account) {
              const accountRef = doc(db, "accounts", account.id);
              // INCOME -> Subtract, EXPENSE -> Add back
              const adjustment = trans.type === 'INCOME' ? -trans.amount : trans.amount;
              batch.update(accountRef, { balance: account.balance + adjustment });
          }

          // 2. Reverse Booking paidAmount if linked
          if (trans.bookingId) {
              const booking = bookings.find(b => b.id === trans.bookingId);
              if (booking) {
                  const bookingRef = doc(db, "bookings", booking.id);
                  const currentPaid = booking.paidAmount || 0;
                  batch.update(bookingRef, { paidAmount: Math.max(0, currentPaid - trans.amount) });
              }
          }

          // 3. Delete the record
          batch.delete(doc(db, "transactions", id));
          await batch.commit();
          
          addNotification({ type: 'SUCCESS', title: 'Deleted', message: 'Transaction removed and balances reverted.' });
      } catch (e) {
          console.error("Delete transaction failed", e);
          addNotification({ type: 'ERROR', title: 'Error', message: 'Failed to remove transaction.' });
      }
  };

  const settleBooking = async (bookingId: string, amount: number, accountId: string) => {
      if (!currentUser) return;

      try {
          const bookingRef = doc(db, "bookings", bookingId);
          // 1. Update Booking Paid Amount (Allowed by Rules)
          // We do this first because the Cloud Function only handles the money movement
          const bookingSnap = await getDoc(bookingRef);
          if (bookingSnap.exists()) {
              const currentPaid = bookingSnap.data().paidAmount || 0;
              await updateDoc(bookingRef, { paidAmount: currentPaid + amount });
          }

          // 2. Process Money Transaction (Secure Server-Side)
          const processFn = httpsCallable(functions, 'processTransaction');
          await processFn({
              type: amount > 0 ? 'INCOME' : 'EXPENSE',
              amount: Math.abs(amount),
              accountId: accountId,
              description: amount > 0 ? `Payment - Booking #${bookingId}` : `Refund - Booking #${bookingId}`,
              category: 'Sales / Booking',
              bookingId: bookingId,
              date: new Date().toISOString(),
              ownerId: currentUser.id
          });

          addNotification({ type: 'SUCCESS', title: 'Payment Recorded', message: `Rp ${amount.toLocaleString()} processed.` });
      } catch (e: any) {
          console.error("Settle Booking Transaction Failed:", e);
          addNotification({ type: 'ERROR', title: 'Transaction Failed', message: e.message || 'Could not process payment.' });
      }
  };

  const transferFunds = async (fromId: string, toId: string, amount: number) => {
      if(!currentUser) return;
      try {
          const processFn = httpsCallable(functions, 'processTransaction');
          await processFn({
              type: 'TRANSFER',
              amount: amount,
              accountId: fromId,
              toAccountId: toId,
              description: 'Internal Fund Transfer',
              category: 'Transfer',
              date: new Date().toISOString(),
              ownerId: currentUser.id
          });

          addNotification({ type: 'SUCCESS', title: 'Transfer Complete', message: 'Funds moved successfully.' });
      } catch (e: any) {
          addNotification({ type: 'ERROR', title: 'Transfer Failed', message: e.message || 'Transfer failed' });
      }
  };

  // --- PACKAGE ACTIONS ---
  const addPackage = async (pkg: Package) => {
      if(!currentUser) return;
      await setDoc(doc(db, "packages", pkg.id), { ...pkg, ownerId: currentUser.id });
  };

  const updatePackage = async (pkg: Package) => {
      if(!currentUser) return;
      await setDoc(doc(db, "packages", pkg.id), { ...pkg, ownerId: currentUser.id });
  };

  const deletePackage = async (id: string) => {
      try {
          await deleteDoc(doc(db, "packages", id));
          addNotification({ type: 'SUCCESS', title: 'Deleted', message: 'Package removed.' });
      } catch (e) {
          addNotification({ type: 'ERROR', title: 'Error', message: 'Failed to delete package.' });
      }
  };

  // --- USER ACTIONS (TEAM) ---
  const addUser = async (user: any) => {
      // NOTE: Creating a real login user requires Admin SDK. 
      // This function creates a user profile document. 
      // For security, strict rules should prevent creating users for other owners.
      if(!currentUser) return;
      // We inject ownerId to link this staff to the current studio owner if we implement team logic later
      // For now, we just save the document. 
      // If this is meant to be a team member, it should probably go into a subcollection or have a studioId.
      // Assuming 'users' collection is global profiles.
      await setDoc(doc(db, "users", user.id), user);
  };

  const updateUser = async (user: any) => {
      if(!currentUser) return;
      await setDoc(doc(db, "users", user.id), user);
  };

  const deleteUser = async (id: string) => {
      try {
          await deleteDoc(doc(db, "users", id));
          addNotification({ type: 'SUCCESS', title: 'Deleted', message: 'Team member removed.' });
      } catch (e) {
          addNotification({ type: 'ERROR', title: 'Error', message: 'Failed to remove user.' });
      }
  };

  // --- ACCOUNT ACTIONS ---
  const addAccount = async (account: Account) => {
      if(!currentUser) return;
      await setDoc(doc(db, "accounts", account.id), { ...account, ownerId: currentUser.id });
  };

  const updateAccount = async (account: Account) => {
      if(!currentUser) return;
      await setDoc(doc(db, "accounts", account.id), { ...account, ownerId: currentUser.id }, { merge: true });
  };

  const deleteAccount = async (id: string) => {
      try {
          await deleteDoc(doc(db, "accounts", id));
          addNotification({ type: 'SUCCESS', title: 'Deleted', message: 'Account removed.' });
      } catch (e) {
          addNotification({ type: 'ERROR', title: 'Error', message: 'Failed to delete account.' });
      }
  };

  const completeOnboarding = async (data: OnboardingData) => {
      if (!currentUser) return;
      const ownerId = currentUser.id;
      const batch = writeBatch(db);

      const userRef = doc(db, "users", ownerId);
      batch.update(userRef, { hasCompletedOnboarding: true, studioFocus: data.focus, studioName: data.studioName });

      const accId = `acc-${Date.now()}`;
      const newAccount: Account = { id: accId, name: data.bankDetails.name || 'Main Bank', type: 'BANK', balance: 0, accountNumber: data.bankDetails.number, ownerId };
      const accRef = doc(db, "accounts", accId);
      batch.set(accRef, newAccount);

      const pkgId = `p-${Date.now()}`;
      const newPackage: Package = { id: pkgId, name: data.initialPackage.name, price: data.initialPackage.price, duration: data.initialPackage.duration, features: ['Includes studio rental', 'Basic editing', 'Digital delivery'], active: true, costBreakdown: [], turnaroundDays: 7, ownerId };
      const pkgRef = doc(db, "packages", pkgId);
      batch.set(pkgRef, newPackage);

      const roomObjects = data.rooms.map((roomName, index) => ({ id: `r-${index + 1}`, name: roomName, type: 'INDOOR' as const, color: index === 0 ? 'indigo' : index === 1 ? 'purple' : 'emerald' }));
      const newConfig: StudioConfig = { ...STUDIO_CONFIG, name: data.studioName, address: data.address, phone: data.phone, taxRate: data.taxRate, ownerId, bankName: data.bankDetails.name, bankAccount: data.bankDetails.number, bankHolder: data.bankDetails.holder, operatingHoursStart: data.operatingHours.start, operatingHoursEnd: data.operatingHours.end, rooms: roomObjects.length > 0 ? roomObjects : [{ id: 'r1', name: 'Main Studio', type: 'INDOOR', color: 'indigo' }] };
      const configRef = doc(db, "studios", ownerId);
      batch.set(configRef, newConfig);

      await batch.commit();
      setConfig(newConfig);
  };

  const triggerAutomation = async (status: ProjectStatus, bookingId?: string) => {
        // Find automation for this status
        const automation = config.workflowAutomations?.find(a => a.triggerStatus === status);

        if (!automation) {
            if (!bookingId) {
                 addNotification({ type: 'INFO', title: 'No Automation', message: `No rules defined for ${status}.` });
            }
            return;
        }

        // Test Run Mode (No Booking ID)
        if (!bookingId) {
            addNotification({ 
                type: 'SUCCESS', 
                title: 'Automation Test', 
                message: `Rule valid! Would add ${automation.tasks.length} tasks to booking.` 
            });
            return;
        }

        // Real Execution
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        if (automation.tasks && automation.tasks.length > 0) {
            const newTasks: BookingTask[] = automation.tasks.map((t, idx) => ({
                id: `at-${Date.now()}-${idx}`,
                title: t,
                completed: false
            }));

            const updatedBooking = {
                ...booking,
                tasks: [...(booking.tasks || []), ...newTasks]
            };

            await updateBooking(updatedBooking);
            
            addNotification({
                type: 'INFO',
                title: 'Workflow Automation',
                message: `Applied ${automation.triggerStatus} workflow.`
            });
        }
  };

  return (
    <StudioContext.Provider value={{
        config, bookings, assets, clients, accounts, packages, transactions, notifications, metrics, loadingData, users,
        updateConfig, addBooking, updateBooking, deleteBooking,
        addClient, updateClient, deleteClient,
        addAsset, updateAsset, deleteAsset,
        addTransaction, deleteTransaction, settleBooking, transferFunds,
        addPackage, updatePackage, deletePackage,
        addUser, updateUser, deleteUser,
        addAccount, updateAccount, deleteAccount,
        completeOnboarding,
        triggerAutomation,
        addNotification, dismissNotification
    }}>
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};