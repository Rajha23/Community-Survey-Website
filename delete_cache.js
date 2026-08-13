import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "community-survey-app",
  appId: "1:781858141684:web:5f33f3d9d534fe0671f5a1",
  storageBucket: "community-survey-app.firebasestorage.app",
  apiKey: "AIzaSyDnlyFJgb09hlGth05esWyxcfSmlQD9HSY",
  authDomain: "community-survey-app.firebaseapp.com",
  messagingSenderId: "781858141684"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipeCache() {
  console.log("Fetching aiAnalysis collection...");
  const snap = await getDocs(collection(db, 'aiAnalysis'));
  let count = 0;
  for (const doc of snap.docs) {
    await deleteDoc(doc.ref);
    count++;
  }
  console.log(`Successfully deleted ${count} cached analyses!`);
  process.exit(0);
}

wipeCache();
