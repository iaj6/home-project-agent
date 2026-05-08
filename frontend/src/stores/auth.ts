import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  function init() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        user.value = firebaseUser;
        loading.value = false;
        return;
      }
      // No session — auto-sign-in anonymously so the demo URL has zero friction.
      // The resulting UID persists in localStorage, so projects survive reloads
      // (but not browser-data clears or different browsers).
      try {
        const cred = await signInAnonymously(auth);
        user.value = cred.user;
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      } finally {
        loading.value = false;
      }
    });
  }

  async function login(email: string, password: string) {
    error.value = null;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user.value = cred.user;
    } catch (e: unknown) {
      error.value = (e as Error).message;
      throw e;
    }
  }

  async function signup(email: string, password: string, displayName: string) {
    error.value = null;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      user.value = cred.user;
    } catch (e: unknown) {
      error.value = (e as Error).message;
      throw e;
    }
  }

  async function logout() {
    await signOut(auth);
    user.value = null;
  }

  return { user, loading, error, init, login, signup, logout };
});
