
import React, { useState, useMemo } from 'react';
import { Booking, User } from '../../types';
import { Calendar, Clock, MapPin, User as UserIcon, Search, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';

interface ScheduleListViewProps {
    bookings: Booking[];
    onSelectBooking: (id: string) => void;
    users: User[];
}

const ScheduleListView: React.FC<ScheduleListViewProps> = ({ bookings, onSelectBooking, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [showPast, setShowPast] = useState(false);
    const [sortAsc, setSortAsc] = useState(true);

    const filteredBookings = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        
        return bookings.filter(b => {
            // 1. Date Filter (Future vs History)
            if (!showPast && b.date < today) return false;

            // 2. Search Filter
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                b.clientName.toLowerCase().includes(searchLower) ||
                b.clientPhone.includes(searchLower) ||
                b.id.toLowerCase().includes(searchLower) ||
                b.package.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;

            // 3. Status Filter
            if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

            return true;
        }).sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.timeStart || '00:00'}`).getTime();
            const dateB = new Date(`${b.date}T${b.timeStart || '00:00'}`).getTime();
            return sortAsc ? dateA - dateB : dateB - dateA;
        });
    }, [bookings, searchTerm, statusFilter, showPast, sortAsc]);

    const getStaffName = (id?: string) => users.find(u => u.id === id)?.name || 'Unassigned';

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'SHOOTING': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'BOOKED': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'CANCELLED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'REVIEW': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            default: return 'bg-lumina-highlight text-lumina-muted border-lumina-highlight';
        }
    };

    return (
        <div className="flex-1 bg-lumina-surface border border-lumina-highlight rounded-2xl overflow-hidden flex flex-col shadow-2xl h-full min-h-[500px]">
            {/* Toolbar */}
            <div className="p-4 border-b border-lumina-highlight bg-lumina-base/30 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lumina-muted w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search client, package..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-lumina-base border border-lumina-highlight rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-lumina-accent outline-none"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <div className="relative">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none bg-lumina-base border border-lumina-highlight text-white text-sm rounded-lg pl-3 pr-8 py-2 focus:border-lumina-accent outline-none cursor-pointer"
                        >
                            <option value="ALL">All Status</option>
                            <option value="BOOKED">Booked</option>
                            <option value="SHOOTING">Shooting</option>
                            <option value="EDITING">Editing</option>
                            <option value="REVIEW">Review</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-lumina-muted pointer-events-none w-4 h-4" />
                    </div>

                    <button 
                        onClick={() => setShowPast(!showPast)}
                        className={`px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${showPast ? 'bg-lumina-highlight text-white border-lumina-highlight' : 'bg-transparent text-lumina-muted border-lumina-highlight hover:text-white'}`}
                    >
                        {showPast ? 'Showing History' : 'Upcoming Only'}
                    </button>

                    <button 
                        onClick={() => setSortAsc(!sortAsc)}
                        className="p-2 rounded-lg border border-lumina-highlight text-lumina-muted hover:text-white hover:bg-lumina-highlight transition-colors"
                        title="Toggle Sort Order"
                    >
                        <ArrowUpDown size={16} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-lumina-base text-lumina-muted text-xs uppercase tracking-wider border-b border-lumina-highlight sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-4 font-bold bg-lumina-base w-[180px]">Date & Time</th>
                            <th className="p-4 font-bold bg-lumina-base">Client Details</th>
                            <th className="p-4 font-bold bg-lumina-base">Package</th>
                            <th className="p-4 font-bold bg-lumina-base">Location</th>
                            <th className="p-4 font-bold bg-lumina-base">Assigned To</th>
                            <th className="p-4 font-bold bg-lumina-base text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-lumina-highlight/30">
                        {filteredBookings.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-lumina-muted italic">
                                    No bookings found matching your filters.
                                </td>
                            </tr>
                        )}
                        {filteredBookings.map((booking) => (
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
                                    <span className="text-xs font-bold text-white bg-lumina-base px-2 py-1 rounded border border-lumina-highlight inline-block whitespace-nowrap">
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
                                        <UserIcon size={14} className="text-lumina-muted/70"/> 
                                        <span className="truncate max-w-[120px]">{getStaffName(booking.photographerId)}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide border inline-block min-w-[80px] text-center ${getStatusColor(booking.status)}`}>
                                        {booking.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-3 border-t border-lumina-highlight bg-lumina-base/30 text-xs text-lumina-muted flex justify-between items-center">
                <span>Showing {filteredBookings.length} bookings</span>
                <span className="hidden md:inline">Click a row to view full project details</span>
            </div>
        </div>
    );
};

export default ScheduleListView;
