import React from 'react';

interface LocationBlockProps {
    name: string;
    address: string;
    className?: string;
    cardClassName?: string;
}

const LocationBlock: React.FC<LocationBlockProps> = ({ 
    name, address, className = "", cardClassName = ""
}) => {
    return (
        <section className={`h-[500px] w-full relative grayscale invert filter contrast-125 ${className}`}>
            <div className="w-full h-full bg-gray-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"></div>
                <div className={`bg-black text-white p-6 rounded-xl border border-white/10 relative z-10 text-center filter invert-0 grayscale-0 ${cardClassName}`}>
                    <div className="text-3xl mb-2">📍</div>
                    <h3 className="font-bold text-xl mb-1">{name}</h3>
                    <p className="text-gray-400 text-sm">{address}</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" className="mt-4 inline-block text-xs font-bold uppercase border-b border-white pb-1">Open in Maps</a>
                </div>
            </div>
        </section>
    );
};

export default LocationBlock;
