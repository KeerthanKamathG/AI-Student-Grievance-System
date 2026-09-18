import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App instance safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the designated Firestore Database ID
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

/**
 * Removes undefined fields recursively from objects and arrays to prevent Firestore invalid data errors.
 */
export function cleanFirestoreData(val: any): any {
  if (val === undefined) return undefined;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned;
}

export { app, db };
