import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  addDoc,
  doc, 
  writeBatch, 
  onSnapshot,
  query,
  orderBy,
  getDoc,
  setLogLevel
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';

import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const config = firebaseConfig as any;
export const db = config.firestoreDatabaseId 
  ? initializeFirestore(app, { 
      experimentalForceLongPolling: true
    }, config.firestoreDatabaseId)
  : initializeFirestore(app, { 
      experimentalForceLongPolling: true
    });

// Silence standard connectivity warning logs from Firestore in the console
try {
  setLogLevel('silent');
} catch (e) {
  console.warn('Could not set Firestore log level to silent:', e);
}

export const auth = getAuth(app);

// Secondary app for creating users without signing out the current admin
const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
export const secondaryAuth = getAuth(secondaryApp);

// Enforce browser-only session persistence (session is wiped when the browser tab closes)
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Failed to configure strict browserSessionPersistence:", error);
});

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
  }
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error (handled gracefully): ', JSON.stringify(errInfo));
  // We do not throw to avoid triggering React Error Boundary crashes.
  // Instead, return the error info or log it.
}

// Default Seed Data
const defaultArticles: any[] = [];
const defaultTestimonials: any[] = [];
const defaultClients: any[] = [];
const defaultCases: any[] = [];
const defaultEvents: any[] = [];
const defaultTransactions: any[] = [];
const defaultInventories: any[] = [];

// Recovery script for local data that was overridden by empty cloud instances
export async function recoverLocalDataToCloud() {
  if (typeof window === 'undefined') return;
  
  const collections = [
    { name: 'clients', key: 'almeida_backup_clients' },
    { name: 'cases', key: 'almeida_backup_cases' },
    { name: 'events', key: 'almeida_backup_events' },
    { name: 'transactions', key: 'almeida_backup_transactions' },
    { name: 'inventories', key: 'almeida_backup_inventories' }
  ];

  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col.name));
      if (snap.empty) {
        const localData = localStorage.getItem(col.key);
        if (localData && localData !== '[]') {
          const parsed = JSON.parse(localData);
          if (parsed.length > 0) {
            console.log(`Recovering ${parsed.length} items to ${col.name} from local storage...`);
            for (const item of parsed) {
              const cleanItem = Object.entries(item).reduce((acc, [k, v]) => {
                if (v !== undefined) acc[k] = v;
                return acc;
              }, {} as any);
              if (cleanItem.id) {
                await setDoc(doc(db, col.name, cleanItem.id), cleanItem);
              } else {
                await addDoc(collection(db, col.name), cleanItem);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`Recovery failed for ${col.name}:`, e);
    }
  }
}

// Helper to seed database
export async function forceSeedDatabase() {
  const results: string[] = [];
  
  // 1. Seed articles
  const articlesSnap = await getDocs(collection(db, 'articles'));
  if (articlesSnap.empty) {
    console.log('Seeding articles...');
    for (const art of defaultArticles) {
      await addDoc(collection(db, 'articles'), art);
    }
    results.push('Artigos');
  }
  
  // 2. Seed testimonials
  const testimonialsSnap = await getDocs(collection(db, 'testimonials'));
  if (testimonialsSnap.empty) {
    console.log('Seeding testimonials...');
    for (const test of defaultTestimonials) {
      await addDoc(collection(db, 'testimonials'), test);
    }
    results.push('Depoimentos');
  }
  
  // 3. Seed clients
  const clientsSnap = await getDocs(collection(db, 'clients'));
  if (clientsSnap.empty) {
    console.log('Seeding clients...');
    for (const cli of defaultClients) {
      await setDoc(doc(db, 'clients', cli.id), cli);
    }
    results.push('Clientes');
  }
  
  // 4. Seed cases
  const casesSnap = await getDocs(collection(db, 'cases'));
  if (casesSnap.empty) {
    console.log('Seeding cases...');
    for (const cs of defaultCases) {
      await setDoc(doc(db, 'cases', cs.id), cs);
    }
    results.push('Casos');
  }
  
  // 5. Seed events
  const eventsSnap = await getDocs(collection(db, 'events'));
  if (eventsSnap.empty) {
    console.log('Seeding events...');
    for (const evt of defaultEvents) {
      await setDoc(doc(db, 'events', evt.id), evt);
    }
    results.push('Agenda');
  }
  
  // 6. Seed transactions
  const transactionsSnap = await getDocs(collection(db, 'transactions'));
  if (transactionsSnap.empty) {
    console.log('Seeding transactions...');
    for (const tr of defaultTransactions) {
      await setDoc(doc(db, 'transactions', tr.id), tr);
    }
    results.push('Transações');
  }
  
  // 7. Seed inventories
  const inventoriesSnap = await getDocs(collection(db, 'inventories'));
  if (inventoriesSnap.empty) {
    console.log('Seeding inventories...');
    for (const inv of defaultInventories) {
      await setDoc(doc(db, 'inventories', inv.id), inv);
    }
    results.push('Inventários');
  }
  
  // Save seed status so we don't auto-seed on subsequent boots
  try {
    await setDoc(doc(db, 'system', 'seed_status'), { seeded: true });
  } catch (e) {
    console.error('Failed to set seed status doc:', e);
  }
  
  return results;
}

export async function seedDatabaseIfEmpty() {
  try {
    // Fast check to avoid permission errors on restricted collections for public users
    const seedStatusSnap = await getDoc(doc(db, 'system', 'seed_status'));
    if (seedStatusSnap.exists() && seedStatusSnap.data().seeded) {
      // Already seeded, do nothing and avoid permission errors
      return;
    }
    
    // Check if user is authenticated (only admins should be able to read/write these collections)
    if (!auth.currentUser) {
       console.log('Skipping automatic seed check: User is not authenticated.');
       return;
    }

    // Try to recover from local browser cache if Firebase is empty
    await recoverLocalDataToCloud();

    const results = await forceSeedDatabase();
    if (results.length > 0) {
      console.log('Firebase Seeding completed successfully! Seeded:', results.join(', '));
    } else {
      console.log('Firebase Seeding completed successfully! Collections already contain data.');
    }
  } catch (error) {
    console.error('Error during automatic seed check:', (error as Error).message);
  }
}
