
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Aperture, Check, ArrowRight, X, TrendingUp, Shield, Zap, Lock, Calendar, DollarSign, User, Bell, Camera, Video } from 'lucide-react';

const Motion = motion as any;

interface LandingPageViewProps {
  onLogin: () => void;
  onRegister: () => void;
}

const LandingPageView: React.FC<LandingPageViewProps> = ({ onLogin, onRegister }) => {
  
  const renderPainPoint = (text: string) => (
      <div className="flex items-start gap-3 text-gray-400">
          <div className="min-w-[24px] pt-1"><X size={20} className="text-rose-500" /></div>
          <p className="text-lg font-medium">{text}</p>
      </div>
  );

  const renderBenefit = (title: string, desc: string) => (
      <div className="bg-lumina-surface border border-lumina-highlight p-6 rounded-2xl hover:border-lumina-accent/50 transition-colors group">
          <div className="w-12 h-12 bg-lumina-accent/10 rounded-xl flex items-center justify-center text-lumina-accent mb-4 group-hover:bg-lumina-accent group-hover:text-black transition-all">
              <Check size={24} strokeWidth={3} />
          </div>
          <h3 className="text-xl font-display font-bold text-white mb-2 uppercase tracking-wide">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
  );

  // --- HERO ANIMATION COMPONENTS ---

  const HeroAnimation = () => {
      const [cards, setCards] = useState<any[]>([]);
      
      const NOTIFICATIONS = [
          { icon: DollarSign, text: "INVOICE PAID", sub: "Bridestory Campaign", color: "text-emerald-400" },
          { icon: Camera, text: "GEAR CHECK-OUT", sub: "Sony A7IV • Lensa 85mm", color: "text-blue-400" },
          { icon: User, text: "NEW INQUIRY", sub: "Pre-wedding Session", color: "text-purple-400" },
          { icon: Bell, text: "SELECTION DONE", sub: "Client finalized 50 photos", color: "text-amber-400" },
      ];

      useEffect(() => {
          const interval = setInterval(() => {
              const newCard = {
                  id: Date.now(),
                  ...NOTIFICATIONS[Math.floor(Math.random() * NOTIFICATIONS.length)],
                  x: Math.random() * 120 - 60, // Wider spread
                  y: Math.random() * 60 - 30 
              };
              setCards(prev => [...prev.slice(-3), newCard]); 
          }, 1500); // Faster pulse
          return () => clearInterval(interval);
      }, []);

      return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
              {/* Animated Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
              
              {/* Central Aperture (The Engine) - SCALED UP TO FRAME TEXT */}
              <div className="relative z-0 opacity-40">
                  {/* Outer Ring */}
                  <Motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                      className="w-[800px] h-[800px] md:w-[1200px] md:h-[1200px] rounded-full border border-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                      <div className="absolute top-0 left-1/2 w-3 h-3 bg-lumina-accent rounded-full -translate-x-1/2 -translate-y-1.5 shadow-[0_0_20px_rgba(190,242,100,0.5)]"></div>
                  </Motion.div>
                  
                  {/* Middle Ring */}
                  <Motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                      className="w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full border border-white/10 border-dashed absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  />

                   {/* Inner Ring */}
                   <Motion.div 
                      animate={{ rotate: 180 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full border-2 border-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  />
              </div>

              {/* Floating Cards Ejecting from Center - Pushed outward to avoid text overlap */}
              <AnimatePresence>
                  {cards.map((card) => (
                      <Motion.div
                          key={card.id}
                          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                          animate={{ 
                              opacity: [0, 1, 1, 0], 
                              scale: [0.8, 1, 1, 1.1], 
                              x: card.x * 15, // Push further out
                              y: card.y * 10 - 250 // Push up higher
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 5, ease: "easeOut" }}
                          className="absolute z-10"
                          style={{ left: '50%', top: '50%' }}
                      >
                          <div className="flex items-center gap-4 bg-[#0a0a0a] border border-lumina-highlight/50 p-4 rounded-xl shadow-2xl min-w-[260px] transform -translate-x-1/2 -translate-y-1/2">
                              <div className={`p-2 rounded-lg bg-white/5 ${card.color}`}>
                                  <card.icon size={20} strokeWidth={3} />
                              </div>
                              <div className="text-left">
                                  <p className="text-sm font-black text-white uppercase tracking-wider">{card.text}</p>
                                  <p className="text-xs text-lumina-muted font-mono font-bold">{card.sub}</p>
                              </div>
                          </div>
                      </Motion.div>
                  ))}
              </AnimatePresence>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-lumina-accent selection:text-black overflow-x-hidden">
      
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <Aperture className="text-lumina-accent w-8 h-8" />
                  <span className="font-display font-bold text-2xl tracking-tight">LUMINA</span>
              </div>
              <div className="flex gap-4">
                  <button onClick={onLogin} className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider">Log In</button>
                  <button onClick={onRegister} className="bg-white text-black px-6 py-2.5 rounded-lg font-black text-sm hover:bg-lumina-accent transition-colors uppercase tracking-wider">
                      Get Access
                  </button>
              </div>
          </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative min-h-screen flex flex-col justify-center items-center text-center overflow-hidden pt-20">
          
          {/* Animated Background */}
          <HeroAnimation />
          
          <Motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8 }}
            className="max-w-6xl mx-auto relative z-30 px-6"
          >
              <div className="inline-block border border-lumina-accent/30 bg-lumina-accent/5 backdrop-blur px-4 py-1.5 rounded-full mb-8">
                  <span className="text-lumina-accent text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lumina-accent animate-pulse"></span>
                      For Photographers & Videographers
                  </span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-display font-black uppercase leading-[0.9] tracking-tighter mb-8 drop-shadow-2xl">
                  SCALE YOUR STUDIO <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">WITHOUT THE CHAOS.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                  The all-in-one Operating System for high-growth creative studios.
                  Ditch the spreadsheets. Automate your bookings, finance, and client delivery.
              </p>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={onRegister}
                    className="group relative inline-flex items-center justify-center px-8 py-5 text-xl font-black text-black transition-all duration-200 bg-lumina-accent font-display uppercase tracking-widest rounded-xl focus:outline-none hover:bg-white hover:scale-105 shadow-[0_0_40px_-10px_rgba(190,242,100,0.5)]"
                  >
                      Build Your Studio
                      <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-4 md:mt-0 md:ml-6">
                      Replaces Honeybook, Excel & Drive
                  </p>
              </div>
          </Motion.div>
      </header>

      {/* THE PROBLEM - SPECIFIC TO STUDIOS */}
      <section className="py-32 bg-[#080808] border-t border-white/10 relative z-20">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
              <div>
                  <h2 className="text-4xl md:text-5xl font-display font-black uppercase leading-[0.9] mb-8">
                      Your Art is Premium. <br/>
                      <span className="text-rose-500">Your Workflow isn't.</span>
                  </h2>
                  <p className="text-xl text-white font-bold mb-6 border-l-4 border-rose-500 pl-6">
                      You are still stitching together Google Calendar, WhatsApp chats, and Excel sheets. It's unprofessional and it's costing you high-ticket clients.
                  </p>
                  <div className="space-y-6 mt-10">
                      {renderPainPoint("Double-booked a camera or studio room? That's a disaster.")}
                      {renderPainPoint("Client asking for the 'link' again? You're wasting time.")}
                      {renderPainPoint("Forgot to invoice for overtime? You're losing revenue.")}
                      {renderPainPoint("Can't find that one contract? You're legally exposed.")}
                  </div>
              </div>
              <div className="bg-lumina-surface p-10 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
                  <div className="absolute -top-20 -right-20 text-[12rem] font-black text-white/5 select-none rotate-12">VS</div>
                  <h3 className="text-3xl font-black text-white mb-8 uppercase tracking-wide">The "Old Way"</h3>
                  <div className="space-y-4 font-mono text-sm text-gray-500">
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 flex justify-between items-center">
                          <span>Studio_Schedule_FINAL.xls</span>
                          <span className="text-rose-500 font-bold">CONFLICT</span>
                      </div>
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 flex justify-between items-center">
                          <span>Client: "Where do I pay?"</span>
                          <span className="text-amber-500 font-bold">MANUAL REPLY</span>
                      </div>
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 flex justify-between items-center">
                          <span>Asset: Sony A7S III</span>
                          <span className="text-rose-500">MISSING?</span>
                      </div>
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 flex justify-between items-center text-rose-500/50 line-through">
                          <span>Professionalism</span>
                          <span>404</span>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* THE SOLUTION (VALUE STACK) */}
      <section id="features" className="py-32 px-6 relative bg-black">
          <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                  <h2 className="text-5xl md:text-7xl font-display font-black uppercase mb-6 tracking-tight">
                      Run Your Studio on <span className="text-lumina-accent">Autopilot</span>
                  </h2>
                  <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                      Lumina combines Booking, Finance, Asset Management, and Client Delivery into one sleek dashboard.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {renderBenefit("SMART CALENDAR", "Prevent double-bookings automatically. If Studio A is booked, it's locked. If the camera is out, it's unavailable.")}
                  {renderBenefit("CLIENT PORTAL", "Give clients a premium experience. They get a private link to select photos, view invoices, and download files.")}
                  {renderBenefit("FINANCIAL CLARITY", "Track every Rupiah. See exactly which photographer brings in the most revenue and what your true profit margin is.")}
                  {renderBenefit("ASSET TRACKING", "Stop losing gear. Check-in/Check-out logs for every lens, body, and light in your inventory.")}
                  {renderBenefit("AUTOMATED INVOICING", "Create professional invoices in seconds. Send them via WhatsApp with one click.")}
                  {renderBenefit("TEAM MANAGEMENT", "Manage staff schedules, commission rates, and access levels. Keep your team in sync.")}
              </div>
          </div>
      </section>

      {/* THE OFFER / PRICING */}
      <section className="py-32 bg-lumina-surface border-y border-white/10">
          <div className="max-w-5xl mx-auto px-6 text-center">
              <h2 className="text-4xl md:text-6xl font-display font-black uppercase mb-12">
                  The "No-Brainer" Offer
              </h2>
              
              <div className="bg-black border-2 border-lumina-accent p-12 rounded-[2.5rem] relative overflow-hidden shadow-[0_0_100px_-20px_rgba(190,242,100,0.2)]">
                  <div className="absolute top-0 right-0 bg-lumina-accent text-black text-sm font-black px-6 py-3 uppercase tracking-widest rounded-bl-2xl">
                      Early Access
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between gap-16">
                      <div className="text-left flex-1">
                          <p className="text-gray-400 uppercase tracking-widest font-bold text-sm mb-4">Lumina Pro Access</p>
                          <div className="flex items-baseline gap-2 mb-6">
                              <span className="text-6xl md:text-7xl font-black text-white tracking-tighter">Rp 299k</span>
                              <span className="text-xl text-gray-500 font-bold">/ month</span>
                          </div>
                          <p className="text-gray-400 text-lg leading-relaxed">
                              Less than the cost of <span className="text-white font-bold">ONE</span> studio rental hour. Saves you <span className="text-white font-bold">10+ hours</span> of admin work per week.
                          </p>
                      </div>
                      
                      <div className="w-full md:w-auto bg-white/5 p-8 rounded-2xl border border-white/10 min-w-[300px]">
                          <div className="space-y-4 mb-8 text-left">
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Unlimited Bookings</span></div>
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Unlimited Staff & Assets</span></div>
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Client Proofing Portal</span></div>
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Website Builder</span></div>
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>WhatsApp Integration</span></div>
                          </div>
                          <button 
                            onClick={onRegister}
                            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-lumina-accent transition-all hover:scale-105"
                          >
                              Start Free Trial
                          </button>
                      </div>
                  </div>
              </div>
              
              <div className="mt-12 flex flex-wrap justify-center gap-8 text-xs text-gray-500 uppercase font-black tracking-widest">
                  <span className="flex items-center gap-2"><Shield size={16} className="text-white"/> 30-Day Money Back Guarantee</span>
                  <span className="flex items-center gap-2"><Lock size={16} className="text-white"/> SSL Secure Data</span>
                  <span className="flex items-center gap-2"><Zap size={16} className="text-white"/> Cancel Anytime</span>
              </div>
          </div>
      </section>

      {/* FINAL CTA */}
      <footer className="py-32 text-center px-6 bg-black relative overflow-hidden">
          <div className="absolute inset-0 bg-lumina-accent/5 blur-[120px] pointer-events-none"></div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-8xl font-display font-black uppercase mb-10 opacity-20 tracking-tighter">
                Lumina
            </h2>
            <p className="text-2xl md:text-3xl text-white font-bold mb-12 leading-tight">
                You didn't start a studio to manage spreadsheets.<br/>
                <span className="text-lumina-accent">You started it to create.</span>
            </p>
            <button 
                onClick={onRegister}
                className="bg-lumina-accent text-black px-12 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_50px_-10px_rgba(190,242,100,0.4)] text-lg"
            >
                Start Your Free Trial
            </button>
            <div className="mt-24 border-t border-white/10 pt-8 text-xs text-gray-600 font-mono">
                © {new Date().getFullYear()} Lumina Studio Systems. All rights reserved.
            </div>
          </div>
      </footer>
    </div>
  );
};

export default LandingPageView;
