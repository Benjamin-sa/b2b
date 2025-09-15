// Firebase initialization
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const functions = getFunctions(firebaseApp);

// Connect to emulators in development
if (import.meta.env.DEV) {
  // Check if we're running in development mode
  console.log('🔧 Development mode detected - connecting to Firebase emulators');
  
  // Connect to Firestore emulator
  try {
   await connectFirestoreEmulator(db, '192.168.129.22', 8086);
    console.log('✅ Connected to Firestore emulator');
  } catch (error) {
    console.warn('⚠️ Firestore emulator connection failed (might already be connected):', error);
  }
  
  // Connect to Auth emulator (if you plan to use it)
  try {
  connectAuthEmulator(auth, 'http://192.168.129.22:9099');
    console.log('✅ Connected to Auth emulator');
  } catch (error) {
    console.warn('⚠️ Auth emulator connection failed (might already be connected):', error);
  }
  
  // Connect to Storage emulator (if you plan to use it)
  try {
  connectStorageEmulator(storage, '192.168.129.22', 5001);
    console.log('✅ Connected to Storage emulator');
  } catch (error) {
    console.warn('⚠️ Storage emulator connection failed (might already be connected):', error);
  }
  
  // Connect to Functions emulator
  try {
  connectFunctionsEmulator(functions, '192.168.129.22', 5001);
    console.log('✅ Connected to Functions emulator');
  } catch (error) {
    console.warn('⚠️ Functions emulator connection failed (might already be connected):', error);
  }
} else {
  console.log('🚀 Production mode - using live Firebase services');
}

console.log('Firebase initialized successfully');