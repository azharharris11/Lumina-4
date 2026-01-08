
import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SiteConfig, Package, User, SiteSection, StudioConfig, PublicBookingSubmission, SitePage } from '../../../types';
import BookingWidget from '../BookingWidget';
import Lightbox from '../Lightbox';
import { Play } from 'lucide-react';

// Blocks
import HeroBlock from '../blocks/HeroBlock';
import GalleryBlock from '../blocks/GalleryBlock';
import FeaturesBlock from '../blocks/FeaturesBlock';
import PricingBlock from '../blocks/PricingBlock';
import CtaBlock from '../blocks/CtaBlock';
import LocationBlock from '../blocks/LocationBlock';
import ContactBlock from '../blocks/ContactBlock';
import TeamBlock from '../blocks/TeamBlock';
import VideoBlock from '../blocks/VideoBlock';
import RichTextBlock from '../blocks/RichTextBlock';

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
    const navBackground = useTransform(scrollY, [0, 100], ['rgba(0,0,0,0)', 'var(--site-bg)']);
    const navBackdrop = useTransform(scrollY, [0, 100], ['blur(0px)', 'blur(12px)']);
    
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    const data = activePage || site; 
    const sections = (data as SitePage).sections || [];

    const scrollToBooking = () => {
        const w = document.getElementById('booking-widget');
        if(w) w.scrollIntoView({behavior:'smooth'});
    };

    const renderHero = (headline: string, desc: string, img: string, sub?: string, videoUrl?: string) => (
        <HeroBlock 
            layout="FULL"
            headline={headline}
            description={desc}
            subheadline={sub}
            image={img}
            videoUrl={videoUrl}
            onButtonClick={scrollToBooking}
            titleClassName="text-[clamp(3rem,8vw,8rem)] font-heading font-bold leading-[0.9] tracking-tighter text-[var(--site-text)]"
            titleStyle={{ fontFamily: 'var(--site-font-heading)' }}
            descClassName="text-[var(--site-text)] opacity-80 text-lg md:text-2xl font-light leading-relaxed"
            descStyle={{ fontFamily: 'var(--site-font-body)' }}
            buttonClassName="group flex items-center gap-4 text-[var(--site-text)] text-sm font-bold uppercase tracking-widest hover:opacity-70"
            buttonText={
                <>
                    <span className="w-12 h-12 rounded-full border border-[var(--site-text)]/30 flex items-center justify-center group-hover:bg-[var(--site-text)] group-hover:text-[var(--site-bg)] transition-all">
                        <Play size={14} fill="currentColor" />
                    </span>
                    Start Project
                </>
            }
            overlay={<div className="absolute inset-0 bg-gradient-to-t from-[var(--site-bg)] via-[var(--site-bg)]/40 to-transparent"></div>}
        />
    );

    const renderSections = () => sections.map((section: SiteSection) => {
        switch(section.type) {
            case 'HERO': return <div key={section.id}>{renderHero(section.content.headline || '', section.content.description || '', section.content.image || '', section.content.subheadline, section.content.videoUrl)}</div>;
            case 'GALLERY': return (
                <GalleryBlock 
                    key={section.id}
                    headline="Selected Works"
                    images={site.gallery}
                    onImageClick={setLightboxSrc}
                    titleClassName="text-[clamp(2rem,4vw,4rem)] font-heading font-bold text-[var(--site-text)]"
                    titleStyle={{ fontFamily: 'var(--site-font-heading)' }}
                />
            );
            case 'MAP_LOCATION': return (
                <LocationBlock 
                    key={section.id}
                    name={config.name}
                    address={config.address}
                />
            );
            case 'TEXT_IMAGE': return (
                <FeaturesBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    image={section.content.image}
                    imagePosition={section.content.layout === 'RIGHT' ? 'RIGHT' : 'LEFT'}
                    className="border-t border-[var(--site-text)]/10"
                    titleClassName="text-[clamp(2.5rem,5vw,5rem)] font-heading font-bold leading-none text-[var(--site-text)]"
                    titleStyle={{ fontFamily: 'var(--site-font-heading)' }}
                    descClassName="text-[var(--site-text)] opacity-70 text-lg"
                    descStyle={{ fontFamily: 'var(--site-font-body)' }}
                />
            );
            case 'PRICING': return (
                <PricingBlock 
                    key={section.id}
                    headline={section.content.headline}
                    packages={packages}
                    className="bg-[var(--site-bg)]"
                    titleClassName="font-heading font-bold text-[var(--site-text)] text-4xl"
                    titleStyle={{ fontFamily: 'var(--site-font-heading)' }}
                    itemClassName="bg-[var(--site-bg)] p-8 md:p-12 hover:bg-[var(--site-text)]/5 transition-colors border-none"
                />
            );
            case 'CTA_BANNER': return (
                <CtaBlock 
                    key={section.id}
                    headline={section.content.headline || ''}
                    buttonText={section.content.buttonText}
                    onButtonClick={scrollToBooking}
                    className="border-t border-[var(--site-text)]/10"
                    titleClassName="text-[clamp(3rem,6vw,6rem)] font-heading font-bold text-[var(--site-text)]"
                    titleStyle={{ fontFamily: 'var(--site-font-heading)' }}
                    buttonClassName="bg-[var(--site-text)] text-[var(--site-bg)] hover:opacity-80 md:text-base"
                />
            );
            case 'CONTACT_FORM': return (
                <ContactBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    className="border-t border-[var(--site-text)]/10"
                    titleClassName="text-[clamp(2.5rem,5vw,5rem)] font-heading font-bold text-[var(--site-text)]"
                    titleStyle={{ fontFamily: 'var(--site-font-heading)' }}
                    descClassName="text-[var(--site-text)]"
                    descStyle={{ fontFamily: 'var(--site-font-body)' }}
                    inputClassName="text-[var(--site-text)] border-[var(--site-text)] placeholder-[var(--site-text)]/50"
                    buttonClassName="bg-[var(--site-text)] text-[var(--site-bg)]"
                />
            );
            case 'TEAM_GRID': 
                const members = (section.content.items && section.content.items.length > 0) 
                    ? section.content.items.map((item, idx) => ({ id: `manual-${idx}`, name: item.title, role: item.text, image: item.image || '' }))
                    : users.filter(u => u.status === 'ACTIVE').map(u => ({ id: u.id, name: u.name, role: u.role, image: u.avatar }));
                
                return (
                    <TeamBlock 
                        key={section.id}
                        headline={section.content.headline}
                        description={section.content.description}
                        members={members}
                        className="bg-[var(--site-bg)]"
                        titleClassName="text-[clamp(2.5rem,5vw,5rem)] font-heading font-bold text-[var(--site-text)]"
                        titleStyle={{ fontFamily: 'var(--site-font-heading)' }}
                        descClassName="text-[var(--site-text)]"
                        descStyle={{ fontFamily: 'var(--site-font-body)' }}
                    />
                );
            case 'VIDEO_EMBED': return (
                <VideoBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    videoUrl={section.content.videoUrl || ''}
                    className="border-t border-[var(--site-text)]/10"
                    titleClassName="text-[clamp(2.5rem,5vw,5rem)] font-heading font-bold text-[var(--site-text)]"
                    titleStyle={{ fontFamily: 'var(--site-font-heading)' }}
                    descClassName="text-[var(--site-text)]"
                    descStyle={{ fontFamily: 'var(--site-font-body)' }}
                />
            );
            case 'RICH_TEXT': return (
                <RichTextBlock 
                    key={section.id}
                    html={section.content.html || ''}
                    className="prose-headings:font-heading prose-headings:text-[var(--site-text)] prose-p:text-[var(--site-text)] prose-a:text-[var(--site-text)] prose-strong:text-[var(--site-text)]"
                    style={{ fontFamily: 'var(--site-font-body)' }}
                />
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
