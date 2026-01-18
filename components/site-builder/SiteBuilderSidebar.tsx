import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
    LayoutTemplate, Type, Image, Share2, Layers, Palette, ChevronLeft, Save, 
    Undo, Redo, LogOut, Plus, Trash2, GripVertical, Settings, Eye, EyeOff, 
    Globe, Info, PanelLeftClose, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Loader2, Zap
} from 'lucide-react';
import { SiteConfig, SiteTheme, SitePage, SiteSection } from '../../types';
import SiteSectionEditor, { DebouncedInput, DebouncedTextarea, ImageUploader } from './SiteSectionEditor';
import ToggleRow from './ToggleRow';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const Motion = motion as any;

interface SiteBuilderSidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    isMobile: boolean;
    localSite: SiteConfig;
    activeTab: 'CONTENT' | 'SECTIONS' | 'GALLERY' | 'MARKETING' | 'PAGES' | 'STYLES';
    setActiveTab: (tab: any) => void;
    activePageId: string;
    setActivePageId: (id: string) => void;
    activePageData: SiteConfig | SitePage;
    hasChanges: boolean;
    themes: {id: SiteTheme, label: string, color: string, textColor: string}[];
    onExit: () => void;
    onSave: () => void;
    handleGlobalChange: (key: string, value: any) => void;
    handleContentChange: (key: string, value: any) => void;
    handleAddSection: (type: any) => void;
    handleUpdateSection: (id: string, content: any) => void;
    handleDeleteSection: (id: string) => void;
    handleMoveSection: (dragIndex: number, hoverIndex: number) => void;
    handleReorderSections: (newOrder: SiteSection[]) => void;
    getActiveSections: () => SiteSection[];
    selectedSectionId: string | null;
    setSelectedSectionId: (id: string | null) => void;
    handleAddPage: () => void;
    handleDeletePage: (id: string) => void;
    handleHidePage: (id: string, hidden: boolean) => void;
    newPageName: string;
    setNewPageName: (name: string) => void;
    newGalleryUrl: string;
    setNewGalleryUrl: (url: string) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

