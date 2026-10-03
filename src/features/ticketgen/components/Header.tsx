import React from 'react';
import { Layers, Maximize2, Download } from 'lucide-react';

interface HeaderProps {
  onOpenFullscreen: () => void;
  onExport: () => void;
  isExporting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFullscreen,
  onExport,
  isExporting,
}) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Brand info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white shadow-sm ring-2 ring-violet-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-gray-900 leading-tight">
                TicketGen DZ
              </span>
              <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                Éditeur de ticket
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium hidden sm:block">
              Maquettes de tickets de démonstration
            </p>
          </div>
        </div>

        {/* Actions: Plein écran & Exporter */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFullscreen}
            className="h-9 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Afficher en plein écran (Échap pour quitter)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Plein écran</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={onExport}
            className="h-9 px-3.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exportation...' : 'Exporter la maquette'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
