
import React, { useState, useEffect } from 'react';
import { PromoPage } from '../../../types';
import { Timer, Zap, Users } from 'lucide-react';

interface PromoBlockProps {
    promo: PromoPage;
    accentColor?: string;
}

const PromoBlock: React.FC<PromoBlockProps> = ({ promo, accentColor = '#bef264' }) => {
    const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(promo.expiryDate) - +new Date();
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft(null);
            }
        };

        const timer = setInterval(calculateTimeLeft, 1000);
        calculateTimeLeft();
        return () => clearInterval(timer);
    }, [promo.expiryDate]);

    if (!promo.isActive) return null;

    const slotsLeft = promo.totalSlots - promo.bookedSlots;
    const progress = (promo.bookedSlots / promo.totalSlots) * 100;

    return (
        <div className="max-w-4xl mx-auto my-12 p-8 md:p-12 bg-black border border-white/10 rounded-3xl relative overflow-hidden text-center shadow-2xl">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-64 h-64 blur-[120px] opacity-20 rounded-full" style={{ backgroundColor: accentColor }}></div>
            
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest mb-6" style={{ color: accentColor }}>
                    <Zap size={14} fill="currentColor"/> Limited Time Offer
                </div>

                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{promo.title}</h2>
                <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">{promo.description}</p>

                {/* Countdown Timer */}
                {timeLeft ? (
                    <div className="grid grid-cols-4 gap-4 mb-12 max-w-sm mx-auto">
                        {[
                            { label: 'Days', val: timeLeft.days },
                            { label: 'Hrs', val: timeLeft.hours },
                            { label: 'Min', val: timeLeft.minutes },
                            { label: 'Sec', val: timeLeft.seconds }
                        ].map(t => (
                            <div key={t.label} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                                <p className="text-2xl md:text-3xl font-mono font-bold text-white leading-none mb-1">{t.val.toString().padStart(2, '0')}</p>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">{t.label}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mb-12 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 font-bold">
                        This offer has expired.
                    </div>
                )}

                {/* Slot Tracker */}
                <div className="mb-10 max-w-md mx-auto">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Users size={12}/> Slots Availability</span>
                        <span className="text-sm font-bold text-white">{slotsLeft} Slots Left</span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: accentColor }}></div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 italic">Hurry! Slots are filling up fast.</p>
                </div>

                <button 
                    disabled={!timeLeft || slotsLeft <= 0}
                    className="px-10 py-4 bg-white text-black font-bold rounded-full text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:grayscale"
                >
                    Claim Special Deal
                </button>
            </div>
        </div>
    );
};

export default PromoBlock;
