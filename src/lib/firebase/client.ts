import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? ''
};

const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
] as const;

const isFirebaseConfigured = requiredKeys.every((key) => firebaseConfig[key]);

const firebaseApp = isFirebaseConfigured
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null;

const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;
const firebaseStorage = firebaseApp ? getStorage(firebaseApp) : null;

export {
  firebaseApp,
  firebaseAuth,
  firebaseDb,
  firebaseStorage,
  firebaseConfig,
  isFirebaseConfigured,
  getMessaging
};
