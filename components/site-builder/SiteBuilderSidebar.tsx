
import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { Layout, Layers, Image as ImageIcon, File, Plus, Palette, Check, Save, ArrowLeft, Trash2, GripVertical, Home, PanelLeftClose, ChevronUp, ChevronDown, Search, Link2, Settings, Eye, EyeOff } from 'lucide-react';
import { SiteConfig, SectionType, SiteTheme, SitePage, SiteSection } from '../../types';
import SiteSectionEditor, { DebouncedInput, DebouncedTextarea, ImageUploader } from './SiteSectionEditor';

interface SiteBuilderSidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    isMobile: boolean;
    localSite: SiteConfig;
    activeTab: 'CONTENT' | 'SECTIONS' | 'GALLERY' | 'MARKETING' | 'PAGES' | 'STYLES';
    setActiveTab: (tab: 'CONTENT' | 'SECTIONS' | 'GALLERY' | 'MARKETING' | 'PAGES' | 'STYLES') => void;
    activePageId: string;
    setActivePageId: (id: string) => void;
    activePageData: SiteConfig | SitePage;
    hasChanges: boolean;
    themes: {id: SiteTheme, label: string, color: string, textColor: string}[];
    onExit: () => void;
    onSave: () => void;
    handleGlobalChange: (key: string, value: any) => void;
    handleContentChange: (key: string, value: any) => void;
    handleAddSection: (type: SectionType) => void;
    handleUpdateSection: (id: string, content: any) => void;
    handleDeleteSection: (id: string) => void;
    handleMoveSection: (index: number, direction: 'UP' | 'DOWN') => void;
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

const FONTS = [
    { label: 'Syne (Display)', value: 'Syne, sans-serif' },
    { label: 'Outfit (Clean)', value: 'Outfit, sans-serif' },
    { label: 'Playfair (Serif)', value: 'Playfair Display, serif' },
    { label: 'Inter (Modern)', value: 'Inter, sans-serif' },
    { label: 'Lora (Reading)', value: 'Lora, serif' }
];

