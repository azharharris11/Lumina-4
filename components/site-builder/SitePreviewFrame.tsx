
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SiteConfig } from '../../types';

interface SitePreviewFrameProps {
  children: React.ReactNode;
  className?: string;
  siteConfig: SiteConfig; // Added to inject vars
}

const SitePreviewFrame: React.FC<SitePreviewFrameProps> = ({ children, className, siteConfig }) => {
  const [contentRef, setContentRef] = useState<HTMLIFrameElement | null>(null);
  const mountNode = contentRef?.contentWindow?.document?.body;
  const isInitialized = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!contentRef?.contentWindow) return;

    const doc = contentRef.contentWindow.document;
    
    // Only inject if not already present to avoid FOUC on re-renders
    if (!isInitialized.current && !doc.getElementById('site-preview-styles')) {
        isInitialized.current = true; // Mark as initialized immediately

        // 1. Initial Hide to prevent FOUC
        doc.body.style.opacity = '0';
        doc.body.style.transition = 'opacity 0.3s ease';

        // 2. Inject Tailwind CDN
        const tailwindScript = doc.createElement('script');
        tailwindScript.id = 'site-preview-tailwind';
        tailwindScript.src = "https://cdn.tailwindcss.com";
        tailwindScript.onload = () => {
            // Unhide after Tailwind loads
            setTimeout(() => {
                doc.body.style.opacity = '1';
                setIsLoaded(true);
            }, 100);
        };
        doc.head.appendChild(tailwindScript);

        // 3. Inject Google Fonts
        const fontPreconnect1 = doc.createElement('link');
        fontPreconnect1.rel = 'preconnect';
        fontPreconnect1.href = 'https://fonts.googleapis.com';
        doc.head.appendChild(fontPreconnect1);

        const fontPreconnect2 = doc.createElement('link');
        fontPreconnect2.rel = 'preconnect';
        fontPreconnect2.href = 'https://fonts.gstatic.com';
        fontPreconnect2.crossOrigin = 'anonymous';
        doc.head.appendChild(fontPreconnect2);

        const fontLink = doc.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;600&family=Lora:ital,wght@0,400;1,400&display=swap';
        doc.head.appendChild(fontLink);

        // 4. Basic Reset & Variables Container
        const style = doc.createElement('style');
        style.id = 'site-preview-styles';
        style.innerHTML = `
          body { margin: 0; overflow-x: hidden; background-color: var(--site-bg, #fff); color: var(--site-text, #000); }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #1c1917; }
          ::-webkit-scrollbar-thumb { background: #292524; border-radius: 3px; }
        `;
        doc.head.appendChild(style);
    }
  }, [contentRef]);

  // Inject CSS Variables for Global Styles
  useEffect(() => {
      if (!contentRef?.contentWindow) return;
      const doc = contentRef.contentWindow.document;
      const root = doc.documentElement;
      
      const style = siteConfig.style || {
          primaryColor: '#000000',
          secondaryColor: '#ffffff',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          fontHeading: 'Syne, sans-serif',
          fontBody: 'Outfit, sans-serif'
      };

      root.style.setProperty('--site-primary', style.primaryColor);
      root.style.setProperty('--site-secondary', style.secondaryColor);
      root.style.setProperty('--site-bg', style.backgroundColor);
      root.style.setProperty('--site-text', style.textColor);
      root.style.setProperty('--site-font-heading', style.fontHeading);
      root.style.setProperty('--site-font-body', style.fontBody);

  }, [contentRef, siteConfig.style]);

  return (
    <iframe
      ref={setContentRef}
      className={className}
      title="Site Preview"
      style={{ border: 'none', width: '100%', height: '100%' }}
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
};

export default SitePreviewFrame;
