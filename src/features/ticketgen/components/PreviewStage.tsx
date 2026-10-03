// @ts-nocheck
import React, { useRef, useState, useCallback } from 'react';
import { Maximize2, Download, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { AppSettings, TicketModel, TicketProductLine, SelectedTarget } from '../types';
import { InteractiveTicket } from './InteractiveTicket';

interface PreviewStageProps {
  settings: AppSettings;
  tableUrl: string;
  ticketUrl: string;
  currentModel: TicketModel;
  selectedTarget?: SelectedTarget | null;
  onSelectTarget?: (target: SelectedTarget | null) => void;
  selectedLineId?: string | null;
  onSelectLine?: (id: string | null) => void;
  onUpdateLine: (updated: TicketProductLine) => void;
  onDeleteLine: (id: string) => void;
  onDuplicateLine: (line: TicketProductLine) => void;
  onOpenEditModal: (line: TicketProductLine) => void;
  onUpdatePosition: (newPos: { x: number; y: number }) => void;
  onUpdateDimensions: (dims: { width: number; height: number }) => void;
  onUpdateZoom: (zoom: number) => void;
  onResetPlan: () => void;
  onOpenFullscreen: () => void;
  onExport: () => void;
  isExporting: boolean;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  settings,
  tableUrl,
  ticketUrl,
  currentModel,
  selectedTarget,
  onSelectTarget,
  selectedLineId,
  onSelectLine,
  onUpdateLine,
  onDeleteLine,
  onDuplicateLine,
  onOpenEditModal,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateZoom,
  onResetPlan,
  onOpenFullscreen,
  onExport,
  isExporting,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingTicket, setIsDraggingTicket] = useState(false);
  const [isTicketHovered, setIsTicketHovered] = useState(false);

  // Position drag state
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initPosX: number;
    initPosY: number;
  }>({
    startX: 0,
    startY: 0,
    initPosX: 0,
    initPosY: 0,
  });

  // Corner resize state
  const [resizingCorner, setResizingCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    initW: number;
    initH: number;
  }>({
    startX: 0,
    startY: 0,
    initW: 380,
    initH: 740,
  });

  const currentWidth = settings.ticketWidth || 380;
  const currentHeight = settings.ticketHeight || 740;
  const previewZoom = settings.previewZoom || 1.0;

  // Background settings
  const bgX = settings.backgroundSettings?.x || 0;
  const bgY = settings.backgroundSettings?.y || 0;
  const bgZoom = settings.backgroundSettings?.zoom || 1.0;

  // Drag ticket on table handlers
  const handleTicketPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest('[data-resize-handle="true"]') ||
      (e.target as HTMLElement).closest('[data-line-item="true"]')
    ) {
      return;
    }
    setIsDraggingTicket(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: settings.position.x,
      initPosY: settings.position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTicketPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingTicket || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaPxX = e.clientX - dragStartRef.current.startX;
      const deltaPxY = e.clientY - dragStartRef.current.startY;

      const deltaPercentX = (deltaPxX / rect.width) * 100;
      const deltaPercentY = (deltaPxY / rect.height) * 100;

      const newX = Math.max(-42, Math.min(42, dragStartRef.current.initPosX + deltaPercentX));
      const newY = Math.max(-36, Math.min(36, dragStartRef.current.initPosY + deltaPercentY));

      onUpdatePosition({ x: newX, y: newY });
    },
    [isDraggingTicket, onUpdatePosition]
  );

  const handleTicketPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTicket) {
      setIsDraggingTicket(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Corner resize handlers
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    corner: 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    e.stopPropagation();
    setResizingCorner(corner);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initW: currentWidth,
      initH: currentHeight,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizingCorner || !containerRef.current) return;
      e.stopPropagation();

      const rect = containerRef.current.getBoundingClientRect();
      const deltaClientX = e.clientX - resizeStartRef.current.startX;
      const deltaClientY = e.clientY - resizeStartRef.current.startY;

      // Scale based on container width vs reference 1200px
      const scaleFactor = 1200 / (rect.width || 1200);
      const deltaW = (resizingCorner === 'se' || resizingCorner === 'ne' ? 1 : -1) * deltaClientX * scaleFactor;
      const deltaH = (resizingCorner === 'se' || resizingCorner === 'sw' ? 1 : -1) * deltaClientY * scaleFactor;

      let newW = resizeStartRef.current.initW + deltaW;
      let newH = resizeStartRef.current.initH + deltaH;

      if (settings.lockProportions) {
        const ratio = resizeStartRef.current.initW / (resizeStartRef.current.initH || 1);
        if (Math.abs(deltaW) >= Math.abs(deltaH)) {
          newW = Math.max(200, Math.min(800, newW));
          newH = Math.round(newW / ratio);
        } else {
          newH = Math.max(300, Math.min(1100, newH));
          newW = Math.round(newH * ratio);
        }
      } else {
        newW = Math.max(200, Math.min(800, newW));
        newH = Math.max(300, Math.min(1100, newH));
      }

      onUpdateDimensions({
        width: Math.round(newW),
        height: Math.round(newH),
      });
    },
    [resizingCorner, settings.lockProportions, onUpdateDimensions]
  );

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizingCorner) {
      setResizingCorner(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-6 flex flex-col h-full space-y-4">
      {/* Top Header bar */}
      <div className="border-b border-gray-100 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-900">
              Aperçu
            </h2>
            <span className="text-[11px] font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
              Ticket : {Math.round(currentWidth)} × {Math.round(currentHeight)} px
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Format scène : 16:9
          </p>
        </div>

        {/* Zoom Controls: [ - ] [ 100% ] [ + ] & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton Réinitialiser le plan */}
          <button
            type="button"
            onClick={onResetPlan}
            className="h-8 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Réinitialiser la position du ticket, l'angle, et le zoom de la table"
          >
            <RotateCcw className="w-3.5 h-3.5 text-violet-600" />
            <span>Réinitialiser le plan</span>
          </button>

          {/* Zoom controls: − 50% 75% 100% 125% 150% + */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold gap-0.5">
            <button
              type="button"
              onClick={() => onUpdateZoom(Math.max(0.4, previewZoom - 0.1))}
              className="w-6 h-6 flex items-center justify-center hover:bg-white text-gray-700 rounded transition-colors text-xs font-bold"
              title="Zoom arrière"
            >
              −
            </button>
            {[0.5, 0.75, 1.0, 1.25, 1.5].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => onUpdateZoom(z)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  Math.abs(previewZoom - z) < 0.05
                    ? 'bg-violet-600 text-white font-bold shadow-2xs'
                    : 'hover:bg-white text-gray-700'
                }`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => onUpdateZoom(Math.min(1.8, previewZoom + 0.1))}
              className="w-6 h-6 flex items-center justify-center hover:bg-white text-gray-700 rounded transition-colors text-xs font-bold"
              title="Zoom avant"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenFullscreen}
            className="h-8 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Plein écran (Échap)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Plein écran</span>
          </button>
        </div>
      </div>

      {/* 16:9 Composition Scene (Ticket entirely visible, responsive containment) */}
      <div className="flex-1 flex flex-col justify-center items-center overflow-hidden">
        <div
          ref={containerRef}
          className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-900 select-none shadow-md border border-gray-200 flex items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          {/* 1. Background Table Image with position & zoom */}
          <div
            className="absolute inset-0 pointer-events-none transition-transform duration-100"
            style={{
              transform: `translate(${bgX}%, ${bgY}%) scale(${bgZoom})`,
            }}
          >
            <img
              src={tableUrl}
              alt="Table background"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>

          {/* 2. Interactive Ticket Overlay with zoom & scale containment */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: `scale(${previewZoom}) translate(${settings.position.x}%, ${settings.position.y}%)`,
              transition: isDraggingTicket || resizingCorner ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div
              onPointerDown={handleTicketPointerDown}
              onPointerMove={handleTicketPointerMove}
              onPointerUp={handleTicketPointerUp}
              onPointerCancel={handleTicketPointerUp}
              onMouseEnter={() => setIsTicketHovered(true)}
              onMouseLeave={() => setIsTicketHovered(false)}
              style={{
                width: `${currentWidth}px`,
                height: `${currentHeight}px`,
                maxWidth: '92%',
                maxHeight: '92%',
                transform: `rotate(${settings.rotation}deg)`,
                cursor: isDraggingTicket ? 'grabbing' : 'grab',
              }}
              className="pointer-events-auto relative group select-none flex items-center justify-center"
              title="Glissez pour déplacer le ticket sur la table, ou tirez les poignées d'angle"
            >
              {/* Ticket Render */}
              <div className="w-full h-full relative">
                {settings.customTicketUrl ? (
                  <img
                    src={ticketUrl}
                    alt="Ticket mockup"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none select-none rounded-[1px] shadow-2xl"
                  />
                ) : (
                  <InteractiveTicket
                    model={currentModel}
                    settings={settings}
                    selectedTarget={selectedTarget ?? null}
                    onSelectTarget={onSelectTarget ?? (() => {})}
                    selectedLineId={selectedLineId}
                    onSelectLine={onSelectLine}
                    onUpdateLine={onUpdateLine}
                    onDeleteLine={onDeleteLine}
                    onDuplicateLine={onDuplicateLine}
                    onOpenEditModal={onOpenEditModal}
                  />
                )}
              </div>

              {/* Selection Bounding Box & 4 Corner Resize Handles */}
              <div
                className={`absolute inset-0 pointer-events-none transition-opacity ${
                  isTicketHovered || isDraggingTicket || resizingCorner
                    ? 'border-2 border-violet-500/80 shadow-md opacity-100'
                    : 'border border-dashed border-violet-400/40 opacity-0 group-hover:opacity-100'
                }`}
              >
                {/* 4 Corner Resize Handles */}
                {/* Top-Left */}
                <div
                  data-resize-handle="true"
                  onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  onPointerCancel={handleResizePointerUp}
                  title="Redimensionner coin haut-gauche"
                  className="pointer-events-auto absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center cursor-nwse-resize z-30"
                >
                  <div className="w-3.5 h-3.5 bg-white border-2 border-violet-600 rounded-full shadow-md hover:scale-125 transition-transform" />
                </div>

                {/* Top-Right */}
                <div
                  data-resize-handle="true"
                  onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  onPointerCancel={handleResizePointerUp}
                  title="Redimensionner coin haut-droit"
                  className="pointer-events-auto absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center cursor-nesw-resize z-30"
                >
                  <div className="w-3.5 h-3.5 bg-white border-2 border-violet-600 rounded-full shadow-md hover:scale-125 transition-transform" />
                </div>

                {/* Bottom-Left */}
                <div
                  data-resize-handle="true"
                  onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  onPointerCancel={handleResizePointerUp}
                  title="Redimensionner coin bas-gauche"
                  className="pointer-events-auto absolute -bottom-2 -left-2 w-5 h-5 flex items-center justify-center cursor-nesw-resize z-30"
                >
                  <div className="w-3.5 h-3.5 bg-white border-2 border-violet-600 rounded-full shadow-md hover:scale-125 transition-transform" />
                </div>

                {/* Bottom-Right */}
                <div
                  data-resize-handle="true"
                  onPointerDown={(e) => handleResizePointerDown(e, 'se')}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  onPointerCancel={handleResizePointerUp}
                  title="Redimensionner coin bas-droit"
                  className="pointer-events-auto absolute -bottom-2 -right-2 w-5 h-5 flex items-center justify-center cursor-nwse-resize z-30"
                >
                  <div className="w-3.5 h-3.5 bg-white border-2 border-violet-600 rounded-full shadow-md hover:scale-125 transition-transform" />
                </div>
              </div>

              {/* Status pill on drag / resize */}
              <div
                className={`absolute -top-5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-black/85 text-white backdrop-blur-xs flex items-center gap-1 transition-opacity pointer-events-none z-40 whitespace-nowrap ${
                  isDraggingTicket || resizingCorner
                    ? 'opacity-100 ring-2 ring-violet-400'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <Move className="w-2.5 h-2.5 text-violet-300" />
                <span>
                  {resizingCorner
                    ? `${Math.round(currentWidth)} × ${Math.round(currentHeight)} px`
                    : isDraggingTicket
                    ? 'Déplacement sur table'
                    : 'Déplacer · 4 poignées pour redimensionner'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Small interaction caption below preview */}
        <div className="mt-3 flex items-center justify-between w-full text-xs text-gray-500 px-1">
          <div className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-gray-400" />
            <span>
              Cliquez sur un produit pour le déplacer (flèches ↑ ↓ ← →) ou glissez le ticket entier
            </span>
          </div>
          <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
            1920 × 1080 (16:9)
          </span>
        </div>
      </div>
    </div>
  );
};
