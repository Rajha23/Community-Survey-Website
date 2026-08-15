import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
    } else {
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // Check if Firebase Admin is initialized
    if (!getApps().length) {
       return res.status(500).json({ error: 'Firebase Admin SDK is not properly initialized on the server. Please check FIREBASE_SERVICE_ACCOUNT env variable.' });
    }

    const { uid, newPassword } = req.body;

    if (!uid || !newPassword) {
      return res.status(400).json({ error: 'Missing uid or newPassword in request body.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Update the user's password using the Admin SDK
    const userRecord = await getAuth().updateUser(uid, {
      password: newPassword,
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Password successfully updated.',
      uid: userRecord.uid 
    });

  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({ error: error.message || 'Failed to change password.' });
  }
}
