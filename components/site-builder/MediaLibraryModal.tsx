import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, Trash2, Check, Loader2, Search } from 'lucide-react';
import { uploadFile, compressImage } from '../../utils/storageUtils';
import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';

const Motion = motion as any;

interface MediaLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [images, setImages] = useState<{name: string, url: string, date: number}[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'GRID' | 'LIST'>('GRID');

    useEffect(() => {
        if (isOpen) {
            fetchImages();
        }
    }, [isOpen]);

    const fetchImages = async () => {
        setIsLoading(true);
        try {
            const listRef = ref(storage, 'site-assets');
            const res = await listAll(listRef);
            
            const urls = await Promise.all(
                res.items.map(async (itemRef) => {
                    const url = await getDownloadURL(itemRef);
                    // Mock date since Firebase Storage listAll doesn't return metadata directly efficiently
                    // In a real app, you'd store file metadata in Firestore
                    return { name: itemRef.name, url, date: Date.now() }; 
                })
            );
            setImages(urls);
        } catch (error) {
            console.error("Error fetching images:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            try {
                const originalFile = e.target.files[0];
                
                // Compress image before upload (Client-side optimization)
                // Max width 1920px, 80% quality JPEG
                let fileToUpload: File | Blob = originalFile;
                if (originalFile.type.startsWith('image/')) {
                    try {
                        fileToUpload = await compressImage(originalFile);
                    } catch (compressionError) {
                        console.warn("Image compression failed, uploading original.", compressionError);
                    }
                }

                const url = await uploadFile(fileToUpload, 'site-assets', originalFile.name);
                // Optimistic update
                setImages(prev => [{ name: originalFile.name, url, date: Date.now() }, ...prev]);
            } catch (err) {
                console.error("Upload error:", err);
                alert("Upload failed.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleDelete = async (url: string, name: string) => {
        if (!confirm('Delete this image permanently?')) return;
        try {
            const fileRef = ref(storage, `site-assets/${name}`);
            await deleteObject(fileRef);
            setImages(prev => prev.filter(img => img.url !== url));
        } catch (e) {
            console.error("Delete failed", e);
            alert("Could not delete file. It might not exist.");
        }
    };

    const filteredImages = images.filter(img => img.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <Motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#1a1a1a] w-full max-w-4xl h-[80vh] rounded-2xl border border-[#333] shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#222]">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <ImageIcon size={18} className="text-blue-500"/> Media Library
                            </h3>
                            <button onClick={onClose} className="p-2 hover:bg-[#333] rounded-full text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Toolbar */}
                        <div className="p-4 border-b border-[#333] flex flex-col md:flex-row gap-4 justify-between items-center bg-[#1a1a1a]">
                            <div className="relative w-full md:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                                <input 
                                    type="text" 
                                    placeholder="Search files..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#111] border border-[#333] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-bold transition-colors shadow-lg shadow-blue-900/20">
                                    {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                                    <span>Upload New</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
                                </label>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#111]">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-500 flex-col gap-4">
                                    <Loader2 size={32} className="animate-spin text-blue-500"/>
                                    <p className="text-sm font-medium">Loading assets...</p>
                                </div>
                            ) : filteredImages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                                    <ImageIcon size={48} className="mb-4 text-[#333]"/>
                                    <p className="text-sm">No images found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {filteredImages.map((img) => (
                                        <div key={img.url} className="group relative aspect-square bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden hover:border-blue-500 transition-all cursor-pointer">
                                            <img 
                                                src={img.url} 
                                                className="w-full h-full object-cover" 
                                                onClick={() => { onSelect(img.url); onClose(); }}
                                            />
                                            
                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(img.url, img.name); }}
                                                        className="p-1.5 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                                <button 
                                                    onClick={() => { onSelect(img.url); onClose(); }}
                                                    className="w-full py-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Check size={12}/> Select
                                                </button>
                                            </div>
                                            
                                            {/* Name Label */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a]/90 backdrop-blur-sm p-1.5 border-t border-[#333]">
                                                <p className="text-[9px] text-gray-400 truncate">{img.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MediaLibraryModal;