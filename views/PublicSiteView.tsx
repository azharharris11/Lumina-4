
import React from 'react';
import { SiteConfig, Package, User, StudioConfig, PublicBookingSubmission, Booking } from '../types';
import NoirTheme from '../components/site-builder/themes/NoirTheme';
import EtherealTheme from '../components/site-builder/themes/EtherealTheme';
import VogueTheme from '../components/site-builder/themes/VogueTheme';
import MinimalTheme from '../components/site-builder/themes/MinimalTheme';
import CinemaTheme from '../components/site-builder/themes/CinemaTheme';
import RetroTheme from '../components/site-builder/themes/RetroTheme';
import AtelierTheme from '../components/site-builder/themes/AtelierTheme';
import HorizonTheme from '../components/site-builder/themes/HorizonTheme';
import BoldTheme from '../components/site-builder/themes/BoldTheme';
import ImpactTheme from '../components/site-builder/themes/ImpactTheme';
import CleanSlateTheme from '../components/site-builder/themes/CleanSlateTheme';
import AuthorityTheme from '../components/site-builder/themes/AuthorityTheme';
import { Loader2, AlertCircle, SearchX, ArrowRight, Aperture } from 'lucide-react';
import ClientPortal from '../components/public/ClientPortal';

interface PublicSiteViewProps {
    config: StudioConfig | null;
    packages: Package[];
    users: User[];
    bookings: Booking[];
    portalBooking?: Booking | null; // Optional: If present, render Client Portal
    isLoading: boolean;
    error: string | null;
    onBooking: (data: PublicBookingSubmission) => void;
}

const PublicSiteView: React.FC<PublicSiteViewProps> = ({ config, packages, users, bookings, portalBooking, isLoading, error, onBooking }) => {
    
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin text-lumina-accent mb-4" />
                <p className="text-sm font-mono text-lumina-muted">Loading Studio...</p>
            </div>
        );
    }

    if (error || !config) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000000_100%)] z-0"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 z-0 pointer-events-none"></div>

                <div className="relative z-10 w-full max-w-lg text-center">
                    <div className="w-20 h-20 bg-lumina-surface border border-lumina-highlight rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-lumina-accent/10">
                        <Aperture className="w-10 h-10 text-lumina-muted" />
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-display font-bold mb-4 tracking-tight text-white">Studio Not Found</h1>
                    
                    <p className="text-lumina-muted text-lg leading-relaxed mb-8">
                        The web address you entered doesn't point to an active studio site yet. 
                        It might be a typo, or the studio hasn't launched.
                    </p>

                    <div className="bg-lumina-surface/50 border border-lumina-highlight rounded-xl p-4 mb-8 backdrop-blur-sm inline-block w-full">
                        <p className="text-xs text-lumina-muted uppercase tracking-widest font-bold mb-2">Technical Details</p>
                        <div className="flex items-center justify-center gap-2 text-rose-400 font-mono text-xs">
                            <AlertCircle size={14} />
                            <span>ERR_SITE_NOT_FOUND: {error || "UNKNOWN_DOMAIN"}</span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <a 
                            href="https://luminaphotocrm.com" 
                            className="bg-lumina-accent text-black px-6 py-3 rounded-lg font-bold hover:bg-white transition-colors flex items-center justify-center gap-2"
                        >
                            Visit Lumina Home <ArrowRight size={16}/>
                        </a>
                        <button 
                            onClick={() => window.history.back()}
                            className="px-6 py-3 rounded-lg font-bold text-lumina-muted hover:text-white transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
                
                <div className="absolute bottom-8 text-xs text-lumina-muted font-mono opacity-50">
                    Lumina Studio Systems • {new Date().getFullYear()}
                </div>
            </div>
        );
    }

    // --- CLIENT PORTAL RENDERER ---
    if (portalBooking) {
        return <ClientPortal booking={portalBooking} config={config} />;
    }

    // --- PUBLIC SITE RENDERER ---
    const site = config.site;
    const commonProps = {
        site,
        packages,
        users,
        config,
        bookings,
        onBooking,
        onNavigate: (pageId: string) => {
            const el = document.getElementById(pageId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Helper to decide which theme to render
    const renderTheme = () => {
        switch(site.theme) {
            case 'ETHEREAL': return <EtherealTheme {...commonProps} />;
            case 'VOGUE': return <VogueTheme {...commonProps} />;
            case 'MINIMAL': return <MinimalTheme {...commonProps} />;
            case 'CINEMA': return <CinemaTheme {...commonProps} />;
            case 'RETRO': return <RetroTheme {...commonProps} />;
            case 'ATELIER': return <AtelierTheme {...commonProps} />;
            case 'HORIZON': return <HorizonTheme {...commonProps} />;
            case 'BOLD': return <BoldTheme {...commonProps} />;
            case 'IMPACT': return <ImpactTheme {...commonProps} />;
            case 'CLEANSLATE': return <CleanSlateTheme {...commonProps} />;
            case 'AUTHORITY': return <AuthorityTheme {...commonProps} />;
            default: return <NoirTheme {...commonProps} />;
        }
    };

    return (
        <div className="w-full min-h-screen">
            {renderTheme()}
            {/* Lumina Badge */}
            <div className="fixed bottom-4 right-4 z-[100] opacity-0 hover:opacity-100 transition-opacity duration-300">
                <a href="https://luminaphotocrm.com" target="_blank" className="flex items-center gap-2 bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 hover:bg-black hover:border-lumina-accent transition-colors">
                    <div className="w-2 h-2 bg-lumina-accent rounded-full"></div>
                    Powered by Lumina
                </a>
            </div>
        </div>
    );
};

export default PublicSiteView;
