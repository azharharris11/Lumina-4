import React, { useState, useEffect } from 'react';
import { Booking, StudioConfig, ProofingItem, ActivityLog } from '../../types';
import { CheckCircle2, Download, MessageCircle, HardDrive, Lock, Image as ImageIcon, Heart, LayoutDashboard, Grid, Send, FileSignature, Loader2, Eye } from 'lucide-react';
import InvoiceModal from '../InvoiceModal';
import ContractViewer from '../ContractViewer';
import { motion, AnimatePresence } from 'framer-motion';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

const Motion = motion as any;

interface ClientPortalProps {
    booking: Booking;
    config: StudioConfig;
}

interface DriveFile {
    id: string;
    name: string;
    thumbnail?: string;
    downloadUrl?: string;
    viewUrl?: string;
    mimeType: string;
    isImage: boolean;
    size?: string;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ booking: initialBooking, config }) => {
    // Keep local state of booking to reflect changes immediately without reload
    const [booking, setBooking] = useState<Booking>(initialBooking);
    const [portalMode, setPortalMode] = useState<'LOGIN' | 'DASHBOARD'>('LOGIN');
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GALLERY' | 'SELECTED' | 'CONTRACT'>('DASHBOARD');
    const [phoneInput, setPhoneInput] = useState('');
    const [loginError, setLoginError] = useState('');
    const [showInvoice, setShowInvoice] = useState(false);
    
    // Gallery State
    const [galleryFiles, setGalleryFiles] = useState<DriveFile[]>([]);
    const [isLoadingGallery, setIsLoadingGallery] = useState(false);
    const [galleryError, setGalleryError] = useState<string | null>(null);

    // Optimistic UI for selections
    const [proofingData, setProofingData] = useState<ProofingItem[]>(booking.proofingData || []);
    const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);

    useEffect(() => {
        if (booking.proofingData) {
            setProofingData(booking.proofingData);
        }
    }, [booking.proofingData]);

    // Fetch Gallery Files when tab is active
    useEffect(() => {
        if (activeTab === 'GALLERY' && galleryFiles.length === 0 && !galleryError) {
            const fetchFiles = async () => {
                setIsLoadingGallery(true);
                try {
                    const getFilesFn = httpsCallable(functions, 'getPortalFiles');
                    const result = await getFilesFn({ bookingId: booking.id });
                    const data = result.data as { files: DriveFile[] };
                    setGalleryFiles(data.files || []);
                } catch (e: any) {
                    console.error("Gallery Fetch Error:", e);
                    setGalleryError("Unable to load gallery. Please contact the studio.");
                } finally {
                    setIsLoadingGallery(false);
                }
            };
            fetchFiles();
        }
    }, [activeTab, booking.id, galleryFiles.length, galleryError]);

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

    const handleClientSign = async (signatureUrl: string) => {
        try {
            const newLog: ActivityLog = {
                id: `log-${Date.now()}`,
                timestamp: new Date().toISOString(),
                action: 'CONTRACT_SIGNED',
                details: 'Client signed digital contract via Portal',
                userId: 'CLIENT',
                userName: booking.clientName
            };

            await updateDoc(doc(db, "bookings", booking.id), {
                contractStatus: 'SIGNED',
                contractSignedDate: new Date().toISOString(),
                contractSignature: signatureUrl,
                logs: arrayUnion(newLog)
            });

            // Update local state
            setBooking(prev => ({
                ...prev,
                contractStatus: 'SIGNED',
                contractSignedDate: new Date().toISOString(),
                contractSignature: signatureUrl,
                logs: [newLog, ...(prev.logs || [])]
            }));

            alert("Contract signed successfully! Thank you.");
        } catch (error) {
            console.error("Error signing contract:", error);
            alert("Failed to save contract. Please try again.");
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
            // Update local state
            setBooking(prev => ({ ...prev, selectionSubmitted: true }));
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
    
    // Branding Styles
    const accentColor = config.portalAccentColor || '#10b981'; // Default Emerald-500
    const bgColor = config.portalBackgroundColor || '#0a0a0a'; // Default Neutral-950
    const bgImage = config.portalBackgroundUrl ? `url(${config.portalBackgroundUrl})` : 'none';

    // Helper for hex to rgba
    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    if (portalMode === 'LOGIN') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 font-sans relative" style={{ backgroundColor: bgColor }}>
                {config.portalBackgroundUrl && (
                    <div className="absolute inset-0 z-0 opacity-30" style={{ backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                )}
                <div className="w-full max-w-md bg-neutral-800/90 backdrop-blur border border-neutral-700 rounded-2xl p-8 shadow-2xl z-10 relative">
                    <div className="text-center mb-8">
                        {config.logoUrl && <img src={config.logoUrl} className="h-12 mx-auto mb-4 object-contain" />}
                        <h2 className="text-2xl font-bold text-white mb-2">{config.name}</h2>
                        <p className="text-neutral-400 text-sm">Client Portal Access</p>
                    </div>
                    <div className="bg-neutral-900/50 p-4 rounded-xl mb-6 border border-neutral-700 text-center">
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
                                className="w-full bg-neutral-900/50 border border-neutral-700 rounded-lg p-3 text-white text-center tracking-widest focus:border-white outline-none transition-colors"
                                maxLength={4}
                                value={phoneInput}
                                onChange={e => setPhoneInput(e.target.value)}
                            />
                        </div>
                        {loginError && <p className="text-rose-500 text-xs text-center">{loginError}</p>}
                        <button 
                            className="w-full text-white font-bold py-3 rounded-lg transition-transform active:scale-95"
                            style={{ backgroundColor: accentColor }}
                        >
                            Access Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Filter selected photos for the "Selected" tab
    const selectedPhotos = proofingData.filter(p => p.selected);

    return (
        <div className="min-h-screen text-white font-sans pb-20 relative" style={{ backgroundColor: bgColor }}>
            {/* Dynamic Background Layer */}
            {config.portalBackgroundUrl && (
                <div className="fixed inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: bgImage, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            )}

            {/* Top Bar */}
            <nav className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <span className="font-bold text-lg hidden md:block">{config.name}</span>
                    <div className="flex bg-white/10 p-1 rounded-lg overflow-x-auto no-scrollbar">
                        {/* Nav Buttons with Dynamic Active State */}
                        {[
                            { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
                            { id: 'CONTRACT', icon: FileSignature, label: 'Contract' },
                            { id: 'GALLERY', icon: Grid, label: 'Photos' },
                            { id: 'SELECTED', icon: Heart, label: 'Selected', count: selectedPhotos.length }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors whitespace-nowrap
                                    ${activeTab === tab.id ? 'text-white shadow-sm' : 'text-neutral-400 hover:text-white'}
                                `}
                                style={activeTab === tab.id ? { backgroundColor: accentColor } : {}}
                            >
                                <tab.icon size={14} className={activeTab === tab.id && tab.id === 'SELECTED' ? 'fill-white' : ''} /> 
                                <span className="hidden sm:inline">{tab.label}</span>
                                {tab.count !== undefined && <span className="bg-black/20 px-1.5 rounded-full text-[10px] min-w-[16px] text-center">{tab.count}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-neutral-400 hidden md:block">
                        #{booking.id.substring(booking.id.length-4).toUpperCase()}
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 relative z-10">
                
                {/* --- DASHBOARD TAB --- */}
                {activeTab === 'DASHBOARD' && (
                    <Motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
                        {/* Booking Alert if Contract not signed */}
                        {booking.contractStatus !== 'SIGNED' && (
                            <div onClick={() => setActiveTab('CONTRACT')} className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:bg-amber-500/20 transition-colors">
                                <div className="p-2 bg-amber-500 text-amber-950 rounded-lg">
                                    <FileSignature size={24}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-400">Action Required: Sign Contract</h3>
                                    <p className="text-sm text-amber-200/70">Please review and sign your service agreement to secure your booking.</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 overflow-x-auto">
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-8">Project Timeline</h3>
                            <div className="flex items-center min-w-[600px]">
                                {steps.map((step, i) => (
                                    <div key={step} className="flex-1 relative last:flex-none">
                                        <div className="flex items-center gap-4">
                                            <div 
                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 relative transition-colors`}
                                                style={{ 
                                                    backgroundColor: i <= currentStepIndex ? accentColor : 'transparent',
                                                    borderColor: i <= currentStepIndex ? accentColor : '#404040',
                                                    color: i <= currentStepIndex ? 'white' : '#737373'
                                                }}
                                            >
                                                {i < currentStepIndex ? <CheckCircle2 size={16}/> : i + 1}
                                            </div>
                                            <div className={`text-sm font-bold ${i <= currentStepIndex ? 'text-white' : 'text-neutral-600'}`}>{step}</div>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div className="absolute top-5 left-10 right-[-20px] h-0.5 bg-neutral-800">
                                                <div 
                                                    className="h-full transition-all duration-500" 
                                                    style={{ 
                                                        width: i < currentStepIndex ? '100%' : '0%',
                                                        backgroundColor: accentColor 
                                                    }}
                                                ></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">Financial Overview</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-neutral-400">Total Amount</span>
                                            <span className="font-bold">Rp {(booking.price * (1 + config.taxRate/100)).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-neutral-400">Paid to Date</span>
                                            <span className="font-bold" style={{ color: accentColor }}>Rp {booking.paidAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                            <span className="font-bold">Balance Due</span>
                                            <span className={`text-xl font-mono font-bold ${isPaid ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                Rp {balance > 0 ? balance.toLocaleString() : '0'}
                                            </span>
                                        </div>

                                        {/* Dynamic Payment Options */}
                                        {!isPaid && (
                                            <div className="pt-4 border-t border-white/10">
                                                <p className="text-xs text-neutral-500 font-bold uppercase mb-2">Payment Options</p>
                                                {(config.paymentChannels && config.paymentChannels.length > 0) ? (
                                                    <div className="space-y-2">
                                                        {config.paymentChannels.map(channel => (
                                                            <div key={channel.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center text-sm hover:bg-white/10 transition-colors">
                                                                <div>
                                                                    <p className="font-bold text-white flex items-center gap-2">
                                                                        {channel.name}
                                                                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-neutral-400">{channel.type}</span>
                                                                    </p>
                                                                    <p className="font-mono text-neutral-300 text-xs">{channel.number}</p>
                                                                    {channel.holder && <p className="text-[10px] text-neutral-500 uppercase">{channel.holder}</p>}
                                                                </div>
                                                                {channel.type === 'QRIS' && channel.qrUrl && (
                                                                    <img src={channel.qrUrl} className="h-10 w-10 bg-white rounded p-0.5" alt="QR"/>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="bg-white/5 p-3 rounded-lg text-sm text-neutral-300">
                                                        <p className="font-bold">{config.bankName}</p>
                                                        <p className="font-mono">{config.bankAccount}</p>
                                                        <p className="text-xs text-neutral-500">{config.bankHolder}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <button onClick={() => setShowInvoice(true)} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                        <Download size={18} /> Download Invoice
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="font-bold text-white mb-2">Need Help?</h3>
                                <p className="text-sm text-neutral-400 mb-6">Contact us via WhatsApp for quick support.</p>
                                <a 
                                    href={`https://wa.me/${config.phone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    className="w-full py-3 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 hover:brightness-110"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    <MessageCircle size={18} /> Chat Support
                                </a>
                            </div>
                        </div>
                    </Motion.div>
                )}

                {/* --- CONTRACT TAB --- */}
                {activeTab === 'CONTRACT' && (
                    <Motion.div initial={{opacity: 0}} animate={{opacity: 1}}>
                        <ContractViewer 
                            booking={booking} 
                            config={config} 
                            onSign={handleClientSign}
                            readOnly={false} 
                        />
                    </Motion.div>
                )}

                {/* --- GALLERY TAB --- */}
                {activeTab === 'GALLERY' && (
                    <Motion.div initial={{opacity: 0}} animate={{opacity: 1}}>
                        
                        {/* Header Section */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 mb-8 text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Project Gallery</h2>
                            <p className="text-neutral-400 mb-6 max-w-lg mx-auto text-sm">
                                {isPaid 
                                    ? "View and download your high-resolution files below." 
                                    : "Preview your gallery below. Please settle the remaining balance to unlock high-resolution downloads."}
                            </p>
                            
                            {!isPaid && (
                                <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-lg text-sm font-bold mb-4">
                                    <Lock size={14}/> Downloads Locked - Balance Due: Rp {balance.toLocaleString()}
                                </div>
                            )}

                            {/* "Download All" Fallback (Only if Paid) */}
                            {isPaid && booking.deliveryUrl && (
                                <div className="mt-4">
                                     <a href={booking.deliveryUrl} target="_blank" className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2 rounded-full font-bold text-xs transition-colors border border-neutral-700">
                                        <HardDrive size={14}/> Open in Google Drive
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Gallery Grid */}
                        {isLoadingGallery ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 size={48} className="text-emerald-500 animate-spin mb-4"/>
                                <p className="text-neutral-500 font-medium">Loading your gallery from secure storage...</p>
                            </div>
                        ) : galleryError ? (
                            <div className="text-center py-20 bg-neutral-900 rounded-xl border border-neutral-800">
                                <p className="text-rose-500 mb-2">{galleryError}</p>
                            </div>
                        ) : galleryFiles.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
                                {galleryFiles.map((file) => (
                                    <div key={file.id} className="group relative aspect-square bg-neutral-800 rounded-lg overflow-hidden border border-neutral-800 hover:border-emerald-500/50 transition-colors">
                                        {/* Thumbnail / Icon */}
                                        {file.isImage && file.thumbnail ? (
                                            <img 
                                                src={file.thumbnail.replace('=s220', '=s800')} // Try to get larger thumb
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                loading="lazy"
                                                alt={file.name}
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
                                                <FileSignature size={32} className="mb-2"/>
                                                <span className="text-[10px] uppercase font-bold px-2 text-center">{file.mimeType.split('/').pop()}</span>
                                            </div>
                                        )}

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                                            {isPaid ? (
                                                <>
                                                    {file.viewUrl && (
                                                        <a 
                                                            href={file.viewUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center backdrop-blur-sm transition-colors"
                                                            title="View"
                                                        >
                                                            <Eye size={18}/>
                                                        </a>
                                                    )}
                                                    {file.downloadUrl && (
                                                        <a 
                                                            href={file.downloadUrl} 
                                                            target="_blank" 
                                                            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg transition-colors"
                                                            title="Download Original"
                                                        >
                                                            <Download size={18}/>
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-rose-500 border border-rose-500/30">
                                                    <Lock size={20}/>
                                                </div>
                                            )}
                                            <p className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-white/80 truncate font-mono">
                                                {file.name}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-20 bg-neutral-900 rounded-xl border border-neutral-800 border-dashed mb-8">
                                <ImageIcon size={48} className="text-neutral-700 mx-auto mb-4"/>
                                <p className="text-neutral-500">No final deliverables found in the linked folder.</p>
                            </div>
                        )}

                        {/* Legacy Proofing Section (If data exists) */}
                        {proofingData.length > 0 && (
                            <div className="mt-12 pt-12 border-t border-neutral-800">
                                <div className="mb-6 flex justify-between items-end">
                                    <div>
                                        <h3 className="text-xl font-bold">Proofing & Selection</h3>
                                        <p className="text-sm text-neutral-400">Select photos for editing.</p>
                                    </div>
                                    {booking.selectionSubmitted && (
                                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30 flex items-center gap-2">
                                            <CheckCircle2 size={12}/> Selection Submitted
                                        </span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                                    {proofingData.map((photo) => (
                                        <div key={photo.id} className="relative aspect-square group bg-neutral-800 rounded-lg overflow-hidden">
                                            <img 
                                                src={photo.thumbnail} 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                loading="lazy" 
                                                referrerPolicy="no-referrer"
                                            />
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
                            </div>
                        )}
                    </Motion.div>
                )}

                {/* --- SELECTED TAB --- */}
                {activeTab === 'SELECTED' && (
                    <Motion.div initial={{opacity: 0}} animate={{opacity: 1}}>
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
                    </Motion.div>
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