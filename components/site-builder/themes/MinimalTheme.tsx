
import React from 'react';
import { motion } from 'framer-motion';
import { SiteConfig, Package, User, SiteGalleryItem, SiteTestimonial, SiteFAQ, StudioConfig, PublicBookingSubmission, SitePage, SiteSection } from '../../../types';
import BookingWidget from '../BookingWidget';
import HeroBlock from '../blocks/HeroBlock';
import FeaturesBlock from '../blocks/FeaturesBlock';
import PricingBlock from '../blocks/PricingBlock';
import ContactBlock from '../blocks/ContactBlock';
import TeamBlock from '../blocks/TeamBlock';
import VideoBlock from '../blocks/VideoBlock';
import RichTextBlock from '../blocks/RichTextBlock';
import ServicesBlock from '../blocks/ServicesBlock';

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

const MinimalTheme: React.FC<ThemeProps> = ({ site, activePage, packages, users, config, onBooking, onNavigate }) => {
    const data = activePage || site;
    const sections = (data as SitePage).sections || [];

    const scrollToBooking = () => {
        const w = document.getElementById('booking-widget');
        if(w) w.scrollIntoView({behavior:'smooth'});
    };

    const renderHero = (headline: string, desc: string, img: string) => (
        <HeroBlock 
            headline={headline}
            description={desc}
            image={img}
            layout="LEFT"
            onButtonClick={scrollToBooking}
            buttonClassName="border-black text-black"
        />
    );

    const renderSections = () => sections.map((section: SiteSection) => {
        switch(section.type) {
            case 'HERO': return <div key={section.id}>{renderHero(section.content.headline || '', section.content.description || '', section.content.image || '')}</div>;
            case 'TEXT_IMAGE': return (
                <FeaturesBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    image={section.content.image}
                    imagePosition={section.content.layout === 'RIGHT' ? 'RIGHT' : 'LEFT'}
                />
            );
            case 'PRICING': return (
                <PricingBlock 
                    key={section.id}
                    headline={section.content.headline}
                    packages={packages}
                />
            );
            case 'CONTACT_FORM': return (
                <ContactBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    titleClassName="font-medium tracking-tight text-3xl"
                    buttonClassName="border-b border-black text-black bg-transparent hover:opacity-50 !p-0 !pb-1 !rounded-none uppercase text-xs"
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
                        titleClassName="font-medium tracking-tight text-3xl"
                    />
                );
            case 'VIDEO_EMBED': return (
                <VideoBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    videoUrl={section.content.videoUrl || ''}
                    titleClassName="font-medium tracking-tight text-3xl"
                />
            );
            case 'RICH_TEXT': return (
                <RichTextBlock 
                    key={section.id}
                    html={section.content.html || ''}
                    className="prose-headings:font-medium prose-headings:tracking-tight"
                />
            );
            case 'FEATURES': return (
                 <ServicesBlock 
                    key={section.id}
                    headline={section.content.headline}
                    items={section.content.items || []}
                    titleClassName="font-medium tracking-tight text-3xl"
                />
            );
            default: return null;
        }
    });

    return (
        <div className="bg-[var(--site-bg)] text-[var(--site-text)] font-sans min-h-full tracking-tight overflow-x-hidden transition-colors duration-300">
            <nav className="px-4 md:px-6 py-6 flex justify-between items-start sticky top-0 bg-[var(--site-bg)]/90 backdrop-blur-sm z-50 border-b border-[var(--site-text)]/5">
                <span className="font-bold text-sm tracking-tighter truncate max-w-[150px] cursor-pointer" onClick={() => onNavigate && onNavigate('HOME')}>{site.title}</span>
                <div className="hidden md:flex gap-6 text-xs font-medium opacity-50">
                    <span onClick={() => onNavigate && onNavigate('HOME')} className="cursor-pointer hover:opacity-100 transition-opacity">Home</span>
                    {site.pages?.map(p => (
                        <span key={p.id} onClick={() => onNavigate && onNavigate(p.id)} className="cursor-pointer hover:opacity-100 transition-opacity">{p.title}</span>
                    ))}
                </div>
            </nav>

            {sections.length > 0 ? renderSections() : (
                <>
                    {renderHero(data.headline, data.description, data.heroImage)}
                    {data.showPortfolio && (
                        <div className="px-4 md:px-6 py-12 md:py-20">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-8 md:gap-y-12">
                                {site.gallery.map((img: SiteGalleryItem) => (
                                    <div key={img.id} className="space-y-2">
                                        <div className="aspect-[3/4] overflow-hidden bg-gray-50">
                                            <img src={img.url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                                        </div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{img.caption}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {data.showBookingWidget && (
                <div className="py-20 px-4 bg-white border-t border-gray-100" id="booking-widget">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-medium mb-2">Reservation</h2>
                    </div>
                    <BookingWidget packages={packages} theme="MINIMAL" onSubmit={onBooking} />
                </div>
            )}

            <footer className="px-4 md:px-6 py-8 md:py-12 flex justify-between items-end border-t border-gray-100">
                <div><p className="text-sm font-bold mb-1">{site.title}</p><p className="text-xs text-gray-400">All rights reserved.</p></div>
            </footer>
        </div>
    )
}

export default MinimalTheme;
