import React, { useState } from 'react';
import { Package, Asset, PackageCostItem } from '../../types';
import { Plus, Edit2, Archive, RefreshCcw, X, Layers, DollarSign, ListChecks, ArrowLeft, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Motion = motion as any;

interface PackagesTabProps {
    packages: Package[];
    onAddPackage: (pkg: Package) => void;
    onUpdatePackage: (pkg: Package) => void;
    onDeletePackage?: (id: string) => void;
    assets: Asset[];
}

const PackagesTab: React.FC<PackagesTabProps> = ({ packages, onAddPackage, onUpdatePackage, assets }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorTab, setEditorTab] = useState<'INFO' | 'FINANCE' | 'WORKFLOW'>('INFO');
    const [isEditing, setIsEditing] = useState(false);
    
    // Editor State
    const [pkgForm, setPkgForm] = useState<Partial<Package>>({});
    const [featureInput, setFeatureInput] = useState('');
    const [taskInput, setTaskInput] = useState('');
    const [newCostItem, setNewCostItem] = useState<Partial<PackageCostItem>>({ description: '', amount: 0, category: 'OTHER' });

    const openEditor = (pkg?: Package) => {
        if (pkg) {
            setPkgForm({
                ...pkg,
                costBreakdown: pkg.costBreakdown || [],
                defaultTasks: pkg.defaultTasks || [],
                defaultAssetIds: pkg.defaultAssetIds || [],
                features: pkg.features || [],
                depositOverride: pkg.depositOverride || { type: 'PERCENTAGE', value: 0 }
            });
            setIsEditing(true);
        } else {
            setPkgForm({
                name: '',
                price: 0,
                duration: 2,
                category: 'General',
                features: [],
                active: true,
                turnaroundDays: 7,
                costBreakdown: [],
                defaultTasks: ['Cull Photos', 'Color Grade', 'Retouch', 'Export', 'Upload Gallery'],
                defaultAssetIds: [],
                defaultAssetIds: [],
                depositOverride: { type: 'PERCENTAGE', value: 50 }, // Default 50%
                taxIncluded: false
            });
            setIsEditing(false);
        }
        setEditorTab('INFO');
        setIsEditorOpen(true);
    };

    const handleSave = () => {
        if (!pkgForm.name || !pkgForm.price) {
            alert("Package name and price are required.");
            return;
        }

        const finalPkg: Package = {
            id: pkgForm.id || `p-${Date.now()}`,
            name: pkgForm.name,
            category: pkgForm.category || 'General',
            price: Number(pkgForm.price),
            duration: Number(pkgForm.duration),
            features: pkgForm.features || [],
            active: pkgForm.active !== undefined ? pkgForm.active : true,
            archived: pkgForm.archived || false,
            turnaroundDays: Number(pkgForm.turnaroundDays) || 7,
            costBreakdown: pkgForm.costBreakdown || [],
            defaultTasks: pkgForm.defaultTasks || [],
            defaultAssetIds: pkgForm.defaultAssetIds || [],
            depositOverride: pkgForm.depositOverride,
            taxIncluded: pkgForm.taxIncluded || false
        };

        if (isEditing) {
            onUpdatePackage(finalPkg);
        } else {
            onAddPackage(finalPkg);
        }
        setIsEditorOpen(false);
    };

    const handleArchive = (pkg: Package) => {
        if (window.confirm(`Are you sure you want to archive "${pkg.name}"?`)) {
            onUpdatePackage({ ...pkg, active: false, archived: true });
        }
    };

    const toggleActive = (pkg: Package) => {
        onUpdatePackage({ ...pkg, active: !pkg.active });
    };

    // Helper functions for array manipulation
    const addFeature = () => { if (featureInput.trim()) { setPkgForm(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] })); setFeatureInput(''); } };
    const removeFeature = (idx: number) => { setPkgForm(prev => ({ ...prev, features: (prev.features || []).filter((_, i) => i !== idx) })); };
    
    const addTask = () => { if (taskInput.trim()) { setPkgForm(prev => ({ ...prev, defaultTasks: [...(prev.defaultTasks || []), taskInput.trim()] })); setTaskInput(''); } };
    const removeTask = (idx: number) => { setPkgForm(prev => ({ ...prev, defaultTasks: (prev.defaultTasks || []).filter((_, i) => i !== idx) })); };

    const toggleAsset = (assetId: string) => {
        const current = pkgForm.defaultAssetIds || [];
        if (current.includes(assetId)) {
            setPkgForm(prev => ({ ...prev, defaultAssetIds: current.filter(id => id !== assetId) }));
        } else {
            setPkgForm(prev => ({ ...prev, defaultAssetIds: [...current, assetId] }));
        }
    };

    const addCost = () => {
        if (newCostItem.description && newCostItem.amount) {
            const item: PackageCostItem = {
                id: `cost-${Date.now()}`,
                description: newCostItem.description,
                amount: Number(newCostItem.amount),
                category: newCostItem.category as any
            };
            setPkgForm(prev => ({ ...prev, costBreakdown: [...(prev.costBreakdown || []), item] }));
            setNewCostItem({ description: '', amount: 0, category: 'OTHER' });
        }
    };
    const removeCost = (id: string) => { setPkgForm(prev => ({ ...prev, costBreakdown: (prev.costBreakdown || []).filter(c => c.id !== id) })); };

    // Group packages by category
    const groupedPackages = packages.reduce((acc, pkg) => {
        if (pkg.archived) return acc;
        const cat = pkg.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(pkg);
        return acc;
    }, {} as Record<string, Package[]>);

    return (
        <div className="relative min-h-[600px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Service Packages</h2>
                    <p className="text-sm text-lumina-muted">Manage your offerings, pricing, and workflows.</p>
                </div>
                <button onClick={() => openEditor()} className="bg-lumina-accent text-lumina-base px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-lumina-accent/90 transition-colors">
                    <Plus size={18}/> Create Package
                </button>
            </div>

            {/* PACKAGE LIST GRID */}
            <div className="space-y-8">
                {Object.entries(groupedPackages).map(([category, pkgs]: [string, Package[]]) => (
                    <div key={category}>
                        <h3 className="text-sm font-bold text-lumina-muted uppercase tracking-wider mb-3 pl-1 border-l-2 border-lumina-accent/50">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pkgs.map(pkg => (
                                <div key={pkg.id} className={`p-5 rounded-2xl border transition-all group hover:shadow-lg ${pkg.active ? 'bg-lumina-base border-lumina-highlight hover:border-lumina-accent/50' : 'bg-lumina-base/30 border-lumina-highlight/30 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-white text-lg">{pkg.name}</h4>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] bg-lumina-surface px-2 py-0.5 rounded border border-lumina-highlight text-lumina-muted">{pkg.duration} Hours</span>
                                                <span className="text-[10px] bg-lumina-surface px-2 py-0.5 rounded border border-lumina-highlight text-lumina-muted">{pkg.turnaroundDays} Days Turnaround</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => toggleActive(pkg)} className="p-1.5 bg-lumina-surface rounded text-lumina-muted hover:text-white" title={pkg.active ? "Deactivate" : "Activate"}><RefreshCcw size={14}/></button>
                                            <button onClick={() => openEditor(pkg)} className="p-1.5 bg-lumina-surface rounded text-lumina-muted hover:text-white"><Edit2 size={14}/></button>
                                            <button onClick={() => handleArchive(pkg)} className="p-1.5 bg-lumina-surface rounded text-lumina-muted hover:text-rose-500"><Archive size={14}/></button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1 mb-4 h-12 overflow-hidden content-start">
                                        {pkg.features.slice(0, 3).map((f, i) => (
                                            <span key={i} className="text-[10px] text-lumina-muted px-1.5 py-0.5 border border-lumina-highlight rounded bg-lumina-base/50">{f}</span>
                                        ))}
                                        {pkg.features.length > 3 && <span className="text-[10px] text-lumina-muted px-1.5 py-0.5">+{pkg.features.length - 3} more</span>}
                                    </div>

                                    <div className="flex justify-between items-end border-t border-lumina-highlight/50 pt-3">
                                        <div>
                                            <p className="text-[10px] text-lumina-muted uppercase font-bold">Starting At</p>
                                            <p className="text-xl font-mono font-bold text-emerald-400">Rp {(pkg.price / 1000).toFixed(0)}k</p>
                                        </div>
                                        {pkg.taxIncluded && (
                                            <span className="text-[10px] text-lumina-muted bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold">Tax Inc.</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* EDITOR DRAWER / MODAL */}
            <AnimatePresence>
                {isEditorOpen && (
                    <>
                        <Motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" 
                            onClick={() => setIsEditorOpen(false)}
                        />
                        <Motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-lumina-surface border-l border-lumina-highlight z-[110] flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-lumina-highlight flex justify-between items-center bg-lumina-base">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setIsEditorOpen(false)} className="p-2 hover:bg-lumina-highlight rounded-lg text-lumina-muted hover:text-white"><ArrowLeft size={20}/></button>
                                    <h3 className="text-xl font-bold text-white">{isEditing ? 'Edit Package' : 'New Package'}</h3>
                                </div>
                                <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                                    <Save size={18}/> Save
                                </button>
                            </div>

                            <div className="flex border-b border-lumina-highlight bg-lumina-surface px-6">
                                {[
                                    { id: 'INFO', label: 'Basic Info', icon: Layers },
                                    { id: 'FINANCE', label: 'Financials', icon: DollarSign },
                                    { id: 'WORKFLOW', label: 'Workflow', icon: ListChecks },
                                ].map(tab => (
                                    <button 
                                        key={tab.id}
                                        onClick={() => setEditorTab(tab.id as any)}
                                        className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${editorTab === tab.id ? 'border-lumina-accent text-white' : 'border-transparent text-lumina-muted hover:text-white'}`}
                                    >
                                        <tab.icon size={14}/> {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-lumina-base space-y-6">
                                
                                {editorTab === 'INFO' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="text-xs font-bold text-lumina-muted uppercase mb-1 block">Package Name</label>
                                                <input autoFocus className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" value={pkgForm.name} onChange={e => setPkgForm({...pkgForm, name: e.target.value})} placeholder="e.g. Wedding Cinematic" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-lumina-muted uppercase mb-1 block">Category</label>
                                                <input className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" value={pkgForm.category} onChange={e => setPkgForm({...pkgForm, category: e.target.value})} placeholder="e.g. Wedding" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-lumina-muted uppercase mb-1 block">Price (IDR)</label>
                                                <input type="number" className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" value={pkgForm.price} onChange={e => setPkgForm({...pkgForm, price: Number(e.target.value)})} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-lumina-muted uppercase mb-1 block">Duration (Hours)</label>
                                                <input type="number" className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" value={pkgForm.duration} onChange={e => setPkgForm({...pkgForm, duration: Number(e.target.value)})} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-lumina-muted uppercase mb-1 block">Turnaround (Days)</label>
                                                <input type="number" className="w-full bg-lumina-surface border border-lumina-highlight rounded-lg p-3 text-white focus:border-lumina-accent outline-none" value={pkgForm.turnaroundDays} onChange={e => setPkgForm({...pkgForm, turnaroundDays: Number(e.target.value)})} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-lumina-muted uppercase mb-2 block">Included Features</label>
                                            <div className="flex gap-2 mb-2">
                                                <input 
                                                    className="flex-1 bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-white text-sm focus:border-lumina-accent outline-none"
                                                    placeholder="e.g. 2 Photographers"
                                                    value={featureInput}
                                                    onChange={e => setFeatureInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addFeature()}
                                                />
                                                <button onClick={addFeature} className="bg-lumina-highlight px-4 rounded-lg text-white font-bold">+</button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {((pkgForm.features as string[]) || []).map((f, i) => (
                                                    <span key={i} className="bg-lumina-surface border border-lumina-highlight px-3 py-1 rounded-lg text-sm text-white flex items-center gap-2">
                                                        {f} <button onClick={() => removeFeature(i)}><X size={12} className="text-lumina-muted hover:text-white"/></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {editorTab === 'FINANCE' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="bg-lumina-surface border border-lumina-highlight rounded-xl p-4 space-y-4">
                                            <h4 className="font-bold text-white text-sm">Payment Rules</h4>
                                            
                                            <div className="flex items-center justify-between p-3 bg-lumina-base rounded-lg border border-lumina-highlight">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">Price Includes Tax?</span>
                                                    <span className="text-xs text-lumina-muted">If ON, tax won't be added on top.</span>
                                                </div>
                                                <button 
                                                    onClick={() => setPkgForm(p => ({...p, taxIncluded: !p.taxIncluded}))}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${pkgForm.taxIncluded ? 'bg-emerald-500' : 'bg-lumina-highlight'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pkgForm.taxIncluded ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-lumina-muted uppercase mb-2 block">Required Down Payment</label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        className="bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-white text-sm outline-none"
                                                        value={pkgForm.depositOverride?.type || 'PERCENTAGE'}
                                                        onChange={e => setPkgForm(p => ({...p, depositOverride: { type: e.target.value as any, value: p.depositOverride?.value || 0 }}))}
                                                    >
                                                        <option value="PERCENTAGE">Percentage (%)</option>
                                                        <option value="FIXED">Fixed Amount (Rp)</option>
                                                    </select>
                                                    <input 
                                                        type="number" 
                                                        className="flex-1 bg-lumina-base border border-lumina-highlight rounded-lg p-2 text-white text-sm outline-none"
                                                        value={pkgForm.depositOverride?.value}
                                                        onChange={e => setPkgForm(p => ({...p, depositOverride: { type: p.depositOverride?.type || 'PERCENTAGE', value: Number(e.target.value) }}))}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-white text-sm mb-3">Cost of Goods Sold (COGS)</h4>
                                            <p className="text-xs text-lumina-muted mb-3">Track internal costs to calculate true profit for this package.</p>
                                            
                                            <div className="flex gap-2 mb-2">
                                                <input placeholder="Expense Item" value={newCostItem.description} onChange={e => setNewCostItem({...newCostItem, description: e.target.value})} className="flex-[2] bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-white text-xs"/>
                                                <input type="number" placeholder="Cost" value={newCostItem.amount || ''} onChange={e => setNewCostItem({...newCostItem, amount: Number(e.target.value)})} className="flex-1 bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-white text-xs"/>
                                                <select value={newCostItem.category} onChange={e => setNewCostItem({...newCostItem, category: e.target.value as any})} className="flex-1 bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-white text-xs">
                                                    <option value="LABOR">Labor</option>
                                                    <option value="MATERIAL">Material</option>
                                                    <option value="OTHER">Other</option>
                                                </select>
                                                <button onClick={addCost} className="bg-lumina-highlight px-3 rounded-lg text-white font-bold text-xs">+</button>
                                            </div>

                                            <div className="space-y-1">
                                                {((pkgForm.costBreakdown as PackageCostItem[]) || []).map(cost => (
                                                    <div key={cost.id} className="flex justify-between items-center bg-lumina-surface px-3 py-2 rounded-lg border border-lumina-highlight text-xs">
                                                        <span className="text-white font-bold">{cost.description}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lumina-muted bg-lumina-base px-2 rounded">{cost.category}</span>
                                                            <span className="text-rose-400 font-mono">Rp {cost.amount.toLocaleString()}</span>
                                                            <button onClick={() => removeCost(cost.id)}><X size={12} className="text-lumina-muted hover:text-white"/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between items-center px-3 py-2 mt-2 border-t border-lumina-highlight">
                                                    <span className="text-xs font-bold text-lumina-muted uppercase">Total Cost</span>
                                                    <span className="text-sm font-bold text-rose-400 font-mono">
                                                        Rp {((pkgForm.costBreakdown as PackageCostItem[]) || []).reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {editorTab === 'WORKFLOW' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div>
                                            <h4 className="font-bold text-white text-sm mb-2">Production Checklist</h4>
                                            <p className="text-xs text-lumina-muted mb-4">Tasks automatically added to the Kanban board when this package is booked.</p>
                                            
                                            <div className="flex gap-2 mb-3">
                                                <input 
                                                    className="flex-1 bg-lumina-surface border border-lumina-highlight rounded-lg p-2 text-white text-sm focus:border-lumina-accent outline-none"
                                                    placeholder="Add Task (e.g. Backup Files)"
                                                    value={taskInput}
                                                    onChange={e => setTaskInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addTask()}
                                                />
                                                <button onClick={addTask} className="bg-lumina-highlight px-4 rounded-lg text-white font-bold">+</button>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {((pkgForm.defaultTasks as string[]) || []).map((task, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-lumina-surface px-4 py-2 rounded-lg border border-lumina-highlight group">
                                                        <span className="text-sm text-white">{task}</span>
                                                        <button onClick={() => removeTask(i)} className="text-lumina-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="border-t border-lumina-highlight pt-6">
                                            <h4 className="font-bold text-white text-sm mb-2">Equipment Reservation</h4>
                                            <p className="text-xs text-lumina-muted mb-4">Select items that should be automatically flagged when this package is booked.</p>
                                            
                                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-lumina-surface rounded-xl border border-lumina-highlight">
                                                {assets.map(asset => (
                                                    <button 
                                                        key={asset.id}
                                                        onClick={() => toggleAsset(asset.id)}
                                                        className={`px-3 py-1.5 text-xs border rounded-lg transition-all ${((pkgForm.defaultAssetIds as string[]) || []).includes(asset.id) ? 'bg-lumina-accent text-lumina-base border-lumina-accent font-bold' : 'text-lumina-muted border-lumina-highlight hover:border-white'}`}
                                                    >
                                                        {asset.name}
                                                    </button>
                                                ))}
                                                {assets.length === 0 && <p className="text-xs text-lumina-muted italic p-2">No assets in inventory.</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </Motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PackagesTab;