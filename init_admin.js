import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "community-survey-app",
  appId: "1:781858141684:web:5f33f3d9d534fe0671f5a1",
  storageBucket: "community-survey-app.firebasestorage.app",
  apiKey: "AIzaSyDnlyFJgb09hlGth05esWyxcfSmlQD9HSY",
  authDomain: "community-survey-app.firebaseapp.com",
  messagingSenderId: "781858141684"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function initAdmin() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'admin@trp.srmtrichy.edu.in', 'admin123');
    const user = userCredential.user;
    await setDoc(doc(db, 'users', user.uid), {
      id: 'admin',
      email: 'admin@trp.srmtrichy.edu.in',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    console.log("Admin user created successfully in production!");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Admin user already exists.");
    } else {
      console.error("Error creating admin user:", error);
    }
    process.exit(1);
  }
}

initAdmin();
