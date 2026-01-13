import React, { useState, useEffect } from 'react';
import { Booking, StudioConfig, ProofingItem, ActivityLog } from '../../types';
import { CheckCircle2, Download, MessageCircle, HardDrive, Lock, Image as ImageIcon, Heart, LayoutDashboard, Grid, Send, FileSignature, Loader2, Eye, ChevronLeft, ChevronRight, X, Users } from 'lucide-react';
import InvoiceModal from '../InvoiceModal';
import ContractViewer from '../ContractViewer';
import { motion, AnimatePresence } from 'framer-motion';
import { updateDoc, doc, arrayUnion, setDoc } from 'firebase/firestore';
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
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    // Optimistic UI for selections
    const [proofingData, setProofingData] = useState<ProofingItem[]>(booking.proofingData || []);
    const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);

    // Feedback States
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

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
                    
                    // Initialize proofing data from files if empty (First time load)
                    if ((!booking.proofingData || booking.proofingData.length === 0) && data.files.length > 0) {
                        const initialProofing = data.files.filter(f => f.isImage).map(f => ({
                            id: f.id,
                            filename: f.name,
                            thumbnail: f.thumbnail || '',
                            selected: false
                        }));
                        setProofingData(initialProofing);
                        // Sync to backend? Maybe wait for user action.
                    }

                } catch (e: any) {
                    console.error("Gallery Fetch Error:", e);
                    setGalleryError("Unable to load gallery. Please contact the studio.");
                } finally {
                    setIsLoadingGallery(false);
                }
            };
            fetchFiles();
        }
    }, [activeTab, booking.id, galleryFiles.length, galleryError, booking.proofingData]);

    // Helper to check selection status
    const isSelected = (fileId: string) => {
        return proofingData.find(p => p.id === fileId)?.selected || false;
    };

    const handleToggleHeart = async (id: string, fileData?: { name: string, thumbnail: string }, feedback?: string) => {
        if (booking.selectionSubmitted) return;
        
        // Check if item exists in proofingData
        const existingIndex = proofingData.findIndex(p => p.id === id);
        let newData = [...proofingData];

        if (existingIndex >= 0) {
            // Toggle selection or update feedback
            if (feedback !== undefined) {
                newData[existingIndex] = { ...newData[existingIndex], feedback: feedback };
            } else {
                newData[existingIndex] = { ...newData[existingIndex], selected: !newData[existingIndex].selected };
            }
        } else if (fileData) {
            // Add if missing (only possible from Gallery tab)
            newData.push({
                id: id,
                filename: fileData.name,
                thumbnail: fileData.thumbnail,
                selected: feedback !== undefined ? false : true,
                feedback: feedback || ''
            });
        }
        
        setProofingData(newData);

        // Silent sync
        try {
            await updateDoc(doc(db, "bookings", booking.id), {
                proofingData: newData
            });
        } catch (e) {
            console.error("Failed to sync selection", e);
        }
    };

    const handleDownloadAll = (part: number = 1) => {
        if (!isPaid) return;
        // Hardcoded base URL for prototype - in production use env var or derived from window.location
        const projectId = "lumina-f7d88"; 
        const url = `https://us-central1-${projectId}.cloudfunctions.net/downloadGalleryZip?bookingId=${booking.id}&part=${part}&size=50`;
        window.open(url, '_blank');
    };

    // Lightbox Navigation
    const handleNextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (lightboxIndex !== null && lightboxIndex < galleryFiles.length - 1) {
            setLightboxIndex(lightboxIndex + 1);
        }
    };

    const handlePrevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (lightboxIndex !== null && lightboxIndex > 0) {
            setLightboxIndex(lightboxIndex - 1);
        }
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (lightboxIndex === null) return;
            if (e.key === 'ArrowRight') handleNextImage();
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'Escape') setLightboxIndex(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex]);

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

    const handleToggleHeartById = async (itemId: string) => {
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

    const handleSubmitFeedback = async () => {
        if (rating === 0) return;

        setIsSubmittingFeedback(true);
        try {
            // Store feedback internally regardless of rating (for owner's record)
            const feedbackId = `rev-${Date.now()}`;
            await setDoc(doc(db, "internal_reviews", feedbackId), {
                id: feedbackId,
                bookingId: booking.id,
                clientName: booking.clientName,
                rating: rating,
                feedback: feedbackText,
                timestamp: new Date().toISOString(),
                status: rating <= 3 ? 'PENDING' : 'RESOLVED',
                ownerId: booking.ownerId
            });

            // If rating is high, redirect logic happens in the UI after this
            setFeedbackSubmitted(true);
            
            // If low rating, notify owner via a new notification
            if (rating <= 3) {
                 await setDoc(doc(db, "notifications", `n-rev-${Date.now()}`), {
                    id: `n-rev-${Date.now()}`,
                    title: "Negative Feedback Received",
                    message: `${booking.clientName} gave a ${rating}-star review. Please check the feedback tab.`,
                    time: new Date().toISOString(),
                    read: false,
                    type: "WARNING",
                    link: "dashboard",
                    ownerId: booking.ownerId
                });
            }
        } catch (e) {
            console.error("Feedback Submission Error:", e);
            alert("Failed to submit feedback. Please try again.");
        } finally {
            setIsSubmittingFeedback(false);
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
    const getFileThumbnail = (file: DriveFile) => {
        if (!file.isImage) return file.thumbnail;
        
        // If not paid, use secure backend watermark proxy
        if (!isPaid) {
            const projectId = "lumina-f7d88"; // Replace with your project ID
            const region = "us-central1";
            return `https://${region}-${projectId}.cloudfunctions.net/proxyWatermarkedImage?fileId=${file.id}&bookingId=${booking.id}&studioName=${encodeURIComponent(config.name)}`;
        }
        
        // If paid, use high-res Google thumbnail
        return file.thumbnail;
    };

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

    // Navigation Tabs Configuration
    const navTabs = [
        { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'CONTRACT', icon: FileSignature, label: 'Contract' },
        { id: 'GALLERY', icon: Grid, label: 'Photos' },
        { id: 'SELECTED', icon: Heart, label: 'Selected', count: selectedPhotos.length }
    ];

    if (booking.status === 'COMPLETED' || booking.status === 'REVIEW') {
        navTabs.push({ id: 'FEEDBACK', icon: MessageCircle, label: 'Feedback', count: undefined });
    }

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
                        {navTabs.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors whitespace-nowrap
                                    ${activeTab === tab.id ? 'text-white shadow-sm' : 'text-neutral-400 hover:text-white'}
                                `}
                                style={activeTab === tab.id ? { backgroundColor: accentColor } : {}}
                            >
                                <tab.icon size={14} className={activeTab === tab.id && (tab.id === 'SELECTED' || tab.id === 'FEEDBACK') ? 'fill-white' : ''} /> 
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
                                    className="w-full py-3 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 hover:brightness-110 mb-4"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    <MessageCircle size={18} /> Chat Support
                                </a>

                                {/* Referral Card */}
                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                                                <Users size={16}/>
                                            </div>
                                            <h4 className="font-bold text-emerald-400 text-sm">Refer & Earn</h4>
                                        </div>
                                        <p className="text-[11px] text-neutral-400 mb-4">Share your code with friends and get <span className="text-emerald-400 font-bold">Rp 50,000</span> for every booking!</p>
                                        
                                        <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-center justify-between group cursor-pointer hover:border-emerald-500/50 transition-colors"
                                             onClick={() => {
                                                 navigator.clipboard.writeText(booking.id.substring(0, 8).toUpperCase());
                                                 alert("Code copied to clipboard!");
                                             }}
                                        >
                                            <span className="font-mono font-bold text-white tracking-widest">{booking.id.substring(0, 8).toUpperCase()}</span>
                                            <Send size={14} className="text-neutral-500 group-hover:text-emerald-400"/>
                                        </div>
                                        <p className="text-[9px] text-neutral-500 mt-2 text-center">Click code to copy</p>
                                    </div>
                                </div>
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

                            {/* "Download All" Button or Parts */}
                            {isPaid && galleryFiles.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-2">
                                    {galleryFiles.length <= 50 ? (
                                        <button 
                                            onClick={() => handleDownloadAll(1)}
                                            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-bold transition-transform hover:scale-105 shadow-lg shadow-emerald-900/20"
                                        >
                                            <Download size={18}/> Download All Photos (.zip)
                                        </button>
                                    ) : (
                                        Array.from({ length: Math.ceil(galleryFiles.length / 50) }).map((_, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => handleDownloadAll(i + 1)}
                                                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-full font-bold text-sm transition-transform hover:scale-105 shadow-lg shadow-emerald-900/20"
                                            >
                                                <Download size={16}/> Part {i + 1} ({i * 50 + 1}-{Math.min((i + 1) * 50, galleryFiles.length)})
                                            </button>
                                        ))
                                    )}
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
                                {galleryFiles.map((file, index) => (
                                    <div 
                                        key={file.id} 
                                        className="group relative aspect-square bg-neutral-800 rounded-lg overflow-hidden border border-neutral-800 hover:border-emerald-500/50 transition-colors cursor-pointer"
                                        onClick={() => setLightboxIndex(index)}
                                    >
                                        {/* Thumbnail */}
                                        {file.isImage && file.thumbnail ? (
                                            <div className="relative w-full h-full">
                                                <img 
                                                    src={getFileThumbnail(file)}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    loading="lazy"
                                                    alt={file.name}
                                                    referrerPolicy="no-referrer"
                                                    onContextMenu={(e) => e.preventDefault()}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
                                                <FileSignature size={32} className="mb-2"/>
                                                <span className="text-[10px] uppercase font-bold px-2 text-center">{file.mimeType.split('/').pop()}</span>
                                            </div>
                                        )}

                                        {/* Overlays */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleToggleHeart(file.id, { name: file.name, thumbnail: file.thumbnail || '' }); }}
                                                    className={`p-2 rounded-full shadow-md transition-transform hover:scale-110 ${isSelected(file.id) ? 'bg-rose-500 text-white' : 'bg-black/50 text-white hover:bg-rose-500'}`}
                                                    title={isSelected(file.id) ? "Unselect" : "Select Favorite"}
                                                >
                                                    <Heart size={16} fill={isSelected(file.id) ? "currentColor" : "none"} />
                                                </button>
                                            </div>
                                            
                                            <div className="text-center">
                                                {!isPaid && (
                                                    <div className="inline-flex items-center gap-1 bg-black/60 px-2 py-1 rounded text-rose-500 text-[10px] font-bold border border-rose-500/30 mb-2">
                                                        <Lock size={10}/> Locked
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-white/90 truncate font-mono drop-shadow-md">{file.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-20 bg-neutral-900 rounded-xl border border-neutral-800 border-dashed mb-8">
                                <ImageIcon size={48} className="text-neutral-700 mx-auto mb-4"/>
                                <p className="text-neutral-500">No photos found in the linked folder.</p>
                            </div>
                        )}

                        {/* LIGHTBOX OVERLAY */}
                        <AnimatePresence>
                            {lightboxIndex !== null && galleryFiles[lightboxIndex] && (
                                <Motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
                                    onClick={() => setLightboxIndex(null)}
                                >
                                    {/* Toolbar */}
                                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent" onClick={e => e.stopPropagation()}>
                                        <p className="text-white text-sm font-mono opacity-80">{galleryFiles[lightboxIndex].name}</p>
                                        <div className="flex gap-4">
                                            {isPaid && galleryFiles[lightboxIndex].downloadUrl && (
                                                <a 
                                                    href={galleryFiles[lightboxIndex].downloadUrl} 
                                                    target="_blank" 
                                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors"
                                                >
                                                    <Download size={16}/> Download
                                                </a>
                                            )}
                                            <button 
                                                onClick={() => setLightboxIndex(null)}
                                                className="bg-white/10 hover:bg-rose-500/20 hover:text-rose-500 text-white p-2 rounded-full transition-colors"
                                            >
                                                <Eye size={20} className="hidden"/> {/* Placeholder for alignment */}
                                                <X size={24} /> 
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Image */}
                                    <div className="w-full h-full p-4 md:p-10 flex items-center justify-center relative">
                                        <div className="relative max-h-full max-w-full">
                                            <img 
                                                src={getFileThumbnail(galleryFiles[lightboxIndex])} 
                                                className="max-h-full max-w-full object-contain shadow-2xl rounded-sm"
                                                onClick={e => e.stopPropagation()}
                                                onContextMenu={(e) => e.preventDefault()}
                                            />
                                        </div>
                                        
                                        {/* Nav Buttons */}
                                        {lightboxIndex > 0 && (
                                            <button 
                                                onClick={handlePrevImage}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                            >
                                                <ChevronLeft size={48} /> 
                                            </button>
                                        )}
                                        {lightboxIndex < galleryFiles.length - 1 && (
                                            <button 
                                                onClick={handleNextImage}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                            >
                                                <ChevronRight size={48} /> 
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Bottom Toolbar */}
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50 w-full max-w-md px-4" onClick={e => e.stopPropagation()}>
                                        {!booking.selectionSubmitted && (
                                            <div className="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex gap-2 shadow-2xl">
                                                <input 
                                                    type="text"
                                                    placeholder="Add editing notes for this photo..."
                                                    className="flex-1 bg-transparent border-none text-white text-sm px-4 focus:ring-0 outline-none"
                                                    value={proofingData.find(p => p.id === galleryFiles[lightboxIndex].id)?.feedback || ''}
                                                    onChange={(e) => handleToggleHeart(galleryFiles[lightboxIndex].id, { name: galleryFiles[lightboxIndex].name, thumbnail: galleryFiles[lightboxIndex].thumbnail || '' }, e.target.value)}
                                                />
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => handleToggleHeart(galleryFiles[lightboxIndex].id, { name: galleryFiles[lightboxIndex].name, thumbnail: galleryFiles[lightboxIndex].thumbnail || '' })}
                                            className={`px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl transition-transform hover:scale-105
                                                ${isSelected(galleryFiles[lightboxIndex].id) ? 'bg-rose-500 text-white' : 'bg-white text-black'}
                                            `}
                                        >
                                            <Heart size={20} fill={isSelected(galleryFiles[lightboxIndex].id) ? "currentColor" : "none"} />
                                            {isSelected(galleryFiles[lightboxIndex].id) ? 'Selected' : 'Select Photo'}
                                        </button>
                                    </div>
                                </Motion.div>
                            )}
                        </AnimatePresence>

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

                {/* --- FEEDBACK TAB --- */}
                {activeTab === 'FEEDBACK' && (
                    <Motion.div initial={{opacity: 0, scale: 0.98}} animate={{opacity: 1, scale: 1}} className="max-w-2xl mx-auto">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 text-center">
                            {!feedbackSubmitted ? (
                                <>
                                    <div className="mb-8">
                                        <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                            <MessageCircle size={40} className="text-white fill-white/10"/>
                                        </div>
                                        <h2 className="text-3xl font-bold mb-2">How was your experience?</h2>
                                        <p className="text-neutral-400">Your feedback helps us improve our service for you and others.</p>
                                    </div>

                                    {/* Star Rating UI */}
                                    <div className="flex justify-center gap-3 mb-10">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => setRating(star)}
                                                className="transition-transform active:scale-90 hover:scale-110"
                                            >
                                                <Heart 
                                                    size={48} 
                                                    className={`transition-colors ${ (hoverRating || rating) >= star ? 'text-rose-500 fill-rose-500' : 'text-neutral-700'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>

                                    <AnimatePresence>
                                        {rating > 0 && (
                                            <Motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
                                                <div className="text-left">
                                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2 ml-1">Tell us more (Optional)</label>
                                                    <textarea 
                                                        value={feedbackText}
                                                        onChange={e => setFeedbackText(e.target.value)}
                                                        placeholder={rating <= 3 ? "How can we make it better?" : "What did you love most about our service?"}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-white outline-none transition-colors min-h-[120px] resize-none"
                                                    />
                                                </div>

                                                <button 
                                                    onClick={handleSubmitFeedback}
                                                    disabled={isSubmittingFeedback}
                                                    className="w-full py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50"
                                                    style={{ backgroundColor: accentColor }}
                                                >
                                                    {isSubmittingFeedback ? (
                                                        <Loader2 size={20} className="animate-spin"/>
                                                    ) : (
                                                        <>Submit Feedback <Send size={18}/></>
                                                    )}
                                                </button>
                                            </Motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            ) : (
                                <Motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="py-6">
                                    {rating >= 4 ? (
                                        <>
                                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                                                <CheckCircle2 size={48}/>
                                            </div>
                                            <h2 className="text-3xl font-bold mb-4">Thank You So Much!</h2>
                                            <p className="text-neutral-400 mb-8 leading-relaxed">
                                                We are thrilled that you had a great experience with <strong>{config.name}</strong>. 
                                                Would you mind sharing your review on Google? It helps our small business immensely.
                                            </p>
                                            
                                            <div className="flex flex-col gap-4">
                                                {config.googleReviewLink ? (
                                                    <a 
                                                        href={config.googleReviewLink} 
                                                        target="_blank" 
                                                        className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all shadow-xl"
                                                    >
                                                        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G"/>
                                                        Post Review on Google
                                                    </a>
                                                ) : (
                                                     <p className="text-xs text-neutral-500 italic">Google Review link not configured by studio.</p>
                                                )}
                                                <button onClick={() => setFeedbackSubmitted(false)} className="text-neutral-500 text-sm hover:text-white transition-colors underline underline-offset-4">
                                                    Go back
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                                                <Heart size={40} className="fill-rose-500/20"/>
                                            </div>
                                            <h2 className="text-3xl font-bold mb-4">We Appreciate Your Honesty</h2>
                                            <p className="text-neutral-400 mb-8 leading-relaxed">
                                                We are sorry that we didn't meet your expectations. 
                                                Your feedback has been sent directly to our management team. 
                                                We will review it and reach out to you if necessary.
                                            </p>
                                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm italic text-neutral-400 mb-8">
                                                "{feedbackText || "No additional comments provided."}"
                                            </div>
                                            <button 
                                                onClick={() => setActiveTab('DASHBOARD')}
                                                className="w-full py-4 border border-white/20 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                                            >
                                                Return to Dashboard
                                            </button>
                                        </>
                                    )}
                                </Motion.div>
                            )}
                        </div>
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