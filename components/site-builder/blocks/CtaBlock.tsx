import React from 'react';

interface CtaBlockProps {
    headline: string;
    buttonText?: string;
    onButtonClick?: () => void;
    className?: string;
    titleClassName?: string;
    titleStyle?: React.CSSProperties;
    buttonClassName?: string;
}

const CtaBlock: React.FC<CtaBlockProps> = ({ 
    headline, buttonText = "Contact Us", onButtonClick,
    className = "", titleClassName = "", titleStyle, buttonClassName = ""
}) => {
    return (
        <section className={`py-32 px-6 text-center ${className}`}>
            <h2 className={`mb-8 ${titleClassName}`} style={titleStyle}>
                {headline}
            </h2>
            <button 
                onClick={onButtonClick} 
                className={`px-12 py-5 font-bold uppercase tracking-widest transition-colors ${buttonClassName}`}
            >
                {buttonText}
            </button>
        </section>
    );
};

export default CtaBlock;
