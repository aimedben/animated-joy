import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  RotateCcw,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Maximize,
  Sliders,
  Image as ImageIcon,
  Upload,
  AlertCircle,
  FileText,
  Type,
} from 'lucide-react';
import { AppSettings, TableOption, TicketProductLine, SelectedTarget } from '../types';
import {
  generateRandomDemoNumber,
  getCurrentTimeString,
  getTodayDateString,
  createDefaultProductLines,
  DEMO_SAMPLE_PRODUCTS,
} from '../data/defaults';

interface SidebarEditorProps {
  settings: AppSettings;
  tableOptions: TableOption[];
  selectedLineIds?: string[];
  onSelectLineIds?: (ids: string[]) => void;
  selectedTarget?: SelectedTarget | null;
  onSelectTarget?: (target: SelectedTarget | null) => void;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onReset: () => void;
  onResetPlan: () => void;
}

export const SidebarEditor: React.FC<SidebarEditorProps> = ({
  settings,
  tableOptions,
  selectedLineIds = [],
  onSelectLineIds,
  selectedTarget,
  onSelectTarget,
  onUpdateSettings,
  onReset,
  onResetPlan,
}) => {
  const tableFileInputRef = useRef<HTMLInputElement>(null);

  // Textarea input states (initialized with default sample products)
  const [namesText, setNamesText] = useState(
    DEMO_SAMPLE_PRODUCTS.map((p) => p.name).join('\n')
  );
  const [qtysText, setQtysText] = useState(
    DEMO_SAMPLE_PRODUCTS.map((p) => p.quantity).join('\n')
  );
  const [pricesText, setPricesText] = useState(
    DEMO_SAMPLE_PRODUCTS.map((p) => p.unitPrice).join('\n')
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live totals calculation
  const totalArticles = useMemo(() => {
    return settings.productLines.reduce(
      (sum, item) => sum + (item.quantity || item.qty || 0),
      0
    );
  }, [settings.productLines]);

  const grandTotal = useMemo(() => {
    return settings.productLines.reduce(
      (sum, item) =>
        sum +
        (item.quantity || item.qty || 0) * (item.unitPrice || item.price || 0),
      0
    );
  }, [settings.productLines]);

  // Handle "Générer" button
  const handleGenerateProducts = () => {
    setErrorMessage(null);
    const names = namesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const qtys = qtysText
      .split('\n')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    const prices = pricesText
      .split('\n')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    if (names.length === 0) {
      setErrorMessage('Veuillez saisir au moins un nom de produit.');
      return;
    }

    if (names.length !== qtys.length || names.length !== prices.length) {
      setErrorMessage(
        `Le nombre de produits (${names.length}), quantités (${qtys.length}) et prix (${prices.length}) doit correspondre.`
      );
      return;
    }

    const availableHeight = Math.max(160, settings.ticketHeight - 280);
    const lineSpacing = Math.min(36, Math.max(24, availableHeight / (names.length || 1)));

    const newLines: TicketProductLine[] = names.map((name, idx) => {
      const quantity = qtys[idx] || 1;
      const unitPrice = prices[idx] || 0;
      const total = quantity * unitPrice;
      return {
        id: `line-${Date.now()}-${idx}`,
        name,
        quantity,
        unitPrice,
        total,
        qty: quantity,
        price: unitPrice,
        y: idx * lineSpacing,
        x: 0,
        fontSize: settings.ticketWidth < 340 ? 11 : 12,
        textAlign: 'left',
      };
    });

    onUpdateSettings((prev) => ({
      ...prev,
      productLines: newLines,
    }));
  };

  // Handle "+ Ajouter un produit"
  const handleAddProduct = () => {
    const newName = `Article ${settings.productLines.length + 1}`;
    const newQty = 1;
    const newPrice = 100;

    setNamesText((prev) => (prev ? `${prev}\n${newName}` : newName));
    setQtysText((prev) => (prev ? `${prev}\n${newQty}` : `${newQty}`));
    setPricesText((prev) => (prev ? `${prev}\n${newPrice}` : `${newPrice}`));

    onUpdateSettings((prev) => {
      const highestY = prev.productLines.reduce((max, l) => Math.max(max, l.y), 0);
      const newLine: TicketProductLine = {
        id: `line-${Date.now()}`,
        name: newName,
        quantity: newQty,
        unitPrice: newPrice,
        total: newQty * newPrice,
        qty: newQty,
        price: newPrice,
        y: prev.productLines.length > 0 ? highestY + 30 : 0,
        x: 0,
        fontSize: prev.ticketWidth < 340 ? 11 : 12,
        textAlign: 'left',
      };
      return {
        ...prev,
        productLines: [...prev.productLines, newLine],
      };
    });
  };

  // Handle "Effacer les produits"
  const handleClearProducts = () => {
    setNamesText('');
    setQtysText('');
    setPricesText('');
    setErrorMessage(null);
    onUpdateSettings((prev) => ({
      ...prev,
      productLines: [],
    }));
  };

  // Active target lines if selected
  const isMulti = selectedLineIds.length > 1;
  const targetLine = useMemo(() => {
    if (selectedLineIds.length > 0) {
      return settings.productLines.find((l) => l.id === selectedLineIds[0]) || null;
    }
    if (!selectedTarget) return null;
    return settings.productLines.find((l) => l.id === selectedTarget.lineId) || null;
  }, [selectedLineIds, selectedTarget, settings.productLines]);

  const currentNameSize = targetLine?.nameStyle?.fontSize || targetLine?.fontSize || 12;
  const currentQtySize = targetLine?.qtyStyle?.fontSize || 11;
  const currentPriceSize = targetLine?.priceStyle?.fontSize || 11;
  const currentTotalSize = targetLine?.totalStyle?.fontSize || 11;

  const updateFontSize = (
    subType: 'name' | 'quantity' | 'unitPrice' | 'total',
    newSize: number
  ) => {
    const clamped = Math.max(8, Math.min(26, newSize));
    onUpdateSettings((prev) => {
      const activeIds = isMulti
        ? selectedLineIds
        : targetLine
        ? [targetLine.id]
        : null;

      if (activeIds && activeIds.length > 0) {
        return {
          ...prev,
          productLines: prev.productLines.map((l) => {
            if (!activeIds.includes(l.id)) return l;
            if (subType === 'name') {
              return {
                ...l,
                fontSize: clamped,
                nameStyle: { ...l.nameStyle, fontSize: clamped },
              };
            }
            if (subType === 'quantity') {
              return { ...l, qtyStyle: { ...l.qtyStyle, fontSize: clamped } };
            }
            if (subType === 'unitPrice') {
              return { ...l, priceStyle: { ...l.priceStyle, fontSize: clamped } };
            }
            if (subType === 'total') {
              return { ...l, totalStyle: { ...l.totalStyle, fontSize: clamped } };
            }
            return l;
          }),
        };
      } else {
        return {
          ...prev,
          productLines: prev.productLines.map((l) => {
            if (subType === 'name') {
              return {
                ...l,
                fontSize: clamped,
                nameStyle: { ...l.nameStyle, fontSize: clamped },
              };
            }
            if (subType === 'quantity') {
              return { ...l, qtyStyle: { ...l.qtyStyle, fontSize: clamped } };
            }
            if (subType === 'unitPrice') {
              return { ...l, priceStyle: { ...l.priceStyle, fontSize: clamped } };
            }
            if (subType === 'total') {
              return { ...l, totalStyle: { ...l.totalStyle, fontSize: clamped } };
            }
            return l;
          }),
        };
      }
    });
  };

  const applySizesToAllLines = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      productLines: prev.productLines.map((l) => ({
        ...l,
        fontSize: currentNameSize,
        nameStyle: { ...l.nameStyle, fontSize: currentNameSize },
        qtyStyle: { ...l.qtyStyle, fontSize: currentQtySize },
        priceStyle: { ...l.priceStyle, fontSize: currentPriceSize },
        totalStyle: { ...l.totalStyle, fontSize: currentTotalSize },
      })),
    }));
  };

  // Handle "Réinitialiser" (restore demo products)
  const handleResetSampleProducts = () => {
    setNamesText(DEMO_SAMPLE_PRODUCTS.map((p) => p.name).join('\n'));
    setQtysText(DEMO_SAMPLE_PRODUCTS.map((p) => p.quantity).join('\n'));
    setPricesText(DEMO_SAMPLE_PRODUCTS.map((p) => p.unitPrice).join('\n'));
    setErrorMessage(null);
    onUpdateSettings((prev) => ({
      ...prev,
      productLines: createDefaultProductLines(),
    }));
  };

  // Dimension helpers
  const currentWidth = settings.ticketWidth || 380;
  const currentHeight = settings.ticketHeight || 740;

  const handleUpdateWidth = (newW: number) => {
    const clampedW = Math.max(200, Math.min(800, newW));
    onUpdateSettings((prev) => {
      if (prev.lockProportions) {
        const ratio = (prev.ticketWidth || 380) / (prev.ticketHeight || 740);
        const newH = Math.round(clampedW / ratio);
        return {
          ...prev,
          ticketWidth: clampedW,
          ticketHeight: Math.max(300, Math.min(1100, newH)),
        };
      }
      return {
        ...prev,
        ticketWidth: clampedW,
      };
    });
  };

  const handleUpdateHeight = (newH: number) => {
    const clampedH = Math.max(300, Math.min(1100, newH));
    onUpdateSettings((prev) => {
      if (prev.lockProportions) {
        const ratio = (prev.ticketWidth || 380) / (prev.ticketHeight || 740);
        const newW = Math.round(clampedH * ratio);
        return {
          ...prev,
          ticketWidth: Math.max(200, Math.min(800, newW)),
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
    onUpdateSettings((prev) => ({
      ...prev,
      ticketWidth: 380,
      ticketHeight: 740,
    }));
  };

  const handleResetDimensions = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      ticketWidth: 380,
      ticketHeight: 740,
      lockProportions: false,
    }));
  };

  // Custom table upload
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

  return (
    <div className="space-y-4">
      {/* 1. INFORMATIONS */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-violet-600" />
            Informations
          </h2>
        </div>

        <div className="space-y-2.5">
          {/* Numéro de maquette */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">
                Numéro de maquette
              </label>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    demoNumber: generateRandomDemoNumber(),
                  }))
                }
                className="text-[11px] text-violet-600 hover:text-violet-800 font-medium underline"
              >
                Générer n°
              </button>
            </div>
            <input
              type="text"
              value={settings.demoNumber}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  demoNumber: e.target.value,
                }))
              }
              className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Date & Heure */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                Date
              </label>
              <input
                type="date"
                value={settings.date}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                Heure
              </label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    time: e.target.value,
                  }))
                }
                className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRODUITS */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Produits
            </h2>
            <p className="text-[10px] text-gray-500">
              Collez vos colonnes correspondantes
            </p>
          </div>
          <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
            {settings.productLines.length} ligne(s)
          </span>
        </div>

        {/* 3 Textareas */}
        <div className="grid grid-cols-3 gap-2">
          {/* Produits */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Produits
            </label>
            <textarea
              rows={7}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder="Canbebe&#10;Mirinda&#10;Pepsi"
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
            />
            <span className="text-[9px] text-gray-400 block mt-0.5 truncate">
              {namesText.split('\n').filter(Boolean).length} saisis
            </span>
          </div>

          {/* Quantités */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Quantités
            </label>
            <textarea
              rows={7}
              value={qtysText}
              onChange={(e) => setQtysText(e.target.value)}
              placeholder="1&#10;2&#10;2"
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-mono text-gray-800 text-center focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
            />
            <span className="text-[9px] text-gray-400 block mt-0.5 truncate text-center">
              {qtysText.split('\n').filter(Boolean).length} saisies
            </span>
          </div>

          {/* Prix unitaires */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Prix unitaires
            </label>
            <textarea
              rows={7}
              value={pricesText}
              onChange={(e) => setPricesText(e.target.value)}
              placeholder="320&#10;120&#10;150"
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-mono text-gray-800 text-right focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
            />
            <span className="text-[9px] text-gray-400 block mt-0.5 truncate text-right">
              {pricesText.split('\n').filter(Boolean).length} saisis
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Total live preview */}
        <div className="p-2.5 bg-violet-50/70 border border-violet-200/70 rounded-lg flex items-center justify-between">
          <span className="text-xs text-violet-800 font-medium">
            Article(s) : <strong className="font-mono">{totalArticles}</strong>
          </span>
          <span className="text-xs font-bold font-mono text-violet-950">
            Total : {grandTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
          </span>
        </div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleGenerateProducts}
            className="h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors col-span-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Générer
          </button>

          <button
            type="button"
            onClick={handleAddProduct}
            className="h-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3 text-violet-600" />
            Ajouter un produit
          </button>

          <button
            type="button"
            onClick={handleResetSampleProducts}
            className="h-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            title="Recharger les exemples"
          >
            <RotateCcw className="w-3 h-3 text-gray-500" />
            Réinitialiser
          </button>

          <button
            type="button"
            onClick={handleClearProducts}
            className="h-8 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors col-span-2"
          >
            <Trash2 className="w-3 h-3 text-rose-500" />
            Effacer les produits
          </button>
        </div>
      </div>

      {/* 2b. CONTRÔLE DE LA TAILLE DU TEXTE */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-violet-600" />
              Taille du texte des produits
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {targetLine
                ? `Ligne : ${targetLine.name}`
                : 'Taille par défaut pour tous les produits'}
            </p>
          </div>
          {targetLine && (
            <button
              type="button"
              onClick={() => onSelectTarget && onSelectTarget(null)}
              className="text-[10px] text-violet-600 hover:text-violet-800 underline font-medium"
            >
              Tous
            </button>
          )}
        </div>

        {/* 4 Controls: Texte produit, Quantité, Prix, Total */}
        <div className="space-y-2.5">
          {/* Texte produit */}
          <div className="flex items-center justify-between bg-gray-50/70 p-2 rounded-lg border border-gray-200/60">
            <span className="text-xs font-semibold text-gray-700">Texte produit</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateFontSize('name', currentNameSize - 1)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                −
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={8}
                  max={24}
                  value={currentNameSize}
                  onChange={(e) => updateFontSize('name', parseInt(e.target.value, 10) || 12)}
                  className="w-14 h-6 px-1 text-center bg-white border border-gray-200 rounded text-xs font-mono font-bold text-gray-900"
                />
                <span className="text-[9px] text-gray-400 absolute right-1 pointer-events-none">px</span>
              </div>
              <button
                type="button"
                onClick={() => updateFontSize('name', currentNameSize + 1)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Quantité */}
          <div className="flex items-center justify-between bg-gray-50/70 p-2 rounded-lg border border-gray-200/60">
            <span className="text-xs font-semibold text-gray-700">Quantité</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateFontSize('quantity', currentQtySize - 1)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                −
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={8}
                  max={24}
                  value={currentQtySize}
                  onChange={(e) => updateFontSize('quantity', parseInt(e.target.value, 10) || 11)}
                  className="w-14 h-6 px-1 text-center bg-white border border-gray-200 rounded text-xs font-mono font-bold text-gray-900"
                />
                <span className="text-[9px] text-gray-400 absolute right-1 pointer-events-none">px</span>
              </div>
              <button
                type="button"
                onClick={() => updateFontSize('quantity', currentQtySize + 1)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Prix unitaire */}
          <div className="flex items-center justify-between bg-gray-50/70 p-2 rounded-lg border border-gray-200/60">
            <span className="text-xs font-semibold text-gray-700">Prix unitaire</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateFontSize('unitPrice', currentPriceSize - 1)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                −
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={8}
                  max={24}
                  value={currentPriceSize}
                  onChange={(e) => updateFontSize('unitPrice', parseInt(e.target.value, 10) || 11)}
                  className="w-14 h-6 px-1 text-center bg-white border border-gray-200 rounded text-xs font-mono font-bold text-gray-900"
                />
                <span className="text-[9px] text-gray-400 absolute right-1 pointer-events-none">px</span>
              </div>
              <button
                type="button"
                onClick={() => updateFontSize('unitPrice', currentPriceSize + 1)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-gray-50/70 p-2 rounded-lg border border-gray-200/60">
            <span className="text-xs font-semibold text-gray-700">Total</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateFontSize('total', currentTotalSize - 1)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                −
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={8}
                  max={24}
                  value={currentTotalSize}
                  onChange={(e) => updateFontSize('total', parseInt(e.target.value, 10) || 11)}
                  className="w-14 h-6 px-1 text-center bg-white border border-gray-200 rounded text-xs font-mono font-bold text-gray-900"
                />
                <span className="text-[9px] text-gray-400 absolute right-1 pointer-events-none">px</span>
              </div>
              <button
                type="button"
                onClick={() => updateFontSize('total', currentTotalSize + 1)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Bouton Appliquer à tous les produits */}
        <button
          type="button"
          onClick={applySizesToAllLines}
          className="w-full h-8 bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          Appliquer ces tailles à toutes les lignes
        </button>
      </div>

      {/* 3. DIMENSIONS DU TICKET */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-violet-600" />
            Dimensions du ticket
          </h2>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings((prev) => ({
                ...prev,
                lockProportions: !prev.lockProportions,
              }))
            }
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              settings.lockProportions
                ? 'bg-violet-100 text-violet-800 border border-violet-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {settings.lockProportions ? (
              <Lock className="w-3 h-3 text-violet-600" />
            ) : (
              <Unlock className="w-3 h-3 text-gray-500" />
            )}
            <span>Proportions</span>
          </button>
        </div>

        {/* Largeur */}
        <div className="space-y-1 bg-gray-50/70 p-2.5 rounded-lg border border-gray-200/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Largeur</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleUpdateWidth(currentWidth - 10)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                −
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={200}
                  max={800}
                  value={currentWidth}
                  onChange={(e) => handleUpdateWidth(parseInt(e.target.value, 10) || 200)}
                  className="w-16 h-6 px-1 text-center bg-white border border-gray-200 rounded text-xs font-mono font-bold text-gray-900"
                />
                <span className="text-[9px] text-gray-400 absolute right-1 pointer-events-none">px</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateWidth(currentWidth + 10)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
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
        </div>

        {/* Hauteur */}
        <div className="space-y-1 bg-gray-50/70 p-2.5 rounded-lg border border-gray-200/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Hauteur</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleUpdateHeight(currentHeight - 10)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                −
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={300}
                  max={1100}
                  value={currentHeight}
                  onChange={(e) => handleUpdateHeight(parseInt(e.target.value, 10) || 300)}
                  className="w-16 h-6 px-1 text-center bg-white border border-gray-200 rounded text-xs font-mono font-bold text-gray-900"
                />
                <span className="text-[9px] text-gray-400 absolute right-1 pointer-events-none">px</span>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateHeight(currentHeight + 10)}
                className="w-6 h-6 bg-white hover:bg-gray-100 rounded text-gray-700 font-bold flex items-center justify-center border border-gray-200 text-xs"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={300}
            max={1100}
            step={2}
            value={currentHeight}
            onChange={(e) => handleUpdateHeight(parseInt(e.target.value, 10))}
            className="w-full accent-violet-600 cursor-pointer"
          />
        </div>

        {/* Action buttons */}
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

      {/* 4. IMAGE DE FOND (TABLE) */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-violet-600" />
            Image de fond (table)
          </h2>
          <button
            type="button"
            onClick={() => tableFileInputRef.current?.click()}
            className="text-[11px] text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 underline"
          >
            <Upload className="w-3 h-3" />
            Importer
          </button>
          <input
            ref={tableFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCustomTableUpload}
            className="hidden"
          />
        </div>

        {/* Thumbnail options */}
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
                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-violet-600 ring-2 ring-violet-500/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={opt.url}
                  alt={opt.name}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>

        {/* Background controls: Position X, Position Y, Zoom */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Zoom arrière-plan</span>
            <span className="font-mono text-[11px]">
              {Math.round((settings.backgroundSettings?.zoom || 1.0) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.8}
            max={2.0}
            step={0.05}
            value={settings.backgroundSettings?.zoom || 1.0}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                backgroundSettings: {
                  ...prev.backgroundSettings,
                  zoom: parseFloat(e.target.value),
                },
              }))
            }
            className="w-full accent-violet-600 cursor-pointer"
          />

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 block mb-0.5">Position X</span>
              <input
                type="range"
                min={-30}
                max={30}
                value={settings.backgroundSettings?.x || 0}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    backgroundSettings: {
                      ...prev.backgroundSettings,
                      x: parseInt(e.target.value, 10),
                    },
                  }))
                }
                className="w-full accent-violet-600 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block mb-0.5">Position Y</span>
              <input
                type="range"
                min={-30}
                max={30}
                value={settings.backgroundSettings?.y || 0}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    backgroundSettings: {
                      ...prev.backgroundSettings,
                      y: parseInt(e.target.value, 10),
                    },
                  }))
                }
                className="w-full accent-violet-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Bouton Réinitialiser le plan */}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onResetPlan}
              className="w-full h-8.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              title="Réinitialiser la position du ticket, l'angle, et le zoom de la table"
            >
              <RotateCcw className="w-3.5 h-3.5 text-violet-600" />
              <span>Réinitialiser le plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
