import React from 'react';
import { motion } from 'framer-motion';
import { Booking } from '../../types';
import { Calendar, MapPin, Clock, Navigation, Phone, MessageCircle } from 'lucide-react';

interface NextShootHeroProps {
    bookings: Booking[];
    onSelectBooking: (id: string) => void;
    onOpenWhatsApp?: (booking: Booking) => void;
}

const NextShootHero: React.FC<NextShootHeroProps> = ({ bookings, onSelectBooking, onOpenWhatsApp }) => {
    // Find the very next booking
    const now = new Date();
    const upcomingBookings = bookings
        .filter(b => b.status === 'BOOKED' || b.status === 'SHOOTING')
        .filter(b => {
            const bookingDate = new Date(`${b.date}T${b.timeStart}`);
            return bookingDate >= now; // Only future bookings
        })
        .sort((a, b) => new Date(`${a.date}T${a.timeStart}`).getTime() - new Date(`${b.date}T${b.timeStart}`).getTime());

    const nextShoot = upcomingBookings[0];

    if (!nextShoot) {
        return (
            <div className="bg-lumina-surface border border-lumina-highlight rounded-2xl p-8 text-center">
                <h2 className="text-xl font-bold text-white mb-2">No Upcoming Shoots</h2>
                <p className="text-lumina-muted text-sm">Time to market your services! Or enjoy the break.</p>
            </div>
        );
    }

    const shootDate = new Date(nextShoot.date);
    const isToday = shootDate.toDateString() === now.toDateString();
    const daysUntil = Math.ceil((shootDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    return (
        <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden group shadow-2xl shadow-emerald-900/10"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-all duration-700"></div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isToday ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                            {isToday ? 'Happening Today' : `In ${daysUntil} Day${daysUntil > 1 ? 's' : ''}`}
                        </span>
                        <span className="text-emerald-200/50 text-xs font-mono">#{nextShoot.id.substring(nextShoot.id.length-4)}</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-2">
                        {nextShoot.package}
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-emerald-100/80 text-sm md:text-base">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-emerald-400"/>
                            {nextShoot.timeStart} ({nextShoot.duration}h)
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-emerald-400"/>
                            {shootDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        {nextShoot.studio && (
                            <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-emerald-400"/>
                                {nextShoot.studio}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                    <div className="bg-black/20 backdrop-blur p-4 rounded-xl border border-white/10 min-w-[200px]">
                        <p className="text-xs text-emerald-200/60 uppercase font-bold mb-1">Client</p>
                        <p className="text-lg font-bold text-white">{nextShoot.clientName}</p>
                        <p className="text-sm text-emerald-200">{nextShoot.clientPhone}</p>
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onOpenWhatsApp?.(nextShoot)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <MessageCircle size={18} /> Chat
                        </button>
                        <button 
                            onClick={() => onSelectBooking(nextShoot.id)}
                            className="px-4 bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center transition-colors"
                        >
                            <Navigation size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default NextShootHero;
