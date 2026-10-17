import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Language } from '../utils/translations';

interface OfflineIndicatorProps {
  lang?: Language;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang = 'en' }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  const isTa = lang === 'ta';

  return (
    <aside
      aria-label={isTa ? 'ஆஃப்லைன் நிலை அறிவிப்பு' : 'Offline status notification'}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-blue-900 border-2 border-white px-3.5 py-2 text-xs font-black text-white shadow-xl animate-bounce"
    >
      <WifiOff className="w-4 h-4 text-amber-300 stroke-[3]" />
      <span>
        {isTa
          ? 'ஆஃப்லைன் முறை — சாதன சேமிப்பகத்திலிருந்து இயங்குகிறது'
          : 'Offline Mode — Operating from local device storage'}
      </span>
    </aside>
  );
};
