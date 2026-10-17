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

  addLine(makeDivider('-'));

  // Items table
  setBold(true);
  if (is80mm) {
    // 48 columns layout: ITEM (20) | QTY (6) | PRICE (10) | TOTAL (12)
    const h = 'ITEM'.padEnd(20) + 'QTY'.padStart(6) + 'PRICE'.padStart(10) + 'TOTAL'.padStart(12);
    addLine(h);
  } else {
    // 32 columns layout: ITEM (14) | QTY (4) | RATE (6) | TOTAL (8)
    const h = 'ITEM'.padEnd(14) + 'QTY'.padStart(4) + 'RATE'.padStart(6) + 'AMT'.padStart(8);
    addLine(h);
  }
  setBold(false);
  addLine(makeDivider('-'));

  // Item rows
  for (const item of bill.items) {
    const name = item.name.length > (is80mm ? 19 : 13)
      ? item.name.substring(0, is80mm ? 19 : 13)
      : item.name;
    const qtyStr = item.quantity.toString();
    const rateStr = item.unitPrice.toFixed(0);
    const lineTotalStr = item.lineTotal.toFixed(0);

    if (is80mm) {
      const line = name.padEnd(20) + qtyStr.padStart(6) + rateStr.padStart(10) + lineTotalStr.padStart(12);
      addLine(line);
    } else {
      const line = name.padEnd(14) + qtyStr.padStart(4) + rateStr.padStart(6) + lineTotalStr.padStart(8);
      addLine(line);
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
  addLine('*** HAVE A DELICIOUS MEAL ***');

  // Feed lines & cut
  addLine();
  addLine();
  addLine();
  addBytes(0x1d, 0x56, 0x42, 0x00); // Partial cut command

  return new Uint8Array(commands);
}
