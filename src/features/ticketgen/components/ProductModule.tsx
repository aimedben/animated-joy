import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoveVertical,
  Grid,
  AlertCircle,
  FileSpreadsheet,
  Check,
  RotateCw,
} from 'lucide-react';
import { AppSettings, TicketProductLine, TextAlign } from '../types';

interface ProductModuleProps {
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onSelectLine: (id: string | null) => void;
  selectedLineId: string | null;
}

export const ProductModule: React.FC<ProductModuleProps> = ({
  settings,
  onUpdateSettings,
  onSelectLine,
  selectedLineId,
}) => {
  // Mode: 'split' (3 textareas) or 'csv' (paste raw list / CSV)
  const [inputMode, setInputMode] = useState<'split' | 'csv'>('split');

  // Split mode textareas
  const [namesText, setNamesText] = useState('Pain de mie\nLait entier 1L\nEau minérale 1.5L\nFromage portion 16p\nCafé moulu 250g');
  const [pricesText, setPricesText] = useState('150\n110\n45\n260\n380');
  const [qtyMode, setQtyMode] = useState<'auto' | 'manual'>('auto');
  const [manualQtyText, setManualQtyText] = useState('1\n2\n3\n1\n1');
  const [minQty, setMinQty] = useState(1);
  const [maxQty, setMaxQty] = useState(6);

  // CSV mode textarea
  const [csvText, setCsvText] = useState(
    'Produit A,1,120\nProduit B,2,250\nProduit C,1,180\nProduit D,4,340\nProduit E,2,90'
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Generate random quantities array for split mode
  const generateRandomQtys = (count: number, min: number, max: number): number[] => {
    const minVal = Math.max(1, Math.min(min, max));
    const maxVal = Math.max(minVal, max);
    return Array.from({ length: count }, () =>
      Math.floor(minVal + Math.random() * (maxVal - minVal + 1))
    );
  };

  // Live parsed preview & count
  const parsedSplitLines = useMemo(() => {
    const names = namesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const prices = pricesText.split('\n').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
    let qtys: number[] = [];

    if (qtyMode === 'manual') {
      qtys = manualQtyText.split('\n').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    }

    return { names, prices, qtys };
  }, [namesText, pricesText, manualQtyText, qtyMode]);

  // Apply parsed lines to ticket
  const handleApplySplit = () => {
    setErrorMessage(null);
    const { names, prices, qtys } = parsedSplitLines;

    if (names.length === 0) {
      setErrorMessage('Veuillez saisir au moins un nom de produit.');
      return;
    }

    if (prices.length !== names.length) {
      setErrorMessage('Le nombre de produits, prix et quantités doit correspondre.');
      return;
    }

    let finalQtys = qtys;
    if (qtyMode === 'auto') {
      finalQtys = generateRandomQtys(names.length, minQty, maxQty);
    } else {
      if (qtys.length !== names.length) {
        setErrorMessage('Le nombre de produits, prix et quantités doit correspondre.');
        return;
      }
    }

    const newLines: TicketProductLine[] = names.map((name, i) => ({
      id: `line-${Date.now()}-${i}`,
      name,
      qty: finalQtys[i] || 1,
      price: prices[i] || 0,
      y: i * 32,
      x: 0,
      textAlign: 'left',
    }));

    onUpdateSettings((prev) => ({
      ...prev,
      productLines: newLines,
    }));
    onSelectLine(null);
    setSuccessFeedback(`${newLines.length} produits ajoutés au ticket`);
    setTimeout(() => setSuccessFeedback(null), 3000);
  };

  // Apply CSV parsed lines
  const handleApplyCsv = () => {
    setErrorMessage(null);
    const rows = csvText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length === 0) {
      setErrorMessage('Veuillez coller des données CSV ou une liste.');
      return;
    }

    const newLines: TicketProductLine[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Skip header if detected
      if (i === 0 && row.toLowerCase().includes('produit') && row.toLowerCase().includes('prix')) {
        continue;
      }

      // Split by comma, semicolon or tab
      const parts = row.split(/[,;\t]/).map((p) => p.trim());
      if (parts.length >= 3) {
        const name = parts[0];
        const qty = parseInt(parts[1], 10) || 1;
        const price = parseFloat(parts[2]) || 0;
        newLines.push({
          id: `line-csv-${Date.now()}-${i}`,
          name,
          qty,
          price,
          y: newLines.length * 32,
          x: 0,
          textAlign: 'left',
        });
      } else if (parts.length === 2) {
        // Name, Price
        const name = parts[0];
        const price = parseFloat(parts[1]) || 0;
        newLines.push({
          id: `line-csv-${Date.now()}-${i}`,
          name,
          qty: 1,
          price,
          y: newLines.length * 32,
          x: 0,
          textAlign: 'left',
        });
      }
    }

    if (newLines.length === 0) {
      setErrorMessage('Impossible de lire les lignes. Format attendu : Produit,Quantité,Prix');
      return;
    }

    onUpdateSettings((prev) => ({
      ...prev,
      productLines: newLines,
    }));
    onSelectLine(null);
    setSuccessFeedback(`${newLines.length} produits importés`);
    setTimeout(() => setSuccessFeedback(null), 3000);
  };

  // Add a single new line
  const handleAddSingleLine = () => {
    onUpdateSettings((prev) => {
      const highestY = prev.productLines.reduce((max, l) => Math.max(max, l.y), 0);
      const newLine: TicketProductLine = {
        id: `line-${Date.now()}`,
        name: `Article démo ${prev.productLines.length + 1}`,
        qty: 1,
        price: 100,
        y: prev.productLines.length > 0 ? highestY + 32 : 0,
        x: 0,
        textAlign: 'left',
      };
      return {
        ...prev,
        productLines: [...prev.productLines, newLine],
      };
    });
  };

  // Alignment actions
  const handleAlign = (align: TextAlign) => {
    onUpdateSettings((prev) => ({
      ...prev,
      productLines: prev.productLines.map((line) => {
        if (selectedLineId && line.id !== selectedLineId) return line;
        return {
          ...line,
          textAlign: align,
          x: align === 'center' ? 0 : align === 'left' ? 0 : 0,
        };
      }),
    }));
  };

  // Distribute vertically with uniform spacing
  const handleDistributeVertically = () => {
    onUpdateSettings((prev) => {
      const sorted = [...prev.productLines].sort((a, b) => a.y - b.y);
      const spacing = 32;
      const distributed = sorted.map((line, idx) => ({
        ...line,
        y: idx * spacing,
        x: 0,
      }));
      return {
        ...prev,
        productLines: distributed,
      };
    });
    setSuccessFeedback('Lignes réparties uniformément');
    setTimeout(() => setSuccessFeedback(null), 2500);
  };

  // Live totals calculation
  const totalArticles = useMemo(() => {
    return settings.productLines.reduce((sum, item) => sum + (item.qty || 0), 0);
  }, [settings.productLines]);

  const grandTotal = useMemo(() => {
    return settings.productLines.reduce(
      (sum, item) => sum + (item.qty || 0) * (item.price || 0),
      0
    );
  }, [settings.productLines]);

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Title */}
      <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-wider uppercase text-gray-900">
            Produits & Lignes
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Copier/coller rapide & éléments déplaçables
          </p>
        </div>
        <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200/50">
          {settings.productLines.length} article(s)
        </span>
      </div>

      {/* Mode selection tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setInputMode('split');
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            inputMode === 'split'
              ? 'bg-white text-violet-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Saisie rapide (3 colonnes)
        </button>
        <button
          type="button"
          onClick={() => {
            setInputMode('csv');
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
            inputMode === 'csv'
              ? 'bg-white text-violet-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Coller une liste / CSV
        </button>
      </div>

      {/* Mode 1: Split Textareas */}
      {inputMode === 'split' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Noms des produits */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Noms des produits <span className="text-gray-400 font-normal">({parsedSplitLines.names.length})</span>
              </label>
              <textarea
                rows={5}
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                placeholder="Produit A&#10;Produit B&#10;Produit C"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-y"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">Un nom par ligne</span>
            </div>

            {/* Prix unitaires */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Prix unitaires (DZD) <span className="text-gray-400 font-normal">({parsedSplitLines.prices.length})</span>
              </label>
              <textarea
                rows={5}
                value={pricesText}
                onChange={(e) => setPricesText(e.target.value)}
                placeholder="120&#10;250&#10;180"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-y"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">Un prix par ligne</span>
            </div>
          </div>

          {/* Quantités : Mode Automatique vs Manuel */}
          <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Quantités</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-gray-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQtyMode('auto')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    qtyMode === 'auto' ? 'bg-violet-600 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mode automatique
                </button>
                <button
                  type="button"
                  onClick={() => setQtyMode('manual')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    qtyMode === 'manual' ? 'bg-violet-600 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mode manuel
                </button>
              </div>
            </div>

            {qtyMode === 'auto' ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span>Minimum :</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={minQty}
                    onChange={(e) => setMinQty(parseInt(e.target.value, 10) || 1)}
                    className="w-14 h-7 px-2 bg-white border border-gray-200 rounded text-center font-mono text-xs focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span>Maximum :</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxQty}
                    onChange={(e) => setMaxQty(parseInt(e.target.value, 10) || 6)}
                    className="w-14 h-7 px-2 bg-white border border-gray-200 rounded text-center font-mono text-xs focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Quick feedback regeneration
                    setSuccessFeedback('Quantités aléatoires prêtes');
                    setTimeout(() => setSuccessFeedback(null), 1500);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-violet-50 text-violet-700 border border-violet-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                  Régénérer
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  rows={3}
                  value={manualQtyText}
                  onChange={(e) => setManualQtyText(e.target.value)}
                  placeholder="1&#10;2&#10;1&#10;4"
                  className="w-full p-2 bg-white border border-gray-200 rounded text-xs font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Une quantité par ligne ({parsedSplitLines.qtys.length} saisis)
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleApplySplit}
            className="w-full h-10 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ajouter au ticket
          </button>
        </div>
      )}

      {/* Mode 2: CSV / List Paste */}
      {inputMode === 'csv' && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">
                Coller une liste CSV (ou tableau Excel)
              </label>
              <span className="text-[10px] text-gray-400">Format: Produit,Quantité,Prix</span>
            </div>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Produit A,1,120&#10;Produit B,2,250&#10;Produit C,1,180"
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-y"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCsv}
            className="w-full h-10 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Importer et insérer sur le ticket
          </button>
        </div>
      )}

      {/* Error or Success Banner */}
      {errorMessage && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successFeedback && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-medium animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{successFeedback}</span>
        </div>
      )}

      {/* Total Automatique Banner */}
      <div className="p-3 bg-violet-50/60 border border-violet-200/80 rounded-lg flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-900 block">
            Total automatique
          </span>
          <span className="text-xs text-violet-700 font-medium">
            Article(s) : <strong className="font-mono text-violet-950">{totalArticles}</strong>
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-violet-600 block uppercase font-semibold">
            Total ticket
          </span>
          <span className="text-sm font-bold font-mono text-violet-900">
            {grandTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
          </span>
        </div>
      </div>

      {/* Tools: Quick Add, Alignment, Distribution, Grid */}
      <div className="pt-2 border-t border-gray-100 space-y-3">
        {/* Quick add single line */}
        <button
          type="button"
          onClick={handleAddSingleLine}
          className="w-full h-9 bg-white hover:bg-gray-50 border border-dashed border-gray-300 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-violet-600" />
          + Ajouter une ligne
        </button>

        {/* Alignment & Distribution controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Alignment */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => handleAlign('left')}
              title="Aligner à gauche"
              className="p-1.5 hover:bg-white text-gray-700 hover:text-violet-700 rounded transition-colors"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleAlign('center')}
              title="Centrer"
              className="p-1.5 hover:bg-white text-gray-700 hover:text-violet-700 rounded transition-colors"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleAlign('right')}
              title="Aligner à droite"
              className="p-1.5 hover:bg-white text-gray-700 hover:text-violet-700 rounded transition-colors"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Distribute vertically */}
          <button
            type="button"
            onClick={handleDistributeVertically}
            title="Distribuer verticalement les lignes"
            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <MoveVertical className="w-3.5 h-3.5 text-gray-600" />
            <span>Distribuer verticalement</span>
          </button>
        </div>

        {/* Grid toggle */}
        <div className="flex items-center justify-between pt-1">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer">
            <Grid className="w-3.5 h-3.5 text-gray-500" />
            <span>Afficher la grille & snap</span>
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showGrid}
            onClick={() =>
              onUpdateSettings((prev) => ({
                ...prev,
                showGrid: !prev.showGrid,
              }))
            }
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-600 ${
              settings.showGrid ? 'bg-violet-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                settings.showGrid ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
