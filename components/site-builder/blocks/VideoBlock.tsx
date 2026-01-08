import React from 'react';
import { motion } from 'framer-motion';

const Motion = motion as any;

export interface VideoBlockProps {
    headline?: string;
    description?: string;
    videoUrl: string;
    className?: string;
    titleClassName?: string;
    descClassName?: string;
    titleStyle?: React.CSSProperties;
    descStyle?: React.CSSProperties;
}

const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
    if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
    if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
        const id = url.split('/').pop();
        return `https://player.vimeo.com/video/${id}`;
    }
    return url;
};

const VideoBlock: React.FC<VideoBlockProps> = ({ 
    headline, description, videoUrl,
    className = "", titleClassName = "", descClassName = "",
    titleStyle, descStyle
}) => {
    const embedUrl = getEmbedUrl(videoUrl);

    return (
        <section className={`px-6 py-20 max-w-7xl mx-auto ${className}`}>
            {(headline || description) && (
                <div className="text-center max-w-3xl mx-auto mb-12">
                    {headline && (
                        <Motion.h2 
                            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className={`text-3xl md:text-5xl font-bold mb-4 ${titleClassName}`}
                            style={titleStyle}
                        >
                            {headline}
                        </Motion.h2>
                    )}
                    {description && (
                        <p className={`opacity-70 leading-relaxed text-lg ${descClassName}`} style={descStyle}>
                            {description}
                        </p>
                    )}
                </div>
            )}

            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                {embedUrl ? (
                    <iframe 
                        src={embedUrl} 
                        className="w-full h-full border-0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        title="Video Embed"
                    ></iframe>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50">
                        <p>No Video URL Provided</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default VideoBlock;