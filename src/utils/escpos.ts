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

  // Item rows
  for (const item of bill.items) {
    setBold(true);
    addLine(item.name.toUpperCase());
    setBold(false);
    if (item.quantity > 1 || item.lineTotal !== item.unitPrice) {
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
