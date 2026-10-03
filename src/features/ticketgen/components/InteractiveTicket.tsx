// @ts-nocheck
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  GripVertical,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  Component,
  CheckSquare,
  Square,
  MoveVertical,
  Minus,
  Plus,
} from 'lucide-react';
import {
  AppSettings,
  TicketModel,
  TicketProductLine,
  SelectedTarget,
  SubElementType,
  ElementStyle,
} from '../types';

interface InteractiveTicketProps {
  model: TicketModel;
  settings: AppSettings;
  selectedLineIds?: string[];
  onSelectLineIds?: (ids: string[]) => void;
  selectedTarget: SelectedTarget | null;
  onSelectTarget: (target: SelectedTarget | null) => void;
  selectedLineId?: string | null;
  onSelectLine?: (id: string | null) => void;
  onUpdateLine: (updated: TicketProductLine) => void;
  onUpdateMultipleLines?: (lines: TicketProductLine[]) => void;
  onDeleteLine: (id: string) => void;
  onDeleteMultipleLines?: (ids: string[]) => void;
  onDuplicateLine: (line: TicketProductLine) => void;
  onOpenEditModal: (line: TicketProductLine) => void;
}

export const InteractiveTicket: React.FC<InteractiveTicketProps> = ({
  model,
  settings,
  selectedLineIds: propSelectedLineIds,
  onSelectLineIds: propOnSelectLineIds,
  selectedTarget: propSelectedTarget,
  onSelectTarget: propOnSelectTarget,
  selectedLineId,
  onSelectLine,
  onUpdateLine,
  onUpdateMultipleLines,
  onDeleteLine,
  onDeleteMultipleLines,
  onDuplicateLine,
  onOpenEditModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsAreaRef = useRef<HTMLDivElement>(null);

  // Synchronized selected line IDs (Multi-selection state)
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = propSelectedLineIds !== undefined ? propSelectedLineIds : internalSelectedIds;

  const setSelectedIds = useCallback(
    (newIds: string[]) => {
      if (propOnSelectLineIds) propOnSelectLineIds(newIds);
      else setInternalSelectedIds(newIds);

      if (newIds.length === 1) {
        if (propOnSelectTarget) propOnSelectTarget({ lineId: newIds[0], subType: 'row' });
        if (onSelectLine) onSelectLine(newIds[0]);
      } else if (newIds.length === 0) {
        if (propOnSelectTarget) propOnSelectTarget(null);
        if (onSelectLine) onSelectLine(null);
      } else {
        // Multi selection active
        if (propOnSelectTarget) propOnSelectTarget({ lineId: newIds[0], subType: 'row' });
        if (onSelectLine) onSelectLine(newIds[0]);
      }
    },
    [propOnSelectLineIds, propOnSelectTarget, onSelectLine]
  );

  // Normalize single selectedTarget
  const activeTarget: SelectedTarget | null = useMemo(() => {
    if (propSelectedTarget) return propSelectedTarget;
    if (selectedLineId) return { lineId: selectedLineId, subType: 'row' };
    if (selectedIds.length === 1) return { lineId: selectedIds[0], subType: 'row' };
    return null;
  }, [propSelectedTarget, selectedLineId, selectedIds]);

  const setActiveTarget = useCallback(
    (target: SelectedTarget | null) => {
      if (propOnSelectTarget) propOnSelectTarget(target);
      if (target) {
        setSelectedIds([target.lineId]);
      } else {
        setSelectedIds([]);
      }
    },
    [propOnSelectTarget, setSelectedIds]
  );

  // Marquee Selection Rectangle State
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Single Drag state
  const [draggingTarget, setDraggingTarget] = useState<SelectedTarget | null>(null);
  const dragStartRef = useRef<{
    startY: number;
    startX: number;
    initialY: number;
    initialX: number;
  }>({ startY: 0, startX: 0, initialY: 0, initialX: 0 });

  // Group Drag state (for multi-selection)
  const [isGroupDragging, setIsGroupDragging] = useState(false);
  const groupDragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPositions: Record<string, { x: number; y: number }>;
  }>({ startX: 0, startY: 0, initialPositions: {} });

  // Resize state for an element handle
  const [resizingHandle, setResizingHandle] = useState<{
    target: SelectedTarget;
    handle: string;
  } | null>(null);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    initialW: number;
    initialH: number;
    initialX: number;
    initialY: number;
  }>({ startX: 0, startY: 0, initialW: 0, initialH: 0, initialX: 0, initialY: 0 });

  // Smart Alignment Guides State
  const [activeGuide, setActiveGuide] = useState<{
    type: 'vertical' | 'horizontal';
    position: number;
    label?: string;
  } | null>(null);

  // Dynamic ticket dimensions
  const width = settings.ticketWidth || 380;
  const height = settings.ticketHeight || 740;
  const isCompact = width < 340;
  const isVeryCompact = width < 280;

  // Base column widths
  const qtyColWidth = Math.round(Math.max(34, width * 0.12));
  const priceColWidth = Math.round(Math.max(50, width * 0.18));
  const totalColWidth = Math.round(Math.max(52, width * 0.19));

  // Available vertical space for product lines
  const headerHeightEstimate = isCompact ? 140 : 165;
  const footerHeightEstimate = isCompact ? 90 : 110;
  const availableItemsHeight = Math.max(100, height - headerHeightEstimate - footerHeightEstimate);
  const lineCount = Math.max(1, settings.productLines.length);
  const naturalLineSpacing = Math.min(
    36,
    Math.max(22, availableItemsHeight / (lineCount + 0.2))
  );

  // Totals
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

  const formattedDate = settings.date
    ? settings.date.split('-').reverse().join('/')
    : '';

  // Selected lines collection
  const selectedLines = useMemo(() => {
    return settings.productLines.filter((l) => selectedIds.includes(l.id));
  }, [settings.productLines, selectedIds]);

  const isMultiSelecting = selectedLines.length > 1;

  // Collective Bounding Box of Multi-Selection
  const groupBounds = useMemo(() => {
    if (selectedLines.length <= 1) return null;
    let minY = Infinity;
    let maxY = -Infinity;

    selectedLines.forEach((l, idx) => {
      const globalIdx = settings.productLines.findIndex((p) => p.id === l.id);
      const y = Number.isFinite(l.y) ? l.y : (globalIdx >= 0 ? globalIdx : idx) * naturalLineSpacing;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + 28);
    });

    if (minY === Infinity) return null;

    return {
      top: Math.max(0, minY - 3),
      height: Math.max(34, maxY - minY + 6),
    };
  }, [selectedLines, settings.productLines, naturalLineSpacing]);

  // Helper to get element style
  const getSubStyle = (line: TicketProductLine, subType: SubElementType): ElementStyle => {
    if (subType === 'name') return line.nameStyle || {};
    if (subType === 'quantity') return line.qtyStyle || {};
    if (subType === 'unitPrice') return line.priceStyle || {};
    if (subType === 'total') return line.totalStyle || {};
    return {};
  };

  // Helper to update element style
  const updateSubStyle = (
    line: TicketProductLine,
    subType: SubElementType,
    newStyle: Partial<ElementStyle>
  ) => {
    if (subType === 'row') {
      onUpdateLine({
        ...line,
        ...newStyle,
      });
      return;
    }
    const current = getSubStyle(line, subType);
    const updatedStyle = { ...current, ...newStyle };
    if (subType === 'name') onUpdateLine({ ...line, nameStyle: updatedStyle });
    if (subType === 'quantity') onUpdateLine({ ...line, qtyStyle: updatedStyle });
    if (subType === 'unitPrice') onUpdateLine({ ...line, priceStyle: updatedStyle });
    if (subType === 'total') onUpdateLine({ ...line, totalStyle: updatedStyle });
  };

  // 1. MARQUEE SELECTION (POINTER EVENTS IN EMPTY AREA)
  const handleItemsAreaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Check if clicked directly on background (not on a product line or handle)
    if (
      (e.target as HTMLElement).closest('[data-product-line="true"]') ||
      (e.target as HTMLElement).closest('[data-toolbar="true"]') ||
      (e.target as HTMLElement).closest('[data-resize-handle="true"]')
    ) {
      return;
    }

    if (!itemsAreaRef.current) return;
    const rect = itemsAreaRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    setIsMarqueeSelecting(true);
    setMarqueeStart({ x: localX, y: localY });
    setMarqueeCurrent({ x: localX, y: localY });

    if (!e.shiftKey) {
      setSelectedIds([]);
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleItemsAreaPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isMarqueeSelecting || !itemsAreaRef.current) return;

      const rect = itemsAreaRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      setMarqueeCurrent({ x: currentX, y: currentY });

      // Calculate intersection rectangle in local coordinates
      const boxTop = Math.min(marqueeStart.y, currentY);
      const boxBottom = Math.max(marqueeStart.y, currentY);

      // Find all product lines intersecting this marquee box
      const intersectedIds: string[] = [];
      settings.productLines.forEach((line, idx) => {
        const lineY = Number.isFinite(line.y) ? line.y : idx * naturalLineSpacing;
        const lineTop = lineY;
        const lineBottom = lineY + 28;

        if (lineBottom >= boxTop && lineTop <= boxBottom) {
          intersectedIds.push(line.id);
        }
      });

      setSelectedIds(intersectedIds);
    },
    [isMarqueeSelecting, marqueeStart, settings.productLines, naturalLineSpacing, setSelectedIds]
  );

  const handleItemsAreaPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // 2. GROUP DRAG (MOVE MULTIPLE SELECTED PRODUCTS TOGETHER)
  const handleGroupPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsGroupDragging(true);

    const initialPositions: Record<string, { x: number; y: number }> = {};
    selectedLines.forEach((line, idx) => {
      const globalIdx = settings.productLines.findIndex((p) => p.id === line.id);
      const currentY = Number.isFinite(line.y)
        ? line.y
        : (globalIdx >= 0 ? globalIdx : idx) * naturalLineSpacing;
      const currentX = Number.isFinite(line.x) ? line.x : 0;
      initialPositions[line.id] = { x: currentX, y: currentY };
    });

    groupDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPositions,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleGroupPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isGroupDragging) return;
      e.stopPropagation();

      const deltaX = e.clientX - groupDragStartRef.current.startX;
      const deltaY = e.clientY - groupDragStartRef.current.startY;

      const updated = settings.productLines.map((line) => {
        if (!selectedIds.includes(line.id)) return line;
        const initPos = groupDragStartRef.current.initialPositions[line.id] || {
          x: line.x || 0,
          y: line.y || 0,
        };

        const newY = Math.max(0, Math.min(availableItemsHeight - 20, initPos.y + deltaY));
        const newX = Math.max(-40, Math.min(40, initPos.x + deltaX));

        return {
          ...line,
          x: Math.round(newX),
          y: Math.round(newY),
        };
      });

      if (onUpdateMultipleLines) {
        onUpdateMultipleLines(updated);
      } else {
        updated.forEach((l) => onUpdateLine(l));
      }
    },
    [isGroupDragging, settings.productLines, selectedIds, availableItemsHeight, onUpdateMultipleLines, onUpdateLine]
  );

  const handleGroupPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isGroupDragging) {
      setIsGroupDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // 3. SINGLE LINE POINTER EVENTS
  const handleSinglePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    line: TicketProductLine,
    subType: SubElementType,
    index: number
  ) => {
    e.stopPropagation();

    // Shift + Click toggles selection in multi-select group
    if (e.shiftKey) {
      if (selectedIds.includes(line.id)) {
        setSelectedIds(selectedIds.filter((id) => id !== line.id));
      } else {
        setSelectedIds([...selectedIds, line.id]);
      }
      return;
    }

    // If part of an already multi-selected group, start group drag
    if (selectedIds.length > 1 && selectedIds.includes(line.id)) {
      handleGroupPointerDown(e);
      return;
    }

    // Single item select & drag
    const target = { lineId: line.id, subType };
    setActiveTarget(target);
    setDraggingTarget(target);

    let currentX = 0;
    let currentY = 0;

    if (subType === 'row') {
      currentX = Number.isFinite(line.x) ? line.x : 0;
      currentY = Number.isFinite(line.y) ? line.y : index * naturalLineSpacing;
    } else {
      const st = getSubStyle(line, subType);
      currentX = st.x || 0;
      currentY = st.y || 0;
    }

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSinglePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, line: TicketProductLine) => {
      if (!draggingTarget || draggingTarget.lineId !== line.id) return;
      e.stopPropagation();

      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      let newX = dragStartRef.current.initialX + deltaX;
      let newY = dragStartRef.current.initialY + deltaY;

      // Smart Guides / Snap System (Canva style)
      let snapGuide: { type: 'vertical' | 'horizontal'; position: number; label?: string } | null = null;
      const snapThreshold = 4;

      if (draggingTarget.subType === 'row') {
        newY = Math.max(0, Math.min(availableItemsHeight - 20, newY));
        newX = Math.max(-40, Math.min(40, newX));

        // Snap to center X (0)
        if (Math.abs(newX) < snapThreshold) {
          newX = 0;
          snapGuide = { type: 'vertical', position: width / 2, label: 'Centre' };
        }

        onUpdateLine({
          ...line,
          x: Math.round(newX),
          y: Math.round(newY),
        });
      } else {
        newX = Math.max(-50, Math.min(50, newX));
        newY = Math.max(-20, Math.min(20, newY));

        if (Math.abs(newY) < snapThreshold) {
          newY = 0;
          snapGuide = { type: 'horizontal', position: line.y || 0, label: 'Aligné' };
        }
        if (Math.abs(newX) < snapThreshold) {
          newX = 0;
          snapGuide = { type: 'vertical', position: 0, label: 'Colonne' };
        }

        updateSubStyle(line, draggingTarget.subType, {
          x: Math.round(newX),
          y: Math.round(newY),
        });
      }

      setActiveGuide(snapGuide);
    },
    [draggingTarget, availableItemsHeight, width, onUpdateLine]
  );

  const handleSinglePointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    line: TicketProductLine
  ) => {
    if (draggingTarget && draggingTarget.lineId === line.id) {
      setDraggingTarget(null);
      setActiveGuide(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // 4. KEYBOARD SHORTCUTS: Ctrl+A, Esc, Arrow nudge
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A / Cmd+A to select all products
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        const activeElem = document.activeElement;
        if (activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        setSelectedIds(settings.productLines.map((l) => l.id));
        return;
      }

      // Esc to deselect all
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setActiveTarget(null);
        return;
      }

      // Arrow keys for selected items
      if (selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const activeElem = document.activeElement;
        if (activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        const updated = settings.productLines.map((line) => {
          if (!selectedIds.includes(line.id)) return line;
          return {
            ...line,
            x: Math.max(-40, Math.min(40, (line.x || 0) + dx)),
            y: Math.max(0, Math.min(availableItemsHeight - 20, (line.y || 0) + dy)),
          };
        });

        if (onUpdateMultipleLines) onUpdateMultipleLines(updated);
        else updated.forEach((l) => onUpdateLine(l));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedIds, settings.productLines, availableItemsHeight, setSelectedIds, setActiveTarget, onUpdateMultipleLines, onUpdateLine]);

  // 5. BULK GROUP ACTIONS (FOR MULTIPLE SELECTED PRODUCTS)
  const handleBulkFontSize = (delta: number, directSize?: number) => {
    const updated = settings.productLines.map((line) => {
      if (!selectedIds.includes(line.id)) return line;
      const curSize = line.nameStyle?.fontSize || line.fontSize || 12;
      const newSize = directSize !== undefined ? directSize : Math.max(8, Math.min(24, curSize + delta));
      return {
        ...line,
        fontSize: newSize,
        nameStyle: { ...line.nameStyle, fontSize: newSize },
        qtyStyle: { ...line.qtyStyle, fontSize: Math.max(8, newSize - 1) },
        priceStyle: { ...line.priceStyle, fontSize: Math.max(8, newSize - 1) },
        totalStyle: { ...line.totalStyle, fontSize: Math.max(8, newSize - 1) },
      };
    });

    if (onUpdateMultipleLines) onUpdateMultipleLines(updated);
    else updated.forEach((l) => onUpdateLine(l));
  };

  const handleBulkBold = () => {
    const anyBold = selectedLines.some((l) => l.nameStyle?.isBold);
    const targetBold = !anyBold;

    const updated = settings.productLines.map((line) => {
      if (!selectedIds.includes(line.id)) return line;
      return {
        ...line,
        nameStyle: { ...line.nameStyle, isBold: targetBold },
        qtyStyle: { ...line.qtyStyle, isBold: targetBold },
        priceStyle: { ...line.priceStyle, isBold: targetBold },
        totalStyle: { ...line.totalStyle, isBold: targetBold },
      };
    });

    if (onUpdateMultipleLines) onUpdateMultipleLines(updated);
    else updated.forEach((l) => onUpdateLine(l));
  };

  const handleBulkAlignment = (align: 'left' | 'center' | 'right') => {
    const updated = settings.productLines.map((line) => {
      if (!selectedIds.includes(line.id)) return line;
      return {
        ...line,
        textAlign: align,
        nameStyle: { ...line.nameStyle, textAlign: align },
      };
    });

    if (onUpdateMultipleLines) onUpdateMultipleLines(updated);
    else updated.forEach((l) => onUpdateLine(l));
  };

  const handleBulkVerticalSpacing = (delta: number) => {
    if (selectedLines.length <= 1) return;

    // Sort selected lines by their current Y position
    const sorted = [...selectedLines].sort((a, b) => (a.y || 0) - (b.y || 0));
    const firstY = sorted[0].y || 0;

    const newPositions: Record<string, number> = {};
    sorted.forEach((line, idx) => {
      const origOffset = (line.y || 0) - firstY;
      const newOffset = Math.max(0, origOffset + idx * delta);
      newPositions[line.id] = Math.min(availableItemsHeight - 20, firstY + newOffset);
    });

    const updated = settings.productLines.map((l) => {
      if (newPositions[l.id] !== undefined) {
        return { ...l, y: Math.round(newPositions[l.id]) };
      }
      return l;
    });

    if (onUpdateMultipleLines) onUpdateMultipleLines(updated);
    else updated.forEach((l) => onUpdateLine(l));
  };

  const handleDistributeVertically = () => {
    if (selectedLines.length <= 2) return;

    const sorted = [...selectedLines].sort((a, b) => (a.y || 0) - (b.y || 0));
    const startY = sorted[0].y || 0;
    const endY = sorted[sorted.length - 1].y || 0;
    const step = (endY - startY) / (sorted.length - 1);

    const newPositions: Record<string, number> = {};
    sorted.forEach((line, idx) => {
      newPositions[line.id] = Math.round(startY + idx * step);
    });

    const updated = settings.productLines.map((l) => {
      if (newPositions[l.id] !== undefined) {
        return { ...l, y: newPositions[l.id] };
      }
      return l;
    });

    if (onUpdateMultipleLines) onUpdateMultipleLines(updated);
    else updated.forEach((l) => onUpdateLine(l));
  };

  const handleDuplicateGroup = () => {
    const duplicatedLines: TicketProductLine[] = selectedLines.map((l, idx) => ({
      ...l,
      id: `line-${Date.now()}-${idx}`,
      name: `${l.name} (copie)`,
      y: (l.y || 0) + 30,
    }));

    if (onUpdateMultipleLines) {
      onUpdateMultipleLines([...settings.productLines, ...duplicatedLines]);
    } else {
      duplicatedLines.forEach((l) => onDuplicateLine(l));
    }

    setSelectedIds(duplicatedLines.map((l) => l.id));
  };

  const handleDeleteGroup = () => {
    if (onDeleteMultipleLines) {
      onDeleteMultipleLines(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteLine(id));
    }
    setSelectedIds([]);
  };

  // Toggle Select All
  const handleToggleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.length === settings.productLines.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(settings.productLines.map((l) => l.id));
    }
  };

  // Render 8 Canva Handles
  const render8Handles = () => (
    <>
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-violet-600 rounded-full shadow-xs cursor-nwse-resize z-30 pointer-events-auto hover:scale-125" />
      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-violet-600 rounded-full shadow-xs cursor-nesw-resize z-30 pointer-events-auto hover:scale-125" />
      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-violet-600 rounded-full shadow-xs cursor-nesw-resize z-30 pointer-events-auto hover:scale-125" />
      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-violet-600 rounded-full shadow-xs cursor-nwse-resize z-30 pointer-events-auto hover:scale-125" />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-white border border-violet-600 rounded-xs shadow-xs cursor-ns-resize z-30 pointer-events-auto hover:scale-110" />
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-white border border-violet-600 rounded-xs shadow-xs cursor-ns-resize z-30 pointer-events-auto hover:scale-110" />
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-4 bg-white border border-violet-600 rounded-xs shadow-xs cursor-ew-resize z-30 pointer-events-auto hover:scale-110" />
      <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-4 bg-white border border-violet-600 rounded-xs shadow-xs cursor-ew-resize z-30 pointer-events-auto hover:scale-110" />
    </>
  );

  const activeLine = useMemo(() => {
    if (!activeTarget) return null;
    return settings.productLines.find((l) => l.id === activeTarget.lineId) || null;
  }, [activeTarget, settings.productLines]);

  return (
    <div
      ref={containerRef}
      onClick={() => {
        setSelectedIds([]);
        setActiveTarget(null);
      }}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        filter:
          'drop-shadow(0 14px 28px rgba(0,0,0,0.38)) drop-shadow(0 4px 8px rgba(0,0,0,0.22))',
      }}
      className="relative flex flex-col justify-between bg-gradient-to-b from-[#FDFDFD] via-[#F8F8F9] to-[#F1F2F4] text-[#0F172A] shadow-xl border border-gray-300/80 rounded-[2px] select-none font-sans overflow-hidden"
    >
      {/* Top zigzag paper tear */}
      <div className="w-full h-2 flex overflow-hidden shrink-0">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white"
          />
        ))}
      </div>

      {/* Main ticket content body */}
      <div className="px-3.5 sm:px-5 pt-2 pb-3 relative flex-1 flex flex-col justify-between overflow-hidden">
        {/* Alignment Grid Overlay */}
        {settings.showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, #7C3AED 1px, transparent 1px), linear-gradient(to bottom, #7C3AED 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
        )}

        {/* Canva Smart Alignment Guides */}
        {activeGuide && (
          <div className="absolute inset-0 pointer-events-none z-40">
            {activeGuide.type === 'vertical' && (
              <div
                style={{ left: `${activeGuide.position}px` }}
                className="absolute inset-y-0 w-0 border-r border-dashed border-violet-500 flex items-start justify-center"
              >
                {activeGuide.label && (
                  <span className="bg-violet-600 text-white text-[9px] font-mono px-1 rounded -translate-y-1">
                    {activeGuide.label}
                  </span>
                )}
              </div>
            )}
            {activeGuide.type === 'horizontal' && (
              <div
                style={{ top: `${activeGuide.position}px` }}
                className="absolute inset-x-0 h-0 border-b border-dashed border-violet-500 flex items-center justify-end"
              >
                {activeGuide.label && (
                  <span className="bg-violet-600 text-white text-[9px] font-mono px-1 rounded -translate-y-2 mr-2">
                    {activeGuide.label}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 1. Header (Business Name, Location, Phone) */}
        <div className="text-center space-y-0.5 shrink-0 mb-1">
          <h1
            className={`font-bold tracking-tight text-gray-900 leading-tight ${
              isVeryCompact
                ? 'text-sm'
                : isCompact
                ? 'text-base'
                : 'text-lg sm:text-xl'
            }`}
          >
            {model.businessName}
          </h1>
          <p
            className={`text-gray-700 font-medium leading-none ${
              isCompact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            {model.location}
          </p>
          <p
            className={`text-gray-600 font-medium ${
              isCompact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            {model.phone}
          </p>
        </div>

        {/* 2. Ticket n° and Date/Time */}
        <div className="flex items-center justify-between text-xs pt-1 pb-1.5 border-b-2 border-gray-900 font-mono shrink-0">
          <span className={`font-bold text-gray-900 ${isCompact ? 'text-[11px]' : 'text-xs'}`}>
            Ticket n° : {settings.demoNumber}
          </span>
          <span className={`text-gray-600 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
            {formattedDate} {settings.time}
          </span>
        </div>

        {/* 3. Table Column Headers with discrete "Tout sélectionner" button */}
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-900 py-1 border-b border-gray-800 uppercase tracking-wide shrink-0">
          <div className="flex-1 flex items-center gap-1.5 min-w-0 pr-1">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              title={
                selectedIds.length === settings.productLines.length
                  ? 'Désélectionner tous les produits'
                  : 'Sélectionner tous les produits (Ctrl+A)'
              }
              className="text-gray-500 hover:text-violet-700 transition-colors p-0.5 rounded hover:bg-black/5"
            >
              {selectedIds.length > 0 && selectedIds.length === settings.productLines.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="truncate">Produit</span>
          </div>
          <span
            style={{ width: `${qtyColWidth}px` }}
            className="text-center shrink-0"
          >
            Qté
          </span>
          <span
            style={{ width: `${priceColWidth}px` }}
            className="text-right pr-1 shrink-0"
          >
            P.U
          </span>
          <span
            style={{ width: `${totalColWidth}px` }}
            className="text-right shrink-0"
          >
            Total
          </span>
        </div>

        {/* 4. PRODUCT ELEMENTS AREA (MARQUEE SELECTION & DRAGGABLE ITEMS) */}
        <div
          ref={itemsAreaRef}
          onPointerDown={handleItemsAreaPointerDown}
          onPointerMove={handleItemsAreaPointerMove}
          onPointerUp={handleItemsAreaPointerUp}
          onPointerCancel={handleItemsAreaPointerUp}
          style={{ height: `${availableItemsHeight}px` }}
          className="relative flex-1 my-1 overflow-visible cursor-default select-none"
        >
          {/* Marquee Selection Rectangle (Semi-transparent) */}
          {isMarqueeSelecting && (
            <div
              style={{
                left: `${Math.min(marqueeStart.x, marqueeCurrent.x)}px`,
                top: `${Math.min(marqueeStart.y, marqueeCurrent.y)}px`,
                width: `${Math.abs(marqueeCurrent.x - marqueeStart.x)}px`,
                height: `${Math.abs(marqueeCurrent.y - marqueeStart.y)}px`,
              }}
              className="absolute border border-violet-500 bg-violet-500/20 pointer-events-none rounded-[2px] z-50 shadow-xs backdrop-blur-[0.5px]"
            />
          )}

          {/* Collective Group Bounding Box around Multiple Selected Lines */}
          {isMultiSelecting && groupBounds && (
            <div
              onPointerDown={handleGroupPointerDown}
              onPointerMove={handleGroupPointerMove}
              onPointerUp={handleGroupPointerUp}
              onPointerCancel={handleGroupPointerUp}
              style={{
                top: `${groupBounds.top}px`,
                height: `${groupBounds.height}px`,
                touchAction: 'none',
              }}
              className="absolute inset-x-0 border-2 border-dashed border-violet-600 bg-violet-600/[0.04] rounded-xs cursor-move z-20 pointer-events-auto"
              title="Glisser pour déplacer tous les produits sélectionnés"
            >
              {/* 8 Handles on Group Bounding Box */}
              {render8Handles()}
            </div>
          )}

          {/* Product Lines */}
          {settings.productLines.map((line, idx) => {
            const isLineSelected = selectedIds.includes(line.id);
            const isRowSingleSelected =
              !isMultiSelecting &&
              activeTarget?.lineId === line.id &&
              activeTarget?.subType === 'row';

            const qty = line.quantity || line.qty || 1;
            const unitPrice = line.unitPrice || line.price || 0;
            const lineTotal = qty * unitPrice;
            const computedY = Number.isFinite(line.y) ? line.y : idx * naturalLineSpacing;
            const computedX = Number.isFinite(line.x) ? line.x : 0;

            const nameStyle = line.nameStyle || {};
            const qtyStyle = line.qtyStyle || {};
            const priceStyle = line.priceStyle || {};
            const totalStyle = line.totalStyle || {};

            const isNameSelected =
              !isMultiSelecting &&
              activeTarget?.lineId === line.id &&
              activeTarget?.subType === 'name';
            const isQtySelected =
              !isMultiSelecting &&
              activeTarget?.lineId === line.id &&
              activeTarget?.subType === 'quantity';
            const isPriceSelected =
              !isMultiSelecting &&
              activeTarget?.lineId === line.id &&
              activeTarget?.subType === 'unitPrice';
            const isTotalSelected =
              !isMultiSelecting &&
              activeTarget?.lineId === line.id &&
              activeTarget?.subType === 'total';

            return (
              <div
                key={line.id}
                data-product-line="true"
                style={{
                  top: `${computedY}px`,
                  transform: `translateX(${computedX}px)`,
                  touchAction: 'none',
                }}
                className={`absolute inset-x-0 h-7 flex items-center justify-between px-1 rounded select-none transition-colors ${
                  isMultiSelecting && isLineSelected
                    ? 'bg-violet-50/70 z-25'
                    : isRowSingleSelected
                    ? 'ring-2 ring-violet-600 bg-violet-50/70 z-20 shadow-xs'
                    : isLineSelected
                    ? 'bg-violet-50/30'
                    : 'hover:bg-black/[0.02]'
                }`}
              >
                {/* Row Drag Handle */}
                <div
                  onPointerDown={(e) => handleSinglePointerDown(e, line, 'row', idx)}
                  onPointerMove={(e) => handleSinglePointerMove(e, line)}
                  onPointerUp={(e) => handleSinglePointerUp(e, line)}
                  className={`w-3.5 h-full flex items-center justify-center cursor-move shrink-0 mr-1 transition-colors ${
                    isLineSelected ? 'text-violet-700' : 'text-gray-400 hover:text-gray-700'
                  }`}
                  title="Glisser la ligne (Shift+Clic pour ajouter à la sélection)"
                >
                  <GripVertical className="w-3 h-3" />
                </div>

                {/* 1. PRODUIT (NAME) */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      if (selectedIds.includes(line.id)) {
                        setSelectedIds(selectedIds.filter((id) => id !== line.id));
                      } else {
                        setSelectedIds([...selectedIds, line.id]);
                      }
                    } else {
                      setActiveTarget({ lineId: line.id, subType: 'name' });
                    }
                  }}
                  onPointerDown={(e) => handleSinglePointerDown(e, line, 'name', idx)}
                  onPointerMove={(e) => handleSinglePointerMove(e, line)}
                  onPointerUp={(e) => handleSinglePointerUp(e, line)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onOpenEditModal(line);
                  }}
                  style={{
                    transform: `translate(${nameStyle.x || 0}px, ${nameStyle.y || 0}px)`,
                    fontSize: `${nameStyle.fontSize || line.fontSize || (isCompact ? 11 : 12)}px`,
                    width: nameStyle.width ? `${nameStyle.width}px` : undefined,
                    height: nameStyle.height ? `${nameStyle.height}px` : undefined,
                    cursor: 'move',
                  }}
                  className={`relative flex-1 min-w-0 pr-1 truncate font-medium text-gray-900 px-1 py-0.5 rounded transition-all ${
                    nameStyle.isBold ? 'font-bold' : ''
                  } ${
                    isNameSelected
                      ? 'ring-2 ring-violet-600 bg-white shadow-xs z-30'
                      : 'hover:bg-violet-50/50'
                  }`}
                  title={line.name}
                >
                  {line.name}
                  {isNameSelected && render8Handles()}
                </div>

                {/* 2. QUANTITÉ */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!e.shiftKey) setActiveTarget({ lineId: line.id, subType: 'quantity' });
                  }}
                  onPointerDown={(e) => handleSinglePointerDown(e, line, 'quantity', idx)}
                  onPointerMove={(e) => handleSinglePointerMove(e, line)}
                  onPointerUp={(e) => handleSinglePointerUp(e, line)}
                  style={{
                    width: qtyStyle.width ? `${qtyStyle.width}px` : `${qtyColWidth}px`,
                    height: qtyStyle.height ? `${qtyStyle.height}px` : undefined,
                    transform: `translate(${qtyStyle.x || 0}px, ${qtyStyle.y || 0}px)`,
                    fontSize: `${qtyStyle.fontSize || (isCompact ? 10 : 11)}px`,
                    cursor: 'move',
                  }}
                  className={`relative text-center font-mono text-gray-800 shrink-0 font-medium px-1 py-0.5 rounded transition-all ${
                    qtyStyle.isBold ? 'font-bold' : ''
                  } ${
                    isQtySelected
                      ? 'ring-2 ring-violet-600 bg-white shadow-xs z-30'
                      : 'hover:bg-violet-50/50'
                  }`}
                >
                  {qty}
                  {isQtySelected && render8Handles()}
                </div>

                {/* 3. PRIX UNITAIRE */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!e.shiftKey) setActiveTarget({ lineId: line.id, subType: 'unitPrice' });
                  }}
                  onPointerDown={(e) => handleSinglePointerDown(e, line, 'unitPrice', idx)}
                  onPointerMove={(e) => handleSinglePointerMove(e, line)}
                  onPointerUp={(e) => handleSinglePointerUp(e, line)}
                  style={{
                    width: priceStyle.width ? `${priceStyle.width}px` : `${priceColWidth}px`,
                    height: priceStyle.height ? `${priceStyle.height}px` : undefined,
                    transform: `translate(${priceStyle.x || 0}px, ${priceStyle.y || 0}px)`,
                    fontSize: `${priceStyle.fontSize || (isCompact ? 10 : 11)}px`,
                    cursor: 'move',
                  }}
                  className={`relative text-right pr-1 font-mono text-gray-800 shrink-0 px-1 py-0.5 rounded transition-all ${
                    priceStyle.isBold ? 'font-bold' : ''
                  } ${
                    isPriceSelected
                      ? 'ring-2 ring-violet-600 bg-white shadow-xs z-30'
                      : 'hover:bg-violet-50/50'
                  }`}
                >
                  {unitPrice}
                  {isPriceSelected && render8Handles()}
                </div>

                {/* 4. TOTAL */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!e.shiftKey) setActiveTarget({ lineId: line.id, subType: 'total' });
                  }}
                  onPointerDown={(e) => handleSinglePointerDown(e, line, 'total', idx)}
                  onPointerMove={(e) => handleSinglePointerMove(e, line)}
                  onPointerUp={(e) => handleSinglePointerUp(e, line)}
                  style={{
                    width: totalStyle.width ? `${totalStyle.width}px` : `${totalColWidth}px`,
                    height: totalStyle.height ? `${totalStyle.height}px` : undefined,
                    transform: `translate(${totalStyle.x || 0}px, ${totalStyle.y || 0}px)`,
                    fontSize: `${totalStyle.fontSize || (isCompact ? 10 : 11)}px`,
                    cursor: 'move',
                  }}
                  className={`relative text-right font-mono font-bold text-gray-900 shrink-0 px-1 py-0.5 rounded transition-all ${
                    totalStyle.isBold ? 'font-black' : ''
                  } ${
                    isTotalSelected
                      ? 'ring-2 ring-violet-600 bg-white shadow-xs z-30'
                      : 'hover:bg-violet-50/50'
                  }`}
                >
                  {lineTotal}
                  {isTotalSelected && render8Handles()}
                </div>

                {/* Handles on Single Row when single row selected */}
                {isRowSingleSelected && render8Handles()}
              </div>
            );
          })}
        </div>

        {/* 5A. MULTI-SELECTION TOOLBAR (WHEN > 1 PRODUCTS SELECTED) */}
        {isMultiSelecting && groupBounds && (
          <div
            data-toolbar="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              top: `${Math.max(4, groupBounds.top + headerHeightEstimate - 40)}px`,
            }}
            className="absolute left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg shadow-2xl px-2.5 py-1.5 flex flex-wrap items-center gap-2 text-[11px] font-medium z-50 border border-slate-700 animate-fade-in whitespace-nowrap"
          >
            {/* Group Indicator */}
            <span className="font-bold text-violet-300 text-[10px] uppercase tracking-wide bg-violet-900/70 px-2 py-0.5 rounded border border-violet-700/60 flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-violet-400" />
              <span>
                {selectedLines.length === settings.productLines.length
                  ? 'Tous les produits sélectionnés'
                  : `${selectedLines.length} produits sélectionnés`}
              </span>
            </span>

            {/* Font Size Group Control */}
            <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded">
              <span className="text-[10px] text-gray-400 px-1">Taille</span>
              <button
                type="button"
                onClick={() => handleBulkFontSize(-1)}
                className="w-5 h-5 flex items-center justify-center hover:bg-slate-700 text-gray-300 hover:text-white rounded font-bold text-xs"
                title="Réduire taille du texte pour tous"
              >
                −
              </button>
              <input
                type="number"
                min={8}
                max={24}
                value={selectedLines[0]?.nameStyle?.fontSize || selectedLines[0]?.fontSize || 12}
                onChange={(e) =>
                  handleBulkFontSize(0, parseInt(e.target.value, 10) || 12)
                }
                className="w-9 h-5 text-center bg-slate-900 border border-slate-700 rounded text-[10px] font-mono font-bold text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleBulkFontSize(1)}
                className="w-5 h-5 flex items-center justify-center hover:bg-slate-700 text-gray-300 hover:text-white rounded font-bold text-xs"
                title="Augmenter taille du texte pour tous"
              >
                +
              </button>
            </div>

            {/* Bold Toggle */}
            <button
              type="button"
              onClick={handleBulkBold}
              className={`p-1 rounded transition-colors ${
                selectedLines.some((l) => l.nameStyle?.isBold)
                  ? 'bg-violet-600 text-white font-bold'
                  : 'hover:bg-slate-800 text-gray-400 hover:text-white'
              }`}
              title="Gras pour tout le groupe"
            >
              <Bold className="w-3 h-3" />
            </button>

            {/* Alignment Group */}
            <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded">
              <button
                type="button"
                onClick={() => handleBulkAlignment('left')}
                className="p-1 hover:bg-slate-700 text-gray-300 hover:text-white rounded"
                title="Aligner tous à gauche"
              >
                <AlignLeft className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => handleBulkAlignment('center')}
                className="p-1 hover:bg-slate-700 text-gray-300 hover:text-white rounded"
                title="Centrer tous"
              >
                <AlignCenter className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => handleBulkAlignment('right')}
                className="p-1 hover:bg-slate-700 text-gray-300 hover:text-white rounded"
                title="Aligner tous à droite"
              >
                <AlignRight className="w-2.5 h-2.5" />
              </button>
            </div>

            <span className="text-slate-600">|</span>

            {/* Vertical Spacing Controls */}
            <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded">
              <span className="text-[10px] text-gray-400 px-1">Espacement</span>
              <button
                type="button"
                onClick={() => handleBulkVerticalSpacing(-2)}
                className="p-1 hover:bg-slate-700 text-gray-300 hover:text-white rounded"
                title="Réduire l'espacement vertical"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => handleBulkVerticalSpacing(2)}
                className="p-1 hover:bg-slate-700 text-gray-300 hover:text-white rounded"
                title="Augmenter l'espacement vertical"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Distribute Vertically Button */}
            <button
              type="button"
              onClick={handleDistributeVertically}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded text-[10px] flex items-center gap-1 transition-colors"
              title="Répartir automatiquement les lignes avec un espacement régulier"
            >
              <MoveVertical className="w-3 h-3 text-violet-400" />
              <span>Distribuer</span>
            </button>

            <span className="text-slate-600">|</span>

            {/* Duplicate & Delete Group */}
            <button
              type="button"
              onClick={handleDuplicateGroup}
              className="p-1 hover:text-violet-300 text-gray-300 transition-colors"
              title="Dupliquer la sélection"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleDeleteGroup}
              className="p-1 hover:text-rose-400 text-rose-300 transition-colors"
              title="Supprimer la sélection"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 6. Subtotal and Totals */}
        <div className="border-t-2 border-gray-900 pt-2 pb-1 space-y-1 mt-1 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-900">
            <span>Article(s) : {totalArticles}</span>
            <span className="font-mono text-sm font-extrabold">
              Total : {grandTotal.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DZD
            </span>
          </div>
          <div className="w-full h-0.5 bg-gray-900" />
        </div>

        {/* 7. Footer */}
        <div className="text-center text-[11px] font-medium text-gray-600 mt-1 shrink-0">
          <p className="font-semibold text-gray-700">*** Merci de votre visite ***</p>
        </div>
      </div>

      {/* Bottom zigzag paper tear */}
      <div className="w-full h-2 flex overflow-hidden shrink-0">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-white"
          />
        ))}
      </div>
    </div>
  );
};
