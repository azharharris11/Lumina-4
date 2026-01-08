import React from 'react';
import { motion } from 'framer-motion';

const Motion = motion as any;

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    image: string;
}

export interface TeamBlockProps {
    headline?: string;
    description?: string;
    members: TeamMember[];
    className?: string;
    titleClassName?: string;
    descClassName?: string;
    cardClassName?: string;
    titleStyle?: React.CSSProperties;
    descStyle?: React.CSSProperties;
}

const TeamBlock: React.FC<TeamBlockProps> = ({ 
    headline = "Meet the Team", description, members = [],
    className = "", titleClassName = "", descClassName = "", cardClassName = "",
    titleStyle, descStyle
}) => {
    return (
        <section className={`px-6 py-20 max-w-7xl mx-auto ${className}`}>
            <div className="text-center max-w-3xl mx-auto mb-16">
                <Motion.h2 
                    initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className={`text-4xl font-bold mb-4 ${titleClassName}`}
                    style={titleStyle}
                >
                    {headline}
                </Motion.h2>
                {description && (
                    <p className={`opacity-70 leading-relaxed text-lg ${descClassName}`} style={descStyle}>
                        {description}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {members.map((member, idx) => (
                    <Motion.div 
                        key={member.id}
                        initial={{ opacity: 0, y: 20 }} 
                        whileInView={{ opacity: 1, y: 0 }} 
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className={`group ${cardClassName}`}
                    >
                        <div className="aspect-[3/4] overflow-hidden bg-gray-100 mb-4 relative">
                            {member.image ? (
                                <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                    No Image
                                </div>
                            )}
                        </div>
                        <h3 className="text-lg font-bold">{member.name}</h3>
                        <p className="text-xs uppercase tracking-widest opacity-60 mt-1">{member.role}</p>
                    </Motion.div>
                ))}
            </div>
        </section>
    );
};

export default TeamBlock;