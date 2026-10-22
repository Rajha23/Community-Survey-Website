import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { getNextUserPrimaryKey } from '../../lib/userService';
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react';

export default function Register({ onViewChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regId, setRegId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRegId = (regId || '').trim();

    if (!cleanEmail || !cleanRegId) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // 1. Check if Register ID is already in use
      const qId = query(collection(db, 'users'), where('id', '==', cleanRegId));
      const querySnapshot = await getDocs(qId);
      if (!querySnapshot.empty) {
        setError('This Register Number is already in use.');
        setLoading(false);
        return;
      }

      // 2. Pre-fetch the next primary key (U086...) BEFORE creating user so setDoc is instant
      const newPrimaryKey = await getNextUserPrimaryKey();

      // 3. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      
      // 4. Save user profile with sequential primary key
      await setDoc(doc(db, 'users', newPrimaryKey), {
        primaryKey: newPrimaryKey,
        uniqueId: newPrimaryKey,
        uid: user.uid,
        id: cleanRegId,
        email: cleanEmail,
        role: 'student',
        createdAt: new Date().toISOString()
      });
      
      // onAuthStateChanged in App.js will handle the view change automatically
    } catch (err) {
      console.error("Registration error:", err);
      let errorMessage = err.message || 'Failed to register.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please go to Login instead.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-brand-card/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 border border-white/5 relative group hover:border-brand-green/30 transition-colors">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-green/10 transition-colors pointer-events-none"></div>
      
      <div className="flex items-center mb-8 relative z-10">
        <button 
          onClick={() => onViewChange('welcome')}
          className="p-2 mr-4 bg-white/5 hover:bg-white/10 rounded-full text-text-secondary hover:text-white transition-colors border border-white/10"
          title="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-serif text-white">Create Account</h2>
          <p className="text-text-muted text-sm mt-1">Join the community portal</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 flex items-start text-sm relative z-10">
          <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Email Address <span className="text-red-500">*</span></label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-brand-bg border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all"
            placeholder="Enter your email address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Register Number / ID <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={regId}
            onChange={(e) => setRegId(e.target.value)}
            className="w-full px-4 py-3 bg-brand-bg border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all"
            placeholder="e.g. 814421104033"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Password <span className="text-red-500">*</span></label>
          <input
            type="password"
            required
            minLength="6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-brand-bg border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all"
            placeholder="Create a strong password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Confirm Password <span className="text-red-500">*</span></label>
          <input
            type="password"
            required
            minLength="6"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-brand-bg border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all"
            placeholder="Confirm your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg shadow-brand-green/20 text-sm font-bold text-black bg-brand-green hover:bg-[#86efac] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green focus:ring-offset-brand-bg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-8 disabled:hover:scale-100"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5 mr-2" />
              Create Student Account
            </>
          )}
        </button>
      </form>
    </div>
  );
}
