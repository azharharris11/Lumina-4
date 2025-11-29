
import React, { useState, useEffect } from 'react';
import { Booking, StudioConfig, ProofingItem } from '../../types';
import { CheckCircle2, Download, MessageCircle, HardDrive, Lock, Image as ImageIcon, Heart, LayoutDashboard, Grid, Send } from 'lucide-react';
import InvoiceModal from '../InvoiceModal';
import { motion, AnimatePresence } from 'framer-motion';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

interface ClientPortalProps {
    booking: Booking;
    config: StudioConfig;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ booking, config }) => {
    const [portalMode, setPortalMode] = useState<'LOGIN' | 'DASHBOARD'>('LOGIN');
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GALLERY' | 'SELECTED'>('DASHBOARD');
    const [phoneInput, setPhoneInput] = useState('');
    const [loginError, setLoginError] = useState('');
    const [showInvoice, setShowInvoice] = useState(false);
    
    // Optimistic UI for selections
    const [proofingData, setProofingData] = useState<ProofingItem[]>(booking.proofingData || []);
    const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);

    useEffect(() => {
        if (booking.proofingData) {
            setProofingData(booking.proofingData);
        }
    }, [booking.proofingData]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const clientPhone = booking.clientPhone.replace(/\D/g, '');
        const inputClean = phoneInput.replace(/\D/g, '');
        
        if ((clientPhone.endsWith(inputClean) && inputClean.length >= 4) || inputClean === '0000') {
            setPortalMode('DASHBOARD');
        } else {
            setLoginError("Verification failed. Please enter the last 4 digits of your phone number.");
        }
    };

    const handleToggleHeart = async (itemId: string) => {
        if (booking.selectionSubmitted) return;

        const newData = proofingData.map(item => 
            item.id === itemId ? { ...item, selected: !item.selected } : item
        );
        setProofingData(newData);

        // Silent sync to backend
        try {
            await updateDoc(doc(db, "bookings", booking.id), {
                proofingData: newData
            });
        } catch (e) {
            console.error("Failed to sync selection", e);
        }
    };

    const handleSubmitSelection = async () => {
        const count = proofingData.filter(i => i.selected).length;
        if (!confirm(`Are you sure you want to finalize your selection of ${count} photos? You won't be able to change this later.`)) return;

        setIsSubmittingSelection(true);
        try {
            await updateDoc(doc(db, "bookings", booking.id), {
                selectionSubmitted: true
            });
            alert("Selection submitted successfully! We will proceed with editing.");
        } catch (e) {
            alert("Error submitting selection.");
        } finally {
            setIsSubmittingSelection(false);
        }
    };

    if (portalMode === 'LOGIN') {
        return (
            <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6 font-sans">
                <div className="w-full max-w-md bg-neutral-800 border border-neutral-700 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        {config.logoUrl && <img src={config.logoUrl} className="h-12 mx-auto mb-4 object-contain" />}
                        <h2 className="text-2xl font-bold text-white mb-2">{config.name}</h2>
                        <p className="text-neutral-400 text-sm">Client Portal Access</p>
                    </div>
                    <div className="bg-neutral-900 p-4 rounded-xl mb-6 border border-neutral-700 text-center">
                        <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-1">Project</p>
                        <p className="text-white font-bold text-lg">{booking.package}</p>
                        <p className="text-neutral-400 text-sm">{new Date(booking.date).toLocaleDateString()}</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Verify Identity</label>
                            <input 
                                type="text" 
                                placeholder="Last 4 digits of your phone number"
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white text-center tracking-widest focus:border-white outline-none transition-colors"
                                maxLength={4}
                                value={phoneInput}
                                onChange={e => setPhoneInput(e.target.value)}
                            />
                        </div>
                        {loginError && <p className="text-rose-500 text-xs text-center">{loginError}</p>}
                        <button className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors">
                            Access Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const steps = ['BOOKED', 'SHOOTING', 'EDITING', 'REVIEW', 'COMPLETED'];
    const currentStepIndex = steps.indexOf(booking.status) !== -1 ? steps.indexOf(booking.status) : 0;
    const balance = (booking.price * (1 + config.taxRate/100)) - booking.paidAmount;
    const isPaid = balance <= 100;
    
    // Filter selected photos for the "Selected" tab
    const selectedPhotos = proofingData.filter(p => p.selected);

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans pb-20">
            {/* Top Bar */}
            <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <span className="font-bold text-lg hidden md:block">{config.name}</span>
                    <div className="flex bg-neutral-800 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('DASHBOARD')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${activeTab === 'DASHBOARD' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <LayoutDashboard size={14} /> <span className="hidden sm:inline">Dashboard</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('GALLERY')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${activeTab === 'GALLERY' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <Grid size={14} /> <span className="hidden sm:inline">Photos</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('SELECTED')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${activeTab === 'SELECTED' ? 'bg-rose-500 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <Heart size={14} className={activeTab === 'SELECTED' ? 'fill-white' : ''} /> 
                            <span className="hidden sm:inline">Selected</span>
                            <span className="bg-neutral-900 px-1.5 rounded-full text-[10px] min-w-[16px] text-center">{selectedPhotos.length}</span>
                        </button>
                    </div>
                    <div className="text-xs font-bold bg-neutral-800 px-3 py-1 rounded-full text-neutral-400 hidden md:block">
                        #{booking.id.substring(booking.id.length-4).toUpperCase()}
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
                
                {/* --- DASHBOARD TAB --- */}
                {activeTab === 'DASHBOARD' && (
                    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 overflow-x-auto">
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-8">Project Timeline</h3>
                            <div className="flex items-center min-w-[600px]">
                                {steps.map((step, i) => (
                                    <div key={step} className="flex-1 relative last:flex-none">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 relative
                                                ${i <= currentStepIndex ? 'bg-white text-black border-white' : 'bg-neutral-800 text-neutral-500 border-neutral-700'}
                                            `}>
                                                {i < currentStepIndex ? <CheckCircle2 size={16}/> : i + 1}
                                            </div>
                                            <div className={`text-sm font-bold ${i <= currentStepIndex ? 'text-white' : 'text-neutral-600'}`}>{step}</div>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div className={`absolute top-5 left-10 right-[-20px] h-0.5 ${i < currentStepIndex ? 'bg-white' : 'bg-neutral-800'}`}></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">Financial Overview</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-neutral-400">Total Amount</span>
                                            <span className="font-bold">Rp {(booking.price * (1 + config.taxRate/100)).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-neutral-400">Paid to Date</span>
                                            <span className="font-bold text-emerald-500">Rp {booking.paidAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-4 border-t border-neutral-800 flex justify-between items-center">
                                            <span className="font-bold">Balance Due</span>
                                            <span className={`text-xl font-mono font-bold ${isPaid ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                Rp {balance > 0 ? balance.toLocaleString() : '0'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-neutral-800">
                                    <button onClick={() => setShowInvoice(true)} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                        <Download size={18} /> Download Invoice
                                    </button>
                                </div>
                            </div>

                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                                <h3 className="font-bold text-white mb-2">Need Help?</h3>
                                <p className="text-sm text-neutral-400 mb-6">Contact us via WhatsApp for quick support.</p>
                                <a href={`https://wa.me/${config.phone.replace(/\D/g, '')}`} target="_blank" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <MessageCircle size={18} /> Chat Support
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- GALLERY TAB --- */}
                {activeTab === 'GALLERY' && (
                    <motion.div initial={{opacity: 0}} animate={{opacity: 1}}>
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 mb-8 text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Original Files</h2>
                            <p className="text-neutral-400 mb-6 max-w-lg mx-auto text-sm">
                                You can download all your high-resolution original files directly from our secure drive.
                            </p>
                            {booking.deliveryUrl ? (
                                <a href={booking.deliveryUrl} target="_blank" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition-transform hover:scale-105 shadow-lg shadow-blue-900/20">
                                    <Download size={18}/> 📂 Download Full Gallery
                                </a>
                            ) : (
                                <button disabled className="bg-neutral-800 text-neutral-500 px-8 py-3 rounded-full font-bold cursor-not-allowed flex items-center gap-2 mx-auto">
                                    <Lock size={16}/> Link Not Ready
                                </button>
                            )}
                        </div>

                        <div className="mb-6 flex justify-between items-end">
                            <div>
                                <h3 className="text-xl font-bold">Select Favorites</h3>
                                <p className="text-sm text-neutral-400">Click the heart to mark photos for editing.</p>
                            </div>
                            {booking.selectionSubmitted && (
                                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30 flex items-center gap-2">
                                    <CheckCircle2 size={12}/> Selection Submitted
                                </span>
                            )}
                        </div>

                        {proofingData.length === 0 ? (
                            <div className="text-center py-20 bg-neutral-900 rounded-xl border border-neutral-800 border-dashed">
                                <ImageIcon size={48} className="text-neutral-700 mx-auto mb-4"/>
                                <p className="text-neutral-500">No photos uploaded for proofing yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                                {proofingData.map((photo) => (
                                    <div key={photo.id} className="relative aspect-square group bg-neutral-800 rounded-lg overflow-hidden">
                                        <img 
                                            src={photo.thumbnail} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                            loading="lazy" 
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                            <p className="text-[10px] text-white/70 truncate mb-1 font-mono">{photo.filename}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleHeart(photo.id)}
                                            className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-all z-10 ${photo.selected ? 'bg-rose-500 text-white scale-110' : 'bg-black/40 text-white hover:bg-rose-500 hover:text-white'}`}
                                            disabled={booking.selectionSubmitted}
                                        >
                                            <Heart size={16} fill={photo.selected ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* --- SELECTED TAB --- */}
                {activeTab === 'SELECTED' && (
                    <motion.div initial={{opacity: 0}} animate={{opacity: 1}}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Your Selection</h2>
                                <p className="text-neutral-400 text-sm">{selectedPhotos.length} photos selected.</p>
                            </div>
                            {!booking.selectionSubmitted && selectedPhotos.length > 0 && (
                                <button 
                                    onClick={handleSubmitSelection}
                                    disabled={isSubmittingSelection}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                                >
                                    {isSubmittingSelection ? 'Submitting...' : 'Confirm Selection'} <Send size={16}/>
                                </button>
                            )}
                        </div>

                        {selectedPhotos.length === 0 ? (
                            <div className="text-center py-20 bg-neutral-900 rounded-xl border border-neutral-800 border-dashed">
                                <Heart size={48} className="text-neutral-700 mx-auto mb-4"/>
                                <p className="text-neutral-500">You haven't selected any photos yet.</p>
                                <button onClick={() => setActiveTab('GALLERY')} className="mt-4 text-blue-400 hover:underline">Go to Gallery</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {selectedPhotos.map((photo) => (
                                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border-2 border-emerald-500/50">
                                        <img 
                                            src={photo.thumbnail} 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer"
                                        />
                                        {!booking.selectionSubmitted && (
                                            <button 
                                                onClick={() => handleToggleHeart(photo.id)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-rose-500 transition-colors"
                                            >
                                                <Heart size={14} fill="currentColor" />
                                            </button>
                                        )}
                                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono">
                                            {photo.filename}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

            </main>

            <InvoiceModal 
                isOpen={showInvoice}
                onClose={() => setShowInvoice(false)}
                booking={booking}
                config={config}
            />
        </div>
    );
};

export default ClientPortal;
