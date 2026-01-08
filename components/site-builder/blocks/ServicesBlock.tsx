import React from 'react';

interface ServiceItem {
    title: string;
    text: string;
    icon?: string;
}

interface ServicesBlockProps {
    headline?: string;
    items: ServiceItem[];
    className?: string;
    titleClassName?: string;
    titleStyle?: React.CSSProperties;
    itemClassName?: string;
}

const ServicesBlock: React.FC<ServicesBlockProps> = ({ 
    headline, items,
    className = "", titleClassName = "", titleStyle, itemClassName = ""
}) => {
    return (
        <div className={`p-8 ${className}`}>
            {headline && (
                <h2 className={`mb-8 ${titleClassName}`} style={titleStyle}>
                    {headline}
                </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {items.map((item, i) => (
                    <div key={i} className={`p-4 ${itemClassName}`}>
                        <h3 className="font-black uppercase mb-2">{item.title}</h3>
                        <p className="text-sm font-bold">{item.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ServicesBlock;
