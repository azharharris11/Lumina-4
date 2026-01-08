import React from 'react';
import { motion } from 'framer-motion';

const Motion = motion as any;

export interface HeroBlockProps {
    headline: string;
    subheadline?: string;
    description?: string;
    image?: string;
    videoUrl?: string; // New Prop
    buttonText?: string;
    onButtonClick?: () => void;
    layout?: 'LEFT' | 'RIGHT' | 'CENTER' | 'FULL'; // Added 'FULL' for Noir style
    // Style hooks for themes to inject classes
    className?: string;
    titleClassName?: string;
    descClassName?: string;
    buttonClassName?: string;
    titleStyle?: React.CSSProperties; // New
    descStyle?: React.CSSProperties; // New
    buttonStyle?: React.CSSProperties; // New
    overlay?: React.ReactNode;
}

const HeroBlock: React.FC<HeroBlockProps> = ({ 
    headline, subheadline, description, image, videoUrl, buttonText = "DISCOVER MORE", 
    onButtonClick, layout = 'LEFT',
    className = "", titleClassName = "", descClassName = "", buttonClassName = "",
    titleStyle, descStyle, buttonStyle,
    overlay
}) => {
    const containerClass = layout === 'FULL' 
        ? 'relative h-[80vh] md:h-screen flex items-center overflow-hidden w-full' 
        : layout === 'CENTER' 
            ? 'flex flex-col items-center text-center' 
            : 'flex flex-col md:flex-row items-center gap-12';

    const textOrder = layout === 'RIGHT' ? 'md:order-2 md:w-1/2 text-left' : 'md:order-1 md:w-1/2 text-left';
    const imgOrder = layout === 'RIGHT' ? 'md:order-1 md:w-1/2' : 'md:order-2 md:w-1/2';

    if (layout === 'FULL') {
        return (
            <header className={`${containerClass} ${className}`}>
                <div className="absolute inset-0 z-0">
                    {videoUrl ? (
                        <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                            <source src={videoUrl} type="video/mp4" />
                        </video>
                    ) : image ? (
                        <Motion.img 
                            initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 2 }}
                            src={image} className="w-full h-full object-cover" 
                        />
                    ) : null}
                    {overlay}
                </div>
                
                <div className="relative z-10 px-6 md:px-12 max-w-7xl mx-auto w-full pt-20">
                    <div className="max-w-4xl">
                        {subheadline && <span className="text-xs font-bold tracking-widest uppercase mb-4 opacity-60 block">{subheadline}</span>}
                        <Motion.h1 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                            className={`text-3xl md:text-6xl font-medium leading-tight mb-4 md:mb-8 break-words ${titleClassName}`}
                            style={titleStyle}
                        >
                            {headline}
                        </Motion.h1>
                        <div className="space-y-6">
                            <p className={`text-sm md:text-base leading-relaxed ${descClassName} max-w-xl`} style={descStyle}>
                                {description}
                            </p>
                            {onButtonClick && (
                                <button onClick={onButtonClick} className={`transition-all ${buttonClassName}`} style={buttonStyle}>
                                    {buttonText}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className={`px-4 md:px-6 py-12 md:py-32 max-w-6xl mx-auto ${containerClass} ${className}`}>
            <div className={`flex flex-col justify-between ${layout !== 'CENTER' ? textOrder : 'w-full'}`}>
                {subheadline && <span className="text-xs font-bold tracking-widest uppercase mb-4 opacity-60 block">{subheadline}</span>}
                <Motion.h1 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                    className={`text-3xl md:text-6xl font-medium leading-tight mb-4 md:mb-8 break-words ${titleClassName}`}
                    style={titleStyle}
                >
                    {headline}
                </Motion.h1>
                <div className="space-y-6">
                    <p className={`text-gray-500 text-sm md:text-base leading-relaxed ${descClassName} ${layout === 'CENTER' ? 'max-w-2xl mx-auto' : 'max-w-md'}`} style={descStyle}>
                        {description}
                    </p>
                    {onButtonClick && (
                        <button onClick={onButtonClick} className={`text-xs font-bold border-b border-current pb-1 hover:opacity-50 transition-opacity w-fit ${buttonClassName}`} style={buttonStyle}>
                            {buttonText}
                        </button>
                    )}
                </div>
            </div>
            
            {image && (
                <Motion.div 
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.8 }}
                    className={`aspect-[4/5] overflow-hidden bg-gray-100 w-full ${layout !== 'CENTER' ? imgOrder : 'mt-12 max-w-4xl mx-auto'}`}
                >
                    <img src={image} className="w-full h-full object-cover" alt="Hero" />
                </Motion.div>
            )}
        </header>
    );
};

export default HeroBlock;
