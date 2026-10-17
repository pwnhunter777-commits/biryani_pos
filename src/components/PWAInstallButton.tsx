import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../utils/translations';
import { AppLogo } from './AppLogo';

interface PWAInstallButtonProps {
  lang?: Language;
  className?: string;
  variant?: 'button' | 'compact' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'en',
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  const isTa = lang === 'ta';

  // If running directly in standalone installed PWA mode, suppress install button
  if (isInstalled && !installedNotice) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledNotice(true);
        setTimeout(() => setInstalledNotice(false), 4000);
      }
    } else {
      // Show universal install guide for iOS or browsers where prompt event hasn't fired
      setShowGuide(true);
    }
  };

  const buttonText = isTa ? 'செயலியை நிறுவு' : 'Install App';

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          title={buttonText}
          className={`px-2.5 py-1 rounded-lg border-2 border-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-800 text-xs font-black flex items-center gap-1 transition cursor-pointer uppercase shadow-xs active:scale-95 ${className}`}
        >
          <Download className="w-3.5 h-3.5 stroke-[3]" />
          <span>{buttonText}</span>
        </button>
      ) : variant === 'banner' ? (
        <div
          className={`w-full bg-blue-50 border-2 border-blue-600 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm ${className}`}
        >
          <div className="flex items-center gap-3">
            <AppLogo size="sm" />
            <div>
              <p className="font-black text-sm text-slate-900 uppercase">
                {isTa ? 'ஆப்-ஆக நிறுவவும் (PWA)' : 'Install as Mobile App (PWA)'}
              </p>
              <p className="text-xs font-bold text-slate-600">
                {isTa
                  ? 'முகப்புத் திரையிலிருந்து நேரடியாக வேகமாக பில் தயாரிக்கலாம்'
                  : 'Fast offline billing directly from your phone home screen'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm transition"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>{buttonText}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer transition ${className}`}
        >
          <Download className="w-4 h-4 stroke-[3]" />
          <span>{buttonText}</span>
        </button>
      )}

      {/* Installed Notice Toast */}
      {installedNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 font-black text-sm">
          <CheckCircle className="w-4 h-4 stroke-[3]" />
          <span>
            {isTa ? 'செயலி வெற்றிகரமாக நிறுவப்பட்டது!' : 'Application installed successfully!'}
          </span>
        </div>
      )}

      {/* Guide Modal for iOS Safari / Manual Install */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border-2 border-blue-600 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <AppLogo size="sm" />
                <h3 className="font-black text-base text-slate-900 uppercase">
                  {isTa ? 'செயலியை நிறுவுதல்' : 'Install PWA App'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs font-bold text-slate-700">
                <p className="font-black text-slate-900 text-sm">
                  {isTa ? 'iPhone / iPad-ல் நிறுவுவது எப்படி:' : 'How to install on iPhone / iPad:'}
                </p>
                <div className="flex items-start gap-2.5 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                    1
                  </span>
                  <div>
                    <span className="font-black text-slate-900">
                      {isTa ? 'சஃபாரி (Safari) கீழே உள்ள பகிர் பொத்தானை அழுத்தவும்' : 'Tap the Share button in Safari toolbar'}
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-blue-700">
                      <Share2 className="w-4 h-4" /> (Share / பகிர்)
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                    2
                  </span>
                  <div>
                    <span className="font-black text-slate-900">
                      {isTa
                        ? 'கீழே நகர்த்தி "Add to Home Screen" என்பதைத் தேர்ந்தெடுக்கவும்'
                        : 'Scroll down and tap "Add to Home Screen"'}
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-blue-700">
                      <PlusSquare className="w-4 h-4" /> (முகப்புத் திரையில் சேர்)
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                    3
                  </span>
                  <div>
                    <span className="font-black text-slate-900">
                      {isTa ? 'மேலே உள்ள "Add" என்பதைத் தொடவும்' : 'Tap "Add" in the top right corner'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs font-bold text-slate-700">
                <p className="font-black text-slate-900 text-sm">
                  {isTa
                    ? 'Android / கணினியில் நிறுவுவது எப்படி:'
                    : 'How to install on Android / Chrome / Edge:'}
                </p>
                <div className="flex items-start gap-2.5 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                    1
                  </span>
                  <div>
                    <span className="font-black text-slate-900">
                      {isTa
                        ? 'பிரவுசரின் மூன்று புள்ளிகள் (⋮) மெனுவைத் திறக்கவும்'
                        : 'Open browser menu (⋮ in top/bottom right)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                    2
                  </span>
                  <div>
                    <span className="font-black text-slate-900">
                      {isTa
                        ? '"Install App" அல்லது "Add to Home Screen" என்பதை அழுத்தவும்'
                        : 'Select "Install app" or "Add to Home screen"'}
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-blue-700">
                      <Smartphone className="w-4 h-4" /> (ஆப் ஆக சேர்)
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer"
            >
              {isTa ? 'புரிந்தது / சரி' : 'Got it / Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
