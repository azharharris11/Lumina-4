
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Account, Booking, Client, StudioConfig, Asset, Package } from '../types';
import { PACKAGES } from '../data';
import { X, Search, ChevronRight, ChevronLeft, Calendar, Clock, User as UserIcon, CheckCircle2, AlertCircle, Plus, DollarSign, Briefcase, Loader2, Save, Camera } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';

const Motion = motion as any;

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  photographers: User[];
  accounts: Account[];
  bookings?: Booking[]; 
  clients?: Client[]; 
  assets?: Asset[]; 
  config: StudioConfig; 
  onAddBooking?: (booking: Booking, paymentDetails?: { amount: number, accountId: string }) => Promise<void>;
  onAddClient?: (client: Client) => void; 
  initialData?: { date: string, time: string, studio: string };
  // googleToken prop removed
  packages?: Package[];
}

const NewBookingModal: React.FC<NewBookingModalProps> = ({ isOpen, onClose, photographers, accounts, bookings = [], clients = [], config, onAddBooking, onAddClient, initialData, packages = [], assets = [] }) => {
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const DRAFT_KEY = 'lumina_booking_draft';

  // TIMEZONE FIX: Get Local Date correctly
  const getLocalDateString = () => {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [bookingForm, setBookingForm] = useState<{
      date: string;
      timeStart: string;
      duration: number;
      studio: string;
      packageId: string;
      photographerId: string;
      price: number;
      notes: string;
      syncGoogle: boolean;
  }>({
      date: getLocalDateString(),
      timeStart: '10:00',
      duration: 2,
      studio: config.rooms[0]?.name || 'Main Studio',
      packageId: '',
      photographerId: photographers[0]?.id || '',
      price: 0,
      notes: '',
      syncGoogle: true // Default to true, backend handles actual sync check
  });

  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', email: '', instagram: '', category: 'NEW' });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, accountId: '' });
  const [discountForm, setDiscountForm] = useState<{ type: 'FIXED' | 'PERCENT', value: number }>({ type: 'FIXED', value: 0 });
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft && !initialData) {
            try {
                const parsed = JSON.parse(savedDraft);
                setBookingForm(prev => ({...prev, ...parsed.form}));
                if (parsed.client) setSelectedClient(parsed.client);
                setStep(parsed.step || 1);
            } catch (e) { console.error("Draft parse error", e); }
        }

        if (initialData) {
            setBookingForm(prev => ({
                ...prev,
                date: initialData.date,
                timeStart: initialData.time,
                studio: initialData.studio
            }));
            setStep(1); 
        }
        
        setIsSubmitting(false);
        setSubmitError(null);
        setDiscountForm({ type: 'FIXED', value: 0 });
        setShowDiscountInput(false);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
      if (isOpen) {
          const draftData = {
              form: bookingForm,
              client: selectedClient,
              step: step
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      }
  }, [bookingForm, selectedClient, step, isOpen]);
