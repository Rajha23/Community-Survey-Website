import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  projectId: "community-survey-app",
  appId: "1:781858141684:web:5f33f3d9d534fe0671f5a1",
  storageBucket: "community-survey-app.firebasestorage.app",
  apiKey: "AIzaSyDnlyFJgb09hlGth05esWyxcfSmlQD9HSY",
  authDomain: "community-survey-app.firebaseapp.com",
  messagingSenderId: "781858141684"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth, Firestore, and Functions
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to local emulator for testing without deploying
connectFunctionsEmulator(functions, "localhost", 5001);
