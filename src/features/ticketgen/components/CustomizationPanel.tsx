import React, { useRef } from 'react';
import {
  RotateCcw,
  Sparkles,
  Calendar,
  Clock,
  Check,
  Upload,
  Crosshair,
  Sliders,
  Image as ImageIcon,
  Lock,
  Unlock,
  Maximize,
} from 'lucide-react';
import { AppSettings, SizeMode, TableOption, TicketModel } from '../types';
import {
  generateRandomDemoNumber,
  getCurrentTimeString,
  getTodayDateString,
} from '../data/defaults';

interface CustomizationPanelProps {
  settings: AppSettings;
  models: TicketModel[];
  tableOptions: TableOption[];
  modelDataUrls: Record<string, string>;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onGenerateDemo: () => void;
  onReset: () => void;
}

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  settings,
  models,
  tableOptions,
  modelDataUrls,
  onUpdateSettings,
  onGenerateDemo,
  onReset,
}) => {
  const tableFileInputRef = useRef<HTMLInputElement>(null);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomTableUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpdateSettings((prev) => ({
        ...prev,
        customTableUrl: url,
        selectedTableId: 'custom',
      }));
    }
  };

  const handleCustomTicketUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpdateSettings((prev) => ({
        ...prev,
        customTicketUrl: url,
        selectedModelId: 'custom',
      }));
    }
  };

  const currentWidth = settings.ticketWidth || 360;
  const currentHeight = settings.ticketHeight || 620;

  const handleUpdateWidth = (newWidth: number) => {
    const clampedW = Math.max(180, Math.min(900, newWidth));
    onUpdateSettings((prev) => {
      const curW = prev.ticketWidth || 360;
      const curH = prev.ticketHeight || 620;
      if (prev.lockProportions) {
        const ratio = curW / (curH || 1);
        const newH = Math.round(clampedW / (ratio || (360 / 620)));
        return {
          ...prev,
          ticketWidth: clampedW,
          ticketHeight: Math.max(250, Math.min(1100, newH)),
        };
      }
      return {
        ...prev,
        ticketWidth: clampedW,
      };
    });
  };

  const handleUpdateHeight = (newHeight: number) => {
    const clampedH = Math.max(250, Math.min(1100, newHeight));
    onUpdateSettings((prev) => {
      const curW = prev.ticketWidth || 360;
      const curH = prev.ticketHeight || 620;
      if (prev.lockProportions) {
        const ratio = curW / (curH || 1);
        const newW = Math.round(clampedH * (ratio || (360 / 620)));
        return {
          ...prev,
          ticketWidth: Math.max(180, Math.min(900, newW)),
          ticketHeight: clampedH,
        };
      }
      return {
        ...prev,
        ticketHeight: clampedH,
      };
    });
  };

  const handleFitToZone = () => {
    onUpdateSettings((prev) => {
      const maxW = 540;
      const maxH = 880;
      let targetW = prev.ticketWidth || 360;
      let targetH = prev.ticketHeight || 620;

      if (targetW > maxW || targetH > maxH) {
        const scaleW = maxW / targetW;
        const scaleH = maxH / targetH;
        const scale = Math.min(scaleW, scaleH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      } else if (targetW < 300 && targetH < 480) {
        targetW = 360;
        targetH = 620;
      }

      return {
        ...prev,
        ticketWidth: targetW,
        ticketHeight: targetH,
      };
    });
  };

  const handleResetDimensions = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      ticketWidth: 360,
      ticketHeight: 620,
      lockProportions: true,
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 sm:p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-wider uppercase text-gray-900">
            Personnalisation
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Paramètres de la maquette de démonstration
          </p>
        </div>
        <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200/50">
          DZ SPECIMEN
        </span>
      </div>

      {/* 1. Numéro de démonstration */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Numéro
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.demoNumber}
            onChange={(e) =>
              onUpdateSettings((prev) => ({ ...prev, demoNumber: e.target.value }))
            }
            className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            placeholder="Ex: 004829"
          />
          <button
            type="button"
            onClick={() =>
              onUpdateSettings((prev) => ({
                ...prev,
                demoNumber: generateRandomDemoNumber(),
              }))
            }
            className="h-10 px-3.5 bg-white border border-gray-200 text-gray-700 hover:text-violet-700 hover:border-violet-300 hover:bg-violet-50/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            Générer
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Identifiant de démonstration uniquement
        </p>
      </div>

      {/* 2. Date & 3. Heure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Date
          </label>
          <div className="space-y-1.5">
            <input
              type="date"
              value={settings.date}
              onChange={(e) =>
                onUpdateSettings((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full h-10 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  date: getTodayDateString(),
                }))
              }
              className="w-full h-8 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <Calendar className="w-3 h-3 text-gray-500" />
              Aujourd&apos;hui
            </button>
          </div>
        </div>

        {/* Heure */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Heure
          </label>
          <div className="space-y-1.5">
            <input
              type="time"
              value={settings.time}
              onChange={(e) =>
                onUpdateSettings((prev) => ({ ...prev, time: e.target.value }))
              }
              className="w-full h-10 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  time: getCurrentTimeString(),
                }))
              }
              className="w-full h-8 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <Clock className="w-3 h-3 text-gray-500" />
              Maintenant
            </button>
          </div>
        </div>
      </div>

      {/* 4. MODÈLE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Modèle
          </label>
          <button
            type="button"
            onClick={() => ticketFileInputRef.current?.click()}
            className="text-[11px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 hover:underline"
          >
            <Upload className="w-3 h-3" />
            Ticket personnalisé
          </button>
          <input
            ref={ticketFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomTicketUpload}
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {models.map((model) => {
            const isSelected =
              settings.selectedModelId === model.id && !settings.customTicketUrl;
            const thumbUrl = modelDataUrls[model.id];

            return (
              <button
                key={model.id}
                type="button"
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    selectedModelId: model.id,
                    customTicketUrl: null,
                  }))
                }
                className={`relative group flex flex-col items-center p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-violet-600 bg-violet-50/40 ring-2 ring-violet-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Checkmark badge */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center z-10 shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}

                {/* Ticket thumbnail preview */}
                <div className="w-full h-20 bg-gray-100 rounded border border-gray-200/60 overflow-hidden flex items-center justify-center mb-1.5">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={model.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono">
                      {model.name}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[11px] font-semibold truncate w-full text-center ${
                    isSelected ? 'text-violet-900' : 'text-gray-700'
                  }`}
                >
                  {model.name}
                </span>
                <span className="text-[10px] text-gray-400 truncate w-full text-center">
                  {model.badge || model.businessName}
                </span>
              </button>
            );
          })}
        </div>

        {settings.customTicketUrl && (
          <div className="mt-2 p-2 bg-violet-50 border border-violet-200 rounded-lg flex items-center justify-between text-xs text-violet-800">
            <span className="truncate">Image de ticket importée active</span>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  customTicketUrl: null,
                  selectedModelId: models[0]?.id || 'seddouk-bejaia',
                }))
              }
              className="text-violet-600 hover:text-violet-900 font-medium ml-2 underline text-[11px]"
            >
              Rétablir modèle
            </button>
          </div>
        )}
      </div>

      {/* 5. IMAGE DE TABLE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Image de table
          </label>
          <button
            type="button"
            onClick={() => tableFileInputRef.current?.click()}
            className="text-[11px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 hover:underline"
          >
            <Upload className="w-3 h-3" />
            Changer l&apos;image de table
          </button>
          <input
            ref={tableFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomTableUpload}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {tableOptions.map((opt) => {
            const isSelected =
              settings.selectedTableId === opt.id && !settings.customTableUrl;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    selectedTableId: opt.id,
                    customTableUrl: null,
                  }))
                }
                className={`relative flex flex-col p-1.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-violet-600 bg-violet-50/30 ring-2 ring-violet-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center z-10 shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-full aspect-video rounded overflow-hidden mb-1 bg-gray-100">
                  <img
                    src={opt.url}
                    alt={opt.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[11px] font-medium text-gray-800 truncate">
                  {opt.name}
                </span>
              </button>
            );
          })}
        </div>

        {settings.customTableUrl && (
          <div className="mt-2 p-2 bg-violet-50 border border-violet-200 rounded-lg flex items-center justify-between text-xs text-violet-800">
            <span className="truncate">Table personnalisée 16:9 active</span>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  customTableUrl: null,
                  selectedTableId: tableOptions[0]?.id || 'table-wood-desk',
                }))
              }
              className="text-violet-600 hover:text-violet-900 font-medium ml-2 underline text-[11px]"
            >
              Rétablir
            </button>
          </div>
        )}
      </div>

      {/* 6. DIMENSIONS DU TICKET */}
      <div className="space-y-3 p-3.5 bg-gray-50/80 border border-gray-200/80 rounded-xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            Dimensions du ticket
          </label>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings((prev) => ({
                ...prev,
                lockProportions: !prev.lockProportions,
              }))
            }
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              settings.lockProportions
                ? 'bg-violet-100 text-violet-800 border border-violet-200'
                : 'bg-gray-200 text-gray-600 border border-gray-300'
            }`}
            title="Activer ou désactiver le verrouillage des proportions"
          >
            {settings.lockProportions ? (
              <Lock className="w-3 h-3 text-violet-600" />
            ) : (
              <Unlock className="w-3 h-3 text-gray-500" />
            )}
            <span>Proportions verrouillées</span>
          </button>
        </div>

        {/* Largeur: [-] [input] [+] and slider */}
        <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-gray-200/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Largeur</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleUpdateWidth(currentWidth - 10)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold flex items-center justify-center transition-colors text-xs"
              >
                −
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={180}
                  max={900}
                  value={currentWidth}
                  onChange={(e) => handleUpdateWidth(parseInt(e.target.value, 10) || 200)}
                  className="w-20 h-7 px-1.5 text-center bg-gray-50 border border-gray-200 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="text-[10px] text-gray-400 absolute right-2 pointer-events-none">px</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateWidth(currentWidth + 10)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold flex items-center justify-center transition-colors text-xs"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={200}
            max={800}
            step={2}
            value={currentWidth}
            onChange={(e) => handleUpdateWidth(parseInt(e.target.value, 10))}
            className="w-full accent-violet-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
            <span>200 px</span>
            <span>800 px</span>
          </div>
        </div>

        {/* Hauteur: [-] [input] [+] and slider */}
        <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-gray-200/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Hauteur</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleUpdateHeight(currentHeight - 10)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold flex items-center justify-center transition-colors text-xs"
              >
                −
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={250}
                  max={1200}
                  value={currentHeight}
                  onChange={(e) => handleUpdateHeight(parseInt(e.target.value, 10) || 300)}
                  className="w-20 h-7 px-1.5 text-center bg-gray-50 border border-gray-200 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="text-[10px] text-gray-400 absolute right-2 pointer-events-none">px</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateHeight(currentHeight + 10)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold flex items-center justify-center transition-colors text-xs"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={300}
            max={1000}
            step={2}
            value={currentHeight}
            onChange={(e) => handleUpdateHeight(parseInt(e.target.value, 10))}
            className="w-full accent-violet-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
            <span>300 px</span>
            <span>1000 px</span>
          </div>
        </div>

        {/* Buttons: Adapter à la zone & Réinitialiser dimensions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleFitToZone}
            className="h-8 px-2 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <Maximize className="w-3 h-3" />
            Adapter à la zone
          </button>
          <button
            type="button"
            onClick={handleResetDimensions}
            className="h-8 px-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-gray-400" />
            Réinitialiser dimensions
          </button>
        </div>
      </div>

      {/* 7. POSITION DU TICKET */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Position
          </label>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings((prev) => ({ ...prev, position: { x: 0, y: 0 } }))
            }
            className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 hover:underline"
          >
            <Crosshair className="w-3 h-3" />
            Centrer
          </button>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
          <span>Déplacement libre</span>
          <span className="text-[11px] text-gray-500 font-mono">
            X: {Math.round(settings.position.x)}% · Y: {Math.round(settings.position.y)}%
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Glissez directement le ticket sur la table à la souris ou au doigt
        </p>
      </div>

      {/* 8. ROTATION */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-gray-500" />
            Rotation
          </label>
          <span className="text-xs font-mono font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
            {settings.rotation > 0 ? `+${settings.rotation}°` : `${settings.rotation}°`}
          </span>
        </div>
        <input
          type="range"
          min="-15"
          max="15"
          step="0.5"
          value={settings.rotation}
          onChange={(e) =>
            onUpdateSettings((prev) => ({
              ...prev,
              rotation: parseFloat(e.target.value),
            }))
          }
          className="w-full accent-violet-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-0.5">
          <span>-15°</span>
          <span>0°</span>
          <span>+15°</span>
        </div>
      </div>

      {/* 10. BOUTON PRINCIPAL & 11. RÉINITIALISER */}
      <div className="pt-2 space-y-2.5">
        <button
          type="button"
          onClick={onGenerateDemo}
          className="w-full h-11 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Générer la démo
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full h-9 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
          Réinitialiser
        </button>
      </div>
    </div>
  );
};
