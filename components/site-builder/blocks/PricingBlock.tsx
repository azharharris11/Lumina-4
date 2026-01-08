import React from 'react';
import { Package } from '../../../types';

interface PricingBlockProps {
    headline?: string;
    packages: Package[];
    // Style hooks
    className?: string;
    itemClassName?: string;
}

const PricingBlock: React.FC<PricingBlockProps> = ({ 
    headline = 'Services', packages,
    className = "", itemClassName = ""
}) => {
    return (
        <div className={`px-4 md:px-6 py-12 md:py-20 bg-gray-50 ${className}`}>
            <div className="max-w-4xl mx-auto">
                <h2 className="text-sm font-bold mb-8 md:mb-12 uppercase tracking-wider text-gray-400">{headline}</h2>
                <div className="space-y-6 md:space-y-8">
                    {packages.filter((p: any) => p.active).map((pkg: any) => (
                        <div key={pkg.id} className={`flex flex-col md:flex-row justify-between md:items-baseline border-b border-gray-200 pb-4 gap-2 md:gap-0 ${itemClassName}`}>
                            <h3 className="text-lg md:text-xl font-medium w-full md:w-1/3">{pkg.name}</h3>
                            <p className="text-xs md:text-sm text-gray-500 w-full md:w-1/3">{pkg.features.slice(0, 3).join(', ')}</p>
                            <span className="text-base md:text-lg w-full md:w-1/3 text-left md:text-right font-mono">Rp {pkg.price.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PricingBlock;
