import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Motion = motion as any;

export interface ContactBlockProps {
    headline?: string;
    description?: string;
    emailTo?: string; // Where to send email (in a real app)
    className?: string;
    titleClassName?: string;
    descClassName?: string;
    buttonClassName?: string;
    inputClassName?: string;
    titleStyle?: React.CSSProperties;
    descStyle?: React.CSSProperties;
}

const ContactBlock: React.FC<ContactBlockProps> = ({ 
    headline = "Get in Touch", description = "Send us a message and we'll get back to you.", emailTo,
    className = "", titleClassName = "", descClassName = "", buttonClassName = "", inputClassName = "",
    titleStyle, descStyle
}) => {
    const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('SENDING');
        // Simulate sending
        setTimeout(() => setStatus('SUCCESS'), 1000);
    };

    return (
        <section className={`px-6 py-20 max-w-6xl mx-auto ${className}`}>
            <div className="flex flex-col md:flex-row gap-12 md:gap-20">
                <div className="md:w-1/3 space-y-6">
                    <Motion.h2 
                        initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        className={`text-4xl font-bold mb-4 ${titleClassName}`}
                        style={titleStyle}
                    >
                        {headline}
                    </Motion.h2>
                    <p className={`opacity-70 leading-relaxed ${descClassName}`} style={descStyle}>
                        {description}
                    </p>
                </div>

                <div className="md:w-2/3">
                    {status === 'SUCCESS' ? (
                        <div className="bg-emerald-500/10 text-emerald-500 p-8 rounded text-center border border-emerald-500/20">
                            <p className="font-bold text-xl mb-2">Message Sent!</p>
                            <p>Thank you for reaching out. We will be in touch shortly.</p>
                            <button onClick={() => setStatus('IDLE')} className="mt-4 text-sm underline hover:opacity-70">Send another</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1 block">Name</label>
                                    <input required type="text" className={`w-full bg-transparent border-b border-current p-2 outline-none focus:opacity-100 opacity-60 transition-opacity ${inputClassName}`} placeholder="Jane Doe" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1 block">Email</label>
                                    <input required type="email" className={`w-full bg-transparent border-b border-current p-2 outline-none focus:opacity-100 opacity-60 transition-opacity ${inputClassName}`} placeholder="jane@example.com" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1 block">Subject</label>
                                <input required type="text" className={`w-full bg-transparent border-b border-current p-2 outline-none focus:opacity-100 opacity-60 transition-opacity ${inputClassName}`} placeholder="Project Inquiry" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider opacity-50 mb-1 block">Message</label>
                                <textarea required rows={5} className={`w-full bg-transparent border-b border-current p-2 outline-none focus:opacity-100 opacity-60 transition-opacity resize-none ${inputClassName}`} placeholder="Tell us about your project..."></textarea>
                            </div>
                            <button 
                                type="submit" 
                                disabled={status === 'SENDING'}
                                className={`px-8 py-3 bg-current text-white font-bold uppercase tracking-widest text-xs hover:opacity-80 transition-opacity disabled:opacity-50 mt-4 ${buttonClassName}`}
                            >
                                {status === 'SENDING' ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ContactBlock;