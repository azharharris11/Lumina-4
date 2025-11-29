
import React, { useState, useEffect } from 'react';
import { Eye, RefreshCcw, HardDrive, Loader2, ExternalLink, AlertTriangle, CheckCircle2, Grid, Heart, Lock, Unlock } from 'lucide-react';
import { Booking, ProofingItem } from '../../types';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

interface DriveFile {
    id: string;
    name: string;
    thumbnailLink: string;
    webViewLink: string;
    mimeType: string;
}

interface ProjectProofingProps {
  booking: Booking;
  googleToken?: string | null;
  onNavigateToFiles: () => void;
}

const ProjectProofing: React.FC<ProjectProofingProps> = ({ booking, googleToken, onNavigateToFiles }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'SELECTED'>('ALL');
  const [proofingFiles, setProofingFiles] = useState<DriveFile[]>([]);
  const [isLoadingProofing, setIsLoadingProofing] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Real-time listener for selections
  const [liveProofingData, setLiveProofingData] = useState<ProofingItem[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
      if(booking.id) {
          const unsub = onSnapshot(doc(db, "bookings", booking.id), (doc) => {
              if(doc.exists()) {
                  const data = doc.data() as Booking;
                  setLiveProofingData(data.proofingData || []);
                  setIsSubmitted(data.selectionSubmitted || false);
              }
          });
          return () => unsub();
      }
  }, [booking.id]);

  const fetchProofingFiles = async () => {
      if (!googleToken || !booking?.deliveryUrl) return;
      const match = booking.deliveryUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      const folderId = match ? match[1] : null;
      if (!folderId) return;
      
      setIsLoadingProofing(true);
      setAuthError(false);
      try {
          const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`;
          const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,thumbnailLink,webViewLink,mimeType)&orderBy=createdTime desc&pageSize=1000`;
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${googleToken}` } });
          
          if (res.status === 401) {
              setAuthError(true);
              return;
          }

          if (res.ok) { const data = await res.json(); setProofingFiles(data.files || []); }
      } catch (e) { console.error(e); } finally { setIsLoadingProofing(false); }
  };

  const handleSyncToPortal = async () => {
      if (proofingFiles.length === 0) return;
      setIsSyncing(true);
      try {
          const currentSelectionsMap = new Map(liveProofingData.map(i => [i.id, i.selected]));
          
          const newProofingData: ProofingItem[] = proofingFiles.map(file => ({
              id: file.id,
              url: file.thumbnailLink.replace('=s220', '=s800'),
              thumbnail: file.thumbnailLink,
              filename: file.name,
              selected: currentSelectionsMap.get(file.id) || false,
              feedback: ''
          }));

          await updateDoc(doc(db, "bookings", booking.id), {
              proofingData: newProofingData
          });
          alert(`Synced ${newProofingData.length} photos to Client Portal.`);
      } catch (e) {
          console.error("Sync failed", e);
          alert("Failed to sync. Please try again.");
      } finally {
          setIsSyncing(false);
      }
  };

  const handleUnlockSelection = async () => {
      if(confirm("Unlock selection? This will allow the client to change their choices.")) {
          await updateDoc(doc(db, "bookings", booking.id), {
              selectionSubmitted: false
          });
      }
  };

  useEffect(() => {
      fetchProofingFiles();
  }, [googleToken, booking?.deliveryUrl]);

  const selectedCount = liveProofingData.filter(i => i.selected).length;
  const displayItems = activeTab === 'ALL' ? proofingFiles : proofingFiles.filter(f => {
      const item = liveProofingData.find(p => p.id === f.id);
      return item?.selected;
  });

  return (
    <div className="bg-lumina-surface border border-lumina-highlight rounded-2xl p-6 min-h-[500px] flex flex-col">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h3 className="font-bold text-white flex items-center gap-2"><Eye size={18} className="text-lumina-accent"/> Proofing Dashboard</h3>
                <p className="text-xs text-lumina-muted mt-1">
                    {liveProofingData.length > 0 ? 'Synced to Portal' : 'Not synced yet'} • {selectedCount} Selected
                </p>
            </div>
            
            <div className="flex gap-2">
                <div className="bg-lumina-base p-1 rounded-lg border border-lumina-highlight flex">
                    <button 
                        onClick={() => setActiveTab('ALL')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${activeTab === 'ALL' ? 'bg-lumina-highlight text-white' : 'text-lumina-muted hover:text-white'}`}
                    >
                        <Grid size={14}/> All
                    </button>
                    <button 
                        onClick={() => setActiveTab('SELECTED')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${activeTab === 'SELECTED' ? 'bg-rose-500/20 text-rose-400' : 'text-lumina-muted hover:text-white'}`}
                    >
                        <Heart size={14} className={activeTab === 'SELECTED' ? 'fill-rose-400' : ''}/> Selected
                    </button>
                </div>

                <button onClick={handleSyncToPortal} disabled={isSyncing || proofingFiles.length === 0} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                    {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <RefreshCcw size={14}/>}
                    {liveProofingData.length > 0 ? 'Re-Sync' : 'Sync'}
                </button>
            </div>
        </div>

        {/* Status Banner */}
        {isSubmitted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-3 text-emerald-400">
                    <CheckCircle2 size={20}/>
                    <div>
                        <p className="font-bold text-sm">Client Selection Submitted</p>
                        <p className="text-xs opacity-80">The client has finalized their {selectedCount} choices. Gallery is locked.</p>
                    </div>
                </div>
                <button onClick={handleUnlockSelection} className="flex items-center gap-2 text-xs font-bold text-lumina-muted hover:text-white bg-lumina-base border border-lumina-highlight px-3 py-2 rounded-lg">
                    <Unlock size={12}/> Unlock
                </button>
            </div>
        ) : liveProofingData.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6 flex items-center gap-3 text-amber-400">
                <Loader2 size={16} className="animate-spin"/>
                <span className="text-xs font-bold">Waiting for client submission...</span>
            </div>
        )}
        
        {authError ? (
            <div className="p-10 text-center border border-dashed border-rose-500/50 rounded-xl bg-rose-500/10">
                <AlertTriangle size={32} className="text-rose-500 mx-auto mb-4"/>
                <p className="text-sm text-white font-bold mb-2">Google Session Expired</p>
                <p className="text-xs text-rose-300 mb-4">Access token is no longer valid. Please refresh your connection.</p>
                <p className="text-[10px] text-lumina-muted">Go to Settings > Profile & Account to reconnect.</p>
            </div>
        ) : !booking?.deliveryUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-lumina-highlight rounded-xl bg-lumina-base/20 min-h-[300px]">
                <HardDrive size={32} className="text-lumina-muted mb-4"/>
                <p className="text-sm text-white font-bold mb-2">No Drive Folder Linked</p>
                <p className="text-xs text-lumina-muted mb-4">Connect a Google Drive folder in the 'Files' tab to start proofing.</p>
                <button onClick={onNavigateToFiles} className="text-xs text-lumina-accent hover:underline">Go to Files</button>
            </div>
        ) : isLoadingProofing ? (
            <div className="flex-1 flex justify-center items-center">
                <Loader2 className="w-8 h-8 text-lumina-accent animate-spin"/>
            </div>
        ) : proofingFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-lumina-highlight rounded-xl bg-lumina-base/20">
                <p className="text-sm text-lumina-muted">Folder is empty.</p>
                <p className="text-xs text-lumina-muted/50 mt-2">Upload images to the linked folder to see them here.</p>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {activeTab === 'SELECTED' && displayItems.length === 0 && (
                    <div className="text-center py-20">
                        <Heart size={32} className="text-lumina-muted mx-auto mb-4 opacity-20"/>
                        <p className="text-lumina-muted text-sm">Client hasn't selected any photos yet.</p>
                    </div>
                )}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {displayItems.map((file) => {
                        const isSelected = liveProofingData.find(p => p.id === file.id)?.selected;
                        return (
                            <div key={file.id} className={`aspect-square rounded-lg overflow-hidden relative group cursor-pointer border-2 transition-all ${isSelected ? 'border-rose-500 shadow-lg shadow-rose-500/10' : 'border-transparent hover:border-lumina-highlight'}`}>
                                <img src={file.thumbnailLink.replace('=s220', '=s400')} className="w-full h-full object-cover" loading="lazy" />
                                
                                {isSelected && (
                                    <div className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full shadow-sm z-10">
                                        <Heart size={12} fill="currentColor"/>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                    <p className="text-[10px] text-white font-mono truncate w-full text-center">{file.name}</p>
                                    <a href={file.webViewLink} target="_blank" className="p-1.5 bg-white text-black rounded-full hover:scale-110 transition-transform" title="View in Drive">
                                        <ExternalLink size={12}/>
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}
    </div>
  );
};

export default ProjectProofing;
