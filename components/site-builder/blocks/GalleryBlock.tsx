import React from 'react';
import MasonryGallery from '../MasonryGallery';
import { SiteGalleryItem } from '../../../types';

interface GalleryBlockProps {
    headline?: string;
    images: SiteGalleryItem[];
    onImageClick?: (src: string) => void;
    columns?: number;
    className?: string;
    titleClassName?: string;
    titleStyle?: React.CSSProperties;
}

const GalleryBlock: React.FC<GalleryBlockProps> = ({ 
    headline, images, onImageClick, columns = 3,
    className = "", titleClassName = "", titleStyle
}) => {
    return (
        <section className={`py-24 px-6 md:px-12 ${className}`}>
            {headline && (
                <h2 className={`text-center mb-12 ${titleClassName}`} style={titleStyle}>
                    {headline}
                </h2>
            )}
            <MasonryGallery images={images} onImageClick={onImageClick} columns={columns} />
        </section>
    );
};

export default GalleryBlock;
