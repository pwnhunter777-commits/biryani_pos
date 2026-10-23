import { Bill, ShopSettings } from '../types';

/**
 * Generates raw ESC/POS command buffers for standard 58mm (32 chars) and 80mm (48 chars)
 * Bluetooth thermal receipt printers.
 */

export function generateEscPosReceipt(bill: Bill, settings: ShopSettings): Uint8Array {
  const is80mm = settings.paperWidth === '80mm';
  const lineWidth = is80mm ? 48 : 32;

  const commands: number[] = [];

  // Helper functions
  const addBytes = (...bytes: number[]) => commands.push(...bytes);
  const addText = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      commands.push(code < 128 ? code : 63); // Fallback to '?' for non-ascii
    }
  };

  const addLine = (text: string = '') => {
    addText(text);
    addBytes(0x0a); // LF
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    addBytes(0x1b, 0x61, align === 'left' ? 0 : align === 'center' ? 1 : 2);
  };

  const setBold = (bold: boolean) => {
    addBytes(0x1b, 0x45, bold ? 1 : 0);
  };

  const setDoubleSize = (enabled: boolean) => {
    addBytes(0x1d, 0x21, enabled ? 0x11 : 0x00);
  };

  // Pad text to fit width
  const makeDivider = (char: string = '-') => char.repeat(lineWidth);

  const padColumns = (col1: string, col2: string, width: number) => {
    const space = Math.max(1, width - col1.length - col2.length);
    return col1 + ' '.repeat(space) + col2;
  };

  // Initialize printer: ESC @
  addBytes(0x1b, 0x40);

  // Header: Shop Name (if configured)
  setAlign('center');
  if (settings.shopName && settings.shopName.trim() !== '') {
    setBold(true);
    setDoubleSize(true);
    addLine(settings.shopName.trim().toUpperCase());
    setDoubleSize(false);
    setBold(false);
  } else {
    // If shop name not yet configured, print generic header
    setBold(true);
    addLine('RESTAURANT CASH BILL');
    setBold(false);
  }

  if (settings.tagline) {
    addLine(settings.tagline);
  }
  if (settings.address) {
    addLine(settings.address);
  }
  if (settings.phone) {
    addLine(`Tel: ${settings.phone}`);
  }

  addLine(makeDivider('='));

  // Bill metadata
  setAlign('left');
  addLine(padColumns(`Bill No: ${bill.billNumber}`, `Date: ${bill.dateString}`, lineWidth));
  addLine(padColumns(`Time: ${bill.timeString}`, `Type: Dine/Take`, lineWidth));

const TAMIL_ITEM_MAP: Record<string, string> = {
  'போன்லெஸ் (எலும்பில்லா)': 'BONELESS CHICKEN',
  'போன்லெஸ்': 'BONELESS CHICKEN',
  'விங்ஸ் (இறக்கை)': 'CHICKEN WINGS',
  'விங்ஸ்': 'CHICKEN WINGS',
  'ஈரல்': 'CHICKEN LIVER',
  'லெக் போன்லெஸ்': 'LEG BONELESS',
  'பிராய்லர் கோழி': 'BROILER CHICKEN',
  'பிராய்லர்': 'BROILER CHICKEN',
  'லெக் பீஸ்': 'LEG PIECE',
  'நாட்டுக்கோழி': 'COUNTRY CHICKEN',
  'நாட்டு கோழி': 'COUNTRY CHICKEN',
  'சிக்கன் பிரியாணி': 'CHICKEN BIRYANI',
  'சிக்கன்': 'CHICKEN',
  'மட்டன்': 'MUTTON',
};

function formatItemNameForPrinter(name: string): string {
  const trimmed = (name || '').trim();
  if (TAMIL_ITEM_MAP[trimmed]) {
    return TAMIL_ITEM_MAP[trimmed];
  }
  for (const [tamil, eng] of Object.entries(TAMIL_ITEM_MAP)) {
    if (trimmed.includes(tamil)) {
      return eng;
    }
  }
  // If contains English characters, extract them
  const englishOnly = trimmed.replace(/[^\x20-\x7E]/g, '').trim();
  if (englishOnly.length >= 2) {
    return englishOnly.toUpperCase();
  }
  return trimmed.toUpperCase();
}

  // Item rows
  for (const item of bill.items) {
    setBold(true);
    addLine(formatItemNameForPrinter(item.name));
    setBold(false);
    if (item.weightKg) {
      const qtyPart = `  ${item.weightKg} KG x ${item.unitPrice.toFixed(0)}`;
      const amtPart = `Rs. ${item.lineTotal.toFixed(0)}`;
      addLine(padColumns(qtyPart, amtPart, lineWidth));
    } else if (item.quantity > 1 || item.lineTotal !== item.unitPrice) {
      const qtyPart = `  ${item.quantity} x ${item.unitPrice.toFixed(0)}`;
      const amtPart = `Rs. ${item.lineTotal.toFixed(0)}`;
      addLine(padColumns(qtyPart, amtPart, lineWidth));
    } else {
      const amtPart = `Rs. ${item.lineTotal.toFixed(0)}`;
      addLine(padColumns('  1 portion', amtPart, lineWidth));
    }
  }

  addLine(makeDivider('-'));

  // Totals
  setBold(true);
  addLine(padColumns(`Total Items: ${bill.totalQuantity}`, `Total: Rs. ${bill.totalAmount.toFixed(0)}`, lineWidth));
  setBold(false);

  addLine(makeDivider('='));

  // Footer notes
  setAlign('center');
  if (settings.footerNote) {
    addLine(settings.footerNote);
  }

  // Feed lines & cut
  addLine();
  addLine();
  addLine();
  addBytes(0x1d, 0x56, 0x42, 0x00); // Partial cut command

  return new Uint8Array(commands);
}
