
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Aperture, Check, ArrowRight, X, TrendingUp, Shield, Zap, Lock, Calendar, DollarSign, User, Bell } from 'lucide-react';

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
          { icon: DollarSign, text: "PAYMENT RECEIVED", sub: "+ Rp 5.000.000", color: "text-emerald-400" },
          { icon: Calendar, text: "BOOKING CONFIRMED", sub: "24 Oct • Studio A", color: "text-blue-400" },
          { icon: User, text: "NEW LEAD", sub: "Sarah & Mike", color: "text-purple-400" },
          { icon: Bell, text: "CONTRACT SIGNED", sub: "Auto-filed", color: "text-amber-400" },
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
                      The Studio Operating System
                  </span>
              </div>
              
              <h1 className="text-6xl md:text-9xl font-display font-black uppercase leading-[0.9] tracking-tighter mb-8 drop-shadow-2xl">
                  Stop Doing <span className="text-lumina-muted line-through decoration-rose-500 decoration-4">Admin</span>. <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">Start Making Money.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                  Lumina replaces your studio manager, accountant, and marketing agency for <span className="text-white border-b-2 border-lumina-accent">Rp 9.000/day</span>. 
                  If it doesn't save you 10 hours a week, we'll refund you.
              </p>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={onRegister}
                    className="group relative inline-flex items-center justify-center px-8 py-5 text-xl font-black text-black transition-all duration-200 bg-lumina-accent font-display uppercase tracking-widest rounded-xl focus:outline-none hover:bg-white hover:scale-105 shadow-[0_0_40px_-10px_rgba(190,242,100,0.5)]"
                  >
                      Start Free Trial
                      <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-4 md:mt-0 md:ml-6">
                      No Credit Card Required • Cancel Anytime
                  </p>
              </div>
          </Motion.div>
      </header>

      {/* THE PROBLEM - HORMOZI STYLE */}
      <section className="py-32 bg-[#080808] border-t border-white/10 relative z-20">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
              <div>
                  <h2 className="text-4xl md:text-6xl font-display font-black uppercase leading-[0.9] mb-8">
                      You Are <span className="text-rose-500">Lighting Money On Fire</span>.
                  </h2>
                  <p className="text-xl text-white font-bold mb-6 border-l-4 border-rose-500 pl-6">
                      Every hour you spend sending invoices is an hour you aren't shooting. That is costing you millions.
                  </p>
                  <div className="space-y-6 mt-10">
                      {renderPainPoint("Still using Google Calendar & Excel? You're prone to errors.")}
                      {renderPainPoint("Chasing clients for payments via WhatsApp? You look unprofessional.")}
                      {renderPainPoint("Forgot to double-check gear inventory? You risk the shoot.")}
                      {renderPainPoint("No website booking engine? You are losing money while you sleep.")}
                  </div>
              </div>
              <div className="bg-lumina-surface p-10 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
                  <div className="absolute -top-20 -right-20 text-[12rem] font-black text-white/5 select-none rotate-12">VS</div>
                  <h3 className="text-3xl font-black text-white mb-8 uppercase tracking-wide">The "Old Way"</h3>
                  <div className="space-y-4 font-mono text-sm text-gray-500">
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 flex justify-between items-center">
                          <span>Spreadsheet_Final_v2_REALLY_FINAL.xls</span>
                          <span className="text-rose-500 font-bold">ERROR</span>
                      </div>
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 flex justify-between items-center">
                          <span>Unpaid Invoice #1023 (Sent 2w ago)</span>
                          <span className="text-amber-500 font-bold">LATE</span>
                      </div>
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 flex justify-between items-center">
                          <span>Client: "Can you resend the contract?"</span>
                          <span className="text-gray-400">Read 10:05</span>
                      </div>
                      <div className="p-4 bg-black/60 rounded-xl border border-white/5 flex justify-between items-center text-rose-500/50 line-through">
                          <span>Peace of Mind</span>
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
                      The "Cheat Code" For <span className="text-lumina-accent">Growth</span>
                  </h2>
                  <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                      We combined 5 different software subscriptions into one dashboard. Lumina handles the logistics. You handle the art.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {renderBenefit("GET PAID WHILE YOU SLEEP", "Integrated Booking Engine & Payment Gateway. Clients book their own slots and pay the deposit instantly. No manual DMs.")}
                  {renderBenefit("NEVER DOUBLE-BOOK AGAIN", "Real-time conflict detection for Rooms, Equipment, and Staff. If Studio A is booked, it's blocked. Simple.")}
                  {renderBenefit("AUTOMATED FOLLOW-UPS", "Lumina sends the invoice, the contract, and the reminder. You don't have to be the 'bad guy' chasing money.")}
                  {renderBenefit("KNOW YOUR NUMBERS", "Automated P&L statements. Know exactly how much profit you made this month without opening Excel.")}
                  {renderBenefit("CLIENT PORTAL", "Give clients a VIP experience. They get a private link to view contracts, invoices, and download deliverables.")}
                  {renderBenefit("ASSET TRACKING", "Stop losing lens caps and expensive bodies. Check-in/Check-out logs for every piece of gear in your inventory.")}
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
                      Limited Time
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between gap-16">
                      <div className="text-left flex-1">
                          <p className="text-gray-400 uppercase tracking-widest font-bold text-sm mb-4">Lumina Pro Access</p>
                          <div className="flex items-baseline gap-2 mb-6">
                              <span className="text-6xl md:text-7xl font-black text-white tracking-tighter">Rp 299k</span>
                              <span className="text-xl text-gray-500 font-bold">/ month</span>
                          </div>
                          <p className="text-gray-400 text-lg leading-relaxed">
                              Equivalent to selling <span className="text-white font-bold">ONE</span> extra print per month. Or saving <span className="text-white font-bold">30 minutes</span> of your time.
                          </p>
                      </div>
                      
                      <div className="w-full md:w-auto bg-white/5 p-8 rounded-2xl border border-white/10 min-w-[300px]">
                          <div className="space-y-4 mb-8 text-left">
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Unlimited Bookings</span></div>
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Unlimited Staff Members</span></div>
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Financial Analytics Suite</span></div>
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Client Portal & CRM</span></div>
                              <div className="flex items-center gap-3 text-sm font-bold text-white"><Check size={18} className="text-lumina-accent"/> <span>Website Builder</span></div>
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
                  <span className="flex items-center gap-2"><Lock size={16} className="text-white"/> SSL Secure Payment</span>
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
                You didn't start a studio to send invoices.<br/>
                <span className="text-lumina-accent">You started it to create.</span>
            </p>
            <button 
                onClick={onRegister}
                className="bg-lumina-accent text-black px-12 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_50px_-10px_rgba(190,242,100,0.4)] text-lg"
            >
                Let's Build Your Empire
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
