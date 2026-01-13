import React, { useRef, useState, useMemo } from 'react';
import { HardDrive, Plus, Upload, Loader2, Lock, MessageCircle, File, Trash2, Download, ExternalLink, Folder, ChevronDown, ChevronRight } from 'lucide-react';
import { Booking, User, ActivityLog, BookingFile } from '../../types';
import { uploadToGoogleDrive, ensureFolderHierarchy } from '../../utils/googleDriveUtils';
import { useStudio } from '../../contexts/StudioContext'; 
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

interface UploadItem {
    file: File;
    path: string; // Relative path (e.g., "Folder/Subfolder") or "" for root
}

interface ProjectFilesProps {
  booking: Booking;
  currentUser?: User;
  onUpdateBooking: (booking: Booking) => void;
  createLocalLog: (action: string, details?: string) => ActivityLog;
  onOpenDrivePicker: () => void;
  googleToken?: string | null;
}

// Helper to traverse DnD entries
const traverseFileTree = (item: any, path: string = ''): Promise<UploadItem[]> => {
    return new Promise((resolve) => {
        if (item.isFile) {
            item.file((file: File) => {
                resolve([{ file, path }]);
            });
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            const entries: any[] = [];
            
            const readEntries = () => {
                dirReader.readEntries(async (result: any[]) => {
                    if (result.length > 0) {
                        entries.push(...result);
                        readEntries(); // Continue reading (readEntries return max 100 items)
                    } else {
                        // Finished reading directory
                        const promises = entries.map(entry => traverseFileTree(entry, path ? `${path}/${item.name}` : item.name));
                        const results = await Promise.all(promises);
                        resolve(results.flat());
                    }
                });
            };
            readEntries();
        } else {
            resolve([]);
        }
    });
};

