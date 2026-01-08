
import React from 'react';
import { SiteConfig, Package, User, SiteGalleryItem, SiteTestimonial, SiteFAQ, StudioConfig, PublicBookingSubmission, SitePage, SiteSection } from '../../../types';
import BookingWidget from '../BookingWidget';
import ContactBlock from '../blocks/ContactBlock';
import TeamBlock from '../blocks/TeamBlock';
import VideoBlock from '../blocks/VideoBlock';
import RichTextBlock from '../blocks/RichTextBlock';
import ServicesBlock from '../blocks/ServicesBlock';

interface ThemeProps {
    site: SiteConfig;
    activePage?: SiteConfig | SitePage;
    packages: Package[];
    users: User[];
    config: StudioConfig;
    onBooking?: (data: PublicBookingSubmission) => void;
    onNavigate?: (pageId: string) => void;
}

const RetroTheme: React.FC<ThemeProps> = ({ site, activePage, packages, users, config, onBooking, onNavigate }) => {
    const data = activePage || site;
    const sections = (data as SitePage).sections || [];

    const renderHero = (headline: string, desc: string, img: string) => (
        <div className="mb-8">
            <div className="bg-white border-2 border-gray-600 border-r-white border-b-white p-1 block mb-4">
                <img src={img} className="w-full h-64 object-cover grayscale contrast-125 pixelated" style={{imageRendering: 'pixelated'}} />
                <p className="text-center text-xs mt-1 bg-blue-800 text-white py-1">System_Ready</p>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-4 tracking-tighter bg-yellow-300 inline-block px-2 break-words max-w-full">{headline}</h1>
            <p className="mb-8 text-xs md:text-sm max-w-xl">{desc}</p>
        </div>
    );

    const renderSections = () => sections.map((section: SiteSection) => {
        switch(section.type) {
            case 'HERO': return <div key={section.id}>{renderHero(section.content.headline || '', section.content.description || '', section.content.image || '')}</div>;
            case 'TEXT_IMAGE': return (
                <div key={section.id} className="mb-8 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black p-4 flex flex-col md:flex-row gap-4 items-center shadow-md">
                    {section.content.layout === 'LEFT' && <img src={section.content.image} className="w-32 h-32 border-2 border-gray-600" />}
                    <div className="flex-1">
                        <h3 className="font-bold mb-2 underline">{section.content.headline}</h3>
                        <p className="text-xs font-mono">{section.content.description}</p>
                    </div>
                    {section.content.layout === 'RIGHT' && <img src={section.content.image} className="w-32 h-32 border-2 border-gray-600" />}
                </div>
            );
            case 'FEATURES': return (
                <div key={section.id} className="mb-8 border-2 border-gray-600 border-r-white border-b-white p-4 bg-white">
                    <h3 className="font-bold mb-4 bg-blue-800 text-white px-2 inline-block">{section.content.headline}</h3>
                    <ul className="list-disc pl-5 text-xs space-y-2">
                        {(section.content.items || []).map((item, i) => (
                            <li key={i}><strong>{item.title}:</strong> {item.text}</li>
                        ))}
                    </ul>
                </div>
            );
            case 'PRICING': return (
                <div key={section.id} className="mb-8">
                    <h2 className="text-lg md:text-xl font-bold mb-4 border-b-2 border-black w-fit">:: PRICELIST.XLS ::</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-2 border-black">
                            <thead className="bg-[#c0c0c0] text-left"><tr><th className="p-2 border border-black">Pkg</th><th className="p-2 border border-black">$$$</th></tr></thead>
                            <tbody>
                                {packages.filter(p => p.active).map(p => <tr key={p.id}><td className="p-2 border border-black">{p.name}</td><td className="p-2 border border-black">Rp {p.price.toLocaleString()}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            case 'CONTACT_FORM': return (
                <div key={section.id} className="mb-8 border-2 border-gray-600 border-r-white border-b-white p-4 bg-[#c0c0c0]">
                    <div className="bg-blue-800 text-white px-2 py-1 text-xs font-bold mb-4">Message_Composer.exe</div>
                    <ContactBlock 
                        headline={section.content.headline}
                        description={section.content.description}
                        className="!p-0 !py-0"
                        titleClassName="font-bold text-lg mb-2"
                        inputClassName="bg-white border-2 border-gray-600 border-r-white border-b-white text-black font-mono text-xs"
                        buttonClassName="bg-[#c0c0c0] border-2 border-white border-r-black border-b-black text-black font-bold text-xs active:border-black active:border-r-white active:border-b-white"
                    />
                </div>
            );
            case 'TEAM_GRID': 
                const members = (section.content.items && section.content.items.length > 0) 
                    ? section.content.items.map((item, idx) => ({ id: `manual-${idx}`, name: item.title, role: item.text, image: item.image || '' }))
                    : users.filter(u => u.status === 'ACTIVE').map(u => ({ id: u.id, name: u.name, role: u.role, image: u.avatar }));
                
                return (
                    <div key={section.id} className="mb-8">
                        <h2 className="text-lg md:text-xl font-bold mb-4 border-b-2 border-black w-fit">:: TEAM_MEMBERS ::</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {members.map(member => (
                                <div key={member.id} className="bg-[#c0c0c0] border-2 border-white border-r-black border-b-black p-1 text-center">
                                    <img src={member.image} className="w-full h-24 object-cover border border-gray-600 mb-1 grayscale" />
                                    <p className="font-bold text-xs">{member.name}</p>
                                    <p className="text-[10px]">{member.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'VIDEO_EMBED': return (
                <div key={section.id} className="mb-8 border-2 border-gray-600 border-r-white border-b-white p-1 bg-black">
                     <VideoBlock 
                        headline={section.content.headline}
                        description={section.content.description}
                        videoUrl={section.content.videoUrl || ''}
                        className="!p-0 !py-0"
                        titleClassName="text-white font-mono mb-2 px-2"
                        descClassName="text-gray-400 font-mono px-2 text-xs"
                    />
                </div>
            );
            case 'RICH_TEXT': return (
                <div key={section.id} className="mb-8 bg-white border-2 border-gray-600 border-r-white border-b-white p-4 font-mono text-xs overflow-auto h-64 resize-y">
                     <RichTextBlock 
                        html={section.content.html || ''}
                        className="!p-0 !py-0 !max-w-none prose-sm font-mono"
                    />
                </div>
            );
            default: return null;
        }
    });

    return (
        <div className="bg-[var(--site-bg)] text-black font-mono min-h-full p-1 md:p-2 overflow-x-hidden pb-12 transition-colors duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-1 md:p-2 h-full">
                {/* Sidebar */}
                <div className="md:col-span-3 space-y-4">
                    <div className="bg-[#c0c0c0] border-2 border-white border-r-gray-600 border-b-gray-600 p-2 shadow-md">
                        <h3 className="font-bold text-xs mb-2 bg-blue-800 text-white px-1">C:\LUMINA\NAV</h3>
                        <ul className="space-y-1 text-xs cursor-pointer">
                            <li onClick={() => onNavigate && onNavigate('HOME')} className="hover:bg-blue-800 hover:text-white px-1">Start.exe (Home)</li>
                            {site.pages?.map(p => (
                                <li key={p.id} onClick={() => onNavigate && onNavigate(p.id)} className="hover:bg-blue-800 hover:text-white px-1">{p.title}.txt</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Main Content Window */}
                <div className="md:col-span-9 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black p-1 shadow-xl flex flex-col h-full">
                    <div className="bg-blue-800 text-white px-2 py-1 text-xs font-bold flex justify-between items-center">
                        <span>{site.title} - Notepad</span>
                        <div className="flex gap-1"><button className="w-3 h-3 bg-[#c0c0c0] border border-white text-black flex items-center justify-center text-[8px]">_</button><button className="w-3 h-3 bg-[#c0c0c0] border border-white text-black flex items-center justify-center text-[8px]">X</button></div>
                    </div>
                    <div className="bg-white border-2 border-gray-600 border-r-white border-b-white p-4 md:p-6 flex-1 overflow-y-auto">
                        {sections.length > 0 ? renderSections() : (
                            <>
                                {renderHero(data.headline, data.description, data.heroImage)}
                                {data.showPortfolio && (
                                    <div className="mb-12">
                                        <h2 className="text-lg md:text-xl font-bold mb-4 border-b-2 border-black w-fit">:: GALLERY ::</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {site.gallery.map((img: SiteGalleryItem) => (
                                                <div key={img.id} className="bg-[#c0c0c0] p-1 border border-black shadow-[4px_4px_0_black]">
                                                    <img src={img.url} className="w-full aspect-square object-cover mb-1 border border-gray-500" />
                                                    <p className="text-[10px] text-center truncate">{img.caption || 'untitled.jpg'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        
                        {data.showBookingWidget && (
                            <div className="mt-12 border-t-2 border-black pt-4" id="booking-widget">
                                <h2 className="text-lg md:text-xl font-bold mb-4">:: NEW_BOOKING.EXE ::</h2>
                                <BookingWidget packages={packages} theme="RETRO" onSubmit={onBooking} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Start Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#c0c0c0] border-t-2 border-white p-1 flex items-center gap-2 z-50">
                <button className="px-2 py-0.5 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black font-bold text-sm flex items-center gap-1 shadow-sm active:border-black active:border-r-white active:border-b-white active:shadow-none">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-black"></div> Start
                </button>
                <div className="border-2 border-gray-600 border-r-white border-b-white px-2 py-0.5 text-xs bg-white inset-shadow ml-auto md:ml-0">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
        </div>
    )
}

export default RetroTheme;
