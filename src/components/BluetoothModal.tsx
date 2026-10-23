import React, { useEffect, useState } from 'react';
import {
  Printer,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  PowerOff,
  FileText,
} from 'lucide-react';
import {
  subscribeToBluetoothState,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  checkBluetoothAvailability,
} from '../utils/bluetoothPrinter';
import { ShopSettings } from '../types';
import { Language, translations } from '../utils/translations';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  lang?: Language;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  onClose,
  settings,
  lang = 'en',
}) => {
  const t = translations[lang] || translations.en;
  const [btState, setBtState] = useState({
    isSupported: checkBluetoothAvailability(),
    isConnecting: false,
    isConnected: false,
    deviceName: null as string | null,
    errorMessage: null as string | null,
  });

  const [testPrintStatus, setTestPrintStatus] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToBluetoothState((s) => {
      setBtState(s);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setTestPrintStatus(null);
    await connectBluetoothPrinter();
  };

  const handleDisconnect = () => {
    setTestPrintStatus(null);
    disconnectBluetoothPrinter();
  };

  const handleSimulatedTestPrint = () => {
    setTestPrintStatus(t.testSent);
    setTimeout(() => {
      setTestPrintStatus(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="w-full max-w-sm mx-auto bg-white border-2 border-blue-200 rounded-2xl shadow-xl p-3.5 sm:p-4 text-slate-900 relative font-bold my-auto overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        <div className="flex items-center gap-2 mb-3 pr-8">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Bluetooth className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 uppercase truncate">{t.thermalPrinter}</h2>
            <p className="text-xs font-bold text-slate-500 truncate">{t.escposWireless}</p>
          </div>
        </div>

        {/* Status Card - Small Compact Div */}
        <div
          className={`p-2.5 sm:p-3 rounded-xl border-2 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            btState.isConnected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-slate-50 border-slate-300 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                btState.isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="font-black text-xs sm:text-sm uppercase truncate">
                {btState.isConnected ? t.connected : t.notConnected}
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">
                {btState.deviceName || (btState.isSupported ? t.readyToPair : t.bluetoothUnavailable)}
              </div>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            {btState.isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-xs font-black flex items-center gap-1 cursor-pointer transition uppercase"
              >
                <PowerOff className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.disconnect}</span>
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={btState.isConnecting}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase flex items-center gap-1 cursor-pointer transition shadow-xs disabled:opacity-50"
              >
                {btState.isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.pairing}</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{t.pairPrinter}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error / Notice Display */}
        {btState.errorMessage && (
          <div className="p-2 rounded-lg bg-red-100 border border-red-300 text-red-800 text-xs font-black mb-2 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 stroke-[2.5]" />
            <div>{btState.errorMessage}</div>
          </div>
        )}

        {testPrintStatus && (
          <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 stroke-[2.5]" />
            <div>{testPrintStatus}</div>
          </div>
        )}

        {/* Printer Setup Instructions - Compact */}
        <div className="space-y-1 text-xs font-bold text-slate-700 bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 mb-3">
          <div className="font-black text-blue-800 text-xs uppercase tracking-wider flex items-center gap-1">
            <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
            {t.setupInstructions}
          </div>
          <ul className="space-y-1 text-slate-600 list-disc list-inside text-xs">
            <li>{t.printerInstruction1}</li>
            <li>{t.printerInstruction2}</li>
            <li>{t.printerInstruction3} <strong>{settings.paperWidth} {t.width}</strong>.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSimulatedTestPrint}
            className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase flex items-center justify-center gap-1 cursor-pointer transition border border-slate-300"
          >
            <FileText className="w-4 h-4 text-blue-600 stroke-[2.5]" />
            {t.testEscPos}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center justify-center cursor-pointer transition shadow-xs"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};
