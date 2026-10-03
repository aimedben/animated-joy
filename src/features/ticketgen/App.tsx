// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarEditor } from './components/SidebarEditor';
import { LineEditModal } from './components/LineEditModal';
import { PreviewStage } from './components/PreviewStage';
import { FullscreenModal } from './components/FullscreenModal';
import { AppSettings, TableOption, TicketModel, TicketProductLine, SelectedTarget } from './types';
import {
  DEFAULT_MODELS,
  TABLE_OPTIONS,
  INITIAL_SETTINGS,
  createDefaultProductLines,
  generateRandomDemoNumber,
  getCurrentTimeString,
  getTodayDateString,
} from './data/defaults';
import { generateTicketDataUrl, renderFinalComposition } from './utils/ticketCanvas';

const STORAGE_KEY = 'ticketgen_dz_settings_v2';

export default function App() {
  // Load settings from localStorage if available
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          customTableUrl: null,
          customTicketUrl: null,
          productLines:
            parsed.productLines && parsed.productLines.length > 0
              ? parsed.productLines
              : INITIAL_SETTINGS.productLines,
          backgroundSettings:
            parsed.backgroundSettings || INITIAL_SETTINGS.backgroundSettings,
        };
      }
    } catch {
      // ignore
    }
    return INITIAL_SETTINGS;
  });

  // Selected target for inline Canva interaction and modal editing
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<TicketProductLine | null>(null);

  const handleSelectTarget = useCallback((target: SelectedTarget | null) => {
    setSelectedTarget(target);
    setSelectedLineId(target ? target.lineId : null);
  }, []);

  const handleSelectLineId = useCallback((id: string | null) => {
    setSelectedLineId(id);
    if (!id) {
      setSelectedTarget(null);
    } else {
      setSelectedTarget((prev) =>
        prev && prev.lineId === id ? prev : { lineId: id, subType: 'row' }
      );
    }
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize settings with localStorage
  useEffect(() => {
    try {
      const toSave = {
        demoNumber: settings.demoNumber,
        date: settings.date,
        time: settings.time,
        selectedModelId: settings.selectedModelId,
        selectedTableId: settings.selectedTableId,
        position: settings.position,
        rotation: settings.rotation,
        showSpecimenBanner: settings.showSpecimenBanner,
        productLines: settings.productLines,
        showGrid: settings.showGrid,
        ticketWidth: settings.ticketWidth,
        ticketHeight: settings.ticketHeight,
        lockProportions: settings.lockProportions,
        backgroundSettings: settings.backgroundSettings,
        previewZoom: settings.previewZoom,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore storage error
    }
  }, [settings]);

  // Current selected model
  const currentModel = useMemo(() => {
    const found = DEFAULT_MODELS.find((m) => m.id === settings.selectedModelId);
    return found || DEFAULT_MODELS[0];
  }, [settings.selectedModelId]);

  // Generate ticket data URLs for thumbnails and export
  const [modelDataUrls, setModelDataUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls: Record<string, string> = {};
    DEFAULT_MODELS.forEach((m) => {
      urls[m.id] = generateTicketDataUrl(m, settings);
    });
    setModelDataUrls(urls);
  }, [
    settings.demoNumber,
    settings.date,
    settings.time,
    settings.showSpecimenBanner,
    settings.productLines,
    settings.selectedModelId,
    settings.ticketWidth,
    settings.ticketHeight,
  ]);

  // The active ticket image URL (used for fallback or custom image)
  const activeTicketUrl = useMemo(() => {
    if (settings.customTicketUrl) {
      return settings.customTicketUrl;
    }
    return modelDataUrls[currentModel.id] || generateTicketDataUrl(currentModel, settings);
  }, [settings.customTicketUrl, currentModel, modelDataUrls, settings]);

  // Current selected table URL
  const activeTableUrl = useMemo(() => {
    if (settings.customTableUrl) {
      return settings.customTableUrl;
    }
    const found = TABLE_OPTIONS.find((t) => t.id === settings.selectedTableId);
    return found ? found.url : TABLE_OPTIONS[0].url;
  }, [settings.customTableUrl, settings.selectedTableId]);

  // Quick toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // Line operations
  const handleUpdateLine = useCallback((updated: TicketProductLine) => {
    setSettings((prev) => ({
      ...prev,
      productLines: prev.productLines.map((l) =>
        l.id === updated.id
          ? {
              ...updated,
              quantity: updated.quantity || updated.qty || 1,
              unitPrice: updated.unitPrice || updated.price || 0,
              total:
                (updated.quantity || updated.qty || 1) *
                (updated.unitPrice || updated.price || 0),
            }
          : l
      ),
    }));
  }, []);

  const handleDeleteLine = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      productLines: prev.productLines.filter((l) => l.id !== id),
    }));
    setSelectedLineId(null);
    showToast('Ligne supprimée');
  }, []);

  const handleDuplicateLine = useCallback((line: TicketProductLine) => {
    const duplicated: TicketProductLine = {
      ...line,
      id: `line-${Date.now()}`,
      name: `${line.name} (copie)`,
      y: (line.y || 0) + 30,
    };
    setSettings((prev) => ({
      ...prev,
      productLines: [...prev.productLines, duplicated],
    }));
    setSelectedLineId(duplicated.id);
    showToast('Ligne dupliquée');
  }, []);

  // Reset to default
  const handleReset = () => {
    setSettings({
      ...INITIAL_SETTINGS,
      demoNumber: generateRandomDemoNumber(),
      date: getTodayDateString(),
      time: getCurrentTimeString(),
      productLines: createDefaultProductLines(),
    });
    setSelectedLineId(null);
    showToast('Paramètres réinitialisés par défaut');
  };

  // Reset stage plane (ticket position, rotation, table position, zoom)
  const handleResetPlan = () => {
    setSettings((prev) => ({
      ...prev,
      position: { x: 0, y: 0 },
      rotation: 0,
      previewZoom: 1.0,
      backgroundSettings: { x: 0, y: 0, zoom: 1.0 },
    }));
    showToast('Plan réinitialisé avec succès');
  };

  // Export 16:9 composition
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const dataUrl = await renderFinalComposition(
        activeTableUrl,
        currentModel,
        settings,
        1920,
        1080
      );

      // Trigger browser download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ticketdz_maquette_${settings.demoNumber || 'ticket'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Maquette exportée avec succès !');
    } catch (err) {
      console.error('Export failed', err);
      showToast("Erreur lors de l'exportation de l'image");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        onOpenFullscreen={() => setIsFullscreen(true)}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
          {/* Left Column: Sidebar Editor (w-full lg:w-[420px] lg:shrink-0) */}
          <div className="w-full lg:w-[420px] lg:shrink-0">
            <SidebarEditor
              settings={settings}
              tableOptions={TABLE_OPTIONS}
              selectedTarget={selectedTarget}
              onSelectTarget={handleSelectTarget}
              onUpdateSettings={setSettings}
              onReset={handleReset}
              onResetPlan={handleResetPlan}
            />
          </div>

          {/* Right Column: Visual Stage (Responsive 16:9) */}
          <div className="w-full lg:flex-1 min-w-0">
            <PreviewStage
              settings={settings}
              tableUrl={activeTableUrl}
              ticketUrl={activeTicketUrl}
              currentModel={currentModel}
              selectedTarget={selectedTarget}
              onSelectTarget={handleSelectTarget}
              selectedLineId={selectedLineId}
              onSelectLine={handleSelectLineId}
              onUpdateLine={handleUpdateLine}
              onDeleteLine={handleDeleteLine}
              onDuplicateLine={handleDuplicateLine}
              onOpenEditModal={setEditingLine}
              onUpdatePosition={(newPos) =>
                setSettings((prev) => ({ ...prev, position: newPos }))
              }
              onUpdateDimensions={(dims) =>
                setSettings((prev) => ({
                  ...prev,
                  ticketWidth: dims.width,
                  ticketHeight: dims.height,
                }))
              }
              onUpdateZoom={(zoom) =>
                setSettings((prev) => ({
                  ...prev,
                  previewZoom: zoom,
                }))
              }
              onResetPlan={handleResetPlan}
              onOpenFullscreen={() => setIsFullscreen(true)}
              onExport={handleExport}
              isExporting={isExporting}
            />
          </div>
        </div>
      </main>

      {/* Direct Line Edit Modal */}
      <LineEditModal
        line={editingLine}
        isOpen={!!editingLine}
        onClose={() => setEditingLine(null)}
        onSave={handleUpdateLine}
        onDelete={handleDeleteLine}
        onDuplicate={handleDuplicateLine}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Fullscreen View */}
      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        tableUrl={activeTableUrl}
        ticketUrl={activeTicketUrl}
        settings={settings}
      />
    </div>
  );
}
