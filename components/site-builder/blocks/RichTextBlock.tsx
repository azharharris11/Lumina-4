import React from 'react';

export interface RichTextBlockProps {
    html: string;
    className?: string;
    style?: React.CSSProperties;
}

const RichTextBlock: React.FC<RichTextBlockProps> = ({ html, className = "", style }) => {
    return (
        <section 
            className={`px-6 py-12 max-w-4xl mx-auto prose prose-lg prose-invert max-w-none ${className}`} 
            style={style}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default RichTextBlock;