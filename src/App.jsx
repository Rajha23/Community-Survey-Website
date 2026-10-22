import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, secondaryAuth } from './lib/firebase';
import { fetchUserProfile } from './lib/userService';
import BackgroundCanvas from './components/BackgroundCanvas';
import LandingPage from './components/landing/LandingPage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import StudentDashboard from './components/student/StudentDashboard';
import AdminDashboard from './components/admin/AdminDashboard';

const ensureDefaultAdmin = async () => {
  try {
    let adminUid;
    try {
      const userCred = await signInWithEmailAndPassword(secondaryAuth, 'admin@trp.srmtrichy.edu.in', 'admin123');
      adminUid = userCred.user.uid;
      await signOut(secondaryAuth);
    } catch (e) {
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, 'admin@trp.srmtrichy.edu.in', 'admin123');
      adminUid = userCred.user.uid;
      await signOut(secondaryAuth);
    }

    const adminDoc = await getDoc(doc(db, 'users', 'admin'));
    if (!adminDoc.exists()) {
      await setDoc(doc(db, 'users', 'admin'), {
        id: '1001',
        primaryKey: 'ADM01',
        uniqueId: 'ADM01',
        uid: adminUid,
        email: 'admin@trp.srmtrichy.edu.in',
        role: 'admin'
      });
    }

    // Clean up old hash doc if present
    const oldHashDoc = await getDoc(doc(db, 'users', adminUid));
    if (oldHashDoc.exists()) {
      await deleteDoc(doc(db, 'users', adminUid));
    }
  } catch (error) {
    console.error("Error setting up default admin:", error);
  }
};

export default function App() {
  const [currentView, setCurrentView] = useState('welcome');
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureDefaultAdmin();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          let data = await fetchUserProfile(currentUser);
          
          // If profile document is not found immediately (registration write in progress), retry up to 5 times
          if (!data) {
            for (let i = 0; i < 5; i++) {
              await new Promise(r => setTimeout(r, 600));
              data = await fetchUserProfile(currentUser);
              if (data) break;
            }
          }
          
          if (data) {
            setUserData(data);
            if (data.role === 'admin') {
              setCurrentView('admin-dashboard');
            } else {
              setCurrentView('student-dashboard');
            }
          } else {
            console.error("No user document found after retries!");
            signOut(auth);
            setCurrentView('welcome');
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          signOut(auth);
          setCurrentView('welcome');
        }
      } else {
        setUser(null);
        setUserData(null);
        setCurrentView('welcome');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen z-10 relative">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }

  return (
    <>
      <BackgroundCanvas />
      
      {/* Navigation Top Bar - shown when logged in */}
      {user && userData && (
        <nav className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
          <div className="font-bold text-xl text-brand-yellow font-serif">
            Community Survey <span className="text-sm font-normal text-text-secondary ml-2 font-sans">({userData.role === 'admin' ? 'Admin Portal' : 'Student Portal'})</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-text-primary hidden md:inline">{userData.email}</span>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <div className={`relative z-10 min-h-screen flex items-center justify-center p-4 ${user ? 'pt-20' : ''}`}>
        {currentView === 'welcome' && <LandingPage onViewChange={setCurrentView} />}
        {currentView === 'login' && <Login role="student" onViewChange={setCurrentView} />}
        {currentView === 'student-login' && <Login role="student" onViewChange={setCurrentView} />}
        {currentView === 'admin-login' && <Login role="admin" onViewChange={setCurrentView} />}
        {currentView === 'register' && <Register onViewChange={setCurrentView} />}
        
        {currentView === 'student-dashboard' && user && userData && (
          <StudentDashboard user={user} userData={userData} />
        )}
        
        {currentView === 'admin-dashboard' && user && userData && (
          <AdminDashboard user={user} userData={userData} />
        )}
      </div>
    </>
  );
}
