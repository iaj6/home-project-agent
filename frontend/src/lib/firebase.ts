import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDvLAQ0TtrOO_oLrzxXNwuJofO6ROVOdE4",
  authDomain: "home-helper-706a8.firebaseapp.com",
  projectId: "home-helper-706a8",
  storageBucket: "home-helper-706a8.firebasestorage.app",
  messagingSenderId: "906219223037",
  appId: "1:906219223037:web:30bc7d57f6bf1d1f748b94",
  measurementId: "G-RJLG8F2D7F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9102');
  connectFirestoreEmulator(db, '127.0.0.1', 8402);
  connectFunctionsEmulator(functions, '127.0.0.1', 5402);
}