const SiteBuilderSidebar: React.FC<SiteBuilderSidebarProps> = ({
    isSidebarOpen, setIsSidebarOpen, isMobile, localSite, activeTab, setActiveTab,
    activePageId, setActivePageId, activePageData, hasChanges, themes, onExit, onSave,
    handleGlobalChange, handleContentChange, handleAddSection, handleUpdateSection, handleDeleteSection,
    handleReorderSections, getActiveSections, selectedSectionId, setSelectedSectionId,
    handleAddPage, handleDeletePage, handleHidePage, newPageName, setNewPageName,
    newGalleryUrl, setNewGalleryUrl, canUndo, canRedo, onUndo, onRedo
}) => {
    
    // Subdomain Availability State
    const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
    const [subdomainStatus, setSubdomainStatus] = useState<'IDLE' | 'AVAILABLE' | 'TAKEN' | 'ERROR'>('IDLE');

    // Debounce checking
    const checkAvailability = async (sub: string) => {
        if (!sub || sub.length < 3) {
            setSubdomainStatus('IDLE');
            return;
        }
        
        setIsCheckingSubdomain(true);
        try {
            // Check reserved list first (Client side check for speed)
            const RESERVED = ['www', 'app', 'admin', 'api', 'mail', 'support', 'staging', 'test', 'login', 'signup', 'register'];
            if (RESERVED.includes(sub)) {
                setSubdomainStatus('TAKEN');
                setIsCheckingSubdomain(false);
                return;
            }

            const q = query(collection(db, "studios"), where("site.subdomain", "==", sub));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                setSubdomainStatus('AVAILABLE');
            } else {
                setSubdomainStatus('TAKEN');
            }
        } catch (e) {
            console.error("Availability check failed", e);
            setSubdomainStatus('ERROR');
        } finally {
            setIsCheckingSubdomain(false);
        }
    };

    const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
    const [domainVerificationStatus, setDomainVerificationStatus] = useState<'IDLE' | 'SUCCESS' | 'FAILED' | 'ERROR'>('IDLE');

    const verifyDomain = async () => {
        if (!localSite.customDomain) return;
        setIsVerifyingDomain(true);
        setDomainVerificationStatus('IDLE');
        
        try {
            // Check CNAME record via Google DNS API
            const response = await fetch(`https://dns.google/resolve?name=${localSite.customDomain}&type=CNAME`);
            const data = await response.json();
            
            // Expected target: app.luminaphotocrm.com
            const target = 'app.luminaphotocrm.com';
            const hasCorrectCNAME = data.Answer?.some((ans: any) => ans.data.includes(target));
            
            if (hasCorrectCNAME) {
                setDomainVerificationStatus('SUCCESS');
            } else {
                setDomainVerificationStatus('FAILED');
            }
        } catch (e) {
            setDomainVerificationStatus('ERROR');
        } finally {
            setIsVerifyingDomain(false);
        }
    };

    if (!isSidebarOpen) return null;

    const sections = getActiveSections();

    const tabs = [
        { id: 'CONTENT', icon: Type, label: 'Content' },
        { id: 'SECTIONS', icon: Layers, label: 'Sections' },
        { id: 'GALLERY', icon: Image, label: 'Gallery' },
        { id: 'PAGES', icon: LayoutTemplate, label: 'Pages' },
        { id: 'PROMOS', icon: Zap, label: 'Promos' }, // New Tab
        { id: 'STYLES', icon: Palette, label: 'Theme' },
        { id: 'MARKETING', icon: Share2, label: 'Settings' },
    ];

    const sectionTypes = [
        { type: 'HERO', label: 'Hero Header' },
        { type: 'TEXT_IMAGE', label: 'Text + Image' },
        { type: 'GALLERY', label: 'Gallery Grid' },
        { type: 'FEATURES', label: 'Features List' },
        { type: 'PRICING', label: 'Pricing Table' },
        { type: 'TESTIMONIALS', label: 'Testimonials' },
        { type: 'FAQ', label: 'FAQ Accordion' },
        { type: 'CTA_BANNER', label: 'Call to Action' },
        { type: 'MAP_LOCATION', label: 'Map Location' },
        { type: 'CONTACT_FORM', label: 'Contact Form' },
        { type: 'TEAM_GRID', label: 'Team Grid' },
        { type: 'VIDEO_EMBED', label: 'Video Embed' },
        { type: 'RICH_TEXT', label: 'Rich Text' }
    ];

    const isSaveDisabled = !hasChanges || isCheckingSubdomain || subdomainStatus === 'TAKEN' || subdomainStatus === 'ERROR';

    return (
        <div className={`fixed inset-y-0 left-0 bg-[#1c1c1c] border-r border-[#333] w-full md:w-[400px] z-50 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            
            {/* Header */}
            <div className="h-14 border-b border-[#333] flex items-center justify-between px-4 bg-[#252525] shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={onExit} className="p-2 hover:bg-[#333] rounded text-gray-400 hover:text-white"><LogOut size={16}/></button>
                    <span className="font-bold text-white text-sm">Site Builder</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onSave} 
                        disabled={isSaveDisabled} 
                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded text-xs font-bold disabled:opacity-50 hover:bg-gray-200"
                    >
                        <Save size={14}/> Save
                    </button>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400"><PanelLeftClose size={18}/></button>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex border-b border-[#333] bg-[#1c1c1c] shrink-0 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[60px] py-3 flex flex-col items-center justify-center gap-1 border-b-2 transition-colors ${activeTab === tab.id ? 'border-white text-white bg-[#252525]' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#252525]'}`}
                        title={tab.label}
                    >
                        <tab.icon size={18} />
                        <span className="text-[9px] font-medium uppercase tracking-wide">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-20">
                
                {/* --- CONTENT TAB --- */}
                {activeTab === 'CONTENT' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-[#252525] p-3 rounded border border-[#333] flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase">Editing Page:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{activePageData.title || localSite.title}</span>
                                {activePageId !== 'HOME' && 'slug' in activePageData && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">/{activePageData.slug}</span>}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Page Headline</label>
                            <DebouncedInput 
                                value={activePageData.headline || ''} 
                                onChange={(val: string) => handleContentChange('headline', val)}
                                className="w-full bg-[#252525] border border-[#333] rounded p-2 text-sm text-white focus:border-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Hero Description</label>
                            <DebouncedTextarea 
                                value={activePageData.description || ''} 
                                onChange={(val: string) => handleContentChange('description', val)}
                                className="w-full bg-[#252525] border border-[#333] rounded p-2 text-sm text-white focus:border-white outline-none min-h-[100px]"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Hero Image</label>
                            <ImageUploader 
                                value={activePageData.heroImage}
                                onChange={(url: string) => handleContentChange('heroImage', url)}
                                className="w-full bg-[#252525] border border-[#333] rounded p-2 text-sm text-white focus:border-white outline-none mb-2"
                            />
                        </div>

                        <div className="border-t border-[#333] pt-4 mt-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Global Info</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Site Title</label>
                                    <DebouncedInput 
                                        value={localSite.title} 
                                        onChange={(val: string) => handleGlobalChange('title', val)}
                                        className="w-full bg-[#252525] border border-[#333] rounded p-2 text-sm text-white focus:border-white outline-none"
                                    />
                                </div>
                                <ToggleRow 
                                    label="Show Booking Widget" 
                                    checked={activePageData.showBookingWidget} 
                                    onChange={(checked) => handleContentChange('showBookingWidget', checked)} 
                                />
                                <ToggleRow 
                                    label="Show Portfolio Grid" 
                                    checked={activePageData.showPortfolio} 
                                    onChange={(checked) => handleContentChange('showPortfolio', checked)} 
                                />
                                <ToggleRow 
                                    label="Show Pricing Table" 
                                    checked={activePageData.showPricing} 
                                    onChange={(checked) => handleContentChange('showPricing', checked)} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SECTIONS TAB --- */}
                {activeTab === 'SECTIONS' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {sectionTypes.map(s => (
                                <button key={s.type} onClick={() => handleAddSection(s.type)} className="p-2 bg-[#252525] border border-[#333] hover:border-white rounded text-left transition-colors">
                                    <span className="text-[10px] font-bold text-gray-400 block mb-0.5">Add</span>
                                    <span className="text-xs font-bold text-white block">{s.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Page Sections</h3>
                            {sections.length === 0 && <p className="text-sm text-gray-500 italic">No sections added yet.</p>}
                            
                            <Reorder.Group axis="y" values={sections} onReorder={handleReorderSections} className="space-y-2">
                                {sections.map((section) => (
                                    <Reorder.Item key={section.id} value={section}>
                                        <div className={`bg-[#252525] border rounded-lg overflow-hidden ${selectedSectionId === section.id ? 'border-blue-500' : 'border-[#333]'}`}>
                                            <div 
                                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#333] transition-colors"
                                                onClick={() => setSelectedSectionId(selectedSectionId === section.id ? null : section.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <GripVertical size={14} className="text-gray-600 cursor-grab active:cursor-grabbing"/>
                                                    <span className="text-xs font-bold text-white uppercase">{section.type.replace('_', ' ')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }} className="text-gray-500 hover:text-rose-500"><Trash2 size={14}/></button>
                                                    {selectedSectionId === section.id ? <ChevronDown size={14} className="text-white"/> : <ChevronRight size={14} className="text-gray-500"/>}
                                                </div>
                                            </div>
                                            
                                            <AnimatePresence>
                                                {selectedSectionId === section.id && (
                                                    <Motion.div 
                                                        initial={{ height: 0, opacity: 0 }} 
                                                        animate={{ height: 'auto', opacity: 1 }} 
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-[#333] bg-[#1a1a1a]"
                                                    >
                                                        <SiteSectionEditor 
                                                            section={section} 
                                                            onUpdate={handleUpdateSection} 
                                                            onDelete={handleDeleteSection} 
                                                        />
                                                    </Motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        </div>
                    </div>
                )}

                {/* --- GALLERY TAB --- */}
                {activeTab === 'GALLERY' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Add Image URL</label>
                            <div className="flex gap-2">
                                <ImageUploader 
                                    value={newGalleryUrl}
                                    onChange={setNewGalleryUrl}
                                    className="flex-1 bg-[#252525] border border-[#333] rounded p-2 text-sm text-white focus:border-white outline-none"
                                />
                                <button 
                                    onClick={() => {
                                        if (newGalleryUrl) {
                                            const newImage = { id: `g-${Date.now()}`, url: newGalleryUrl, caption: '' };
                                            handleGlobalChange('gallery', [...localSite.gallery, newImage]);
                                            setNewGalleryUrl('');
                                        }
                                    }}
                                    className="bg-white text-black px-3 rounded font-bold text-sm"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {localSite.gallery.map((img, idx) => (
                                <div key={img.id} className="relative group aspect-square rounded overflow-hidden border border-[#333]">
                                    <img src={img.url} className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => {
                                            const newGallery = localSite.gallery.filter(g => g.id !== img.id);
                                            handleGlobalChange('gallery', newGallery);
                                        }}
                                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                        <input 
                                            value={img.caption || ''}
                                            onChange={(e) => {
                                                const newGallery = [...localSite.gallery];
                                                newGallery[idx] = { ...img, caption: e.target.value };
                                                handleGlobalChange('gallery', newGallery);
                                            }}
                                            placeholder="Caption..."
                                            className="w-full bg-transparent text-[10px] text-white outline-none border-none placeholder-gray-400"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- PAGES TAB --- */}
                {activeTab === 'PAGES' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex gap-2 mb-4">
                            <input 
                                placeholder="New Page Name" 
                                value={newPageName}
                                onChange={e => setNewPageName(e.target.value)}
                                className="flex-1 bg-[#252525] border border-[#333] rounded p-2 text-sm text-white focus:border-white outline-none"
                                onKeyDown={e => e.key === 'Enter' && handleAddPage()}
                            />
                            <button onClick={handleAddPage} disabled={!newPageName} className="bg-white text-black px-3 rounded font-bold text-sm disabled:opacity-50">
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div 
                                onClick={() => {
                                    setActivePageId('HOME');
                                    setActiveTab('CONTENT');
                                }}
                                className={`p-3 rounded border flex items-center justify-between cursor-pointer ${activePageId === 'HOME' ? 'bg-[#252525] border-blue-500 text-white' : 'border-[#333] text-gray-400 hover:bg-[#252525]'}`}
                            >
                                <span className="text-sm font-bold">Home</span>
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">INDEX</span>
                            </div>
                            
                            {localSite.pages && localSite.pages.length > 0 && (
                                <Reorder.Group axis="y" values={localSite.pages} onReorder={(newOrder) => handleGlobalChange('pages', newOrder)} className="space-y-2">
                                    {localSite.pages.map(page => (
                                        <Reorder.Item key={page.id} value={page}>
                                            <div 
                                                onClick={() => {
                                                    setActivePageId(page.id);
                                                    setActiveTab('CONTENT');
                                                }}
                                                className={`p-3 rounded border flex items-center justify-between cursor-pointer group ${activePageId === page.id ? 'bg-[#252525] border-blue-500 text-white' : 'border-[#333] text-gray-400 hover:bg-[#252525]'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <GripVertical size={14} className="text-gray-600 cursor-grab active:cursor-grabbing hover:text-white" onPointerDown={(e) => e.stopPropagation()} />
                                                    <span className="text-sm font-bold">{page.title}</span>
                                                    {page.hidden && <EyeOff size={12} className="text-gray-600"/>}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); handleHidePage(page.id, !page.hidden); }} className="p-1 hover:bg-[#333] rounded" title={page.hidden ? "Show" : "Hide"}>
                                                        {page.hidden ? <Eye size={12}/> : <EyeOff size={12}/>}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }} className="p-1 hover:bg-rose-900/30 text-rose-500 rounded">
                                                        <Trash2 size={12}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>
                            )}
                        </div>
                    </div>
                )}

                {/* --- PROMOS TAB --- */}
                {activeTab === 'PROMOS' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <button 
                            onClick={() => {
                                const newPromo: any = {
                                    id: `promo-${Date.now()}`,
                                    slug: 'special-offer',
                                    title: 'Limited Offer',
                                    description: 'Book now and save!',
                                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    totalSlots: 10,
                                    bookedSlots: 0,
                                    packageId: '',
                                    discountValue: 100000,
                                    isActive: true
                                };
                                handleGlobalChange('promoPages', [...(localSite.promoPages || []), newPromo]);
                            }}
                            className="w-full py-3 bg-white text-black rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors mb-4"
                        >
                            <Plus size={14}/> Create Promo Page
                        </button>

                        <div className="space-y-3">
                            {(!localSite.promoPages || localSite.promoPages.length === 0) && (
                                <p className="text-center text-gray-500 text-xs py-10 italic">No promos created yet.</p>
                            )}
                            {(localSite.promoPages || []).map((promo, idx) => (
                                <div key={promo.id} className="bg-[#252525] border border-[#333] rounded-xl p-4 space-y-4 group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <DebouncedInput 
                                                value={promo.title}
                                                onChange={(val) => {
                                                    const newPromos = [...(localSite.promoPages || [])];
                                                    newPromos[idx] = { ...promo, title: val };
                                                    handleGlobalChange('promoPages', newPromos);
                                                }}
                                                className="bg-transparent text-white font-bold text-sm border-none p-0 focus:ring-0 w-full mb-1"
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500">Slug:</span>
                                                <DebouncedInput 
                                                    value={promo.slug}
                                                    onChange={(val) => {
                                                        const newPromos = [...(localSite.promoPages || [])];
                                                        newPromos[idx] = { ...promo, slug: val.toLowerCase().replace(/ /g, '-') };
                                                        handleGlobalChange('promoPages', newPromos);
                                                    }}
                                                    className="bg-[#1a1a1a] text-blue-400 text-[10px] border border-[#333] rounded px-1.5 py-0.5 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newPromos = localSite.promoPages?.filter(p => p.id !== promo.id);
                                                handleGlobalChange('promoPages', newPromos);
                                            }}
                                            className="text-gray-600 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Expiry Date</label>
                                            <input 
                                                type="date"
                                                value={promo.expiryDate}
                                                onChange={(e) => {
                                                    const newPromos = [...(localSite.promoPages || [])];
                                                    newPromos[idx] = { ...promo, expiryDate: e.target.value };
                                                    handleGlobalChange('promoPages', newPromos);
                                                }}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded p-1.5 text-[10px] text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Total Slots</label>
                                            <input 
                                                type="number"
                                                value={promo.totalSlots}
                                                onChange={(e) => {
                                                    const newPromos = [...(localSite.promoPages || [])];
                                                    newPromos[idx] = { ...promo, totalSlots: parseInt(e.target.value) };
                                                    handleGlobalChange('promoPages', newPromos);
                                                }}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded p-1.5 text-[10px] text-white outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-[#333]">
                                        <span className="text-[10px] text-gray-500">Active Status</span>
                                        <button 
                                            onClick={() => {
                                                const newPromos = [...(localSite.promoPages || [])];
                                                newPromos[idx] = { ...promo, isActive: !promo.isActive };
                                                handleGlobalChange('promoPages', newPromos);
                                            }}
                                            className={`w-8 h-4 rounded-full transition-colors relative ${promo.isActive ? 'bg-emerald-500' : 'bg-gray-700'}`}
                                        >
                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${promo.isActive ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </button>
                                    </div>
                                    
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded text-[10px] text-blue-300 flex items-center gap-2">
                                        <Globe size={12}/> 
                                        <span className="truncate">.../promo/{promo.slug}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- STYLES TAB --- */}
                {activeTab === 'STYLES' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Select Theme</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {themes.map(theme => (
                                <button
                                    key={theme.id}
                                    onClick={() => handleGlobalChange('theme', theme.id)}
                                    className={`p-3 rounded border text-left transition-all relative overflow-hidden ${localSite.theme === theme.id ? 'border-white ring-1 ring-white' : 'border-[#333] hover:border-gray-500'}`}
                                    style={{ backgroundColor: theme.color }}
                                >
                                    <span className="relative z-10 text-sm font-bold" style={{ color: theme.textColor }}>{theme.label}</span>
                                    {localSite.theme === theme.id && <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-[#333] pt-4 mt-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Theme Colors</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Background</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={localSite.style?.backgroundColor || '#000000'}
                                            onChange={e => handleGlobalChange('style', { ...localSite.style, backgroundColor: e.target.value })}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                        />
                                        <input 
                                            value={localSite.style?.backgroundColor || '#000000'}
                                            onChange={e => handleGlobalChange('style', { ...localSite.style, backgroundColor: e.target.value })}
                                            className="flex-1 bg-[#252525] border border-[#333] rounded p-1.5 text-xs text-white uppercase"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Text Color</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={localSite.style?.textColor || '#ffffff'}
                                            onChange={e => handleGlobalChange('style', { ...localSite.style, textColor: e.target.value })}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                        />
                                        <input 
                                            value={localSite.style?.textColor || '#ffffff'}
                                            onChange={e => handleGlobalChange('style', { ...localSite.style, textColor: e.target.value })}
                                            className="flex-1 bg-[#252525] border border-[#333] rounded p-1.5 text-xs text-white uppercase"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Primary Accent</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={localSite.style?.primaryColor || '#3b82f6'}
                                            onChange={e => handleGlobalChange('style', { ...localSite.style, primaryColor: e.target.value })}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                        />
                                        <input 
                                            value={localSite.style?.primaryColor || '#3b82f6'}
                                            onChange={e => handleGlobalChange('style', { ...localSite.style, primaryColor: e.target.value })}
                                            className="flex-1 bg-[#252525] border border-[#333] rounded p-1.5 text-xs text-white uppercase"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Secondary Accent</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={localSite.style?.secondaryColor || '#ef4444'}
                                            onChange={e => handleGlobalChange('style', { ...localSite.style, secondaryColor: e.target.value })}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                        />
                                        <input 
                                            value={localSite.style?.secondaryColor || '#ef4444'}
                                            onChange={e => handleGlobalChange('style', { ...localSite.style, secondaryColor: e.target.value })}
                                            className="flex-1 bg-[#252525] border border-[#333] rounded p-1.5 text-xs text-white uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-[#333] pt-4 mt-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Typography (Global)</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Heading Font</label>
                                    <select 
                                        value={localSite.style?.fontHeading || 'Syne, sans-serif'} 
                                        onChange={e => handleGlobalChange('style', { ...localSite.style, fontHeading: e.target.value })}
                                        className="w-full bg-[#252525] border border-[#333] rounded p-2 text-sm text-white focus:border-white outline-none"
                                    >
                                        <option value="Syne, sans-serif">Syne</option>
                                        <option value="Outfit, sans-serif">Outfit</option>
                                        <option value="Playfair Display, serif">Playfair Display</option>
                                        <option value="Inter, sans-serif">Inter</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Body Font</label>
                                    <select 
                                        value={localSite.style?.fontBody || 'Outfit, sans-serif'} 
                                        onChange={e => handleGlobalChange('style', { ...localSite.style, fontBody: e.target.value })}
                                        className="w-full bg-[#252525] border border-[#333] rounded p-2 text-sm text-white focus:border-white outline-none"
                                    >
                                        <option value="Outfit, sans-serif">Outfit</option>
                                        <option value="Inter, sans-serif">Inter</option>
                                        <option value="Lora, serif">Lora</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SETTINGS/MARKETING TAB --- */}
                {activeTab === 'MARKETING' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-[#252525] p-4 rounded border border-[#333]">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Palette size={12}/> Branding Assets</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Favicon (32x32)</label>
                                    <ImageUploader 
                                        value={localSite.branding?.faviconUrl}
                                        onChange={(url: string) => handleGlobalChange('branding', { ...localSite.branding, faviconUrl: url })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Social Share Image (1200x630)</label>
                                    <ImageUploader 
                                        value={localSite.branding?.socialShareImage}
                                        onChange={(url: string) => handleGlobalChange('branding', { ...localSite.branding, socialShareImage: url })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white outline-none"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Displayed when sharing your site on social media.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#252525] p-4 rounded border border-[#333]">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Globe size={12}/> Domain Configuration</h3>
                            
                            <div className="space-y-4">
                                {/* Subdomain Input */}
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Lumina Subdomain</label>
                                    <div className="relative">
                                        <div className={`flex items-center bg-[#1a1a1a] border rounded overflow-hidden transition-colors ${
                                            subdomainStatus === 'AVAILABLE' ? 'border-emerald-500/50' : 
                                            subdomainStatus === 'TAKEN' ? 'border-rose-500/50' : 
                                            'border-[#333]'
                                        }`}>
                                            <input 
                                                value={localSite.subdomain}
                                                onBlur={(e) => checkAvailability(e.target.value)}
                                                onChange={e => {
                                                    // Stricter Regex: Alphanumeric only, no special chars, no spaces.
                                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                    handleGlobalChange('subdomain', val);
                                                    setSubdomainStatus('IDLE'); // Reset status on type
                                                }}
                                                className="bg-transparent p-2 text-sm text-white outline-none flex-1 pl-3"
                                                placeholder="your-studio"
                                            />
                                            <span className="text-xs text-gray-500 px-2 bg-[#252525] border-l border-[#333] h-full flex items-center">.luminaphotocrm.com</span>
                                        </div>
                                        
                                        {/* Status Indicator */}
                                        <div className="absolute top-2 right-40">
                                            {isCheckingSubdomain && <Loader2 size={12} className="animate-spin text-gray-400"/>}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mt-1 min-h-[14px]">
                                        <p className="text-[10px] text-gray-500">Default address for your site.</p>
                                        
                                        {/* Feedback Message */}
                                        {subdomainStatus === 'AVAILABLE' && (
                                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                                <CheckCircle2 size={10}/> Available
                                            </span>
                                        )}
                                        {subdomainStatus === 'TAKEN' && (
                                            <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                                                <AlertCircle size={10}/> Unavailable
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-[#333] w-full"></div>

                                {/* Custom Domain Input */}
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Custom Domain (Optional)</label>
                                    <div className="flex gap-2">
                                        <DebouncedInput 
                                            value={localSite.customDomain || ''}
                                            onChange={(val: string) => handleGlobalChange('customDomain', val)}
                                            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white outline-none"
                                            placeholder="www.yourdomain.com"
                                        />
                                        <button 
                                            onClick={verifyDomain}
                                            disabled={!localSite.customDomain || isVerifyingDomain}
                                            className="bg-[#333] text-white px-3 rounded text-[10px] font-bold uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-30"
                                        >
                                            {isVerifyingDomain ? <Loader2 size={12} className="animate-spin"/> : 'Verify'}
                                        </button>
                                    </div>
                                    
                                    {domainVerificationStatus === 'SUCCESS' && (
                                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-bold"><CheckCircle2 size={10}/> Connection verified!</p>
                                    )}
                                    {domainVerificationStatus === 'FAILED' && (
                                        <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1 font-bold"><AlertCircle size={10}/> Record not found yet.</p>
                                    )}
                                    {domainVerificationStatus === 'ERROR' && (
                                        <p className="text-[10px] text-gray-500 mt-1">Unable to check DNS at this moment.</p>
                                    )}
                                </div>
                                
                                {/* Simple Guide */}
                                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded">
                                    <h4 className="text-xs font-bold text-blue-200 mb-2 flex items-center gap-2"><Info size={12}/> Connection Guide</h4>
                                    
                                    <p className="text-[10px] text-gray-300 mb-3 leading-relaxed">
                                        To use your own domain (e.g. Namecheap, GoDaddy), login to your provider and add a <strong>CNAME Record</strong>:
                                    </p>

                                    <div className="bg-black/50 p-2 rounded border border-blue-900/50 text-[10px] space-y-1.5 font-mono text-gray-300">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-1">
                                            <span className="text-gray-500">Type</span>
                                            <span className="text-white font-bold bg-blue-900/50 px-1.5 rounded">CNAME</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/10 pb-1">
                                            <span className="text-gray-500">Host</span>
                                            <span className="text-white font-bold">www</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Value</span>
                                            <span className="text-emerald-400 font-bold select-all">app.luminaphotocrm.com</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex gap-2 items-start">
                                        <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-gray-400 leading-tight">
                                            It may take up to 24 hours for DNS to propagate globally. SSL will be provisioned automatically.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#252525] p-4 rounded border border-[#333]">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Share2 size={12}/> SEO & Tracking</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">SEO Title</label>
                                    <DebouncedInput 
                                        value={localSite.seo?.title || ''}
                                        onChange={(val: string) => handleGlobalChange('seo', { ...localSite.seo, title: val })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white outline-none"
                                        placeholder="Studio Name | Professional Photographer"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">SEO Description</label>
                                    <DebouncedTextarea 
                                        value={localSite.seo?.description || ''}
                                        onChange={(val: string) => handleGlobalChange('seo', { ...localSite.seo, description: val })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white outline-none min-h-[80px]"
                                        placeholder="Describe your studio for search engines..."
                                    />
                                </div>
                                
                                {/* SEO SERP Preview */}
                                <div className="p-3 bg-white rounded border border-[#333]">
                                    <div className="text-[10px] text-gray-500 mb-1">Google Search Preview</div>
                                    <div className="text-[#1a0dab] text-sm font-medium hover:underline cursor-pointer truncate">
                                        {localSite.seo?.title || localSite.title || 'Studio Name'}
                                    </div>
                                    <div className="text-[#006621] text-xs truncate">
                                        https://{localSite.subdomain || 'your-site'}.luminaphotocrm.com
                                    </div>
                                    <div className="text-[#545454] text-xs line-clamp-2">
                                        {localSite.seo?.description || localSite.description || 'Professional photography services...'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Facebook Pixel ID</label>
                                        <DebouncedInput 
                                            value={localSite.pixels?.facebookPixelId || ''}
                                            onChange={(val: string) => handleGlobalChange('pixels', { ...localSite.pixels, facebookPixelId: val })}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white outline-none font-mono"
                                            placeholder="Pixel ID"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Google Analytics (G-)</label>
                                        <DebouncedInput 
                                            value={localSite.pixels?.googleTagId || ''}
                                            onChange={(val: string) => handleGlobalChange('pixels', { ...localSite.pixels, googleTagId: val })}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white outline-none font-mono"
                                            placeholder="G-XXXXXXX"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SiteBuilderSidebar;