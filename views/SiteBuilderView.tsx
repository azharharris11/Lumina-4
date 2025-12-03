
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SiteBuilderViewProps, SitePage, SiteSection, SectionType, SiteTheme, SiteConfig, PublicBookingSubmission } from '../types';
import { Globe, Smartphone, Monitor, PanelLeftOpen, Undo2, Redo2 } from 'lucide-react';
import SitePreviewFrame from '../components/site-builder/SitePreviewFrame';
import SiteBuilderSidebar from '../components/site-builder/SiteBuilderSidebar';

// Themes
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

interface ExtendedSiteBuilderViewProps extends SiteBuilderViewProps {
    onExit?: () => void;
    onPublicBooking?: (data: PublicBookingSubmission) => void;
}

const THEMES: {id: SiteTheme, label: string, color: string, textColor: string}[] = [
    { id: 'NOIR', label: 'Noir', color: '#000000', textColor: '#ffffff' },
    { id: 'ETHEREAL', label: 'Ethereal', color: '#fcfaf7', textColor: '#4a4a4a' },
    { id: 'VOGUE', label: 'Vogue', color: '#ff3333', textColor: '#000000' },
    { id: 'MINIMAL', label: 'Minimal', color: '#ffffff', textColor: '#000000' },
    { id: 'CINEMA', label: 'Cinema', color: '#1a1a1a', textColor: '#ffffff' },
    { id: 'RETRO', label: 'Retro', color: '#008080', textColor: '#ffffff' },
    { id: 'ATELIER', label: 'Atelier', color: '#f5f0eb', textColor: '#2c2c2c' },
    { id: 'HORIZON', label: 'Horizon', color: '#0f172a', textColor: '#ffffff' },
    { id: 'BOLD', label: 'Bold', color: '#bef264', textColor: '#000000' },
    { id: 'IMPACT', label: 'Impact', color: '#ffff00', textColor: '#000000' },
    { id: 'CLEANSLATE', label: 'Clean Slate', color: '#f8fafc', textColor: '#334155' },
    { id: 'AUTHORITY', label: 'Authority', color: '#1a1a1a', textColor: '#d97706' },
];

