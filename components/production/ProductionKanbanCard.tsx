
import React from 'react';
import { motion } from 'framer-motion';
import { Booking, User } from '../../types';
import { Clock, AlertCircle } from 'lucide-react';

const Motion = motion as any;

interface ProductionKanbanCardProps {
    booking: Booking;
    currentUser?: User;
    onSelect: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
}

const ProductionKanbanCard: React.FC<ProductionKanbanCardProps> = ({ booking, currentUser, onSelect, onDragStart }) => {
    
    const getDeadlineColor = (date: string) => {
        const today = new Date();
        const deadline = new Date(date);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'text-rose-500 bg-rose-500/10';
        if (diffDays <= 2) return 'text-amber-500 bg-amber-500/10';
        return 'text-emerald-500 bg-emerald-500/10';
    };

    return (
        <Motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
        >
            <div
                draggable="true"
                onDragStart={(e) => onDragStart(e as any, booking.id)}
                onClick={() => onSelect(booking.id)}
                className="w-full text-left bg-lumina-base border border-lumina-highlight p-2.5 md:p-3 rounded-xl shadow-sm hover:border-lumina-accent/50 cursor-grab active:cursor-grabbing group relative overflow-hidden transition-all focus:outline-none active:scale-[0.98]"
            >
                {/* Visual Accent */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getDeadlineColor(booking.date).split(' ')[0].replace('text-', 'bg-')}`} />

                {/* Card Content */}
                <div className="flex justify-between items-start mb-1 pl-1">
                    <span className="text-[8px] md:text-[9px] font-bold text-lumina-muted uppercase tracking-widest truncate max-w-[120px]">{booking.package}</span>
                    <div className="flex gap-1">
                        {booking.photographerId === currentUser?.id && (
                            <div className="px-1 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[7px] font-black">MY JOB</div>
                        )}
                    </div>
                </div>
                
                <h4 className="font-bold text-white text-sm mb-1 truncate pl-1">{booking.clientName}</h4>
                
                <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-lumina-muted mb-2 pl-1">
                    <Clock size={10} className="shrink-0" />
                    <span>{new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-lumina-highlight/30 ml-1">
                    <div className={`text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${getDeadlineColor(booking.date)}`}>
                        <AlertCircle size={10} /> 
                        <span className="hidden sm:inline">Due:</span> 
                        {new Date(booking.date).toLocaleDateString()}
                    </div>
                    <div className="w-5 h-5 rounded-full bg-lumina-surface border border-lumina-highlight flex items-center justify-center text-[8px] text-white font-bold shadow-inner">
                        {booking.clientName.charAt(0)}
                    </div>
                </div>
            </div>
        </Motion.div>
    );
};

export default ProductionKanbanCard;
