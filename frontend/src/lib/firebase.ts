import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

/**
 * Firebase web-SDK config. These are public values — they're visible in any
 * browser's network tab on the deployed site. Sourced from Vite env at
 * build time so a forker swaps their own project values via
 * `frontend/.env.local` (or hosting-side env). See `.env.example`.
 *
 * If any required var is missing at build time Vite emits an explicit error
 * rather than failing silently at runtime.
 */
const env = import.meta.env;

function required(name: string): string {
  const v = (env as Record<string, string | undefined>)[name];
  if (!v) {
    throw new Error(
      `Missing ${name}. Copy frontend/.env.example to frontend/.env.local and fill in your Firebase project values.`,
    );
  }
  return v;
}

const firebaseConfig = {
  apiKey: required('VITE_FIREBASE_API_KEY'),
  authDomain: required('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: required('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: required('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: required('VITE_FIREBASE_APP_ID'),
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID, // optional
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development. Ports are configured in firebase.json
// at the repo root; if you change them there, change them here too.
if (env.DEV) {
  const host = env.VITE_EMULATOR_HOST ?? '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9102`);
  connectFirestoreEmulator(db, host, 8402);
  connectFunctionsEmulator(functions, host, 5402);
}
