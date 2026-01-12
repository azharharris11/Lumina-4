
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, FolderPlus, X, ArrowLeft, Folder, MoreVertical, Edit, Trash2 } from 'lucide-react';

const Motion = motion as any;

interface DriveFolder {
    id: string;
    name: string;
}

interface ProjectDrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  googleToken: string | null;
  onSelectFolder: (folderId: string, folderName: string) => void;
}

const ProjectDrivePicker: React.FC<ProjectDrivePickerProps> = ({ isOpen, onClose, googleToken, onSelectFolder }) => {
  const [driveBreadcrumbs, setDriveBreadcrumbs] = useState<DriveFolder[]>([{id: 'root', name: 'My Drive'}]);
  const [driveFolderList, setDriveFolderList] = useState<DriveFolder[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [authError, setAuthError] = useState(false); // NEW: Track auth errors
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingItem, setRenamingItem] = useState<DriveFolder | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // New State for Selection
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const currentDriveFolderId = driveBreadcrumbs[driveBreadcrumbs.length - 1].id;

  const fetchDriveFolders = async (parentId: string) => {
      if (!googleToken) return;
      setIsLoadingDrive(true);
      setAuthError(false);
      try {
          const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
          const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`;
          
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${googleToken}` } });
          
          if (res.status === 401) {
              setAuthError(true);
              return;
          }
          
          if (!res.ok) return;
          const data = await res.json();
          setDriveFolderList(data.files || []);
      } catch (e) { console.error(e); } finally { setIsLoadingDrive(false); }
  };

  useEffect(() => {
      if(isOpen) {
          fetchDriveFolders(currentDriveFolderId);
          setSelectedFolderId(null); // Reset selection on open/nav
      } else {
          // Reset on close
          setDriveBreadcrumbs([{id: 'root', name: 'My Drive'}]);
          setDriveFolderList([]);
          setSelectedFolderId(null);
          setAuthError(false);
      }
  }, [isOpen, currentDriveFolderId]);

  const handleNavigateDrive = (folder: DriveFolder) => { 
      setDriveBreadcrumbs(prev => [...prev, folder]); 
      setActiveMenuId(null); 
      setSelectedFolderId(null);
  };
  
  const handleDriveBack = () => { 
      if (driveBreadcrumbs.length > 1) { 
          setDriveBreadcrumbs(prev => prev.slice(0, -1)); 
          setActiveMenuId(null); 
          setSelectedFolderId(null);
      } 
  };

  const createSubFolder = async () => {
      if (!newFolderName.trim() || !googleToken) return;
      setActionLoading(true);
      try {
          const metadata = { name: newFolderName, mimeType: 'application/vnd.google-apps.folder', parents: [currentDriveFolderId] };
          const res = await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(metadata)
          });
          
          if (res.status === 401) { setAuthError(true); return; }

          if (res.ok) {
              const newFolder = await res.json();
              setNewFolderName('');
              setShowNewFolderInput(false);
              // Automatically navigate into the new folder
              setDriveBreadcrumbs(prev => [...prev, { id: newFolder.id, name: newFolder.name }]);
          }
      } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const renameItem = async () => {
      if (!renamingItem || !renameInput.trim() || !googleToken) return;
      try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${renamingItem.id}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: renameInput })
          });
          
          if (res.status === 401) { setAuthError(true); return; }

          setRenamingItem(null);
          fetchDriveFolders(currentDriveFolderId);
      } catch(e) { console.error(e); }
  };

  const trashItem = async (item: DriveFolder) => {
      if (!googleToken || !window.confirm(`Delete folder "${item.name}"?`)) return;
      try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${item.id}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ trashed: true })
          });
          
          if (res.status === 401) { setAuthError(true); return; }

          fetchDriveFolders(currentDriveFolderId);
          setActiveMenuId(null);
      } catch(e) { console.error(e); }
  };

  const handleConfirmSelection = () => {
      if (selectedFolderId) {
          // Select the highlighted child folder
          const folder = driveFolderList.find(f => f.id === selectedFolderId);
          if (folder) onSelectFolder(folder.id, folder.name);
      } else {
          // Select the current parent folder
          const folderName = driveBreadcrumbs[driveBreadcrumbs.length - 1].name;
          onSelectFolder(currentDriveFolderId, folderName);
      }
  };

  const handleFolderClick = (folderId: string) => {
      // Toggle selection: if clicking the already selected one, unselect it.
      if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
      } else {
          setSelectedFolderId(folderId);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <Motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-lumina-surface border border-lumina-highlight w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[80vh]"
        >
            <div className="p-4 border-b border-lumina-highlight flex justify-between items-center bg-lumina-base rounded-t-xl">
                <div>
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">Select Drive Folder</h3>
                    {googleToken && !authError && (
                        <div className="flex items-center gap-1 text-xs text-lumina-muted mt-1 overflow-x-auto no-scrollbar max-w-[200px]">
                            {driveBreadcrumbs.map((crumb, i) => (
                                <React.Fragment key={crumb.id}>
                                    <span 
                                        onClick={() => {
                                            setDriveBreadcrumbs(prev => prev.slice(0, i + 1));
                                            setActiveMenuId(null);
                                        }}
                                        className="hover:text-white cursor-pointer hover:underline whitespace-nowrap"
                                    >
                                        {crumb.name}
                                    </span>
                                    {i < driveBreadcrumbs.length - 1 && <ChevronRight size={10} />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {googleToken && !authError && (
                        <button onClick={() => setShowNewFolderInput(!showNewFolderInput)} className="p-2 hover:bg-lumina-highlight rounded text-lumina-muted hover:text-white" title="New Folder">
                            <FolderPlus size={18} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-lumina-highlight rounded text-lumina-muted hover:text-white">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {!googleToken || authError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                         <Trash2 size={32} className="text-rose-500" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Connection Error</h3>
                    <p className="text-lumina-muted text-sm mb-6">
                        {authError 
                            ? "Your Google session has expired. Please reconnect in Settings." 
                            : "Your Google Account is not connected."}
                    </p>
                    <button onClick={onClose} className="px-6 py-2 bg-lumina-highlight hover:bg-white hover:text-black text-white rounded-lg font-bold transition-colors">
                        Close
                    </button>
                </div>
            ) : (
                <>
                    {showNewFolderInput && (
                        <div className="p-2 bg-lumina-highlight/20 border-b border-lumina-highlight flex gap-2">
                            <input 
                                autoFocus
                                placeholder="New Folder Name"
                                className="flex-1 bg-lumina-base border border-lumina-highlight rounded px-3 py-1.5 text-sm text-white focus:border-lumina-accent outline-none"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createSubFolder()}
                            />
                            <button onClick={createSubFolder} disabled={actionLoading} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold">Create</button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {isLoadingDrive ? (
                            <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-lumina-accent"/></div>
                        ) : (
                            <div className="grid grid-cols-1 gap-1">
                                {driveBreadcrumbs.length > 1 && (
                                    <div onClick={handleDriveBack} className="flex items-center gap-3 p-2 hover:bg-lumina-highlight rounded cursor-pointer text-lumina-muted">
                                        <ArrowLeft size={16} /> <span className="text-sm font-bold">Back</span>
                                    </div>
                                )}
                                {driveFolderList.map(folder => (
                                    <div 
                                        key={folder.id} 
                                        className={`flex items-center justify-between p-2 rounded cursor-pointer group relative transition-colors
                                            ${selectedFolderId === folder.id ? 'bg-lumina-accent/20 border border-lumina-accent/50' : 'hover:bg-lumina-highlight border border-transparent'}
                                        `}
                                        onClick={() => handleFolderClick(folder.id)}
                                        onDoubleClick={() => handleNavigateDrive(folder)}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <Folder className={`shrink-0 ${selectedFolderId === folder.id ? 'text-lumina-accent fill-lumina-accent/20' : 'text-blue-400 fill-blue-400/20'}`} size={18} />
                                            {renamingItem?.id === folder.id ? (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <input 
                                                        autoFocus
                                                        className="bg-black border border-lumina-accent rounded px-2 py-0.5 text-sm text-white w-32"
                                                        value={renameInput}
                                                        onChange={e => setRenameInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && renameItem()}
                                                    />
                                                    <button onClick={renameItem} className="text-xs bg-lumina-accent text-black px-2 rounded">Save</button>
                                                </div>
                                            ) : (
                                                <span className={`text-sm truncate ${selectedFolderId === folder.id ? 'text-white font-bold' : 'text-white'}`}>{folder.name}</span>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            <button 
                                                className="p-1 text-lumina-muted hover:text-white"
                                                title="Open Folder"
                                                onClick={(e) => { e.stopPropagation(); handleNavigateDrive(folder); }}
                                            >
                                                <ChevronRight size={16} />
                                            </button>

                                            <div className="relative" onClick={e => e.stopPropagation()}>
                                                <button 
                                                    className="p-1 text-lumina-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => setActiveMenuId(activeMenuId === folder.id ? null : folder.id)}
                                                >
                                                    <MoreVertical size={14} />
                                                </button>
                                                {activeMenuId === folder.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-32 bg-black border border-lumina-highlight rounded shadow-xl z-50 overflow-hidden">
                                                        <button onClick={() => { setRenamingItem(folder); setRenameInput(folder.name); setActiveMenuId(null); }} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-lumina-highlight flex items-center gap-2"><Edit size={12}/> Rename</button>
                                                        <button onClick={() => trashItem(folder)} className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-lumina-highlight flex items-center gap-2"><Trash2 size={12}/> Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {driveFolderList.length === 0 && (
                                    <p className="text-center text-lumina-muted text-sm py-8">No sub-folders found.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-lumina-highlight bg-lumina-base rounded-b-xl flex justify-between items-center">
                        <button 
                            onClick={handleConfirmSelection}
                            className="w-full px-4 py-3 bg-lumina-accent text-lumina-base font-bold text-sm rounded-lg hover:bg-lumina-accent/90"
                        >
                            {selectedFolderId 
                                ? `Select Folder: "${driveFolderList.find(f => f.id === selectedFolderId)?.name}"`
                                : `Select Current: "${driveBreadcrumbs[driveBreadcrumbs.length - 1].name}"`
                            }
                        </button>
                    </div>
                </>
            )}
        </Motion.div>
    </div>
  );
};

export default ProjectDrivePicker;