const ProjectFiles: React.FC<ProjectFilesProps> = ({ booking, currentUser, onUpdateBooking, createLocalLog, onOpenDrivePicker, googleToken }) => {
  const { addNotification } = useStudio(); // Use Context
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPaymentSettled = useMemo(() => {
      if (!booking) return false;
      const tax = booking.taxSnapshot || 0;
      let subtotal = booking.price;
      if (booking.items && booking.items.length > 0) {
          subtotal = booking.items.reduce((acc, item) => acc + item.total, 0);
      }
      let discountVal = 0;
      if (booking.discount) {
          discountVal = booking.discount.type === 'PERCENT' ? subtotal * (booking.discount.value/100) : booking.discount.value;
      }
      const total = (subtotal - discountVal) * (1 + tax/100);
      return booking.paidAmount >= (total - 100);
  }, [booking]);

  const handleUploadClick = () => { 
      if (!booking.driveFolderId) {
          onOpenDrivePicker();
          return;
      }
      if (!googleToken) {
        alert("Google Account not connected or token expired. Please reconnect in Settings.");
        return;
      }
      fileInputRef.current?.click(); 
  };

  const processUploads = async (items: UploadItem[]) => {
      if (!items || items.length === 0) return;
      
      if (!booking.driveFolderId) {
        alert("No Google Drive folder linked.");
        return;
      }
      if (!googleToken) {
        alert("Missing Google Access Token.");
        return;
      }

      setIsUploading(true);
      setUploadProgress({ current: 0, total: items.length });
      
      const newFiles: BookingFile[] = [];
      const logs: ActivityLog[] = [];
      let successCount = 0;

      // Cache folder IDs to avoid re-fetching/creating same folders multiple times
      const folderCache: Record<string, string> = { '': booking.driveFolderId };

      try {
          for (let i = 0; i < items.length; i++) {
              const { file, path } = items[i];
              
              try {
                  // Determine Target Folder
                  let targetFolderId = booking.driveFolderId;
                  
                  if (path) {
                      if (folderCache[path]) {
                          targetFolderId = folderCache[path];
                      } else {
                          // Create/Find folder hierarchy
                          targetFolderId = await ensureFolderHierarchy(path, booking.driveFolderId, googleToken);
                          folderCache[path] = targetFolderId;
                      }
                  }

                  const driveFile = await uploadToGoogleDrive(file, targetFolderId, googleToken);
                  
                  newFiles.push({
                      id: driveFile.id,
                      name: file.name,
                      path: path,
                      url: driveFile.webViewLink,
                      type: 'DELIVERABLE',
                      uploadedAt: new Date().toISOString(),
                      source: 'GOOGLE_DRIVE'
                  });

                  logs.push(createLocalLog('UPLOAD', `Uploaded: ${path ? path + '/' : ''}${file.name}`));
                  successCount++;
              } catch (err) {
                  console.error(`Failed to upload ${file.name}`, err);
              }
              setUploadProgress({ current: i + 1, total: items.length });
          }

          if (newFiles.length > 0) {
              const updatedFiles = [...(booking.files || []), ...newFiles];
              onUpdateBooking({ 
                  ...booking, 
                  files: updatedFiles,
                  logs: [...logs, ...(booking.logs || [])]
              });
              
              addNotification({
                  type: 'SUCCESS',
                  title: 'Upload Complete',
                  message: `${successCount} file(s) saved to Google Drive.`
              });
          } else {
              alert("Failed to upload files. Check console.");
          }

      } catch (error) {
          console.error("Batch Upload Error", error);
      } finally {
          setIsUploading(false);
          setUploadProgress(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          // Standard input only gives flat list, path is empty
          const items: UploadItem[] = Array.from(e.target.files).map((f: File) => ({ file: f, path: '' }));
          processUploads(items);
      }
  };

  // Drag and Drop Handlers
  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!isUploading && booking.driveFolderId) setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };
  
  const onDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (!isUploading && booking.driveFolderId) {
          const items = e.dataTransfer.items;
          if (items && items.length > 0) {
              const promises: Promise<UploadItem[]>[] = [];
              for (let i = 0; i < items.length; i++) {
                  const item = items[i].webkitGetAsEntry();
                  if (item) {
                      promises.push(traverseFileTree(item));
                  }
              }
              const results = await Promise.all(promises);
              processUploads(results.flat());
          } else if (e.dataTransfer.files.length > 0) {
              // Fallback if items/webkitGetAsEntry is not available
              const uploadItems: UploadItem[] = Array.from(e.dataTransfer.files).map((f: File) => ({ file: f, path: '' }));
              processUploads(uploadItems);
          }
      }
  };

  const toggleFolder = (path: string) => {
      setCollapsedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Group files by path
  const groupedFiles = useMemo(() => {
      const groups: Record<string, BookingFile[]> = {};
      (booking.files || []).forEach(file => {
          const path = file.path || '';
          if (!groups[path]) groups[path] = [];
          groups[path].push(file);
      });
      return groups;
  }, [booking.files]);

  const sortedPaths = useMemo(() => {
      return Object.keys(groupedFiles).sort((a, b) => {
          if (a === '') return -1;
          if (b === '') return 1;
          return a.localeCompare(b);
      });
  }, [groupedFiles]);

  const handleDeleteFile = (fileId: string) => {
      if(window.confirm("Remove this file link? (File remains in Drive)")) {
          const updatedFiles = (booking.files || []).filter(f => f.id !== fileId);
          onUpdateBooking({
              ...booking,
              files: updatedFiles
          });
      }
  };

  const handleDeleteFromDrive = async (fileId: string, fileName: string) => {
      if (!window.confirm(`Are you sure you want to PERMANENTLY delete '${fileName}' from Google Drive? This cannot be undone.`)) return;
      
      try {
          const deleteFn = httpsCallable(functions, 'deleteDriveFile');
          await deleteFn({ fileId });
          
          // Remove from local state
          const updatedFiles = (booking.files || []).filter(f => f.id !== fileId);
          onUpdateBooking({
              ...booking,
              files: updatedFiles
          });
          
          addNotification({ type: 'SUCCESS', title: 'Deleted', message: 'File removed from Google Drive.' });
      } catch (e: any) {
          alert("Failed to delete from Drive: " + e.message);
      }
  };

  const handleRenameInDrive = async (fileId: string, oldName: string) => {
      const newName = prompt("Enter new filename:", oldName);
      if (!newName || newName === oldName) return;

      try {
          const renameFn = httpsCallable(functions, 'renameDriveFile');
          await renameFn({ fileId, newName });

          // Update local state
          const updatedFiles = (booking.files || []).map(f => 
              f.id === fileId ? { ...f, name: newName } : f
          );
          onUpdateBooking({
              ...booking,
              files: updatedFiles
          });

          addNotification({ type: 'SUCCESS', title: 'Renamed', message: 'File renamed successfully.' });
      } catch (e: any) {
          alert("Failed to rename: " + e.message);
      }
  };

  const handleQuickWhatsApp = () => { 
      const url = `https://wa.me/${booking?.clientPhone.replace(/\D/g, '')}`; 
      window.open(url, '_blank'); 
  };

  return (
    <div className="space-y-6">
        <div className="bg-lumina-surface border border-lumina-highlight rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><HardDrive size={18} className="text-lumina-accent"/> Project Files (Google Drive)</h3>
            
            {/* Drive Link Section */}
            <div className="p-4 bg-lumina-base border border-lumina-highlight rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-6 h-6" alt="Drive" />
                    </div>
                    <div>
                        <p className="font-bold text-white text-sm">Google Drive Folder</p>
                        {!googleToken ? (
                             <p className="text-xs text-rose-400 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"/> Google Account Disconnected
                             </p>
                        ) : booking.deliveryUrl ? (
                            <a href={booking.deliveryUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline truncate block max-w-[200px]">{booking.deliveryUrl}</a>
                        ) : (
                            <p className="text-xs text-lumina-muted">No specific folder linked yet.</p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    {!googleToken ? (
                        <button 
                            onClick={() => alert("Please go to Settings > Profile & Account to connect your Google Account first.")}
                            className="flex-1 px-4 py-2 bg-lumina-surface border border-rose-500/50 text-rose-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 hover:bg-rose-500/10"
                        >
                            Connect Account
                        </button>
                    ) : booking.deliveryUrl ? (
                        <a href={booking.deliveryUrl} target="_blank" rel="noreferrer" className="flex-1 text-center px-4 py-2 bg-lumina-surface border border-lumina-highlight hover:bg-lumina-highlight text-white text-xs font-bold rounded-lg transition-colors">
                            Open Folder
                        </a>
                    ) : (
                        <button 
                            onClick={onOpenDrivePicker}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={14}/> Link Folder
                        </button>
                    )}
                </div>
            </div>

            {/* Grouped Files List */}
            <div className="mb-6 space-y-4">
                <h4 className="text-xs font-bold text-lumina-muted uppercase mb-2">Files</h4>
                {(!booking.files || booking.files.length === 0) && (
                    <p className="text-sm text-lumina-muted/50 italic">No files linked.</p>
                )}
                
                {sortedPaths.map(path => (
                    <div key={path} className="space-y-2">
                        {path !== '' && (
                            <button 
                                onClick={() => toggleFolder(path)}
                                className="w-full flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors group"
                            >
                                {collapsedFolders[path] ? <ChevronRight size={14} className="text-lumina-muted" /> : <ChevronDown size={14} className="text-lumina-muted" />}
                                <Folder size={16} className="text-blue-400 fill-blue-400/20" />
                                <span className="text-xs font-bold text-white/80">{path}</span>
                                <span className="text-[10px] text-lumina-muted ml-auto">{groupedFiles[path].length} items</span>
                            </button>
                        )}
                        
                        {!collapsedFolders[path] && (
                            <div className={`${path !== '' ? 'ml-4 pl-4 border-l border-lumina-highlight' : ''} space-y-2`}>
                                {groupedFiles[path].map((file) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-lumina-base/50 border border-lumina-highlight rounded-lg group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-lumina-surface rounded text-lumina-accent">
                                                <File size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{file.name}</p>
                                                <p className="text-[10px] text-lumina-muted">
                                                    {new Date(file.uploadedAt).toLocaleDateString()} • {file.source === 'GOOGLE_DRIVE' ? 'Google Drive' : 'Storage'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-lumina-highlight rounded text-lumina-muted hover:text-white transition-colors" title="View/Download">
                                                {file.source === 'GOOGLE_DRIVE' ? <ExternalLink size={14} /> : <Download size={14} />}
                                            </a>
                                            
                                            {file.source === 'GOOGLE_DRIVE' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleRenameInDrive(file.id, file.name)} 
                                                        className="p-2 hover:bg-lumina-highlight rounded text-lumina-muted hover:text-blue-400 transition-colors" 
                                                        title="Rename in Drive"
                                                    >
                                                        <Plus size={14} className="rotate-45" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteFromDrive(file.id, file.name)} 
                                                        className="p-2 hover:bg-rose-500/20 rounded text-lumina-muted hover:text-rose-500 transition-colors" 
                                                        title="Delete from Google Drive"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}

                                            {file.source !== 'GOOGLE_DRIVE' && (
                                                <button onClick={() => handleDeleteFile(file.id)} className="p-2 hover:bg-rose-500/20 rounded text-lumina-muted hover:text-rose-500 transition-colors" title="Remove Link">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Delivery Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                    onClick={(!googleToken || !booking.driveFolderId) ? undefined : handleUploadClick}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`p-4 border border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all bg-lumina-base/30 h-32 relative
                        ${(!googleToken || !booking.driveFolderId) ? 'border-lumina-highlight opacity-40 cursor-not-allowed' : 
                          isDragging ? 'border-lumina-accent bg-lumina-accent/10 scale-[1.02]' : 'border-lumina-highlight cursor-pointer hover:border-lumina-accent/50 group'}
                        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                    `}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        multiple 
                        onChange={handleFileChange} 
                    />
                    {isUploading ? (
                        <>
                            <Loader2 className="animate-spin text-lumina-accent mb-2" />
                            <p className="text-sm font-bold text-white">Uploading {uploadProgress?.current}/{uploadProgress?.total}...</p>
                        </>
                    ) : (
                        <>
                            <Upload className={`mb-2 transition-colors ${isDragging ? 'text-lumina-accent' : 'text-lumina-muted group-hover:text-white'}`} />
                            <p className="text-sm font-bold text-white">{isDragging ? 'Drop files here' : 'Upload to Drive'}</p>
                            <p className="text-xs text-lumina-muted">
                                {(!googleToken ? 'Connect Google Account First' : !booking.driveFolderId ? 'Link a Folder First' : 'Click or Drag & Drop multiple files')}
                            </p>
                        </>
                    )}
                </div>
                
                <div className="p-4 bg-lumina-base border border-lumina-highlight rounded-xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-sm">Client Access</h4>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isPaymentSettled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {isPaymentSettled ? 'Unlocked' : 'Locked'}
                        </div>
                    </div>
                    <p className="text-xs text-lumina-muted mb-4">
                        {isPaymentSettled 
                            ? "Payment complete. Share the folder link with your client." 
                            : "Outstanding balance detected. Ensure payment before sharing."}
                    </p>
                    <button 
                        disabled={!isPaymentSettled && currentUser?.role !== 'OWNER'}
                        onClick={handleQuickWhatsApp}
                        className="w-full py-2 bg-lumina-surface border border-lumina-highlight hover:bg-lumina-highlight text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {!isPaymentSettled && <Lock size={12}/>} Notify Client
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ProjectFiles;