// ... (rest of the file remains unchanged until render part)


  useEffect(() => {
      if (accounts.length > 0 && !paymentForm.accountId) {
          setPaymentForm(prev => ({ ...prev, accountId: accounts[0].id }));
      }
  }, [accounts]);

  const filteredClients = useMemo(() => {
      let result = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch));
      
      // Optimistic UI: Ensure selectedClient is in the list even if not in 'clients' prop yet
      if (selectedClient && !result.find(c => c.id === selectedClient.id)) {
          // Only add if it matches search (or if search is empty), OR force it to top if it's the active selection
          result = [selectedClient, ...result];
      }
      return result;
  }, [clients, clientSearch, selectedClient]);

  const availablePackages = config.site?.showPricing ? (packages.length > 0 ? packages : PACKAGES) : (packages.length > 0 ? packages : PACKAGES);

  // --- ROBUST CONFLICT DETECTION (Client Side Preview) ---
  const conflictError = useMemo(() => {
      if (!bookingForm.date || !bookingForm.timeStart || !bookingForm.studio || !bookingForm.packageId) return null;

      const bufferMins = config.bufferMinutes || 0;
      const [newStartH, newStartM] = bookingForm.timeStart.split(':').map(Number);
      
      // Calculate Proposed Time Range (Minutes from midnight)
      const newStartMins = newStartH * 60 + newStartM;
      // End time includes duration AND buffer to ensure cleaning/prep time
      const newEndMins = newStartMins + (bookingForm.duration * 60) + bufferMins; 

      // 0. CHECK OPERATING HOURS
      const opStartH = parseInt(config.operatingHoursStart || '09:00');
      const opEndH = parseInt(config.operatingHoursEnd || '21:00');
      const opStartMins = opStartH * 60;
      const opEndMins = opEndH * 60;

      if (newStartMins < opStartMins || newEndMins > opEndMins) {
          return `Outside operating hours (${config.operatingHoursStart} - ${config.operatingHoursEnd})`;
      }

      // 1. CHECK ROOM CONFLICTS
      const roomConflict = bookings.find(b => {
          if (b.status === 'CANCELLED' || b.date !== bookingForm.date || b.studio !== bookingForm.studio) return false;

          const [bStartH, bStartM] = b.timeStart.split(':').map(Number);
          const bStartMins = bStartH * 60 + bStartM;
          const bEndMins = bStartMins + (b.duration * 60) + bufferMins;

          return (newStartMins < bEndMins) && (newEndMins > bStartMins);
      });

      if (roomConflict) {
          return `Room occupied by ${roomConflict.clientName} until ${formatMinsToTime(
              parseTime(roomConflict.timeStart) + (roomConflict.duration * 60) + bufferMins
          )} (incl. ${bufferMins}m buffer)`;
      }

      // 2. CHECK PHOTOGRAPHER CONFLICTS
      const photographerConflict = bookings.find(b => {
          if (b.status === 'CANCELLED' || b.date !== bookingForm.date || b.photographerId !== bookingForm.photographerId) return false;

          const [bStartH, bStartM] = b.timeStart.split(':').map(Number);
          const bStartMins = bStartH * 60 + bStartM;
          const bEndMins = bStartMins + (b.duration * 60) + bufferMins;

          return (newStartMins < bEndMins) && (newEndMins > bStartMins);
      });

      if (photographerConflict) {
          const photographer = photographers.find(p => p.id === bookingForm.photographerId);
          return `${photographer?.name || 'Photographer'} is already assigned to ${photographerConflict.clientName} at this time.`;
      }

      // 3. CHECK PHOTOGRAPHER LEAVE / UNAVAILABLE DATES
      const selectedPhotographer = photographers.find(p => p.id === bookingForm.photographerId);
      if (selectedPhotographer?.unavailableDates?.includes(bookingForm.date)) {
          return `${selectedPhotographer.name} is marked as unavailable on this date.`;
      }

      // 4. CHECK ASSET CONFLICTS (Equipment Double Booking)
      // Check logic: If selected package requires assets, check if those assets are used by ANY other booking at the same time
      const selectedPkg = availablePackages.find(p => p.id === bookingForm.packageId);
      const requiredAssetIds = selectedPkg?.defaultAssetIds || [];

      if (requiredAssetIds.length > 0) {
          // Find other bookings happening at the same time (ANY room)
          const concurrentBookings = bookings.filter(b => {
              if (b.status === 'CANCELLED' || b.date !== bookingForm.date) return false;
              const [bStartH, bStartM] = b.timeStart.split(':').map(Number);
              const bStartMins = bStartH * 60 + bStartM;
              const bEndMins = bStartMins + (b.duration * 60) + bufferMins;
              return (newStartMins < bEndMins) && (newEndMins > bStartMins);
          });

          for (const booking of concurrentBookings) {
              // We need to know what assets the *other* booking is using.
              // Since 'items' might not link to assets directly in this simple data model,
              // we look at the package they booked.
              const bPkg = packages.find(p => p.name === booking.package);
              
              if (bPkg && bPkg.defaultAssetIds) {
                  const conflictAssets = requiredAssetIds.filter(id => bPkg.defaultAssetIds?.includes(id));
                  
                  if (conflictAssets.length > 0) {
                      const assetNames = assets
                          .filter(a => conflictAssets.includes(a.id))
                          .map(a => a.name)
                          .join(', ');
                      return `Equipment Conflict: ${assetNames} is being used in ${booking.studio}`;
                  }
              }
          }
      }

      return null;
  }, [bookingForm, bookings, config.bufferMinutes, availablePackages, packages, assets]);

  // Helpers for time calc display
  function parseTime(t: string) {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
  }
  function formatMinsToTime(totalMins: number) {
      const h = Math.floor(totalMins / 60) % 24;
      const m = totalMins % 60;
      return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  }


  const handleCreateClient = () => {
      if (onAddClient && newClientForm.name) {
          const newClient: Client = {
              id: `c-${Date.now()}`,
              name: newClientForm.name,
              phone: newClientForm.phone,
              email: newClientForm.email,
              instagram: newClientForm.instagram,
              category: newClientForm.category,
              notes: '',
              joinedDate: getLocalDateString(), // Timezone fix
              avatar: `https://ui-avatars.com/api/?name=${newClientForm.name}&background=random`
          };
          onAddClient(newClient);
          setSelectedClient(newClient);
          setIsCreatingClient(false);
          setClientSearch('');
          // Auto-advance to next step for smoother flow
          setStep(2);
      }
  };

  const handleSelectPackage = (pkgId: string) => {
      const realPkg = availablePackages.find(p => p.id === pkgId);
      if (realPkg) {
          setBookingForm(prev => ({
              ...prev,
              packageId: pkgId,
              price: realPkg.price,
              duration: realPkg.duration
          }));
      }
  };

  const calculateTotal = () => {
      let subtotal = bookingForm.price;
      
      // Apply Discount
      let discountAmount = 0;
      if (discountForm.value > 0) {
          if (discountForm.type === 'PERCENT') {
              discountAmount = subtotal * (discountForm.value / 100);
          } else {
              discountAmount = discountForm.value;
          }
      }
      
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const tax = config.taxRate || 0;
      const taxAmount = taxableAmount * (tax / 100);
      
      return {
          subtotal,
          discountAmount,
          taxAmount,
          total: taxableAmount + taxAmount
      };
  };

  const isStepValid = () => {
      if (step === 1) return !!selectedClient;
      if (step === 2) return !!bookingForm.packageId && !!bookingForm.date && !!bookingForm.timeStart && !conflictError;
      return true;
  };

  const handleSubmit = async () => {
      if (onAddBooking && selectedClient && !conflictError) {
          if (paymentForm.amount > 0 && !paymentForm.accountId) {
              alert("Please select a valid account for deposit.");
              return;
          }

          setIsSubmitting(true);
          setSubmitError(null);

          const { total, discountAmount } = calculateTotal();
          const selectedPkg = availablePackages.find(p => p.id === bookingForm.packageId) || { name: 'Custom', features: [] };
          
          const newBooking: Booking = {
              id: `b-${Date.now()}`,
              clientName: selectedClient.name,
              clientPhone: selectedClient.phone,
              clientId: selectedClient.id,
              date: bookingForm.date,
              timeStart: bookingForm.timeStart,
              duration: bookingForm.duration,
              package: selectedPkg.name,
              price: total, // Store final total as price for now, ideally strictly separation
              paidAmount: 0,
              status: 'BOOKED',
              photographerId: bookingForm.photographerId,
              studio: bookingForm.studio,
              contractStatus: 'PENDING',
              contractSignedDate: '',
              contractSignature: '',
              items: [
                  { 
                      id: `i-${Date.now()}`, 
                      description: selectedPkg.name, 
                      quantity: 1, 
                      unitPrice: bookingForm.price, 
                      total: bookingForm.price 
                  }
              ],
              taxSnapshot: config.taxRate,
              notes: bookingForm.notes,
              googleSync: bookingForm.syncGoogle,
              logs: [],
              discount: discountAmount > 0 ? { 
                  type: discountForm.type, 
                  value: discountForm.value 
              } : undefined
          };

          try {
              // This is now an async operation that checks for conflicts on server
              await onAddBooking(newBooking, paymentForm.amount > 0 ? paymentForm : undefined);
              setCreatedBooking(newBooking);
              setIsSuccess(true);
              localStorage.removeItem(DRAFT_KEY);
          } catch (e: any) {
              console.error("Submission failed:", e);
              setSubmitError(e.message || "Failed to create booking. Please try again.");
          } finally {
              setIsSubmitting(false);
          }
      }
  };

  if (!isOpen) return null;

  if (isSuccess && createdBooking) {
      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
              <Motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-lumina-surface border border-lumina-highlight w-full max-w-md p-8 rounded-3xl shadow-2xl text-center"
              >
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="text-emerald-500" size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
                  <p className="text-lumina-muted mb-8 text-sm">Session for <span className="text-white font-bold">{createdBooking.clientName}</span> has been successfully scheduled.</p>
                  
                  <div className="space-y-3">
                      <button 
                        onClick={() => {
                            const text = `Hi ${createdBooking.clientName}, your booking for ${createdBooking.package} on ${createdBooking.date} at ${createdBooking.timeStart} is confirmed!`;
                            window.open(`https://wa.me/${createdBooking.clientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                          <Camera size={18} /> Send Confirmation (WA)
                      </button>
                      <button 
                        onClick={onClose}
                        className="w-full py-3 bg-lumina-highlight hover:bg-lumina-highlight/80 text-white font-bold rounded-xl transition-colors"
                      >
                          Done
                      </button>
                  </div>
              </Motion.div>
          </div>
      );
  }

  const totals = calculateTotal();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-0">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={isSubmitting ? undefined : onClose}></div>
      
      <Motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-lumina-surface border border-lumina-highlight w-full max-w-4xl h-[90vh] lg:h-[800px] rounded-2xl shadow-2xl flex overflow-hidden"
      >
        {/* Sidebar Stepper (Desktop) */}
        <div className="hidden lg:flex w-64 bg-lumina-base border-r border-lumina-highlight flex-col p-6 justify-between">
            <div>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-display font-bold text-white">New Session</h2>
                    {localStorage.getItem(DRAFT_KEY) && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Save size={10}/> Saved</span>}
                </div>
                
                <div className="space-y-6 relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-lumina-highlight -z-10"></div>
                    {[
                        { id: 1, label: 'Client', icon: UserIcon },
                        { id: 2, label: 'Details', icon: Briefcase },
                        { id: 3, label: 'Payment', icon: DollarSign }
                    ].map((s) => (
                        <div key={s.id} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10
                                ${step >= s.id ? 'bg-lumina-accent text-lumina-base' : 'bg-lumina-surface border border-lumina-highlight text-lumina-muted'}`}>
                                {step > s.id ? <CheckCircle2 size={14}/> : s.id}
                            </div>
                            <span className={`text-sm font-bold ${step === s.id ? 'text-white' : 'text-lumina-muted'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-lumina-surface/50 p-4 rounded-xl border border-lumina-highlight">
                <p className="text-xs text-lumina-muted uppercase mb-2 font-bold">Summary</p>
                <div className="space-y-2 text-sm text-white">
                    <div className="flex items-center gap-2 truncate">
                        <UserIcon size={14} className="text-lumina-accent shrink-0"/>
                        <span className="truncate">{selectedClient?.name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-lumina-accent shrink-0"/>
                        <span>{new Date(bookingForm.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-lumina-accent shrink-0"/>
                        <span>{totals.total > 0 ? `Rp ${(totals.total/1000).toFixed(0)}k` : '-'}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-lumina-surface">
            <div className="lg:hidden p-4 border-b border-lumina-highlight bg-lumina-base flex justify-between items-center">
                <span className="font-bold text-white">Step {step} of 3</span>
                <button onClick={onClose}><X className="text-lumina-muted" /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
                {submitError && (
                    <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400">
                        <AlertCircle size={20} />
                        <span className="text-sm font-bold">{submitError}</span>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    
                    {/* STEP 1: CLIENT */}
                    {step === 1 && (
                        <Motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                            <h2 className="text-2xl font-bold text-white">Select Client</h2>
                            {!isCreatingClient ? (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-lumina-muted w-5 h-5" />
                                        <input 
                                            autoFocus
                                            className="w-full bg-lumina-base border border-lumina-highlight rounded-xl pl-12 pr-4 py-4 text-white focus:border-lumina-accent outline-none transition-all shadow-inner"
                                            placeholder="Search existing clients..."
                                            value={clientSearch}
                                            onChange={e => setClientSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                        <button onClick={() => setIsCreatingClient(true)} className="p-4 border border-dashed border-lumina-highlight rounded-xl text-lumina-muted hover:text-white hover:border-lumina-accent hover:bg-lumina-accent/5 transition-all flex flex-col items-center justify-center gap-2 h-[100px]">
                                            <Plus size={24} /> <span className="font-bold text-sm">Create New Client</span>
                                        </button>
                                        {filteredClients.map(client => (
                                            <div key={client.id} onClick={() => setSelectedClient(client)} className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 h-[100px] ${selectedClient?.id === client.id ? 'bg-lumina-accent/10 border-lumina-accent shadow-lg shadow-lumina-accent/10' : 'bg-lumina-base border-lumina-highlight hover:border-lumina-muted'}`}>
                                                <img src={client.avatar} className="w-12 h-12 rounded-full border border-lumina-highlight" />
                                                <div className="text-left overflow-hidden">
                                                    <p className={`font-bold text-sm truncate ${selectedClient?.id === client.id ? 'text-white' : 'text-lumina-text'}`}>{client.name}</p>
                                                    <p className="text-xs text-lumina-muted truncate">{client.phone}</p>
                                                </div>
                                                {selectedClient?.id === client.id && <CheckCircle2 className="ml-auto text-lumina-accent" size={20} />}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="bg-lumina-base border border-lumina-highlight rounded-xl p-6 space-y-4 animate-in slide-in-from-right">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-white">New Client Profile</h3>
                                        <button onClick={() => setIsCreatingClient(false)} className="text-xs text-lumina-muted hover:text-white hover:underline">Cancel</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-lumina-muted mb-1 block">Full Name</label><input className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" value={newClientForm.name} onChange={e => setNewClientForm({...newClientForm, name: e.target.value})} /></div>
                                        <div><label className="text-xs font-bold text-lumina-muted mb-1 block">Phone</label><input className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" value={newClientForm.phone} onChange={e => setNewClientForm({...newClientForm, phone: e.target.value})} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-lumina-muted mb-1 block">Email</label><input className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" value={newClientForm.email} onChange={e => setNewClientForm({...newClientForm, email: e.target.value})} /></div>
                                        <div><label className="text-xs font-bold text-lumina-muted mb-1 block">Instagram (Optional)</label><input className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" placeholder="@username" value={newClientForm.instagram} onChange={e => setNewClientForm({...newClientForm, instagram: e.target.value})} /></div>
                                    </div>
                                    <button onClick={handleCreateClient} className="w-full py-3 bg-lumina-accent text-lumina-base font-bold rounded-xl hover:bg-lumina-accent/90 transition-colors">Save Client</button>
                                </div>
                            )}
                        </Motion.div>
                    )}

                    {/* STEP 2: SESSION */}
                    {step === 2 && (
                        <Motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                            <h2 className="text-2xl font-bold text-white">Session Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-lumina-muted uppercase mb-3 block">Select Package</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {availablePackages.filter(p => p.active).map(pkg => (
                                            <div key={pkg.id} onClick={() => handleSelectPackage(pkg.id)} className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${bookingForm.packageId === pkg.id ? 'bg-lumina-highlight border-lumina-accent' : 'bg-lumina-base border-lumina-highlight hover:border-lumina-muted'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-white text-sm">{pkg.name}</h4>
                                                    {bookingForm.packageId === pkg.id && <CheckCircle2 size={16} className="text-lumina-accent"/>}
                                                </div>
                                                <p className="text-xs text-lumina-muted mb-3 line-clamp-2">{pkg.features.slice(0, 2).join(', ')}</p>
                                                {/* Show Asset Requirement Indicator */}
                                                {pkg.defaultAssetIds && pkg.defaultAssetIds.length > 0 && (
                                                    <div className="text-[10px] text-lumina-muted flex items-center gap-1 mb-2">
                                                        <Camera size={10} /> Requires Equipment
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-end border-t border-white/5 pt-3">
                                                    <span className="text-[10px] font-bold bg-lumina-surface px-2 py-1 rounded text-white">{pkg.duration} Hours</span>
                                                    <span className="text-sm font-mono text-lumina-accent font-bold">Rp {(pkg.price/1000).toFixed(0)}k</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-white border-b border-lumina-highlight pb-2">Logistics</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-lumina-muted block mb-1">Date</label>
                                                <div className="relative"><Calendar className="absolute left-3 top-2.5 text-lumina-muted w-4 h-4"/><input type="date" min={getLocalDateString()} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg pl-10 p-2 text-white text-sm focus:border-lumina-accent outline-none" value={bookingForm.date} onChange={e => {
                                                    const selected = e.target.value;
                                                    const today = getLocalDateString();
                                                    if (selected < today) return; // Prevent past dates
                                                    setBookingForm({...bookingForm, date: selected});
                                                }} /></div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-lumina-muted block mb-1">Start Time</label>
                                                <div className="relative"><Clock className="absolute left-3 top-2.5 text-lumina-muted w-4 h-4"/><input type="time" className="w-full bg-lumina-base border border-lumina-highlight rounded-lg pl-10 p-2 text-white text-sm focus:border-lumina-accent outline-none" value={bookingForm.timeStart} onChange={e => setBookingForm({...bookingForm, timeStart: e.target.value})} /></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-lumina-muted block mb-1">Duration (h)</label>
                                                <input type="number" min="1" className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-white text-sm focus:border-lumina-accent outline-none" value={bookingForm.duration} onChange={e => setBookingForm({...bookingForm, duration: Math.max(1, Number(e.target.value))})} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-lumina-muted block mb-1">Room</label>
                                                <CustomSelect 
                                                    value={bookingForm.studio} 
                                                    onChange={val => setBookingForm({...bookingForm, studio: val})}
                                                    options={config.rooms.map(r => ({ value: r.name, label: r.name }))}
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* CONFLICT ERROR DISPLAY */}
                                        {conflictError && (
                                            <Motion.div 
                                                initial={{ opacity: 0, y: -10 }} 
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2"
                                            >
                                                <AlertCircle className="text-rose-500 w-4 h-4 mt-0.5 shrink-0" />
                                                <span className="text-xs text-rose-400 font-bold">{conflictError}</span>
                                            </Motion.div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-white border-b border-lumina-highlight pb-2">Assignments</h3>
                                        <div>
                                            <label className="text-xs text-lumina-muted block mb-1">Lead Photographer</label>
                                            <CustomSelect 
                                                value={bookingForm.photographerId}
                                                onChange={val => setBookingForm({...bookingForm, photographerId: val})}
                                                options={photographers.map(p => ({ value: p.id, label: p.name }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-lumina-muted block mb-1">Internal Notes</label>
                                            <textarea className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-white text-sm h-20 resize-none focus:border-lumina-accent outline-none" placeholder="Special requests..." value={bookingForm.notes} onChange={e => setBookingForm({...bookingForm, notes: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Motion.div>
                    )}

                    {/* STEP 3: PAYMENT */}
                    {step === 3 && (
                        <Motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                            <h2 className="text-2xl font-bold text-white">Payment & Confirmation</h2>
                            <div className="bg-white text-black rounded-xl overflow-hidden shadow-2xl max-w-md mx-auto relative">
                                <div className="h-2 bg-lumina-accent w-full"></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                        <span className="font-black text-lg uppercase">Total Due</span>
                                        <div className="text-right">
                                            <span className="font-black text-2xl font-mono tracking-tight block">Rp {totals.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            {totals.discountAmount > 0 && <span className="text-xs text-emerald-600 font-bold">Includes Discount</span>}
                                        </div>
                                    </div>

                                    {/* Breakdown */}
                                    <div className="space-y-2 mb-6 text-sm">
                                        <div className="flex justify-between text-gray-500">
                                            <span>Subtotal</span>
                                            <span>Rp {totals.subtotal.toLocaleString()}</span>
                                        </div>
                                        
                                        {/* Discount Control */}
                                        <div className="flex justify-between items-center text-gray-500">
                                            <button onClick={() => setShowDiscountInput(!showDiscountInput)} className="text-emerald-600 hover:underline font-bold text-xs flex items-center gap-1">
                                                <Plus size={10} className={showDiscountInput ? 'rotate-45 transition-transform' : ''}/> {showDiscountInput ? 'Remove Discount' : 'Add Discount'}
                                            </button>
                                            {totals.discountAmount > 0 && <span className="text-emerald-600 font-bold">- Rp {totals.discountAmount.toLocaleString()}</span>}
                                        </div>

                                        {showDiscountInput && (
                                            <div className="flex gap-2 p-2 bg-gray-50 rounded-lg animate-in slide-in-from-top-2">
                                                <select 
                                                    className="bg-white border border-gray-300 rounded text-xs p-1 focus:outline-none"
                                                    value={discountForm.type}
                                                    onChange={(e) => setDiscountForm({...discountForm, type: e.target.value as any})}
                                                >
                                                    <option value="FIXED">Rp (Fixed)</option>
                                                    <option value="PERCENT">% (Percent)</option>
                                                </select>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    className="flex-1 bg-white border border-gray-300 rounded text-xs p-1 focus:outline-none"
                                                    placeholder="Value"
                                                    value={discountForm.value || ''}
                                                    onChange={(e) => setDiscountForm({...discountForm, value: Math.max(0, Number(e.target.value))})}
                                                />
                                            </div>
                                        )}

                                        <div className="flex justify-between text-gray-500">
                                            <span>Tax ({config.taxRate || 0}%)</span>
                                            <span>Rp {totals.taxAmount.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-100 p-4 rounded-lg space-y-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><DollarSign size={14}/> Initial Deposit</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">Rp</span>
                                                <input type="number" min="0" className="w-full pl-8 pr-3 py-2 rounded border border-gray-300 text-sm font-bold focus:outline-none focus:border-black" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: Math.max(0, Number(e.target.value))})} />
                                            </div>
                                            <button onClick={() => setPaymentForm(p => ({...p, amount: Math.floor(totals.total * 0.5)}))} className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-bold hover:bg-gray-200">50%</button>
                                        </div>
                                        {paymentForm.amount > 0 && (
                                            <div className="animate-in slide-in-from-top-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Deposit Account</label>
                                                <CustomSelect 
                                                    value={paymentForm.accountId}
                                                    onChange={(val) => setPaymentForm({...paymentForm, accountId: val})}
                                                    options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                                                    className="bg-white border-gray-300 text-black"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex items-center gap-2"><input type="checkbox" id="googleSync" checked={bookingForm.syncGoogle} onChange={(e) => setBookingForm({...bookingForm, syncGoogle: e.target.checked})} className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"/><label htmlFor="googleSync" className="text-xs font-bold uppercase text-gray-600">Sync to Google Calendar (if connected)</label></div>
                                </div>
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-4 lg:p-6 border-t border-lumina-highlight bg-lumina-base flex justify-between items-center shrink-0">
                {step > 1 ? <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-lumina-muted hover:text-white font-bold transition-colors"><ChevronLeft size={20} /> Back</button> : <div></div>}
                <button onClick={step === 3 ? handleSubmit : () => setStep(step + 1)} disabled={!isStepValid() || isSubmitting} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${isStepValid() && !isSubmitting ? (step === 3 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-lumina-accent hover:bg-lumina-accent/90 text-lumina-base') : 'bg-lumina-highlight text-lumina-muted cursor-not-allowed opacity-50'}`}>
                    {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Saving...</> : <>{step === 3 ? 'Confirm Booking' : 'Next Step'} {step !== 3 && <ChevronRight size={20} />}</>}
                </button>
            </div>
        </div>
      </Motion.div>
    </div>
  );
};

export default NewBookingModal;
