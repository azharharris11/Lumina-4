
import React from 'react';
import { motion } from 'framer-motion';
import { SiteConfig, Package, User, StudioConfig, PublicBookingSubmission, SitePage, SiteSection } from '../../../types';
import BookingWidget from '../BookingWidget';

// Blocks
import HeroBlock from '../blocks/HeroBlock';
import FeaturesBlock from '../blocks/FeaturesBlock';
import ServicesBlock from '../blocks/ServicesBlock';
import ContactBlock from '../blocks/ContactBlock';
import TeamBlock from '../blocks/TeamBlock';
import VideoBlock from '../blocks/VideoBlock';
import RichTextBlock from '../blocks/RichTextBlock';
import GalleryBlock from '../blocks/GalleryBlock';

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

const VogueTheme: React.FC<ThemeProps> = ({ site, activePage, packages, users, config, onBooking, onNavigate }) => {
    const data = activePage || site;
    const sections = (data as SitePage).sections || [];

    const scrollToBooking = () => {
        const widget = document.getElementById('booking-widget');
        if(widget) widget.scrollIntoView({ behavior: 'smooth' });
    };

    const renderHero = (headline: string, desc: string, img: string) => (
        <HeroBlock 
            headline={headline}
            description={desc}
            image={img}
            layout="LEFT"
            onButtonClick={scrollToBooking}
            buttonText="BOOK NOW"
            className="border-b-4 border-black !px-0 !py-0 !max-w-none"
            titleClassName="text-5xl md:text-8xl font-black uppercase leading-none break-words hyphens-auto"
            descClassName="font-bold text-sm md:text-xl border-l-4 border-black pl-4"
            buttonClassName="absolute bottom-4 right-4 bg-white border-4 border-black p-2 md:p-4 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-xs md:text-base z-10 hover:scale-110"
        />
    );

    const renderSections = () => sections.map((section: SiteSection) => {
        switch(section.type) {
            case 'HERO': return (
                <div key={section.id} className="grid grid-cols-1 md:grid-cols-2 border-b-4 border-black">
                    <div className="p-6 md:p-12 flex flex-col justify-center border-b-4 md:border-b-0 md:border-r-4 border-black bg-[#ffff00]">
                        <Motion.h1 initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-5xl md:text-8xl font-black uppercase leading-none mb-6">{section.content.headline}</Motion.h1>
                        <p className="font-bold text-sm md:text-xl border-l-4 border-black pl-4">{section.content.description}</p>
                    </div>
                    <div className="aspect-square relative">
                        <img src={section.content.image} className="w-full h-full object-cover grayscale contrast-125" />
                        <div onClick={scrollToBooking} className="absolute bottom-4 right-4 bg-white border-4 border-black p-4 font-bold shadow-[8px_8px_0_0_black] cursor-pointer">BOOK NOW</div>
                    </div>
                </div>
            );
            case 'TEXT_IMAGE': return (
                <FeaturesBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    image={section.content.image}
                    imagePosition={section.content.layout === 'RIGHT' ? 'RIGHT' : 'LEFT'}
                    className="!max-w-none !py-0 border-b-4 border-black !gap-0"
                    titleClassName="text-4xl font-black uppercase leading-none"
                    descClassName="font-bold text-lg border-l-4 border-[#ff3333] pl-4"
                />
            );
            case 'FEATURES': return (
                <ServicesBlock 
                    key={section.id}
                    headline={section.content.headline}
                    items={section.content.items || []}
                    className="border-b-4 border-black bg-[#ff3333]"
                    titleClassName="text-4xl font-black uppercase text-white"
                    itemClassName="border-4 border-black shadow-[4px_4px_0_0_black] font-bold"
                />
            );
            case 'CONTACT_FORM': return (
                <ContactBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    className="border-b-4 border-black bg-white"
                    titleClassName="text-6xl font-black uppercase leading-none"
                    inputClassName="border-4 border-black shadow-[4px_4px_0_0_black] font-bold placeholder-gray-500"
                    buttonClassName="border-4 border-black shadow-[4px_4px_0_0_black] bg-[#ffff00] text-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
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
                        className="border-b-4 border-black bg-[#ffff00]"
                        titleClassName="text-6xl font-black uppercase leading-none"
                        cardClassName="border-4 border-black bg-white p-4 shadow-[8px_8px_0_0_black]"
                    />
                );
            case 'VIDEO_EMBED': return (
                <VideoBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    videoUrl={section.content.videoUrl || ''}
                    className="border-b-4 border-black bg-white"
                    titleClassName="text-6xl font-black uppercase leading-none"
                />
            );
            case 'RICH_TEXT': return (
                <RichTextBlock 
                    key={section.id}
                    html={section.content.html || ''}
                    className="border-b-4 border-black bg-white prose-headings:font-black prose-headings:uppercase prose-p:font-bold prose-img:border-4 prose-img:border-black prose-img:shadow-[8px_8px_0_0_black]"
                />
            );
            case 'GALLERY': return (
                <GalleryBlock 
                   key={section.id}
                   headline={section.content.headline}
                   images={site.gallery}
                   className="border-b-4 border-black"
                   titleClassName="text-4xl font-black uppercase leading-none"
               />
            );
            default: return null;
        }
    });

    return (
        <div className="bg-[var(--site-bg)] text-[var(--site-text)] font-sans min-h-full border-[4px] md:border-[12px] border-[var(--site-primary)] overflow-x-hidden w-full transition-colors duration-300">
            <nav className="p-4 border-b-4 border-[var(--site-text)] flex justify-between items-center font-bold uppercase tracking-tighter text-sm md:text-xl sticky top-0 bg-[var(--site-bg)] z-50">
                <span className="truncate max-w-[150px] cursor-pointer" onClick={() => onNavigate && onNavigate('HOME')}>{site.title}</span>
                <div className="flex gap-4">
                    <span onClick={() => onNavigate && onNavigate('HOME')} className="cursor-pointer hover:bg-[var(--site-secondary)] px-1">Home</span>
                    {site.pages?.map(p => (
                        <span key={p.id} onClick={() => onNavigate && onNavigate(p.id)} className="cursor-pointer hover:bg-[var(--site-secondary)] px-1">{p.title}</span>
                    ))}
                </div>
            </nav>

            {sections.length > 0 ? renderSections() : renderHero(data.headline, data.description, data.heroImage)}

            {data.showBookingWidget && (
                <div className="p-6 md:p-12 border-t-4 border-black bg-white" id="booking-widget">
                    <h2 className="text-3xl md:text-6xl font-black uppercase text-center mb-8">MAKE IT HAPPEN</h2>
                    <BookingWidget packages={packages} theme="VOGUE" onSubmit={onBooking} />
                </div>
            )}
        </div>
    )
}

export default VogueTheme;
