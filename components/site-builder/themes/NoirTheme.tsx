
import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SiteConfig, Package, User, SiteSection, StudioConfig, PublicBookingSubmission, SitePage } from '../../../types';
import ScrollReveal from '../ScrollReveal';
import BeforeAfterSlider from '../BeforeAfterSlider';
import BookingWidget from '../BookingWidget';
import MasonryGallery from '../MasonryGallery';
import Lightbox from '../Lightbox';
import { Play } from 'lucide-react';

const Motion = motion as any;

interface ThemeProps {
    site: SiteConfig;
    activePage?: SiteConfig | SitePage;
    packages: Package[];
    users: User[];
    config: StudioConfig;
    onBooking?: (data: PublicBookingSubmission) => void;
    onNavigate?: (pageId: string) => void;
}

const NoirTheme: React.FC<ThemeProps> = ({ site, activePage, packages, users, config, onBooking, onNavigate }) => {
    const { scrollY } = useScroll();
    // Using CSS variables for colors, set via parent context/CSS injection
    const navBackground = useTransform(scrollY, [0, 100], ['rgba(0,0,0,0)', 'var(--site-bg)']); // Fallback to black if var not set handled in CSS
    const navBackdrop = useTransform(scrollY, [0, 100], ['blur(0px)', 'blur(12px)']);
    
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    const data = activePage || site; 
    const sections = (data as SitePage).sections || [];

    // --- RENDERERS ---

    const renderHero = (headline: string, desc: string, img: string, sub?: string, videoUrl?: string) => (
        <header className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                {videoUrl ? (
                    <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-50">
                        <source src={videoUrl} type="video/mp4" />
                    </video>
                ) : (
                    <Motion.img 
                        initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 2 }}
                        src={img} className="w-full h-full object-cover opacity-60" 
                    />
                )}
                {/* Gradient uses CSS var for background color to blend properly */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--site-bg)] via-[var(--site-bg)]/40 to-transparent"></div>
            </div>
            
            <div className="relative z-10 px-6 md:px-12 max-w-7xl mx-auto w-full pt-20">
                <div className="max-w-4xl">
                    {sub && (
                        <Motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-4 mb-6">
                            <div className="h-[1px] w-12 bg-[var(--site-text)] opacity-50"></div>
                            <p className="text-xs md:text-sm font-bold uppercase tracking-[0.3em] text-[var(--site-text)] opacity-70">{sub}</p>
                        </Motion.div>
                    )}
                    <Motion.h1 
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-[clamp(3rem,8vw,8rem)] font-heading font-bold leading-[0.9] tracking-tighter text-[var(--site-text)] mb-8"
                        style={{ fontFamily: 'var(--site-font-heading)' }}
                    >
                        {headline}
                    </Motion.h1>
                    <Motion.p 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        className="text-[var(--site-text)] opacity-80 text-lg md:text-2xl font-light max-w-xl leading-relaxed mb-10"
                        style={{ fontFamily: 'var(--site-font-body)' }}
                    >
                        {desc}
                    </Motion.p>
                    <Motion.button 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                        onClick={() => { const w = document.getElementById('booking-widget'); if(w) w.scrollIntoView({behavior:'smooth'}); }}
                        className="group flex items-center gap-4 text-[var(--site-text)] text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                        <span className="w-12 h-12 rounded-full border border-[var(--site-text)]/30 flex items-center justify-center group-hover:bg-[var(--site-text)] group-hover:text-[var(--site-bg)] transition-all">
                            <Play size={14} fill="currentColor" />
                        </span>
                        Start Project
                    </Motion.button>
                </div>
            </div>
        </header>
    );

    const renderSections = () => sections.map((section: SiteSection) => {
        switch(section.type) {
            case 'HERO': return <div key={section.id}>{renderHero(section.content.headline || '', section.content.description || '', section.content.image || '', section.content.subheadline, section.content.videoUrl)}</div>;
            case 'GALLERY': return (
                <section key={section.id} className="py-24 px-6 md:px-12 bg-[var(--site-bg)]">
                    <h2 className="text-[clamp(2rem,4vw,4rem)] font-heading font-bold mb-12 text-center text-[var(--site-text)]" style={{ fontFamily: 'var(--site-font-heading)' }}>Selected Works</h2>
                    <MasonryGallery images={site.gallery} onImageClick={setLightboxSrc} columns={3} />
                </section>
            );
            case 'MAP_LOCATION': return (
                <section key={section.id} className="h-[500px] w-full relative grayscale invert filter contrast-125">
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"></div>
                        <div className="bg-black text-white p-6 rounded-xl border border-white/10 relative z-10 text-center filter invert-0 grayscale-0">
                            <div className="text-3xl mb-2">📍</div>
                            <h3 className="font-bold text-xl mb-1">{config.name}</h3>
                            <p className="text-gray-400 text-sm">{config.address}</p>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`} target="_blank" className="mt-4 inline-block text-xs font-bold uppercase border-b border-white pb-1">Open in Maps</a>
                        </div>
                    </div>
                </section>
            );
            case 'TEXT_IMAGE': return (
                <section key={section.id} className="py-24 px-6 md:px-12 border-t border-[var(--site-text)]/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className={section.content.layout === 'RIGHT' ? 'order-1' : 'order-2'}>
                            <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-heading font-bold leading-none mb-8 text-[var(--site-text)]" style={{ fontFamily: 'var(--site-font-heading)' }}>{section.content.headline}</h2>
                            <p className="text-[var(--site-text)] opacity-70 text-lg leading-relaxed" style={{ fontFamily: 'var(--site-font-body)' }}>{section.content.description}</p>
                        </div>
                        <div className={`${section.content.layout === 'RIGHT' ? 'order-2' : 'order-1'} aspect-[4/5]`}>
                            <ScrollReveal><img src={section.content.image} className="w-full h-full object-cover" /></ScrollReveal>
                        </div>
                    </div>
                </section>
            );
            case 'PRICING': return (
                <section key={section.id} className="py-24 px-6 md:px-12 bg-[var(--site-bg)]">
                    <h2 className="text-center text-4xl font-heading font-bold mb-16 text-[var(--site-text)]" style={{ fontFamily: 'var(--site-font-heading)' }}>{section.content.headline}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--site-text)]/10 border border-[var(--site-text)]/10">
                        {packages.filter(p=>p.active).map(p => (
                            <div key={p.id} className="bg-[var(--site-bg)] p-8 md:p-12 hover:bg-[var(--site-text)]/5 transition-colors group">
                                <h3 className="text-2xl font-bold mb-2 text-[var(--site-text)]">{p.name}</h3>
                                <p className="text-[var(--site-text)] opacity-50 mb-8 h-12 text-sm">{p.features.slice(0,2).join(', ')}</p>
                                <p className="text-3xl font-mono text-[var(--site-text)] mb-8">Rp {(p.price/1000000).toFixed(1)}</p>
                                <button onClick={() => { const w = document.getElementById('booking-widget'); if(w) w.scrollIntoView({behavior:'smooth'}); }} className="w-full py-4 border border-[var(--site-text)]/20 text-xs font-bold uppercase tracking-widest text-[var(--site-text)] hover:bg-[var(--site-text)] hover:text-[var(--site-bg)] transition-all">Select</button>
                            </div>
                        ))}
                    </div>
                </section>
            );
            case 'CTA_BANNER': return (
                <section key={section.id} className="py-32 px-6 text-center border-t border-[var(--site-text)]/10">
                    <h2 className="text-[clamp(3rem,6vw,6rem)] font-heading font-bold mb-8 text-[var(--site-text)]" style={{ fontFamily: 'var(--site-font-heading)' }}>{section.content.headline}</h2>
                    <button 
                        onClick={() => { const w = document.getElementById('booking-widget'); if(w) w.scrollIntoView({behavior:'smooth'}); }} 
                        className="px-12 py-5 bg-[var(--site-text)] text-[var(--site-bg)] font-bold uppercase tracking-widest hover:opacity-80 transition-colors text-sm md:text-base"
                    >
                        {section.content.buttonText}
                    </button>
                </section>
            );
            default: return null;
        }
    });

    return (
        <div className="bg-[var(--site-bg)] text-[var(--site-text)] font-sans min-h-full selection:bg-[var(--site-text)] selection:text-[var(--site-bg)] overflow-x-hidden w-full transition-colors duration-300">
            <Motion.nav style={{ backgroundColor: navBackground, backdropFilter: navBackdrop }} className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center transition-all border-b border-[var(--site-text)]/5">
                <span onClick={() => onNavigate && onNavigate('HOME')} className="font-heading font-bold text-xl tracking-tight cursor-pointer mix-blend-difference" style={{ fontFamily: 'var(--site-font-heading)' }}>{site.title}</span>
                <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest opacity-60">
                    <button onClick={() => onNavigate && onNavigate('HOME')} className="hover:opacity-100 transition-opacity">Home</button>
                    {site.pages?.filter(p => !p.hidden).map(p => <button key={p.id} onClick={() => onNavigate && onNavigate(p.id)} className="hover:opacity-100 transition-opacity">{p.title}</button>)}
                </div>
                <button onClick={() => { const w = document.getElementById('booking-widget'); if(w) w.scrollIntoView({behavior:'smooth'}); }} className="px-5 py-2 border border-[var(--site-text)]/30 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--site-text)] hover:text-[var(--site-bg)] transition-all">Book</button>
            </Motion.nav>

            {sections.length > 0 ? renderSections() : (
                renderHero(data.headline, data.description, data.heroImage)
            )}

            {data.showBookingWidget && (
                <div id="booking-widget" className="py-24 border-t border-[var(--site-text)]/10 bg-[var(--site-bg)]">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-heading font-bold mb-4 text-[var(--site-text)]" style={{ fontFamily: 'var(--site-font-heading)' }}>Start collaboration</h2>
                        <p className="text-[var(--site-text)] opacity-60">Tell us about your project.</p>
                    </div>
                    {/* Booking Widget internal styles need to adapt or rely on theme prop. For now, it stays neutral/styled within component */}
                    <BookingWidget packages={packages} theme="NOIR" onSubmit={onBooking} />
                </div>
            )}

            <footer className="py-12 px-6 border-t border-[var(--site-text)]/10 flex flex-col md:flex-row justify-between items-end gap-8 text-xs text-[var(--site-text)] opacity-50 uppercase tracking-wider">
                <div>
                    <p className="font-bold text-lg mb-2">{site.title}</p>
                    <p>{config.address}</p>
                </div>
                <div>
                    <div className="flex gap-4 mb-4">
                        {site.socialLinks?.map(link => (
                            <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">{link.platform}</a>
                        ))}
                    </div>
                    <p>{site.footerText || `© ${new Date().getFullYear()} ${site.title}.`}</p>
                </div>
            </footer>

            <Lightbox isOpen={!!lightboxSrc} imageSrc={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        </div>
    );
}

export default NoirTheme;
