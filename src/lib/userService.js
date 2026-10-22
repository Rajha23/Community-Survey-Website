import { doc, getDoc, getDocs, collection, query, where, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Calculates the next unique primary key starting from U001.
 * e.g. U001, U002, U003 ...
 */
export async function getNextUserPrimaryKey() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let maxNum = 0;
    usersSnap.forEach(d => {
      const data = d.data();
      const candidates = [d.id, data.primaryKey, data.uniqueId, data.userCode];
      for (const val of candidates) {
        if (typeof val === 'string') {
          const match = val.match(/^U(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
    });
    const nextNum = maxNum + 1;
    return `U${String(nextNum).padStart(3, '0')}`;
  } catch (err) {
    console.error("Error generating next user primary key:", err);
    return 'U001';
  }
}

/**
 * Fetches user profile from Firestore by direct doc ID, UID, or email.
 */
export async function fetchUserProfile(user) {
  if (!user) return null;

  try {
    // 1. Direct doc by UID
    const directRef = doc(db, 'users', user.uid);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      const data = directSnap.data();
      return {
        docId: directSnap.id,
        primaryKey: data.primaryKey || data.uniqueId || (directSnap.id.startsWith('U') ? directSnap.id : null),
        ...data
      };
    }

    // 2. Query by uid field (for documents named U001, U002, etc.)
    const qUid = query(collection(db, 'users'), where('uid', '==', user.uid));
    const snapUid = await getDocs(qUid);
    if (!snapUid.empty) {
      const d = snapUid.docs[0];
      const data = d.data();
      return {
        docId: d.id,
        primaryKey: data.primaryKey || data.uniqueId || d.id,
        ...data
      };
    }

    // 3. Fallback query by email
    if (user.email) {
      const qEmail = query(collection(db, 'users'), where('email', '==', user.email));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const d = snapEmail.docs[0];
        const data = d.data();
        return {
          docId: d.id,
          primaryKey: data.primaryKey || data.uniqueId || d.id,
          ...data
        };
      }
    }
  } catch (err) {
    console.error("Error in fetchUserProfile:", err);
  }

  return null;
}
