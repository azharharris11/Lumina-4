
import React from 'react';
import { Booking, User } from '../../types';
import { Calendar, Clock, MapPin, User as UserIcon } from 'lucide-react';

interface ScheduleListViewProps {
    bookings: Booking[];
    onSelectBooking: (id: string) => void;
    users: User[];
}

const ScheduleListView: React.FC<ScheduleListViewProps> = ({ bookings, onSelectBooking, users }) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter for upcoming bookings (today onwards) and sort by date ascending
    const sortedBookings = [...bookings]
        .filter(b => b.date >= today && b.status !== 'CANCELLED')
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.timeStart}`);
            const dateB = new Date(`${b.date}T${b.timeStart}`);
            return dateA.getTime() - dateB.getTime();
        });

    const getStaffName = (id?: string) => users.find(u => u.id === id)?.name || 'Unassigned';

    return (
        <div className="flex-1 bg-lumina-surface border border-lumina-highlight rounded-2xl overflow-hidden flex flex-col shadow-2xl h-full min-h-[500px]">
            <div className="p-4 border-b border-lumina-highlight bg-lumina-base/30">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Upcoming Schedule</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-lumina-base text-lumina-muted text-xs uppercase tracking-wider border-b border-lumina-highlight sticky top-0 z-10">
                        <tr>
                            <th className="p-4 font-bold bg-lumina-base">Date & Time</th>
                            <th className="p-4 font-bold bg-lumina-base">Client</th>
                            <th className="p-4 font-bold bg-lumina-base">Package</th>
                            <th className="p-4 font-bold bg-lumina-base">Location</th>
                            <th className="p-4 font-bold bg-lumina-base">Staff</th>
                            <th className="p-4 font-bold bg-lumina-base">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-lumina-highlight/30">
                        {sortedBookings.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-lumina-muted italic">
                                    No upcoming bookings found.
                                </td>
                            </tr>
                        )}
                        {sortedBookings.map((booking) => (
                            <tr 
                                key={booking.id} 
                                onClick={() => onSelectBooking(booking.id)}
                                className="hover:bg-lumina-highlight/10 transition-colors cursor-pointer group"
                            >
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm flex items-center gap-2">
                                            <Calendar size={14} className="text-lumina-accent"/> 
                                            {new Date(booking.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="text-lumina-muted text-xs flex items-center gap-2 mt-1 font-mono">
                                            <Clock size={12}/> {booking.timeStart} <span className="opacity-50">({booking.duration}h)</span>
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-white text-sm">{booking.clientName}</div>
                                    <div className="text-xs text-lumina-muted mt-0.5">{booking.clientPhone}</div>
                                </td>
                                <td className="p-4">
                                    <span className="text-xs font-bold text-white bg-lumina-base px-2 py-1 rounded border border-lumina-highlight inline-block">
                                        {booking.package}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-xs text-lumina-muted font-bold">
                                        <MapPin size={14} className="text-lumina-muted/70"/> {booking.studio}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-xs text-lumina-muted">
                                        <UserIcon size={14} className="text-lumina-muted/70"/> {getStaffName(booking.photographerId)}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide border
                                        ${booking.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                          booking.status === 'SHOOTING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                          booking.status === 'BOOKED' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                          'bg-lumina-highlight text-lumina-muted border-lumina-highlight'}
                                    `}>
                                        {booking.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScheduleListView;
