import { Bill, ShopSettings } from '../types';
import { generateEscPosReceipt } from './escpos';
import { incrementBillPrintCount } from '../db/storage';

// Known Bluetooth printer GATT service UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer service
  'e7810a71-73ae-499d-8c15-44ae0f32f542', // Common Chinese POS printers
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / serial transparent
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / Microchip
];

interface BluetoothState {
  isSupported: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  deviceName: string | null;
  errorMessage: string | null;
}

// Global cached connection
let cachedDevice: any = null;
let cachedCharacteristic: any = null;

let state: BluetoothState = {
  isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
  isConnecting: false,
  isConnected: false,
  deviceName: null,
  errorMessage: null,
};

type StateListener = (state: BluetoothState) => void;
const stateListeners = new Set<StateListener>();

export function subscribeToBluetoothState(listener: StateListener): () => void {
  stateListeners.add(listener);
  listener({ ...state });
  return () => {
    stateListeners.delete(listener);
  };
}

function updateState(updates: Partial<BluetoothState>) {
  state = { ...state, ...updates };
  stateListeners.forEach((l) => l({ ...state }));
}

/**
 * Checks if Web Bluetooth is available
 */
export function checkBluetoothAvailability(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Connect to a Bluetooth thermal printer
 */
export async function connectBluetoothPrinter(): Promise<boolean> {
  if (!checkBluetoothAvailability()) {
    updateState({
      errorMessage: 'Web Bluetooth is not supported or disabled in this browser. Use Browser Print or Android native app.',
      isConnected: false,
    });
    return false;
  }

  try {
    updateState({ isConnecting: true, errorMessage: null });

    const nav = navigator as any;
    // Request device with optional services
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        ...PRINTER_SERVICES,
        '00001800-0000-1000-8000-00805f9b34fb',
        '00001801-0000-1000-8000-00805f9b34fb',
      ],
    });

    if (!device) {
      throw new Error('No device selected');
    }

    device.addEventListener('gattserverdisconnected', onDisconnected);

    const server = await device.gatt.connect();
    
    // Find writable characteristic
    let foundChar: any = null;

    // First try known printer services
    for (const serviceUuid of PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            foundChar = char;
            break;
          }
        }
        if (foundChar) break;
      } catch {
        // service not found on this device, continue
      }
    }

    // If not found in known list, discover all services
    if (!foundChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              foundChar = char;
              break;
            }
          }
          if (foundChar) break;
        }
      } catch (err) {
        console.warn('Could not inspect all primary services:', err);
      }
    }

    if (!foundChar) {
      throw new Error('Connected to device, but no writable printer characteristic was found.');
    }

    cachedDevice = device;
    cachedCharacteristic = foundChar;

    updateState({
      isConnecting: false,
      isConnected: true,
      deviceName: device.name || 'Bluetooth Printer',
      errorMessage: null,
    });

    return true;
  } catch (error: any) {
    const isUserCancelled = error?.name === 'NotFoundError' || error?.message?.includes('User cancelled');
    const msg = isUserCancelled
      ? 'Device selection cancelled.'
      : error?.message || 'Failed to connect to Bluetooth printer.';

    updateState({
      isConnecting: false,
      isConnected: false,
      deviceName: null,
      errorMessage: msg,
    });
    return false;
  }
}

function onDisconnected() {
  cachedDevice = null;
  cachedCharacteristic = null;
  updateState({
    isConnected: false,
    deviceName: null,
    errorMessage: 'Printer disconnected.',
  });
}

/**
 * Disconnect current printer
 */
export function disconnectBluetoothPrinter(): void {
  try {
    if (cachedDevice && cachedDevice.gatt.connected) {
      cachedDevice.gatt.disconnect();
    }
  } catch (e) {
    console.error('Error disconnecting printer:', e);
  }
  onDisconnected();
}

/**
 * Send print data over Bluetooth thermal printer
 */
export async function printBillViaBluetooth(
  bill: Bill,
  settings: ShopSettings
): Promise<{ success: boolean; error?: string }> {
  const bytes = generateEscPosReceipt(bill, settings);

  if (!cachedCharacteristic || !cachedDevice?.gatt?.connected) {
    // Attempt auto-reconnect or report error
    return {
      success: false,
      error: 'Printer is not connected. Please connect your Bluetooth thermal printer first.',
    };
  }

  try {
    // Split into chunks of 100 bytes to avoid GATT buffer overflow on mobile
    const CHUNK_SIZE = 100;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      if (cachedCharacteristic.writeValueWithoutResponse) {
        await cachedCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await cachedCharacteristic.writeValue(chunk);
      }
      // Small delay between chunks
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    incrementBillPrintCount(bill.id);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Printing failed: ${err?.message || 'Bluetooth transmission error'}. Your saved bill #${bill.billNumber} is intact and can be reprinted.`,
    };
  }
}
