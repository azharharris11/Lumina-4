
import React, { useState, useEffect } from 'react';
import { SiteSection } from '../../types';
import { Trash2, Video, MousePointerClick, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadFile } from '../../utils/storageUtils';

// Helper Components
export const DebouncedInput = ({ value, onChange, className, placeholder, type = 'text', ...props }: any) => {
    const [localValue, setLocalValue] = useState(value);
    
    useEffect(() => {
        setLocalValue(value);
    }, [value]);
    
    const handleBlur = () => {
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <input 
            type={type}
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
            placeholder={placeholder}
            {...props}
        />
    );
};

export const DebouncedTextarea = ({ value, onChange, className, placeholder, ...props }: any) => {
    const [localValue, setLocalValue] = useState(value);
    
    useEffect(() => {
        setLocalValue(value);
    }, [value]);
    
    const handleBlur = () => {
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    return (
        <textarea 
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            className={className}
            placeholder={placeholder}
            {...props}
        />
    );
};

export const ImageUploader = ({ value, onChange, className }: any) => {
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            try {
                const url = await uploadFile(e.target.files[0], 'site-assets');
                onChange(url);
            } catch (err) {
                alert("Upload failed.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="flex gap-2 items-center">
            <DebouncedInput 
                value={value || ''}
                onChange={onChange}
                className={className}
                placeholder="Image URL..."
            />
            <label className="p-2 bg-lumina-surface border border-lumina-highlight rounded-lg hover:bg-lumina-highlight cursor-pointer text-white transition-colors">
                {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
            </label>
            {value && (
                <div className="w-9 h-9 rounded overflow-hidden border border-lumina-highlight shrink-0 bg-black relative group">
                    <img src={value} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon size={12} className="text-white"/>
                    </div>
                </div>
            )}
        </div>
    );
}

interface SiteSectionEditorProps {
    section: SiteSection;
    onUpdate: (id: string, content: any) => void;
    onDelete: (id: string) => void;
}

const SiteSectionEditor: React.FC<SiteSectionEditorProps> = ({ section, onUpdate, onDelete }) => {
    return (
        <div className="space-y-3 p-4 bg-lumina-base border border-lumina-highlight rounded-xl mt-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase text-white bg-lumina-accent/20 text-lumina-accent px-2 py-0.5 rounded border border-lumina-accent/20">{section.type.replace('_', ' ')}</span>
                <button onClick={() => onDelete(section.id)} className="text-lumina-muted hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
            </div>
            
            {section.type !== 'GALLERY' && section.type !== 'PRICING' && section.type !== 'TESTIMONIALS' && section.type !== 'FAQ' && section.type !== 'MAP_LOCATION' && (
                <div>
                    <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Headline</label>
                    <DebouncedInput 
                        value={section.content.headline || ''}
                        onChange={(val: string) => onUpdate(section.id, { headline: val })}
                        className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none"
                    />
                </div>
            )}
            
            {(section.type === 'HERO' || section.type === 'TEXT_IMAGE' || section.type === 'CTA_BANNER') && (
                <div>
                    <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Description</label>
                    <DebouncedTextarea 
                        value={section.content.description || ''}
                        onChange={(val: string) => onUpdate(section.id, { description: val })}
                        className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none min-h-[80px]"
                    />
                </div>
            )}
            
            {(section.type === 'HERO' || section.type === 'TEXT_IMAGE') && (
                <div>
                    <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Image</label>
                    <ImageUploader 
                        value={section.content.image}
                        onChange={(url: string) => onUpdate(section.id, { image: url })}
                        className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none"
                    />
                </div>
            )}

            {section.type === 'HERO' && (
                <div>
                    <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold flex items-center gap-1"><Video size={10}/> Video Background URL (Optional)</label>
                    <DebouncedInput 
                        placeholder="https://... (mp4/webm)"
                        value={section.content.videoUrl || ''}
                        onChange={(val: string) => onUpdate(section.id, { videoUrl: val })}
                        className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none"
                    />
                </div>
            )}
            
            {section.type === 'TEXT_IMAGE' && (
                <div>
                    <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Layout</label>
                    <div className="flex bg-lumina-surface rounded-lg p-1 border border-lumina-highlight">
                        {['LEFT', 'RIGHT', 'CENTER'].map((layout) => (
                            <button 
                                key={layout}
                                onClick={() => onUpdate(section.id, { layout })}
                                className={`flex-1 text-[10px] font-bold py-1.5 rounded ${section.content.layout === layout ? 'bg-lumina-highlight text-white' : 'text-lumina-muted'}`}
                            >
                                {layout}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {section.type === 'FEATURES' && (
                <div>
                    <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Features List</label>
                    {section.content.items?.map((item, idx) => (
                        <div key={idx} className="mb-2 pb-2 border-b border-lumina-highlight/50 last:border-0">
                            <input 
                                value={item.title} 
                                onChange={(e) => {
                                    const newItems = [...(section.content.items || [])];
                                    newItems[idx].title = e.target.value;
                                    onUpdate(section.id, { items: newItems });
                                }}
                                className="w-full bg-transparent border-none p-1 text-xs text-white font-bold placeholder-gray-600 focus:ring-0"
                                placeholder="Title"
                            />
                            <textarea 
                                value={item.text} 
                                onChange={(e) => {
                                    const newItems = [...(section.content.items || [])];
                                    newItems[idx].text = e.target.value;
                                    onUpdate(section.id, { items: newItems });
                                }}
                                className="w-full bg-transparent border-none p-1 text-xs text-lumina-muted placeholder-gray-700 focus:ring-0 resize-none h-12"
                                placeholder="Description"
                            />
                        </div>
                    ))}
                    <button 
                        onClick={() => onUpdate(section.id, { items: [...(section.content.items || []), { title: 'New Feature', text: 'Description here.' }] })}
                        className="w-full py-1.5 border border-dashed border-lumina-highlight rounded text-[10px] text-lumina-muted hover:text-white hover:border-lumina-accent"
                    >
                        + Add Feature
                    </button>
                </div>
            )}
            
            {section.type === 'CTA_BANNER' && (
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Button Text</label>
                        <DebouncedInput 
                            value={section.content.buttonText || ''}
                            onChange={(val: string) => onUpdate(section.id, { buttonText: val })}
                            className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold flex items-center gap-1"><MousePointerClick size={10}/> Action Type</label>
                        <select 
                            value={section.content.bookingMode || 'INSTANT'} 
                            onChange={(e) => onUpdate(section.id, { bookingMode: e.target.value })}
                            className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white focus:border-lumina-accent outline-none"
                        >
                            <option value="INSTANT">Scroll to Booking</option>
                            <option value="INQUIRY">Scroll to Inquiry Form</option>
                        </select>
                    </div>
                </div>
            )}

            {section.type === 'MAP_LOCATION' && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Latitude</label>
                            <input 
                                type="number" step="0.0001"
                                value={section.content.mapConfig?.lat || -6.200000}
                                onChange={(e) => onUpdate(section.id, { mapConfig: { ...section.content.mapConfig, lat: parseFloat(e.target.value) } })}
                                className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Longitude</label>
                            <input 
                                type="number" step="0.0001"
                                value={section.content.mapConfig?.lng || 106.816666}
                                onChange={(e) => onUpdate(section.id, { mapConfig: { ...section.content.mapConfig, lng: parseFloat(e.target.value) } })}
                                className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-lumina-muted uppercase block mb-1 font-bold">Label</label>
                        <DebouncedInput 
                            value={section.content.mapConfig?.label || 'Our Studio'}
                            onChange={(val: string) => onUpdate(section.id, { mapConfig: { ...section.content.mapConfig, label: val } })}
                            className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-xs text-white"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SiteSectionEditor;
