import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AppSettings } from '../types';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableUrl: string;
  ticketUrl: string;
  settings: AppSettings;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  isOpen,
  onClose,
  tableUrl,
  ticketUrl,
  settings,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentWidth = settings.ticketWidth || 360;
  const currentHeight = settings.ticketHeight || 620;
  const widthPercent = (currentWidth / 1920) * 100;
  const heightPercent = (currentHeight / 1080) * 100;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer select-none p-2 sm:p-4"
      title="Cliquer ou appuyer sur Échap pour quitter"
    >
      {/* Subtle close hint button */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/60 hover:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-white/90 border border-white/20 transition-all">
        <span>Fermer (Échap)</span>
        <X className="w-4 h-4" />
      </div>

      {/* 16:9 Container fitted to maximum screen without distortion */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[95vw] max-h-[92vh] aspect-video rounded-md overflow-hidden bg-slate-900 shadow-2xl border border-white/10"
      >
        {/* 1. Background Table */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${settings.backgroundSettings?.x || 0}%, ${settings.backgroundSettings?.y || 0}%) scale(${settings.backgroundSettings?.zoom || 1.0})`,
          }}
        >
          <img
            src={tableUrl}
            alt="Table background"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 2. Ticket Mockup with position, scale & rotation */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(${settings.position.x}%, ${settings.position.y}%)`,
          }}
        >
          <div
            style={{
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
              transform: `rotate(${settings.rotation}deg)`,
              filter: 'drop-shadow(0 20px 35px rgba(0,0,0,0.45)) drop-shadow(0 6px 12px rgba(0,0,0,0.25))',
            }}
            className="flex items-center justify-center"
          >
            <img
              src={ticketUrl}
              alt="Ticket mockup"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
