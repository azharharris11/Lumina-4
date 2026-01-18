import React from 'react';

interface FeaturesBlockProps {
    headline?: string;
    description?: string;
    image?: string;
    imagePosition?: 'LEFT' | 'RIGHT';
    // Style hooks
    className?: string;
    titleClassName?: string;
    descClassName?: string;
}

const FeaturesBlock: React.FC<FeaturesBlockProps> = ({ 
    headline, description, image, imagePosition = 'LEFT',
    className = "", titleClassName = "", descClassName = ""
}) => {
    // If imagePosition is RIGHT, Image is Order 2 (Right), Text is Order 1 (Left)
    // If imagePosition is LEFT, Image is Order 1 (Left), Text is Order 2 (Right)
    
    const imgOrder = imagePosition === 'RIGHT' ? 'md:order-2' : 'md:order-1';
    const textOrder = imagePosition === 'RIGHT' ? 'md:order-1' : 'md:order-2';

    return (
        <section className={`py-20 px-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center ${className}`}>
            <div className={`bg-gray-50 aspect-[4/5] overflow-hidden ${imgOrder}`}>
                {image && <img src={image} className="w-full h-full object-cover" alt="Feature" loading="lazy" />}
            </div>
            <div className={textOrder}>
                <h2 className={`text-2xl font-medium mb-6 ${titleClassName}`}>{headline}</h2>
                <p className={`text-gray-500 leading-relaxed text-sm ${descClassName}`}>{description}</p>
            </div>
        </section>
    );
};

export default FeaturesBlock;
