
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, OnboardingData } from '../types';
import { Aperture, ArrowRight, Camera, Briefcase, Building, Zap, Check, User as UserIcon, Clock, DollarSign, Tag, ArrowLeft, MapPin, Phone, Plus, Trash2, Percent, AlertCircle, RefreshCw, Users, Palette, Monitor, Home } from 'lucide-react';

const Motion = motion as any;

interface OnboardingViewProps {
  user: User;
  onComplete: (data: OnboardingData) => Promise<void>;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);
  
  // Form State
  const [studioName, setStudioName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  
  // Personalization State
  const [businessType, setBusinessType] = useState<'FREELANCE' | 'STUDIO' | 'AGENCY'>('STUDIO');
  const [teamSize, setTeamSize] = useState<'SOLO' | 'SMALL' | 'LARGE'>('SOLO');
  const [visualTheme, setVisualTheme] = useState<'MODERN' | 'CLASSIC' | 'PLAYFUL'>('MODERN');

  const [focus, setFocus] = useState('');
  
  const [opHours, setOpHours] = useState({ start: '09:00', end: '18:00' });
  const [rooms, setRooms] = useState<string[]>(['Main Studio']);
  const [newRoom, setNewRoom] = useState('');

  const [bank, setBank] = useState({ name: '', number: '', holder: '' });
  const [taxRate, setTaxRate] = useState<number>(0);
  
  const [pkg, setPkg] = useState({ name: 'Standard Session', price: 1000000, duration: 2 });

  // Loading State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing Core System...');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
      setStudioName(user.name ? `${user.name.split(' ')[0]}'s Studio` : 'My Studio');
  }, [user.name]);

  // Auto-fill Package based on Focus
  useEffect(() => {
      if (focus === 'WEDDING') setPkg({ name: 'Wedding Day', price: 5000000, duration: 8 });
      if (focus === 'PORTRAIT') setPkg({ name: 'Family Portrait', price: 1500000, duration: 1 });
      if (focus === 'COMMERCIAL') setPkg({ name: 'Product Shoot', price: 3000000, duration: 4 });
      if (focus === 'RENTAL') setPkg({ name: 'Studio Rental (Hourly)', price: 300000, duration: 1 });
  }, [focus]);

  // Loader & Submission Effect
  useEffect(() => {
      if (step === 8) {
          setError(null);
          setLoadingProgress(0);
          
          const texts = ["Configuring Logic...", "Optimizing UI...", "Setting up Ledger...", "Finalizing Workspace..."];
          let i = 0;
          
          const interval = setInterval(() => {
              setLoadingProgress(prev => {
                  if (prev >= 100) {
                      clearInterval(interval);
                      return 100;
                  }
                  return prev + (Math.random() * 15);
              });
              if (Math.random() > 0.8) { i = (i + 1) % texts.length; setLoadingText(texts[i]); }
          }, 200);

          return () => clearInterval(interval);
      }
  }, [step]);

  useEffect(() => {
      if (step === 8 && loadingProgress >= 100 && !isSubmitting && !error) {
          const finishSetup = async () => {
              setIsSubmitting(true);
              try {
                  await onComplete({
                      studioName, address, phone, focus,
                      operatingHours: opHours,
                      rooms: businessType === 'FREELANCE' ? [] : rooms,
                      bankDetails: bank,
                      taxRate,
                      initialPackage: pkg,
                      businessType, teamSize, visualTheme
                  });
              } catch (err: any) {
                  setError(err.message || "Failed to complete setup.");
                  setIsSubmitting(false);
              }
          };
          setTimeout(finishSetup, 500);
      }
  }, [step, loadingProgress, isSubmitting, error, onComplete]);

  const businessTypeOptions = [
      { id: 'FREELANCE', label: 'Freelancer', icon: Camera, desc: 'On-Location Shoots' },
      { id: 'STUDIO', label: 'Physical Studio', icon: Home, desc: 'Manage Rooms & Rentals' },
      { id: 'AGENCY', label: 'Agency', icon: Building, desc: 'Multi-Team Projects' }
  ];

  const teamSizeOptions = [
      { id: 'SOLO', label: 'Just Me', icon: UserIcon },
      { id: 'SMALL', label: '2-5 People', icon: Users },
      { id: 'LARGE', label: '6+ People', icon: Briefcase }
  ];

  const themeOptions = [
      { id: 'MODERN', label: 'Modern Dark', icon: Monitor, desc: 'Sleek & Professional', color: 'bg-zinc-900' },
      { id: 'CLASSIC', label: 'Classic Serif', icon: Palette, desc: 'Clean & Airy', color: 'bg-white' },
      { id: 'PLAYFUL', label: 'Playful Pink', icon: Zap, desc: 'Vibrant & Friendly', color: 'bg-pink-500' }
  ];

  const focusOptions = [
      { id: 'WEDDING', label: 'Wedding & Events', icon: Camera, desc: 'High volume, fast turnaround' },
      { id: 'COMMERCIAL', label: 'Commercial / Ads', icon: Briefcase, desc: 'B2B, invoicing focused' },
      { id: 'PORTRAIT', label: 'Portrait & Family', icon: UserIcon, desc: 'Studio sessions, recurring clients' },
      { id: 'RENTAL', label: 'Studio Rental', icon: Building, desc: 'Booking slots, asset tracking' }
  ];

  return (
    <div className="min-h-screen bg-lumina-base flex items-center justify-center relative overflow-hidden p-6">
      <div className="absolute inset-0 z-0">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center opacity-5 mix-blend-overlay"></div>
         <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-lumina-accent/10 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      <Motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl relative z-10">
        <div className="mb-8 text-center">
            <Motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="inline-flex items-center justify-center p-3 bg-lumina-surface border border-lumina-highlight rounded-2xl mb-6 shadow-2xl">
                <Aperture className="w-8 h-8 text-lumina-accent animate-spin-slow" />
            </Motion.div>
            {step < 8 && <Motion.h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2">Welcome to Lumina</Motion.h1>}
        </div>

        <div className="bg-lumina-surface/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl min-h-[500px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
                
                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                    <Motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                        <div className="text-center mb-8"><h2 className="text-xl font-bold text-white uppercase tracking-widest">Brand Identity</h2><p className="text-lumina-muted text-sm">Let's set up your business profile.</p></div>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-lumina-muted uppercase mb-1 block">Studio Name</label><input autoFocus type="text" value={studioName} onChange={(e) => setStudioName(e.target.value)} className="w-full bg-lumina-base border border-lumina-highlight rounded-xl p-3 text-white focus:border-lumina-accent outline-none" placeholder="Enter Studio Name"/></div>
                            <div><label className="text-xs font-bold text-lumina-muted uppercase mb-1 block">Business Phone</label><div className="relative"><Phone size={16} className="absolute left-3 top-3 text-lumina-muted"/><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-lumina-base border border-lumina-highlight rounded-xl p-3 pl-10 text-white focus:border-lumina-accent outline-none text-sm" placeholder="+62..."/></div></div>
                        </div>
                        <div className="flex justify-center mt-8"><button onClick={() => { if(studioName) setStep(2); }} disabled={!studioName} className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-lumina-accent transition-colors disabled:opacity-50 shadow-xl">Get Started <ArrowRight size={18} /></button></div>
                    </Motion.div>
                )}

                {/* STEP 2: BUSINESS & TEAM */}
                {step === 2 && (
                    <Motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                        <div className="text-center mb-4"><h2 className="text-xl font-bold text-white uppercase tracking-widest">Business Model</h2><p className="text-lumina-muted text-sm">Tell us about your operation.</p></div>
                        <div className="space-y-6">
                            <div><label className="text-xs font-bold text-lumina-muted uppercase mb-3 block text-center">Business Type</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {businessTypeOptions.map(opt => (<button key={opt.id} onClick={() => setBusinessType(opt.id as any)} className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${businessType === opt.id ? 'bg-lumina-accent text-black border-lumina-accent' : 'bg-lumina-base border-lumina-highlight text-lumina-muted hover:border-white hover:text-white'}`}><opt.icon size={20} /><span className="text-[10px] font-bold uppercase">{opt.label}</span></button>))}
                                </div>
                            </div>
                            <div><label className="text-xs font-bold text-lumina-muted uppercase mb-3 block text-center">Team Size</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {teamSizeOptions.map(opt => (<button key={opt.id} onClick={() => setTeamSize(opt.id as any)} className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${teamSize === opt.id ? 'bg-lumina-accent text-black border-lumina-accent' : 'bg-lumina-base border-lumina-highlight text-lumina-muted hover:border-white hover:text-white'}`}><opt.icon size={20} /><span className="text-[10px] font-bold uppercase">{opt.label}</span></button>))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-8 gap-4"><button onClick={() => setStep(1)} className="text-lumina-muted hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"><ArrowLeft size={16}/> Back</button><button onClick={() => setStep(3)} className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-lumina-accent transition-colors shadow-xl">Next Step <ArrowRight size={18} /></button></div>
                    </Motion.div>
                )}

                {/* STEP 3: VISUAL THEME */}
                {step === 3 && (
                    <Motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                        <div className="text-center mb-6"><h2 className="text-xl font-bold text-white uppercase tracking-widest">Brand Experience</h2><p className="text-lumina-muted text-sm">Choose the interface style for your studio.</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {themeOptions.map(opt => (
                                <button key={opt.id} onClick={() => setVisualTheme(opt.id as any)} className={`relative overflow-hidden p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-3 h-48 group ${visualTheme === opt.id ? 'border-lumina-accent ring-2 ring-lumina-accent ring-offset-4 ring-offset-lumina-base' : 'border-lumina-highlight hover:border-white'}`}>
                                    <div className={`absolute inset-0 opacity-10 ${opt.color}`}></div>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${visualTheme === opt.id ? 'bg-lumina-accent text-black' : 'bg-lumina-highlight text-white'}`}><opt.icon size={24} /></div>
                                    <div className="relative z-10"><h3 className="font-bold text-xs uppercase tracking-wider mb-1 text-white">{opt.label}</h3><p className="text-[10px] text-lumina-muted px-2">{opt.desc}</p></div>
                                    {visualTheme === opt.id && <div className="absolute top-3 right-3 bg-lumina-accent text-black rounded-full p-1 shadow-lg"><Check size={10} /></div>}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-center mt-8 gap-4"><button onClick={() => setStep(2)} className="text-lumina-muted hover:text-white text-sm font-bold flex items-center gap-2"><ArrowLeft size={16}/> Back</button><button onClick={() => setStep(4)} className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-lumina-accent transition-colors shadow-xl">Next Step <ArrowRight size={18} /></button></div>
                    </Motion.div>
                )}

                {/* STEP 4: FOCUS */}
                {step === 4 && (
                    <Motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                        <div className="text-center mb-6"><h2 className="text-xl font-bold text-white uppercase tracking-widest">Industry Focus</h2><p className="text-lumina-muted text-sm">We'll pre-configure your studio for your niche.</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {focusOptions.map(opt => (
                                <button key={opt.id} onClick={() => setFocus(opt.id)} className={`p-5 rounded-2xl border text-left transition-all group ${focus === opt.id ? 'bg-lumina-accent text-black border-lumina-accent' : 'bg-lumina-base border-lumina-highlight text-lumina-muted hover:border-white hover:text-white'}`}>
                                    <opt.icon size={24} className={`mb-3 ${focus === opt.id ? 'text-black' : 'text-lumina-accent'}`} /><h3 className="font-bold text-sm uppercase tracking-wider mb-1">{opt.label}</h3><p className={`text-[11px] leading-relaxed ${focus === opt.id ? 'text-black/70' : 'text-lumina-muted group-hover:text-gray-400'}`}>{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-center mt-8 gap-4"><button onClick={() => setStep(3)} className="text-lumina-muted hover:text-white text-sm font-bold flex items-center gap-2"><ArrowLeft size={16}/> Back</button><button onClick={() => setStep(5)} disabled={!focus} className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-lumina-accent transition-colors disabled:opacity-50 shadow-xl">Next Step <ArrowRight size={18} /></button></div>
                    </Motion.div>
                )}

                {/* STEP 5: OPERATIONS */}
                {step === 5 && (
                    <Motion.div key="step5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                        <div className="text-center mb-6"><h2 className="text-xl font-bold text-white uppercase tracking-widest">Workspace</h2><p className="text-lumina-muted text-sm">Configure your availability and space.</p></div>
                        <div className="space-y-6">
                            <div className="p-5 bg-lumina-base border border-lumina-highlight rounded-2xl">
                                <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-xs uppercase tracking-widest"><Clock size={14} className="text-lumina-accent"/> Operating Hours</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-lumina-muted uppercase block mb-1">Open From</label><input type="time" value={opHours.start} onChange={e => setOpHours({...opHours, start: e.target.value})} className="w-full bg-lumina-surface border border-lumina-highlight rounded-xl p-2 text-white text-sm outline-none focus:border-lumina-accent" /></div>
                                    <div><label className="text-[10px] font-bold text-lumina-muted uppercase block mb-1">Until</label><input type="time" value={opHours.end} onChange={e => setOpHours({...opHours, end: e.target.value})} className="w-full bg-lumina-surface border border-lumina-highlight rounded-xl p-2 text-white text-sm outline-none focus:border-lumina-accent" /></div>
                                </div>
                            </div>
                            {businessType !== 'FREELANCE' && (
                                <div className="p-5 bg-lumina-base border border-lumina-highlight rounded-2xl">
                                    <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-xs uppercase tracking-widest"><Building size={14} className="text-blue-400"/> Rooms</h3>
                                    <div className="flex flex-wrap gap-2 mb-4">{rooms.map((room, i) => (<div key={i} className="flex items-center gap-2 bg-lumina-surface px-3 py-1.5 rounded-full border border-lumina-highlight text-xs text-white"><span>{room}</span><button onClick={() => removeRoom(i)} className="text-lumina-muted hover:text-rose-500 transition-colors"><X size={12}/></button></div>))}</div>
                                    <div className="flex gap-2"><input placeholder="Room Name..." value={newRoom} onChange={e => setNewRoom(e.target.value.toUpperCase())} className="flex-1 bg-lumina-surface border border-lumina-highlight rounded-xl p-2.5 text-white text-xs outline-none" /><button onClick={addRoom} className="bg-blue-600 text-white p-2.5 rounded-xl"><Plus size={18}/></button></div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center mt-8 gap-4"><button onClick={() => setStep(4)} className="text-lumina-muted hover:text-white text-sm font-bold flex items-center gap-2"><ArrowLeft size={16}/> Back</button><button onClick={() => setStep(6)} disabled={businessType !== 'FREELANCE' && rooms.length === 0} className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-lumina-accent transition-colors shadow-xl disabled:opacity-50">Next Step <ArrowRight size={18} /></button></div>
                    </Motion.div>
                )}

                {/* STEP 6: FINANCE */}
                {step === 6 && (
                    <Motion.div key="step6" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                        <div className="text-center mb-6"><h2 className="text-xl font-bold text-white uppercase tracking-widest">Finance</h2><p className="text-lumina-muted text-sm">Where should clients send payments?</p></div>
                        <div className="space-y-6">
                            <div className="p-5 bg-lumina-base border border-lumina-highlight rounded-2xl space-y-4">
                                <h3 className="text-white font-bold flex items-center gap-2 mb-2 text-xs uppercase tracking-widest"><DollarSign size={14} className="text-emerald-400"/> Bank Account</h3>
                                <input placeholder="Bank Name" value={bank.name} onChange={e => setBank({...bank, name: e.target.value.toUpperCase()})} className="w-full bg-lumina-surface border border-lumina-highlight rounded-xl p-3 text-white text-sm outline-none" />
                                <input placeholder="Account Number" value={bank.number} onChange={e => setBank({...bank, number: e.target.value})} className="w-full bg-lumina-surface border border-lumina-highlight rounded-xl p-3 text-white text-sm font-mono outline-none" />
                                <input placeholder="Holder Name" value={bank.holder} onChange={e => setBank({...bank, holder: e.target.value})} className="w-full bg-lumina-surface border border-lumina-highlight rounded-xl p-3 text-white text-sm outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-center mt-8 gap-4"><button onClick={() => setStep(5)} className="text-lumina-muted hover:text-white text-sm font-bold flex items-center gap-2"><ArrowLeft size={16}/> Back</button><button onClick={() => setStep(7)} disabled={!bank.name || !bank.number} className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-lumina-accent transition-colors shadow-xl disabled:opacity-50">Next Step <ArrowRight size={18} /></button></div>
                    </Motion.div>
                )}

                {/* STEP 7: PACKAGE */}
                {step === 7 && (
                    <Motion.div key="step7" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                        <div className="text-center mb-6"><h2 className="text-xl font-bold text-white uppercase tracking-widest">Initial Offering</h2><p className="text-lumina-muted text-sm">Let's create your best-selling package.</p></div>
                        <div className="bg-gradient-to-br from-lumina-base to-lumina-surface border border-lumina-highlight rounded-3xl p-8 max-w-md mx-auto shadow-2xl space-y-5">
                            <div><label className="text-[10px] font-bold text-lumina-muted uppercase block mb-1">Package Name</label><input type="text" value={pkg.name} onChange={e => setPkg({...pkg, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-lumina-muted uppercase block mb-1">Price (IDR)</label><input type="number" value={pkg.price} onChange={e => setPkg({...pkg, price: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-emerald-400 font-mono font-bold outline-none" /></div>
                                <div><label className="text-[10px] font-bold text-lumina-muted uppercase block mb-1">Hours</label><input type="number" value={pkg.duration} onChange={e => setPkg({...pkg, duration: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-bold outline-none" /></div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-8 gap-4"><button onClick={() => setStep(6)} className="text-lumina-muted hover:text-white text-sm font-bold flex items-center gap-2"><ArrowLeft size={16}/> Back</button><button onClick={() => setStep(8)} disabled={!pkg.name || pkg.price <= 0} className="flex items-center gap-2 bg-lumina-accent text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-lumina-accent/20">Build Workspace <Zap size={20} fill="currentColor" /></button></div>
                    </Motion.div>
                )}

                {/* STEP 8: LOADER */}
                {step === 8 && (
                    <Motion.div key="step8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8 py-10">
                        <div className="relative w-32 h-32 mx-auto">
                            <svg className="w-full h-full" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" /><Motion.circle cx="50" cy="50" r="45" fill="none" stroke={error ? "#f43f5e" : "#bef264"} strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: loadingProgress / 100 }} transition={{ duration: 0.5, ease: "linear" }} transform="rotate(-90 50 50)" /></svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">{error ? <AlertCircle className="text-rose-500 w-10 h-10" /> : <><span className="text-2xl font-mono font-bold text-white">{Math.round(loadingProgress)}%</span><span className="text-[8px] text-lumina-muted font-bold mt-1 uppercase">Synchronizing</span></>}</div>
                        </div>
                        <div className="max-w-xs mx-auto"><h2 className="text-2xl font-bold text-white mb-2">{error ? "Setup Interrupted" : "Finalizing Profile"}</h2><p className={`${error ? "text-rose-400" : "text-lumina-accent"} font-mono text-[10px] uppercase tracking-widest`}>{error || loadingText}</p></div>
                        {error && (<Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><button onClick={() => { setError(null); setLoadingProgress(0); setIsSubmitting(false); }} className="flex items-center gap-2 mx-auto bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-lumina-accent transition-all"><RefreshCw size={18} /> Retry Setup</button></Motion.div>)}
                    </Motion.div>
                )}

            </AnimatePresence>
        </div>
      </Motion.div>
    </div>
  );
};

export default OnboardingView;
