
import React, { useRef, useState, useEffect } from 'react';
import { Booking, StudioConfig } from '../types';
import { FileSignature, Eraser, Loader2, CheckCircle2, Calendar, DollarSign, Clock, MapPin } from 'lucide-react';
import { uploadFile, dataURLtoBlob } from '../utils/storageUtils';

interface ContractViewerProps {
    booking: Booking;
    config: StudioConfig;
    onSign: (signatureUrl: string) => Promise<void>;
    readOnly?: boolean;
}

const ContractViewer: React.FC<ContractViewerProps> = ({ booking, config, onSign, readOnly = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    // --- Signature Pad Logic ---
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (readOnly) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = (e as React.MouseEvent).nativeEvent.offsetX;
            y = (e as React.MouseEvent).nativeEvent.offsetY;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000'; // Black ink
        setIsSigning(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isSigning || readOnly) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
             x = e.touches[0].clientX - rect.left;
             y = e.touches[0].clientY - rect.top;
        } else {
             x = (e as React.MouseEvent).nativeEvent.offsetX;
             y = (e as React.MouseEvent).nativeEvent.offsetY;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => { setIsSigning(false); };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setHasSignature(false);
        }
    };

    const handleSave = async () => {
        if (!hasSignature) {
            alert("Please sign the contract before accepting.");
            return;
        }

        const canvas = canvasRef.current;
        if (canvas) {
            setIsSaving(true);
            try {
                // Upload transparent signature
                const dataUrl = canvas.toDataURL('image/png');
                const blob = dataURLtoBlob(dataUrl);
                const file = new File([blob], `signature_${booking.id}.png`, { type: 'image/png' });
                const downloadURL = await uploadFile(file, `contracts/${booking.id}`);
                
                await onSign(downloadURL);
            } catch (error) {
                console.error("Error signing:", error);
                alert("Failed to save signature. Please try again.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    // --- Dynamic Content ---
    const eventDate = new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const totalAmount = booking.price * (1 + config.taxRate / 100);
    const balance = totalAmount - booking.paidAmount;

    const DEFAULT_TERMS = `
1. Payment Terms: A non-refundable deposit is required to secure the date. The remaining balance is due on or before the project date. ${config.name} reserves the right to withhold deliverables until full payment is received.

2. Cancellation & Rescheduling: If the Client cancels the event/session more than 14 days prior to the date, the deposit may be transferred to a future date within 6 months. Cancellations within 14 days of the event will result in forfeiture of the deposit.

3. Copyright & Usage: ${config.name} retains copyright of all images/video. The Client is granted a personal use license to print and share images. Commercial use requires a separate written agreement. The Client agrees that ${config.name} may use images for portfolio and marketing purposes unless requested otherwise in writing.

4. Liability: ${config.name} will take utmost care with respect to exposure, editing, and delivery. However, in the unlikely event of total photographic failure, injury, or sickness beyond control, liability shall be limited to a full refund of all monies paid.

5. Turnaround Time: Standard editing turnaround is ${config.defaultTurnaroundDays || 14} days. Expedited delivery may incur additional fees.
`.trim();

    return (
        <div className="bg-white text-neutral-900 rounded-lg shadow-xl overflow-hidden max-w-4xl mx-auto border border-neutral-200">
            {/* Header */}
            <div className="bg-neutral-50 p-8 border-b border-neutral-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">Service Agreement</h1>
                        <p className="text-neutral-500 text-sm uppercase tracking-widest">Contract ID: #{booking.id.slice(-6).toUpperCase()}</p>
                    </div>
                    {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-16 object-contain" />}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Service Provider</h3>
                        <p className="font-bold text-lg">{config.name}</p>
                        <p className="text-neutral-600 text-sm whitespace-pre-line">{config.address}</p>
                        <p className="text-neutral-600 text-sm">{config.phone} | {config.website}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Client</h3>
                        <p className="font-bold text-lg">{booking.clientName}</p>
                        <p className="text-neutral-600 text-sm">{booking.clientPhone}</p>
                    </div>
                </div>
            </div>

            {/* Contract Body */}
            <div className="p-8 space-y-8 font-serif leading-relaxed text-neutral-800">
                
                {/* Section 1: Project Details */}
                <section>
                    <h2 className="text-xl font-bold font-sans text-neutral-900 border-b border-neutral-200 pb-2 mb-4">1. Project Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans bg-neutral-50 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-neutral-400"/>
                            <div>
                                <span className="block font-bold text-neutral-700">Date</span>
                                <span>{eventDate}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-neutral-400"/>
                            <div>
                                <span className="block font-bold text-neutral-700">Time / Duration</span>
                                <span>{booking.timeStart} ({booking.duration} hours)</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin size={18} className="text-neutral-400"/>
                            <div>
                                <span className="block font-bold text-neutral-700">Package</span>
                                <span>{booking.package}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <DollarSign size={18} className="text-neutral-400"/>
                            <div>
                                <span className="block font-bold text-neutral-700">Total Value</span>
                                <span>Rp {totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Terms */}
                <section className="text-sm text-justify">
                    <h2 className="text-xl font-bold font-sans text-neutral-900 border-b border-neutral-200 pb-2 mb-4">2. Terms & Conditions</h2>
                    
                    <div className="whitespace-pre-line space-y-4">
                        {config.contractTerms || DEFAULT_TERMS}
                    </div>

                    <p className="mt-4 pt-4 border-t border-dashed border-neutral-200 font-sans text-neutral-500 text-xs italic">
                        *Balance Due: <span className="font-bold text-neutral-900">Rp {balance > 0 ? balance.toLocaleString() : '0'}</span> to be paid according to the terms above.
                    </p>
                </section>

                {/* Section 3: Signature */}
                <section className="pt-8 mt-8 border-t-2 border-dashed border-neutral-300">
                    <h2 className="text-xl font-bold font-sans text-neutral-900 mb-4">3. Acceptance</h2>
                    <p className="text-sm mb-6">By signing below, the Client acknowledges they have read, understood, and agreed to the terms listed above.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Client Signature */}
                        <div>
                            <p className="font-bold text-sm uppercase tracking-wider mb-4">Client Signature</p>
                            
                            {booking.contractStatus === 'SIGNED' ? (
                                <div className="border border-emerald-500/50 bg-emerald-50 rounded-lg p-4 relative">
                                    <div className="absolute top-2 right-2 text-emerald-600 flex items-center gap-1 text-xs font-bold">
                                        <CheckCircle2 size={14}/> Signed
                                    </div>
                                    <img src={booking.contractSignature} className="h-24 mx-auto object-contain mix-blend-multiply" alt="Client Signature" />
                                    <div className="border-t border-emerald-200 mt-2 pt-2 text-center">
                                        <p className="font-serif italic text-lg">{booking.clientName}</p>
                                        <p className="text-xs text-neutral-500">Date: {new Date(booking.contractSignedDate || '').toLocaleString()}</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {readOnly ? (
                                        <div className="h-32 bg-neutral-100 border-2 border-neutral-300 border-dashed rounded-lg flex items-center justify-center text-neutral-400 text-sm italic">
                                            Client has not signed yet
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="border-2 border-neutral-300 rounded-lg bg-neutral-50 overflow-hidden touch-none relative">
                                                <canvas 
                                                    ref={canvasRef}
                                                    width={400} 
                                                    height={200}
                                                    className="w-full h-40 cursor-crosshair"
                                                    onMouseDown={startDrawing}
                                                    onMouseMove={draw}
                                                    onMouseUp={stopDrawing}
                                                    onMouseLeave={stopDrawing}
                                                    onTouchStart={startDrawing}
                                                    onTouchMove={draw}
                                                    onTouchEnd={stopDrawing}
                                                />
                                                <div className="absolute bottom-2 left-2 text-[10px] text-neutral-400 pointer-events-none">Sign here</div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <button onClick={clearSignature} disabled={isSaving} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
                                                    <Eraser size={14}/> Clear
                                                </button>
                                                <button 
                                                    onClick={handleSave} 
                                                    disabled={isSaving || !hasSignature} 
                                                    className="bg-neutral-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isSaving && <Loader2 size={14} className="animate-spin"/>}
                                                    {isSaving ? 'Signing...' : 'Accept & Sign'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Studio Representative (Auto-filled) */}
                        <div>
                             <p className="font-bold text-sm uppercase tracking-wider mb-4">Studio Representative</p>
                             <div className="h-full flex flex-col justify-end pb-4">
                                <div className="border-b border-neutral-900 mb-2 min-h-[60px] flex items-end">
                                    {config.signatureUrl ? (
                                        <img src={config.signatureUrl} alt="Studio Signature" className="h-20 object-contain mix-blend-multiply" />
                                    ) : (
                                        <p className="font-serif italic text-xl px-4 pb-2">{config.name}</p>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500">Authorized Signature</p>
                             </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ContractViewer;
