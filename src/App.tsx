import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  getShopSettings,
  subscribeToStore,
  getPersistedSession,
  setPersistedSession,
  checkAndPerformThreeDayReset,
  syncAllDataToFirebase,
} from './db/storage';
import { ShopSettings, ScreenState } from './types';
import { PinPad } from './components/PinPad';
import { OwnerView } from './components/OwnerView';
import { EmployeeView } from './components/EmployeeView';
import { Language, translations, getSavedLanguage, saveLanguage } from './utils/translations';
import { LanguageToggle } from './components/LanguageToggle';
import { AppLogo } from './components/AppLogo';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [lang, setLang] = useState<Language>(() => getSavedLanguage());
  const [screen, setScreen] = useState<ScreenState>(() => {
    checkAndPerformThreeDayReset();
    const session = getPersistedSession();
    if (session === 'OWNER') {
      return 'OWNER_DASHBOARD';
    }
    if (session === 'EMPLOYEE') {
      return 'EMPLOYEE_SECTION';
    }
    return 'OPENING_SCREEN';
  });
  const [settings, setSettings] = useState<ShopSettings>(getShopSettings());
  const [verifiedEmployeePin, setVerifiedEmployeePin] = useState<string>('1234');

  const t = translations[lang] || translations.en;

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    saveLanguage(newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === 'ta') {
      document.body.classList.add('lang-ta');
    } else {
      document.body.classList.remove('lang-ta');
    }
  }, [lang]);

  useEffect(() => {
    checkAndPerformThreeDayReset();
    const unsub = subscribeToStore(() => {
      setSettings(getShopSettings());
    });
    return unsub;
  }, []);

  const handleOwnerLoginSuccess = () => {
    setPersistedSession('OWNER');
    setScreen('OWNER_DASHBOARD');
  };

  const handleEmployeeLoginSuccess = () => {
    setPersistedSession('EMPLOYEE');
    setVerifiedEmployeePin(settings.employeePin || '1234');
    setScreen('EMPLOYEE_SECTION');
  };

  const handleLogout = async () => {
    // Till the person is logouting, save all data in Firebase
    try {
      await syncAllDataToFirebase();
    } catch (err) {
      console.error('Logout Firebase sync error:', err);
    }
    setPersistedSession(null);
    setScreen('OPENING_SCREEN');
  };

  return (
    <div
      className={`min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-start antialiased selection:bg-blue-600 selection:text-white font-bold w-full max-w-full overflow-x-hidden ${
        lang === 'ta' ? 'lang-ta' : ''
      }`}
    >
      {/* Main Container */}
      <div className="w-full max-w-full flex-1 flex flex-col overflow-x-hidden">
        {/* ================= SCREEN 1: OPENING SCREEN ================= */}
        {screen === 'OPENING_SCREEN' && (
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 text-center bg-gradient-to-b from-blue-50/80 via-white to-slate-50 relative w-full max-w-full overflow-x-hidden">
            {/* Top Language Toggle */}
            <div className="absolute top-3 right-3 z-10">
              <LanguageToggle currentLang={lang} onLanguageChange={handleLanguageChange} />
            </div>

            {/* App Logo */}
            <div className="mb-2">
              <AppLogo size="lg" />
            </div>

            {/* Main Title - Bold and Big */}
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mb-3 px-3 break-words max-w-sm sm:max-w-md mx-auto">
              {settings.shopName && settings.shopName.trim() !== ''
                ? settings.shopName
                : t.appName}
            </h1>

            {/* Clean, Compact, Bold Big Buttons */}
            <div className="w-full max-w-xs space-y-2">
              <button
                type="button"
                onClick={() => setScreen('OWNER_LOGIN')}
                className="w-full py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-base sm:text-lg uppercase tracking-wide shadow-md shadow-blue-500/20 transition cursor-pointer text-center flex items-center justify-center"
              >
                <span>{t.ownerLogin}</span>
              </button>

              <button
                type="button"
                onClick={() => setScreen('EMPLOYEE_LOGIN')}
                className="w-full py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-base sm:text-lg uppercase tracking-wide shadow-md shadow-blue-500/20 transition cursor-pointer text-center flex items-center justify-center"
              >
                <span>{t.employeeLogin}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= SCREEN 2: OWNER LOGIN ================= */}
        {screen === 'OWNER_LOGIN' && (
          <div className="flex-1 flex flex-col justify-center items-center p-3 bg-slate-50 relative">
            <div className="absolute top-4 right-4">
              <LanguageToggle currentLang={lang} onLanguageChange={handleLanguageChange} />
            </div>

            <div className="mb-3">
              <AppLogo size="md" />
            </div>

            <button
              onClick={() => setScreen('OPENING_SCREEN')}
              className="mb-3 text-sm font-black text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer transition uppercase"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" /> {t.back}
            </button>
            <PinPad
              title={t.ownerAuth}
              subtitle={t.enterPin}
              expectedPin={settings.ownerPin}
              onSuccess={handleOwnerLoginSuccess}
              onCancel={() => setScreen('OPENING_SCREEN')}
              lang={lang}
            />
          </div>
        )}

        {/* ================= SCREEN 3: OWNER DASHBOARD ================= */}
        {screen === 'OWNER_DASHBOARD' && (
          <div className="flex-1 flex flex-col">
            <OwnerView
              onLogout={handleLogout}
              lang={lang}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        )}

        {/* ================= SCREEN 4: EMPLOYEE LOGIN ================= */}
        {screen === 'EMPLOYEE_LOGIN' && (
          <div className="flex-1 flex flex-col justify-center items-center p-3 bg-slate-50 relative">
            <div className="absolute top-4 right-4">
              <LanguageToggle currentLang={lang} onLanguageChange={handleLanguageChange} />
            </div>

            <div className="mb-3">
              <AppLogo size="md" />
            </div>

            <button
              onClick={() => setScreen('OPENING_SCREEN')}
              className="mb-3 text-sm font-black text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer transition uppercase"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" /> {t.back}
            </button>
            <PinPad
              title={t.employeeAuth}
              subtitle={t.enterPin}
              expectedPin={settings.employeePin}
              onSuccess={handleEmployeeLoginSuccess}
              onCancel={() => setScreen('OPENING_SCREEN')}
              lang={lang}
            />
          </div>
        )}

        {/* ================= SCREEN 5: EMPLOYEE SECTION ================= */}
        {screen === 'EMPLOYEE_SECTION' && (
          <div className="flex-1 flex flex-col">
            <EmployeeView
              onLogout={handleLogout}
              employeePin={verifiedEmployeePin}
              lang={lang}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        )}
      </div>

      {/* Floating Offline Notification when network disconnects */}
      <OfflineIndicator lang={lang} />
    </div>
  );
}
