
import React from 'react';
import { motion } from 'framer-motion';
import { SiteConfig, Package, User, SiteGalleryItem, SiteTestimonial, SiteFAQ, StudioConfig, PublicBookingSubmission, SitePage, SiteSection } from '../../../types';
import ScrollReveal from '../ScrollReveal';
import BeforeAfterSlider from '../BeforeAfterSlider';
import BookingWidget from '../BookingWidget';

// Blocks
import ContactBlock from '../blocks/ContactBlock';
import TeamBlock from '../blocks/TeamBlock';
import VideoBlock from '../blocks/VideoBlock';
import RichTextBlock from '../blocks/RichTextBlock';
import HeroBlock from '../blocks/HeroBlock';
import FeaturesBlock from '../blocks/FeaturesBlock';
import ServicesBlock from '../blocks/ServicesBlock';
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

const EtherealTheme: React.FC<ThemeProps> = ({ site, activePage, packages, users, config, onBooking, onNavigate }) => {
    // Prioritize activePage, fallback to site (Global)
    const data = activePage || site;
    const sections = (data as SitePage).sections || [];

    const scrollToBooking = () => {
        const w = document.getElementById('booking-widget');
        if(w) w.scrollIntoView({behavior:'smooth'});
    };

    const renderHero = (headline: string, desc: string, img: string) => (
         <header className="px-4 md:px-8 py-8 md:py-12 text-center max-w-3xl mx-auto">
                <Motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="text-[10px] md:text-xs uppercase tracking-[0.3em] mb-4 md:mb-6 text-[#8a8a8a]"
                >
                    Est. 2023
                </Motion.p>
                <Motion.h1 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-4xl md:text-7xl italic font-light mb-6 md:mb-8 leading-tight break-words hyphens-auto font-serif"
                >
                    {headline}
                </Motion.h1>
                <Motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 1 }}
                    className="w-full h-[250px] md:h-[500px] overflow-hidden rounded-t-[3rem] md:rounded-t-full mx-auto mt-8 md:mt-12 shadow-xl"
                >
                    <img src={img} className="w-full h-full object-cover hover:scale-105 transition-transform duration-[2s]" />
                </Motion.div>
            </header>
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
                    className="py-12 md:py-24"
                    titleClassName="font-serif italic font-light text-4xl"
                    descClassName="font-serif leading-loose text-[#8a8a8a]"
                />
            );
            case 'GALLERY': return (
                 <GalleryBlock 
                    key={section.id}
                    headline={section.content.headline}
                    images={site.gallery}
                    titleClassName="font-serif italic font-light text-3xl mb-8"
                />
            );
            case 'CONTACT_FORM': return (
                <ContactBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    className="bg-[#fcfaf7] border-t border-[#eaeaea]"
                    titleClassName="font-serif italic font-light text-4xl text-[#4a4a4a]"
                    descClassName="font-serif text-[#8a8a8a]"
                    inputClassName="border-b border-[#eaeaea] placeholder-[#8a8a8a] text-[#4a4a4a] font-serif"
                    buttonClassName="bg-[#4a4a4a] text-[#fcfaf7] font-serif tracking-widest text-[10px]"
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
                        className="bg-white"
                        titleClassName="font-serif italic font-light text-4xl text-[#4a4a4a]"
                        descClassName="font-serif text-[#8a8a8a]"
                        cardClassName="font-serif"
                    />
                );
            case 'VIDEO_EMBED': return (
                <VideoBlock 
                    key={section.id}
                    headline={section.content.headline}
                    description={section.content.description}
                    videoUrl={section.content.videoUrl || ''}
                    className="py-12 md:py-24"
                    titleClassName="font-serif italic font-light text-4xl text-[#4a4a4a]"
                    descClassName="font-serif text-[#8a8a8a]"
                />
            );
            case 'RICH_TEXT': return (
                <RichTextBlock 
                    key={section.id}
                    html={section.content.html || ''}
                    className="prose-headings:font-serif prose-headings:font-light prose-headings:italic prose-p:font-serif prose-p:text-[#8a8a8a]"
                />
            );
            default: return null;
        }
    });

    return (
        <div className="bg-[var(--site-bg)] text-[var(--site-text)] font-serif min-h-full overflow-x-hidden w-full transition-colors duration-300">
            <nav className="p-4 md:p-8 sticky top-0 bg-[var(--site-bg)]/90 backdrop-blur-sm z-50 transition-all border-b border-[var(--site-text)]/10 md:border-none flex flex-col md:flex-row justify-between items-center">
                <span 
                    onClick={() => onNavigate && onNavigate('HOME')}
                    className="font-serif text-base md:text-2xl tracking-widest uppercase border-b border-[var(--site-text)] pb-1 md:pb-2 inline-block cursor-pointer"
                >
                    {site.title}
                </span>
                <div className="hidden md:flex gap-8 text-[10px] uppercase tracking-widest opacity-60 mt-4 md:mt-0">
                    <button onClick={() => onNavigate && onNavigate('HOME')} className="hover:opacity-100 transition-colors">Home</button>
                    {site.pages?.map(page => (
                        <button 
                            key={page.id} 
                            onClick={() => onNavigate && onNavigate(page.id)}
                            className="hover:opacity-100 transition-colors"
                        >
                            {page.title}
                        </button>
                    ))}
                </div>
            </nav>

            {sections.length > 0 ? renderSections() : (
                 <>
                    {renderHero(data.headline, data.description, data.heroImage)}
                    
                    {site.beforeAfter?.enabled && site.beforeAfter.beforeImage && (
                        <div className="py-8 md:py-20 bg-white">
                            <BeforeAfterSlider 
                                before={site.beforeAfter.beforeImage} 
                                after={site.beforeAfter.afterImage} 
                                label={site.beforeAfter.label} 
                            />
                        </div>
                    )}

                    {data.showPortfolio && (
                        <div className="px-4 md:px-8 py-12 md:py-20">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {(data.gallery || []).map((img: SiteGalleryItem, i: number) => (
                                    <ScrollReveal key={img.id} delay={i * 0.1}>
                                        <div className="space-y-3 md:space-y-4">
                                            <div className="aspect-[2/3] overflow-hidden rounded-sm">
                                                <img src={img.url} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                                            </div>
                                            <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#8a8a8a] text-center">{img.caption}</p>
                                        </div>
                                    </ScrollReveal>
                                ))}
                            </div>
                        </div>
                    )}
                 </>
            )}

            {data.showPricing && (
                <div className="bg-white py-16 md:py-24 px-4 md:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl md:text-4xl font-light text-center mb-12 md:mb-16 italic">Investment</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                            {packages.filter((p: any) => p.active).map((pkg: any) => (
                                <div key={pkg.id} className="text-center space-y-4 group cursor-pointer">
                                    <h3 className="text-lg md:text-xl uppercase tracking-widest">{pkg.name}</h3>
                                    <div className="w-8 h-px bg-black mx-auto group-hover:w-16 transition-all duration-500"></div>
                                    <p className="text-[#8a8a8a] text-sm leading-loose min-h-[80px]">
                                        {pkg.features.slice(0, 3).join(' • ')}
                                    </p>
                                    <p className="text-lg font-medium">Rp {(pkg.price/1000000).toFixed(1)}M</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {data.showBookingWidget && (
                <div className="py-16 md:py-24 bg-[#fcfaf7] border-t border-[#eaeaea]" id="booking-widget">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-light italic mb-4">Begin Your Story</h2>
                        <p className="text-xs uppercase tracking-widest text-[#8a8a8a]">Select a date below</p>
                    </div>
                    <BookingWidget packages={packages} theme="ETHEREAL" onSubmit={onBooking} />
                </div>
            )}

            <footer className="py-12 md:py-16 text-center text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
                <p className="mb-4">{config.address} • {config.phone}</p>
                <p>&copy; {new Date().getFullYear()} {site.title}</p>
            </footer>
        </div>
    )
}

export default EtherealTheme;
