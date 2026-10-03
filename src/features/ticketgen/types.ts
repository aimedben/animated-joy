export type SizeMode = 'small' | 'medium' | 'large';

export interface TicketItem {
  name: string;
  qty: number;
  price: number;
}

export interface TicketModel {
  id: string;
  name: string;
  businessName: string;
  location: string;
  phone: string;
  items: TicketItem[];
  footer: string;
  badge?: string;
}

export interface TableOption {
  id: string;
  name: string;
  description: string;
  url: string;
}

export interface Position {
  x: number; // percentage offset from center (-40 to 40)
  y: number; // percentage offset from center (-35 to 35)
}

export interface BackgroundSettings {
  x: number; // percentage offset -50 to 50
  y: number; // percentage offset -50 to 50
  zoom: number; // 0.8 to 2.0 (default 1.0)
}

export type TextAlign = 'left' | 'center' | 'right';

export type SubElementType = 'row' | 'name' | 'quantity' | 'unitPrice' | 'total';

export interface SelectedTarget {
  lineId: string;
  subType: SubElementType;
}

export interface ElementStyle {
  fontSize?: number;
  isBold?: boolean;
  textAlign?: TextAlign;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface TicketProductLine {
  id: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  qty?: number;
  price?: number;
  x: number; // X offset in pixels within container
  y: number; // Y position in pixels within container
  width?: number;
  height?: number;
  fontSize?: number;
  textAlign?: TextAlign;
  // Sub-element styling & offsets
  nameStyle?: ElementStyle;
  qtyStyle?: ElementStyle;
  priceStyle?: ElementStyle;
  totalStyle?: ElementStyle;
}

export interface AppSettings {
  demoNumber: string;
  date: string;
  time: string;
  selectedModelId: string;
  selectedTableId: string;
  customTableUrl: string | null;
  customTicketUrl: string | null;
  size?: SizeMode;
  ticketWidth: number; // in pixels (200 to 800)
  ticketHeight: number; // in pixels (300 to 1100)
  lockProportions: boolean;
  position: Position;
  rotation: number; // in degrees, e.g. -15 to +15
  showSpecimenBanner: boolean;
  productLines: TicketProductLine[];
  showGrid: boolean;
  backgroundSettings: BackgroundSettings;
  previewZoom: number;
}