const SiteBuilderSidebar: React.FC<SiteBuilderSidebarProps> = (props) => {
    const {
        isSidebarOpen, setIsSidebarOpen, isMobile, localSite, activeTab, setActiveTab, activePageId, setActivePageId, activePageData, hasChanges,
        themes, onExit, onSave, handleGlobalChange, handleContentChange, handleAddSection, handleUpdateSection, handleDeleteSection, handleReorderSections,
        getActiveSections, selectedSectionId, setSelectedSectionId, handleAddPage, handleDeletePage, handleHidePage, newPageName, setNewPageName, newGalleryUrl, setNewGalleryUrl
    } = props;

    const sections = getActiveSections();

    // Initialize style defaults if missing
    const siteStyle = localSite.style || {
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        fontHeading: 'Syne, sans-serif',
        fontBody: 'Outfit, sans-serif'
    };

    // Helper for Social Links update
    const updateSocialLink = (platform: string, url: string) => {
        const current = localSite.socialLinks || [];
        const exists = current.find(l => l.platform === platform);
        let newLinks;
        
        if (url.trim() === '') {
            newLinks = current.filter(l => l.platform !== platform);
        } else if (exists) {
            newLinks = current.map(l => l.platform === platform ? { ...l, url } : l);
        } else {
            newLinks = [...current, { platform, url }];
        }
        handleGlobalChange('socialLinks', newLinks);
    };

    const getSocialLink = (platform: string) => localSite.socialLinks?.find(l => l.platform === platform)?.url || '';

    const handleStyleChange = (key: string, value: string) => {
        handleGlobalChange('style', { ...siteStyle, [key]: value });
    };

    return (
        <motion.div 
            className="bg-lumina-surface/95 backdrop-blur-xl border-r border-lumina-highlight flex flex-col shadow-2xl z-20 order-2 md:order-1 overflow-hidden"
            initial={false}
            animate={{ 
                width: isMobile ? "100%" : (isSidebarOpen ? 400 : 0),
                height: isMobile ? (isSidebarOpen ? "60vh" : "60px") : "100%",
                opacity: 1
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <div className="flex flex-col h-full w-full md:w-[400px] overflow-hidden"> 
                {/* Header */}
                <div className="p-4 border-b border-lumina-highlight flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={onExit} className="p-2 rounded-lg hover:bg-lumina-highlight text-lumina-muted hover:text-white transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex items-center gap-2" onClick={() => isMobile && setIsSidebarOpen(!isSidebarOpen)}>
                            <h2 className="font-bold text-white text-sm">Site Editor</h2>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${hasChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
                                <span className="text-[10px] text-lumina-muted hidden md:inline">{hasChanges ? 'Draft' : 'Saved'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onSave} disabled={!hasChanges} className="p-2 bg-lumina-accent text-lumina-base rounded-lg disabled:opacity-50 disabled:grayscale hover:brightness-110 transition-all">
                            <Save size={18} />
                        </button>
                        {isMobile ? (
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-lumina-highlight text-lumina-muted hover:text-white rounded-lg">
                                {isSidebarOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>
                        ) : (
                            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-lumina-highlight text-lumina-muted hover:text-white rounded-lg hidden md:block">
                                <PanelLeftClose size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content - Only show if open */}
                {isSidebarOpen && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Page Selector */}
                        <div className="p-2 bg-lumina-base border-b border-lumina-highlight overflow-x-auto shrink-0">
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => { setActivePageId('HOME'); setActiveTab('CONTENT'); }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-2
                                        ${activePageId === 'HOME' ? 'bg-lumina-highlight text-white border border-lumina-highlight' : 'text-lumina-muted hover:text-white'}
                                    `}
                                >
                                    <Home size={12} /> Home
                                </button>
                                {localSite.pages?.map(page => (
                                    <button 
                                        key={page.id}
                                        onClick={() => { setActivePageId(page.id); setActiveTab('SECTIONS'); }}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1
                                            ${activePageId === page.id ? 'bg-lumina-highlight text-white border border-lumina-highlight' : 'text-lumina-muted hover:text-white'}
                                        `}
                                    >
                                        {page.hidden && <EyeOff size={10} className="text-lumina-muted"/>}
                                        {page.title}
                                    </button>
                                ))}
                                <button onClick={() => setActiveTab('PAGES')} className={`px-2 py-1.5 rounded-lg text-lumina-muted hover:text-white hover:bg-lumina-highlight transition-colors`}><Plus size={14} /></button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-lumina-highlight overflow-x-auto no-scrollbar shrink-0">
                            {[
                                { id: 'CONTENT', icon: Layout, label: 'Content' },
                                { id: 'SECTIONS', icon: Layers, label: 'Blocks' },
                                { id: 'STYLES', icon: Palette, label: 'Styles' },
                                { id: 'GALLERY', icon: ImageIcon, label: 'Gallery' },
                                { id: 'MARKETING', icon: Settings, label: 'Settings' },
                                { id: 'PAGES', icon: File, label: 'Pages' }
                            ].map((tab) => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors
                                        ${activeTab === tab.id 
                                            ? 'border-lumina-accent text-lumina-accent bg-lumina-accent/5' 
                                            : 'border-transparent text-lumina-muted hover:text-white hover:bg-lumina-highlight/30'}
                                    `}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 bg-lumina-surface/50 pb-12 md:pb-4">
                            
                            {activeTab === 'STYLES' && (
                                <div className="space-y-6">
                                    {/* Global Style Controls */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-lumina-muted uppercase tracking-widest flex items-center gap-2">Global Colors</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-lumina-muted mb-1 block">Background</label>
                                                <div className="flex gap-2">
                                                    <input type="color" value={siteStyle.backgroundColor} onChange={e => handleStyleChange('backgroundColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0"/>
                                                    <input value={siteStyle.backgroundColor} onChange={e => handleStyleChange('backgroundColor', e.target.value)} className="flex-1 bg-lumina-base border border-lumina-highlight rounded px-2 text-xs text-white uppercase"/>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-lumina-muted mb-1 block">Text</label>
                                                <div className="flex gap-2">
                                                    <input type="color" value={siteStyle.textColor} onChange={e => handleStyleChange('textColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0"/>
                                                    <input value={siteStyle.textColor} onChange={e => handleStyleChange('textColor', e.target.value)} className="flex-1 bg-lumina-base border border-lumina-highlight rounded px-2 text-xs text-white uppercase"/>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-lumina-muted mb-1 block">Primary Accent</label>
                                                <div className="flex gap-2">
                                                    <input type="color" value={siteStyle.primaryColor} onChange={e => handleStyleChange('primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0"/>
                                                    <input value={siteStyle.primaryColor} onChange={e => handleStyleChange('primaryColor', e.target.value)} className="flex-1 bg-lumina-base border border-lumina-highlight rounded px-2 text-xs text-white uppercase"/>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-lumina-muted mb-1 block">Secondary</label>
                                                <div className="flex gap-2">
                                                    <input type="color" value={siteStyle.secondaryColor} onChange={e => handleStyleChange('secondaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0"/>
                                                    <input value={siteStyle.secondaryColor} onChange={e => handleStyleChange('secondaryColor', e.target.value)} className="flex-1 bg-lumina-base border border-lumina-highlight rounded px-2 text-xs text-white uppercase"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 border-t border-lumina-highlight pt-6">
                                        <h3 className="text-xs font-bold text-lumina-muted uppercase tracking-widest">Typography</h3>
                                        <div>
                                            <label className="text-[10px] font-bold text-lumina-muted mb-1 block">Headings</label>
                                            <select 
                                                value={siteStyle.fontHeading} 
                                                onChange={e => handleStyleChange('fontHeading', e.target.value)}
                                                className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none"
                                            >
                                                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-lumina-muted mb-1 block">Body Text</label>
                                            <select 
                                                value={siteStyle.fontBody} 
                                                onChange={e => handleStyleChange('fontBody', e.target.value)}
                                                className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none"
                                            >
                                                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-3 border-t border-lumina-highlight pt-6">
                                        <h3 className="text-xs font-bold text-lumina-muted uppercase tracking-widest flex items-center gap-2">Layout Templates</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {themes.map((theme) => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => handleGlobalChange('theme', theme.id)}
                                                    className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all text-left h-24
                                                        ${localSite.theme === theme.id ? 'border-lumina-accent ring-1 ring-lumina-accent shadow-lg' : 'border-lumina-highlight hover:border-white/50'}
                                                    `}
                                                >
                                                    <div className="absolute inset-0" style={{ backgroundColor: theme.color }}></div>
                                                    <div className="absolute bottom-0 left-0 w-full p-2 bg-black/60 backdrop-blur-sm flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{theme.label}</span>
                                                        {localSite.theme === theme.id && <div className="w-4 h-4 bg-lumina-accent rounded-full flex items-center justify-center"><Check size={10} className="text-black"/></div>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'CONTENT' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-lumina-muted uppercase tracking-widest flex items-center gap-2"><Layout size={14}/> {activePageId === 'HOME' ? 'Global Content' : 'Page Content'}</h3>
                                        
                                        <div>
                                            <label className="text-[10px] font-bold text-lumina-muted uppercase mb-1 block">Title / Brand Name</label>
                                            <DebouncedInput 
                                                value={activePageData.title} 
                                                onChange={(val: string) => handleContentChange('title', val)} 
                                                className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-sm text-white focus:border-lumina-accent outline-none"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] font-bold text-lumina-muted uppercase mb-1 block">Main Headline</label>
                                            <DebouncedTextarea 
                                                value={activePageData.headline} 
                                                onChange={(val: string) => handleContentChange('headline', val)} 
                                                className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-sm text-white focus:border-lumina-accent outline-none min-h-[80px]"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-lumina-muted uppercase mb-1 block">Hero Image</label>
                                            <ImageUploader 
                                                value={activePageData.heroImage}
                                                onChange={(url: string) => handleContentChange('heroImage', url)}
                                                className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === 'SECTIONS' && (
                                <div className="space-y-6">
                                    {activePageId === 'HOME' ? (
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center"><p className="text-xs text-amber-200 font-bold">Standard Layout. To add custom blocks, create a new page.</p></div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['TEXT_IMAGE', 'FEATURES', 'GALLERY', 'PRICING', 'CTA_BANNER', 'FAQ', 'MAP_LOCATION'].map((type) => (
                                                    <button key={type} onClick={() => handleAddSection(type as SectionType)} className="flex flex-col items-center justify-center p-3 bg-lumina-base border border-lumina-highlight rounded-xl hover:border-lumina-accent hover:bg-lumina-accent/10 transition-all group">
                                                        <Plus size={16} className="text-lumina-muted group-hover:text-lumina-accent mb-1" />
                                                        <span className="text-[9px] font-bold text-white group-hover:text-lumina-accent uppercase">{type.replace('_', ' ')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            <Reorder.Group axis="y" values={sections} onReorder={handleReorderSections} className="space-y-2">
                                                {sections.map((section, index) => (
                                                    <Reorder.Item key={section.id} value={section} className="relative">
                                                        <div className={`border rounded-xl transition-all ${selectedSectionId === section.id ? 'border-lumina-accent bg-lumina-accent/5' : 'border-lumina-highlight bg-lumina-surface'}`}>
                                                            <div className="p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing" onClick={() => setSelectedSectionId(selectedSectionId === section.id ? null : section.id)}>
                                                                <GripVertical size={14} className="text-lumina-muted hover:text-white"/>
                                                                <span className="text-xs font-bold text-white flex-1 uppercase tracking-wider">{section.type.replace('_', ' ')}</span>
                                                            </div>
                                                            {selectedSectionId === section.id && (
                                                                <SiteSectionEditor 
                                                                    section={section}
                                                                    onUpdate={handleUpdateSection}
                                                                    onDelete={handleDeleteSection}
                                                                />
                                                            )}
                                                        </div>
                                                    </Reorder.Item>
                                                ))}
                                            </Reorder.Group>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'GALLERY' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-lumina-base border border-lumina-highlight rounded-xl">
                                        <label className="text-[10px] font-bold text-lumina-muted uppercase mb-2 block">Add New Image</label>
                                        <ImageUploader 
                                            value={newGalleryUrl}
                                            onChange={setNewGalleryUrl}
                                            className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none mb-2"
                                        />
                                        <button onClick={() => { if(newGalleryUrl) { handleGlobalChange('gallery', [...localSite.gallery, {id: `g-${Date.now()}`, url: newGalleryUrl, caption: ''}]); setNewGalleryUrl(''); } }} className="w-full py-2 bg-lumina-accent text-lumina-base rounded-lg font-bold text-xs mt-2">Add to Gallery</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {localSite.gallery.map((img) => (
                                            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-lumina-highlight">
                                                <img src={img.url} className="w-full h-full object-cover"/>
                                                <button onClick={() => handleGlobalChange('gallery', localSite.gallery.filter(i => i.id !== img.id))} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 hover:bg-rose-500"><Trash2 size={12}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'MARKETING' && (
                                <div className="space-y-6">
                                    {/* Footer & Socials */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-lumina-muted uppercase tracking-widest flex items-center gap-2"><Link2 size={14}/> Social & Footer</h3>
                                        <div>
                                            <label className="text-[10px] font-bold text-lumina-muted uppercase mb-1 block">Footer Copyright Text</label>
                                            <DebouncedInput 
                                                value={localSite.footerText || ''} 
                                                onChange={(val: string) => handleGlobalChange('footerText', val)} 
                                                className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-sm text-white focus:border-lumina-accent outline-none"
                                                placeholder={`© ${new Date().getFullYear()} ${localSite.title}`}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-lumina-muted uppercase mb-1 block">Instagram URL</label>
                                                <DebouncedInput 
                                                    value={getSocialLink('INSTAGRAM')} 
                                                    onChange={(val: string) => updateSocialLink('INSTAGRAM', val)} 
                                                    className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-lumina-muted uppercase mb-1 block">TikTok URL</label>
                                                <DebouncedInput 
                                                    value={getSocialLink('TIKTOK')} 
                                                    onChange={(val: string) => updateSocialLink('TIKTOK', val)} 
                                                    className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-xs text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SEO */}
                                    <div className="space-y-4 border-t border-lumina-highlight pt-6">
                                        <h3 className="text-xs font-bold text-lumina-muted uppercase tracking-widest flex items-center gap-2"><Search size={14}/> {activePageId === 'HOME' ? 'Global SEO' : 'Page SEO'}</h3>
                                        <div>
                                            <label className="text-[10px] font-bold text-lumina-muted uppercase mb-1 block">Meta Title</label>
                                            <DebouncedInput 
                                                value={activePageData.seo?.title || ''} 
                                                onChange={(val: string) => handleContentChange('seo', { ...activePageData.seo, title: val })} 
                                                className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-sm text-white focus:border-lumina-accent outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-lumina-muted uppercase mb-1 block">Meta Description</label>
                                            <DebouncedTextarea 
                                                value={activePageData.seo?.description || ''} 
                                                onChange={(val: string) => handleContentChange('seo', { ...activePageData.seo, description: val })} 
                                                className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-sm text-white focus:border-lumina-accent outline-none min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'PAGES' && (
                                <div className="space-y-6">
                                    <div className="flex gap-2">
                                        <input value={newPageName} onChange={(e) => setNewPageName(e.target.value)} placeholder="New Page Name" className="flex-1 bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none" />
                                        <button onClick={handleAddPage} disabled={!newPageName} className="px-3 bg-lumina-accent text-lumina-base rounded-lg font-bold text-xs">Add</button>
                                    </div>
                                    <div className="space-y-2">
                                        {localSite.pages?.map(page => (
                                            <div key={page.id} className="flex items-center justify-between p-3 bg-lumina-base border border-lumina-highlight rounded-xl group">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-xs font-bold ${page.hidden ? 'text-lumina-muted line-through' : 'text-white'}`}>{page.title}</p>
                                                        {page.hidden && <EyeOff size={10} className="text-lumina-muted"/>}
                                                    </div>
                                                    <p className="text-[10px] text-lumina-muted font-mono">/{page.slug}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleHidePage(page.id, !page.hidden)} className="p-1.5 hover:text-white text-lumina-muted transition-colors" title={page.hidden ? "Show in Nav" : "Hide from Nav"}>
                                                        {page.hidden ? <EyeOff size={14}/> : <Eye size={14}/>}
                                                    </button>
                                                    <button onClick={() => handleDeletePage(page.id)} className="p-1.5 hover:text-rose-500 text-lumina-muted transition-colors"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default SiteBuilderSidebar;
