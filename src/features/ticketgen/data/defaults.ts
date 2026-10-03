import { AppSettings, TableOption, TicketModel } from '../types';

import tableWoodDesk from '../assets/images/table_wood_desk_1791047001699.jpg';
import tableOfficeMinimal from '../assets/images/table_office_minimal_1791047013722.jpg';
import tableCafeBistro from '../assets/images/table_cafe_bistro_1791047024421.jpg';

export const DEFAULT_MODELS: TicketModel[] = [
  {
    id: 'seddouk-bejaia',
    name: 'Ticket 1',
    badge: 'Seddouk (Béjaïa)',
    businessName: 'QUICHER LYAZID',
    location: 'SEDDOUK CENTRE BEJAIA',
    phone: 'Tel : 05 52 31 19 88',
    items: [
      { name: 'Huile d’olive 1L', qty: 1, price: 950 },
      { name: 'Semoule extra 2kg', qty: 2, price: 180 },
      { name: 'Eau minérale 1.5L', qty: 2, price: 50 },
      { name: 'Lait pasteurisé', qty: 3, price: 25 },
    ],
    footer: '*** Merci de votre visite ***',
  },
  {
    id: 'didouche-alger',
    name: 'Ticket 2',
    badge: 'Alger Centre',
    businessName: 'CAFÉ DES ARCADES',
    location: '14 RUE DIDOUCHE MOURAD, ALGER',
    phone: 'Tel : 021 63 42 10',
    items: [
      { name: 'Café pressé', qty: 2, price: 90 },
      { name: 'Croissant pur beurre', qty: 2, price: 80 },
      { name: 'Jus d’orange frais', qty: 1, price: 220 },
      { name: 'Eau minérale 0.5L', qty: 1, price: 40 },
    ],
    footer: '*** À bientôt chez nous ***',
  },
  {
    id: 'front-mer-oran',
    name: 'Ticket 3',
    badge: 'Oran Front de Mer',
    businessName: 'PAPETERIE EL MANAR',
    location: 'BOULEVARD FRONT DE MER, ORAN',
    phone: 'Tel : 041 33 18 20',
    items: [
      { name: 'Cahier spirale A4', qty: 2, price: 320 },
      { name: 'Stylos à bille (lot 4)', qty: 1, price: 180 },
      { name: 'Rame papier 80g', qty: 1, price: 850 },
      { name: 'Correcteur liquide', qty: 1, price: 110 },
    ],
    footer: '*** Merci pour vos achats ***',
  },
];

export const TABLE_OPTIONS: TableOption[] = [
  {
    id: 'table-wood-desk',
    name: 'Bureau Bois Verni',
    description: 'Table bois avec stylos bleus & reflets',
    url: tableWoodDesk,
  },
  {
    id: 'table-office-minimal',
    name: 'Chêne Clair Minimal',
    description: 'Bureau épuré avec tasse de café',
    url: tableOfficeMinimal,
  },
  {
    id: 'table-cafe-bistro',
    name: 'Café Bistrot Noyer',
    description: 'Ambiance chaleureuse bois sombre',
    url: tableCafeBistro,
  },
];

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function generateRandomDemoNumber(): string {
  // 6 digits random number formatted like 004821
  const num = Math.floor(10000 + Math.random() * 90000);
  return `00${num}`;
}

export const DEMO_SAMPLE_PRODUCTS = [
  { name: 'Canbebe', quantity: 1, unitPrice: 320 },
  { name: 'Mirinda', quantity: 2, unitPrice: 120 },
  { name: 'Pepsi', quantity: 2, unitPrice: 150 },
  { name: 'Palmary', quantity: 1, unitPrice: 180 },
  { name: 'Nestlé Pure Life', quantity: 6, unitPrice: 60 },
  { name: 'Moment', quantity: 2, unitPrice: 120 },
  { name: 'Tomate CAB', quantity: 3, unitPrice: 180 },
  { name: 'Maxon', quantity: 2, unitPrice: 300 },
  { name: 'Candia', quantity: 1, unitPrice: 160 },
];

export function createDefaultProductLines() {
  return DEMO_SAMPLE_PRODUCTS.map((item, index) => {
    const total = item.quantity * item.unitPrice;
    return {
      id: `line-${index + 1}-${Date.now()}`,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total,
      qty: item.quantity,
      price: item.unitPrice,
      y: index * 32,
      x: 0,
      fontSize: 12,
      textAlign: 'left' as const,
    };
  });
}

export const INITIAL_SETTINGS: AppSettings = {
  demoNumber: '004829',
  date: getTodayDateString(),
  time: getCurrentTimeString(),
  selectedModelId: 'seddouk-bejaia',
  selectedTableId: 'table-wood-desk',
  customTableUrl: null,
  customTicketUrl: null,
  size: 'medium',
  ticketWidth: 380,
  ticketHeight: 740,
  lockProportions: false,
  position: { x: 0, y: 0 },
  rotation: -1,
  showSpecimenBanner: false,
  productLines: createDefaultProductLines(),
  showGrid: false,
  backgroundSettings: { x: 0, y: 0, zoom: 1.0 },
  previewZoom: 1.0,
};
