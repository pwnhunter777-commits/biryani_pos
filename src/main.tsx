import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebaseSync } from './db/storage';

// Initialize real-time Firebase sync
initFirebaseSync();

createRoot(document.getElementById('root')!).render(<App />);