const SiteBuilderView: React.FC<ExtendedSiteBuilderViewProps> = ({ config, packages, users, bookings, onUpdateConfig, onExit, onPublicBooking }) => {
  // HISTORY STATE FOR UNDO/REDO
  const [history, setHistory] = useState<SiteConfig[]>([config.site]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const localSite = history[historyIndex];

  const [previewMode, setPreviewMode] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'SECTIONS' | 'GALLERY' | 'MARKETING' | 'PAGES' | 'STYLES'>('CONTENT');
  const [activePageId, setActivePageId] = useState<string>('HOME');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [newPageName, setNewPageName] = useState('');
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const hasChanges = useMemo(() => {
      return JSON.stringify(localSite) !== JSON.stringify(config.site);
  }, [localSite, config.site]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const updateSiteState = useCallback((newState: SiteConfig) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
      if (canUndo) setHistoryIndex(prev => prev - 1);
  }, [canUndo]);

  const handleRedo = useCallback(() => {
      if (canRedo) setHistoryIndex(prev => prev + 1);
  }, [canRedo]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              e.preventDefault();
              if (e.shiftKey) handleRedo();
              else handleUndo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Updated Public URL Logic: Uses Subdomain if available
  const publicUrl = useMemo(() => {
      if (localSite.subdomain) {
          return `https://${localSite.subdomain}.luminaphotocrm.com`;
      }
      return `${window.location.origin}?site=${config.ownerId || 'me'}`;
  }, [localSite.subdomain, config.ownerId]);

  const activePageData = useMemo(() => {
      if (activePageId === 'HOME') return localSite;
      return localSite.pages?.find(p => p.id === activePageId) || localSite;
  }, [activePageId, localSite]);

  const handleContentChange = (key: string, value: any) => {
      if (activePageId === 'HOME') {
          updateSiteState({ ...localSite, [key]: value });
      } else {
          updateSiteState({
              ...localSite,
              pages: localSite.pages?.map(p => p.id === activePageId ? { ...p, [key]: value } : p) || []
          });
      }
  };

  const getActiveSections = () => {
      if (activePageId === 'HOME') return [];
      const page = localSite.pages?.find(p => p.id === activePageId);
      return page?.sections || [];
  };

  const handleAddSection = (type: SectionType) => {
      const newSection: SiteSection = {
          id: `sec-${Date.now()}`,
          type,
          content: { 
              headline: 'New Section', 
              description: 'Edit this text.',
              image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=500&q=60' 
          }
      };
      const currentSections = getActiveSections();
      updateSiteState({
          ...localSite,
          pages: localSite.pages?.map(p => p.id === activePageId ? { ...p, sections: [...currentSections, newSection] } : p) || []
      });
      setSelectedSectionId(newSection.id);
  };

  const handleUpdateSection = (id: string, content: any) => {
      const currentSections = getActiveSections();
      const updatedSections = currentSections.map(s => s.id === id ? { ...s, content: { ...s.content, ...content } } : s);
      updateSiteState({
          ...localSite,
          pages: localSite.pages?.map(p => p.id === activePageId ? { ...p, sections: updatedSections } : p) || []
      });
  };

  const handleDeleteSection = (id: string) => {
      const currentSections = getActiveSections();
      updateSiteState({
          ...localSite,
          pages: localSite.pages?.map(p => p.id === activePageId ? { ...p, sections: currentSections.filter(s => s.id !== id) } : p) || []
      });
  };

  const handleReorderSections = (newOrder: SiteSection[]) => {
      updateSiteState({
          ...localSite,
          pages: localSite.pages?.map(p => p.id === activePageId ? { ...p, sections: newOrder } : p) || []
      });
  };

  const handleGlobalChange = (key: string, value: any) => {
      updateSiteState({ ...localSite, [key]: value });
  };

  const handleAddPage = () => {
      if (!newPageName) return;
      const newPage: SitePage = {
          id: `page-${Date.now()}`,
          title: newPageName,
          slug: newPageName.toLowerCase().replace(/\s+/g, '-'),
          headline: newPageName,
          description: '',
          heroImage: localSite.heroImage,
          showPortfolio: false,
          showPricing: false,
          showBookingWidget: false,
          gallery: [],
          sections: []
      };
      updateSiteState({
          ...localSite,
          pages: [...(localSite.pages || []), newPage]
      });
      setNewPageName('');
      setActivePageId(newPage.id);
      setActiveTab('SECTIONS');
  };

  const handleDeletePage = (id: string) => {
      if (confirm('Delete this page?')) {
          updateSiteState({
              ...localSite,
              pages: (localSite.pages || []).filter(p => p.id !== id)
          });
          if (activePageId === id) setActivePageId('HOME');
      }
  };

  const handleHidePage = (id: string, hidden: boolean) => {
      updateSiteState({
          ...localSite,
          pages: (localSite.pages || []).map(p => p.id === id ? { ...p, hidden } : p)
      });
  };

  // Helper to decide theme component
  const renderTheme = () => {
      const props = {
          site: localSite,
          activePage: activePageData,
          packages,
          users,
          config,
          bookings,
          onBooking: onPublicBooking
      };
      
      switch(localSite.theme) {
          case 'ETHEREAL': return <EtherealTheme {...props} />;
          case 'VOGUE': return <VogueTheme {...props} />;
          case 'MINIMAL': return <MinimalTheme {...props} />;
          case 'CINEMA': return <CinemaTheme {...props} />;
          case 'RETRO': return <RetroTheme {...props} />;
          case 'ATELIER': return <AtelierTheme {...props} />;
          case 'HORIZON': return <HorizonTheme {...props} />;
          case 'BOLD': return <BoldTheme {...props} />;
          case 'IMPACT': return <ImpactTheme {...props} />;
          case 'CLEANSLATE': return <CleanSlateTheme {...props} />;
          case 'AUTHORITY': return <AuthorityTheme {...props} />;
          default: return <NoirTheme {...props} />;
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#1a1a1a] flex flex-col md:flex-row h-screen w-screen overflow-hidden">
        {/* Sidebar */}
        <SiteBuilderSidebar 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            isMobile={isMobile}
            localSite={localSite}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activePageId={activePageId}
            setActivePageId={setActivePageId}
            activePageData={activePageData}
            hasChanges={hasChanges}
            themes={THEMES}
            onExit={() => onExit && onExit()}
            onSave={() => onUpdateConfig({ ...config, site: localSite })}
            handleGlobalChange={handleGlobalChange}
            handleContentChange={handleContentChange}
            handleAddSection={handleAddSection}
            handleUpdateSection={handleUpdateSection}
            handleDeleteSection={handleDeleteSection}
            handleMoveSection={() => {}} 
            handleReorderSections={handleReorderSections}
            getActiveSections={getActiveSections}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            handleAddPage={handleAddPage}
            handleDeletePage={handleDeletePage}
            handleHidePage={handleHidePage}
            newPageName={newPageName}
            setNewPageName={setNewPageName}
            newGalleryUrl={newGalleryUrl}
            setNewGalleryUrl={setNewGalleryUrl}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
        />

        {/* Preview Area */}
        <div className="flex-1 flex flex-col relative h-full bg-[#111]">
            <div className="h-14 border-b border-lumina-highlight flex justify-between items-center px-6 bg-lumina-surface shrink-0">
                <div className="flex bg-lumina-base rounded-lg p-1 border border-lumina-highlight">
                    <button onClick={() => setPreviewMode('DESKTOP')} className={`p-2 rounded ${previewMode === 'DESKTOP' ? 'bg-lumina-highlight text-white' : 'text-lumina-muted'}`}><Monitor size={16}/></button>
                    <button onClick={() => setPreviewMode('MOBILE')} className={`p-2 rounded ${previewMode === 'MOBILE' ? 'bg-lumina-highlight text-white' : 'text-lumina-muted'}`}><Smartphone size={16}/></button>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={handleUndo} disabled={!canUndo} className="p-2 text-lumina-muted hover:text-white disabled:opacity-30"><Undo2 size={18}/></button>
                        <button onClick={handleRedo} disabled={!canRedo} className="p-2 text-lumina-muted hover:text-white disabled:opacity-30"><Redo2 size={18}/></button>
                    </div>
                    <div className="h-4 w-px bg-lumina-highlight"></div>
                    {hasChanges ? (
                        <span className="flex items-center gap-2 text-xs font-bold text-lumina-muted cursor-not-allowed">
                            <Globe size={14}/> Save to View Live
                        </span>
                    ) : (
                        <a 
                            href={publicUrl} 
                            target="_blank"
                            className="flex items-center gap-2 text-xs font-bold transition-colors text-emerald-400 hover:text-emerald-300"
                        >
                            <Globe size={14}/> View Live Site
                        </a>
                    )}
                </div>
                {!isSidebarOpen && !isMobile && (
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-lumina-surface border border-lumina-highlight rounded text-white absolute left-4 top-3 hover:bg-lumina-highlight">
                        <PanelLeftOpen size={18}/>
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[#0a0a0a] p-8">
                <motion.div 
                    layout
                    className={`bg-white shadow-2xl transition-all duration-500 overflow-hidden relative border-black
                        ${previewMode === 'MOBILE' 
                            ? 'w-[375px] h-[750px] rounded-[3rem] border-[12px] shadow-[0_0_0_2px_#333]' 
                            : 'w-full h-full rounded-lg border-0'
                        }
                    `}
                >
                    {/* Mobile Bezel & Notch */}
                    {previewMode === 'MOBILE' && (
                        <>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-xl z-50 flex justify-center items-center">
                                <div className="w-16 h-1.5 bg-gray-800 rounded-full"></div>
                            </div>
                            <div className="absolute right-[-14px] top-24 w-[3px] h-12 bg-gray-700 rounded-r-md"></div>
                            <div className="absolute left-[-14px] top-24 w-[3px] h-8 bg-gray-700 rounded-l-md"></div>
                            <div className="absolute left-[-14px] top-36 w-[3px] h-12 bg-gray-700 rounded-l-md"></div>
                        </>
                    )}
                    
                    <SitePreviewFrame className="w-full h-full bg-white" siteConfig={localSite}>
                        {renderTheme()}
                    </SitePreviewFrame>
                </motion.div>
            </div>
        </div>
    </div>
  );
};

export default SiteBuilderView;
