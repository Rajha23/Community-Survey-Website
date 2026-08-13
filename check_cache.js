import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkCache() {
  const snap = await getDocs(collection(db, 'aiAnalysis'));
  console.log(`Found ${snap.docs.length} cached analyses!`);
  for (const doc of snap.docs) {
    console.log("--- DOC:", doc.id, "---");
    console.log(JSON.stringify(doc.data(), null, 2));
  }
  process.exit(0);
}

checkCache();
