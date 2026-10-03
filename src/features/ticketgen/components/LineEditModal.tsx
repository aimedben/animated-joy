import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Copy } from 'lucide-react';
import { TicketProductLine } from '../types';

interface LineEditModalProps {
  line: TicketProductLine | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: TicketProductLine) => void;
  onDelete: (id: string) => void;
  onDuplicate: (line: TicketProductLine) => void;
}

export const LineEditModal: React.FC<LineEditModalProps> = ({
  line,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
}) => {
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (line) {
      setName(line.name);
      setQty(line.quantity ?? line.qty ?? 1);
      setPrice(line.unitPrice ?? line.price ?? 0);
    }
  }, [line]);

  if (!isOpen || !line) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...line,
      name: name.trim() || 'Article démo',
      qty: Math.max(1, qty || 1),
      price: Math.max(0, price || 0),
    });
    onClose();
  };

  const lineTotal = (qty || 1) * (price || 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">
            Modifier la ligne de produit
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Produit
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Eau minérale 1.5L"
              className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Quantité
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Prix unitaire (DZD)
              </label>
              <input
                type="number"
                step="any"
                min={0}
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Line total summary */}
          <div className="p-2.5 bg-violet-50/70 border border-violet-100 rounded-lg flex items-center justify-between text-xs">
            <span className="text-violet-800 font-medium">Total de la ligne :</span>
            <span className="font-mono font-bold text-violet-950">
              {lineTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onDuplicate(line);
                onClose();
              }}
              title="Dupliquer cette ligne"
              className="h-9 px-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-gray-500" />
              <span>Dupliquer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDelete(line.id);
                onClose();
              }}
              title="Supprimer cette ligne"
              className="h-9 px-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="submit"
              className="flex-1 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Appliquer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
