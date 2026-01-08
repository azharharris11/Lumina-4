import React, { useState } from 'react';
import { StudioConfig, StudioRoom, PaymentChannel } from '../../types';
import { DollarSign, CreditCard as BankIcon, FileText, Tag, Clock, Trash2, X, Upload, Loader2, Image as ImageIcon, QrCode } from 'lucide-react';
import { uploadFile } from '../../utils/storageUtils';

interface GeneralTabProps {
    config: StudioConfig;
    setConfig: (config: StudioConfig) => void;
    onSave: () => void;
    onUpdateConfig: (config: StudioConfig) => void;
    bookingsCount?: number; // Optional check for deletions
}

const GeneralTab: React.FC<GeneralTabProps> = ({ config, setConfig, onSave, onUpdateConfig }) => {
    const [newRoom, setNewRoom] = useState<Partial<StudioRoom>>({ name: '', type: 'INDOOR', color: 'gray' });
    const [newPaymentChannel, setNewPaymentChannel] = useState<Partial<PaymentChannel>>({ type: 'BANK', name: '', number: '', holder: '' });
    const [newExpenseCat, setNewExpenseCat] = useState('');
    const [newAssetCat, setNewAssetCat] = useState('');
    const [newClientCat, setNewClientCat] = useState('');
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);
    const [isUploadingQR, setIsUploadingQR] = useState(false);
    const [isUploadingPortalBg, setIsUploadingPortalBg] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setConfig({ ...config, [name]: value });
    };

    const handleAddRoom = () => {
        if (newRoom.name) {
            const room: StudioRoom = { id: `r-${Date.now()}`, name: newRoom.name, type: newRoom.type as any, color: newRoom.color || 'gray' };
            const updatedConfig = { ...config, rooms: [...(config.rooms || []), room] };
            setConfig(updatedConfig);
            onUpdateConfig(updatedConfig); // Immediate save
            setNewRoom({ name: '', type: 'INDOOR', color: 'gray' });
        }
    };

    const handleDeleteRoom = (id: string, name: string) => {
        if (!window.confirm(`Delete studio room '${name}'?`)) return;
        const updatedConfig = { ...config, rooms: (config.rooms || []).filter(r => r.id !== id) };
        setConfig(updatedConfig);
        onUpdateConfig(updatedConfig);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingLogo(true);
            try {
                const file = e.target.files[0];
                const url = await uploadFile(file, 'studio-assets', 'logo');
                setConfig({ ...config, logoUrl: url });
            } catch (error) {
                alert("Failed to upload logo.");
            } finally {
                setIsUploadingLogo(false);
            }
        }
    };

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingSignature(true);
            try {
                const file = e.target.files[0];
                const url = await uploadFile(file, 'studio-assets', 'signature');
                setConfig({ ...config, signatureUrl: url });
            } catch (error) {
                alert("Failed to upload signature.");
            } finally {
                setIsUploadingSignature(false);
            }
        }
    };

    const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingQR(true);
            try {
                const file = e.target.files[0];
                const url = await uploadFile(file, 'studio-assets', 'qris');
                setNewPaymentChannel(prev => ({ ...prev, qrUrl: url }));
            } catch (error) {
                alert("Failed to upload QR code.");
            } finally {
                setIsUploadingQR(false);
            }
        }
    };

    const handlePortalBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingPortalBg(true);
            try {
                const file = e.target.files[0];
                const url = await uploadFile(file, 'studio-assets', 'portal-bg');
                setConfig({ ...config, portalBackgroundUrl: url });
            } catch (error) {
                alert("Failed to upload background.");
            } finally {
                setIsUploadingPortalBg(false);
            }
        }
    };

    const handleAddPaymentChannel = () => {
        if (newPaymentChannel.name && newPaymentChannel.number) {
            const channel: PaymentChannel = {
                id: `pc-${Date.now()}`,
                type: newPaymentChannel.type as any,
                name: newPaymentChannel.name!,
                number: newPaymentChannel.number!,
                holder: newPaymentChannel.holder || '',
                qrUrl: newPaymentChannel.qrUrl
            };
            const updatedConfig = { 
                ...config, 
                paymentChannels: [...(config.paymentChannels || []), channel] 
            };
            setConfig(updatedConfig);
            // Reset form
            setNewPaymentChannel({ type: 'BANK', name: '', number: '', holder: '', qrUrl: '' });
        }
    };

    const handleDeletePaymentChannel = (id: string) => {
        if (!confirm("Remove this payment method?")) return;
        const updatedConfig = {
            ...config,
            paymentChannels: (config.paymentChannels || []).filter(c => c.id !== id)
        };
        setConfig(updatedConfig);
    };

    const addCategory = (listName: 'expenseCategories' | 'assetCategories' | 'clientCategories', value: string, setter: (v: string) => void) => {
        if (value.trim()) {
            const current = config[listName] || [];
            if (!current.includes(value.trim())) {
                setConfig({ ...config, [listName]: [...current, value.trim()] });
            }
            setter('');
        }
    };

    const removeCategory = (listName: 'expenseCategories' | 'assetCategories' | 'clientCategories', value: string) => {
        setConfig({ ...config, [listName]: (config[listName] || []).filter(c => c !== value) });
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">General Settings</h2>
            
            {/* Basic Info */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-lumina-highlight pb-2">Studio Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Studio Name</label><input name="name" value={config.name} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Address</label><input name="address" value={config.address} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Phone</label><input name="phone" value={config.phone} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Website</label><input name="website" value={config.website} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                    
                    {/* Logo Upload Section */}
                    <div>
                        <label className="block text-xs text-lumina-muted mb-1 font-bold">Studio Logo</label>
                        <div className="flex items-center gap-4 p-3 border border-lumina-highlight rounded-lg bg-lumina-base h-[74px]">
                            <div className="w-12 h-12 bg-lumina-surface rounded flex items-center justify-center overflow-hidden border border-lumina-highlight shrink-0">
                                {config.logoUrl ? (
                                    <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon className="text-lumina-muted" size={20} />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-lumina-surface hover:bg-lumina-highlight text-white text-[10px] font-bold rounded-lg transition-colors border border-lumina-highlight">
                                    {isUploadingLogo ? <Loader2 size={12} className="animate-spin"/> : <Upload size={12}/>}
                                    {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Signature Upload Section */}
                    <div>
                        <label className="block text-xs text-lumina-muted mb-1 font-bold">Owner Signature / Stamp</label>
                        <div className="flex items-center gap-4 p-3 border border-lumina-highlight rounded-lg bg-lumina-base h-[74px]">
                            <div className="w-12 h-12 bg-lumina-surface rounded flex items-center justify-center overflow-hidden border border-lumina-highlight shrink-0">
                                {config.signatureUrl ? (
                                    <img src={config.signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon className="text-lumina-muted" size={20} />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-lumina-surface hover:bg-lumina-highlight text-white text-[10px] font-bold rounded-lg transition-colors border border-lumina-highlight">
                                    {isUploadingSignature ? <Loader2 size={12} className="animate-spin"/> : <Upload size={12}/>}
                                    {isUploadingSignature ? 'Uploading...' : 'Upload Signature'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} disabled={isUploadingSignature} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Invoice Prefix</label><input name="invoicePrefix" value={config.invoicePrefix || ''} onChange={handleChange} placeholder="e.g. LUM" className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                </div>
            </div>

            {/* Portal Branding */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-lumina-highlight pb-2">Client Portal Appearance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs text-lumina-muted mb-1 font-bold">Accent Color</label>
                        <div className="flex gap-2">
                            <input type="color" name="portalAccentColor" value={config.portalAccentColor || '#10b981'} onChange={handleChange} className="h-10 w-10 rounded border-none cursor-pointer bg-transparent"/>
                            <input name="portalAccentColor" value={config.portalAccentColor || '#10b981'} onChange={handleChange} className="flex-1 bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white uppercase" placeholder="#10B981"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-lumina-muted mb-1 font-bold">Background Color</label>
                        <div className="flex gap-2">
                            <input type="color" name="portalBackgroundColor" value={config.portalBackgroundColor || '#0a0a0a'} onChange={handleChange} className="h-10 w-10 rounded border-none cursor-pointer bg-transparent"/>
                            <input name="portalBackgroundColor" value={config.portalBackgroundColor || '#0a0a0a'} onChange={handleChange} className="flex-1 bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white uppercase" placeholder="#0A0A0A"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-lumina-muted mb-1 font-bold">Background Image (Optional)</label>
                        <div className="flex items-center gap-2 p-1.5 border border-lumina-highlight rounded-lg bg-lumina-base h-[46px]">
                            <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 h-full bg-lumina-surface hover:bg-lumina-highlight text-white text-[10px] font-bold rounded transition-colors">
                                {isUploadingPortalBg ? <Loader2 size={12} className="animate-spin"/> : <Upload size={12}/>}
                                {config.portalBackgroundUrl ? 'Change Image' : 'Upload Image'}
                                <input type="file" accept="image/*" className="hidden" onChange={handlePortalBgUpload} disabled={isUploadingPortalBg} />
                            </label>
                            {config.portalBackgroundUrl && (
                                <div className="h-full aspect-square relative group">
                                    <img src={config.portalBackgroundUrl} alt="BG" className="h-full w-full object-cover rounded" />
                                    <X size={10} className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-full cursor-pointer hidden group-hover:block" onClick={() => setConfig({...config, portalBackgroundUrl: ''})}/>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Policy */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-lumina-highlight pb-2 flex items-center gap-2"><DollarSign size={16}/> Financial Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Tax Rate (%)</label><input type="number" name="taxRate" value={config.taxRate} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Down Payment (%)</label><input type="number" name="requiredDownPaymentPercentage" value={config.requiredDownPaymentPercentage} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Payment Due (Days)</label><input type="number" name="paymentDueDays" value={config.paymentDueDays} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                </div>
            </div>

            {/* Payment Channels (Dynamic) */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-lumina-highlight pb-2 flex items-center gap-2"><BankIcon size={16}/> Payment Channels</h3>
                
                <div className="space-y-2 mb-4">
                    {(!config.paymentChannels || config.paymentChannels.length === 0) && (
                        <p className="text-xs text-lumina-muted italic">No payment channels added yet.</p>
                    )}
                    {(config.paymentChannels || []).map(channel => (
                        <div key={channel.id} className="flex justify-between items-center bg-lumina-base p-3 rounded-lg border border-lumina-highlight group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-lumina-surface flex items-center justify-center border border-lumina-highlight">
                                    {channel.type === 'QRIS' ? <QrCode size={16} className="text-emerald-500"/> : <BankIcon size={16} className="text-blue-500"/>}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                        {channel.name} 
                                        <span className="text-[10px] text-lumina-muted font-normal bg-lumina-surface px-1.5 rounded">{channel.type}</span>
                                    </p>
                                    <p className="text-xs text-lumina-muted font-mono">{channel.number} {channel.holder ? `(${channel.holder})` : ''}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDeletePaymentChannel(channel.id)} className="p-2 text-lumina-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add New Channel Form */}
                <div className="bg-lumina-base border border-lumina-highlight rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-lumina-muted uppercase mb-2">Add New Channel</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <select 
                            className="bg-lumina-surface border border-lumina-highlight text-white text-xs rounded p-2"
                            value={newPaymentChannel.type}
                            onChange={e => setNewPaymentChannel({...newPaymentChannel, type: e.target.value as any})}
                        >
                            <option value="BANK">Bank Account</option>
                            <option value="E_WALLET">E-Wallet</option>
                            <option value="QRIS">QRIS</option>
                        </select>
                        <input 
                            placeholder={newPaymentChannel.type === 'QRIS' ? "Provider (e.g. GoPay)" : "Bank Name (e.g. BCA)"}
                            value={newPaymentChannel.name} 
                            onChange={e => setNewPaymentChannel({...newPaymentChannel, name: e.target.value})} 
                            className="bg-lumina-surface border border-lumina-highlight text-white text-xs rounded p-2"
                        />
                        <input 
                            placeholder={newPaymentChannel.type === 'QRIS' ? "NMID / ID" : "Account Number"} 
                            value={newPaymentChannel.number} 
                            onChange={e => setNewPaymentChannel({...newPaymentChannel, number: e.target.value})} 
                            className="bg-lumina-surface border border-lumina-highlight text-white text-xs rounded p-2 font-mono"
                        />
                         <input 
                            placeholder="Account Holder (Optional)" 
                            value={newPaymentChannel.holder} 
                            onChange={e => setNewPaymentChannel({...newPaymentChannel, holder: e.target.value})} 
                            className="bg-lumina-surface border border-lumina-highlight text-white text-xs rounded p-2"
                        />
                    </div>
                    
                    {newPaymentChannel.type === 'QRIS' && (
                        <div className="flex items-center gap-2 mt-2">
                             <label className="flex-1 cursor-pointer flex items-center gap-2 p-2 bg-lumina-surface border border-lumina-highlight border-dashed rounded text-xs text-lumina-muted hover:text-white transition-colors">
                                {isUploadingQR ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
                                {newPaymentChannel.qrUrl ? 'Change QR Image' : 'Upload QR Image'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} disabled={isUploadingQR}/>
                            </label>
                            {newPaymentChannel.qrUrl && (
                                <img src={newPaymentChannel.qrUrl} className="h-8 w-8 object-cover rounded bg-white" alt="QR Preview"/>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end mt-2">
                        <button 
                            onClick={handleAddPaymentChannel} 
                            disabled={!newPaymentChannel.name || !newPaymentChannel.number}
                            className="bg-lumina-highlight hover:bg-lumina-accent text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                            Add Channel
                        </button>
                    </div>
                </div>
            </div>

            {/* Legal */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-lumina-highlight pb-2 flex items-center gap-2"><FileText size={16}/> Legal & Footer</h3>
                <div className="grid grid-cols-1 gap-6">
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">NPWP (Tax ID)</label><input name="npwp" value={config.npwp || ''} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white" placeholder="XX.XXX.XXX.X-XXX.XXX"/></div>
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Invoice Footer Note</label><textarea name="invoiceFooter" value={config.invoiceFooter || ''} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white min-h-[80px]" placeholder="Terms & Conditions, Thank you note..."/></div>
                    
                    {/* Contract Terms Editor */}
                    <div className="col-span-1">
                        <label className="block text-xs text-lumina-muted mb-1 font-bold">Default Contract Terms</label>
                        <p className="text-[10px] text-lumina-muted mb-2">These terms will appear on all new digital contracts. You can use simple numbering.</p>
                        <textarea 
                            name="contractTerms" 
                            value={config.contractTerms || ''} 
                            onChange={handleChange} 
                            className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white min-h-[300px] font-mono text-sm leading-relaxed" 
                            placeholder={`1. Payment Terms: ...\n2. Cancellation Policy: ...\n3. Copyright: ...`}
                        />
                    </div>
                </div>
            </div>

            {/* Categories Management */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-lumina-highlight pb-2 flex items-center gap-2"><Tag size={16}/> Custom Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[ 
                        { title: 'Expense Types', list: 'expenseCategories', val: newExpenseCat, set: setNewExpenseCat },
                        { title: 'Asset Types', list: 'assetCategories', val: newAssetCat, set: setNewAssetCat },
                        { title: 'Client Tags', list: 'clientCategories', val: newClientCat, set: setNewClientCat }
                    ].map((grp) => (
                        <div key={grp.list} className="bg-lumina-base border border-lumina-highlight rounded-xl p-4">
                            <h4 className="text-xs font-bold text-lumina-muted uppercase mb-3">{grp.title}</h4>
                            <div className="flex gap-2 mb-3">
                                <input placeholder="Add..." value={grp.val} onChange={e => grp.set(e.target.value)} className="flex-1 bg-lumina-surface border border-lumina-highlight rounded p-1.5 text-white text-xs" onKeyDown={e => e.key === 'Enter' && addCategory(grp.list as any, grp.val, grp.set)} />
                                <button onClick={() => addCategory(grp.list as any, grp.val, grp.set)} className="bg-lumina-highlight px-2 rounded text-white text-xs">+</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(config[grp.list as keyof StudioConfig] as string[] || []).map((cat) => (
                                    <span key={cat} className="bg-lumina-surface px-2 py-1 rounded text-[10px] text-white border border-lumina-highlight flex items-center gap-1">
                                        {cat} <X size={10} className="cursor-pointer text-lumina-muted hover:text-rose-500" onClick={() => removeCategory(grp.list as any, cat)}/>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Operating Hours */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-lumina-highlight pb-2 flex items-center gap-2"><Clock size={16}/> Operating Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Open Time</label><input type="time" name="operatingHoursStart" value={config.operatingHoursStart} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Close Time</label><input type="time" name="operatingHoursEnd" value={config.operatingHoursEnd} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                    <div><label className="block text-xs text-lumina-muted mb-1 font-bold">Buffer (Minutes)</label><input type="number" name="bufferMinutes" value={config.bufferMinutes} onChange={handleChange} className="w-full bg-lumina-base border border-lumina-highlight rounded-lg p-3 text-white"/></div>
                </div>
            </div>

            {/* Rooms */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-lumina-highlight pb-2">Studio Rooms</h3>
                <div className="space-y-3 mb-4">
                    {config.rooms.map(room => (
                        <div key={room.id} className="flex justify-between items-center bg-lumina-base p-3 rounded-lg border border-lumina-highlight">
                            <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full bg-${room.color}-500`}></div>
                                <span className="text-white font-bold">{room.name}</span>
                                <span className="text-xs text-lumina-muted uppercase bg-lumina-surface px-2 py-0.5 rounded">{room.type}</span>
                            </div>
                            <button onClick={() => handleDeleteRoom(room.id, room.name)} className="text-lumina-muted hover:text-rose-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input placeholder="New Room Name" value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} className="flex-1 bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-white text-sm"/>
                    <button onClick={handleAddRoom} className="bg-lumina-accent text-lumina-base px-4 rounded-lg font-bold text-sm">Add</button>
                </div>
            </div>

            <div className="flex justify-end pt-6 sticky bottom-0 bg-lumina-surface py-4 border-t border-lumina-highlight">
                <button onClick={onSave} className="bg-lumina-accent text-lumina-base px-6 py-3 rounded-xl font-bold hover:bg-lumina-accent/90 shadow-lg w-full md:w-auto">Save Changes</button>
            </div>
        </div>
    );
};

export default GeneralTab;
