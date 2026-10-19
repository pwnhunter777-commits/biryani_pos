import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CatalogItem, Bill, ShopSettings, OwnerSharedDailyReport } from '../types';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection established successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is disconnected.');
    } else {
      console.info('Firebase connection test result:', error);
    }
    return false;
  }
}

// ================= SYNC SERVICES =================

// 1. Catalog Items
export async function saveCatalogItemToFirestore(item: CatalogItem): Promise<void> {
  const path = `items/${item.id}`;
  try {
    // Sanitize undefined fields for Firestore
    const cleanItem = JSON.parse(JSON.stringify(item));
    await setDoc(doc(db, 'items', item.id), cleanItem, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCatalogItemFromFirestore(id: string): Promise<void> {
  const path = `items/${id}`;
  try {
    await deleteDoc(doc(db, 'items', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 2. Customer Bills
export async function saveBillToFirestore(bill: Bill): Promise<void> {
  const path = `bills/${bill.id}`;
  try {
    const cleanBill = JSON.parse(JSON.stringify(bill));
    await setDoc(doc(db, 'bills', bill.id), cleanBill, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 3. Shop Settings
export async function saveShopSettingsToFirestore(settings: ShopSettings): Promise<void> {
  const path = 'settings/current';
  try {
    const cleanSettings = JSON.parse(JSON.stringify(settings));
    await setDoc(doc(db, 'settings', 'current'), cleanSettings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Daily Reports
export async function saveDailyReportToFirestore(report: OwnerSharedDailyReport): Promise<void> {
  const path = `dailyReports/${report.id}`;
  try {
    const cleanReport = JSON.parse(JSON.stringify(report));
    await setDoc(doc(db, 'dailyReports', report.id), cleanReport, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ================= REAL-TIME LISTENERS =================

export function subscribeToFirestoreItems(
  onUpdate: (items: CatalogItem[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = 'items';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: CatalogItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CatalogItem);
      });
      onUpdate(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToFirestoreBills(
  onUpdate: (bills: Bill[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = 'bills';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const bills: Bill[] = [];
      snapshot.forEach((docSnap) => {
        bills.push(docSnap.data() as Bill);
      });
      onUpdate(bills);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToFirestoreSettings(
  onUpdate: (settings: ShopSettings) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = 'settings';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      snapshot.forEach((docSnap) => {
        if (docSnap.id === 'current') {
          onUpdate(docSnap.data() as ShopSettings);
        }
      });
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToFirestoreDailyReports(
  onUpdate: (reports: OwnerSharedDailyReport[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = 'dailyReports';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const reports: OwnerSharedDailyReport[] = [];
      snapshot.forEach((docSnap) => {
        reports.push(docSnap.data() as OwnerSharedDailyReport);
      });
      onUpdate(reports);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
