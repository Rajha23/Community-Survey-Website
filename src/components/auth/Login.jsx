import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { LogIn, ArrowLeft, Loader2 } from 'lucide-react';

export default function Login({ role, onViewChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.role !== role) {
          setError(`Invalid credentials. This portal is for ${role}s only.`);
          await auth.signOut();
        }
      } else {
        setError('User profile not found. Please contact an administrator.');
        await auth.signOut();
      }
    } catch (err) {
      let errorMessage = 'Failed to sign in.';
      switch (err.code) {
        case 'auth/invalid-credential':
          errorMessage = 'Incorrect email or password.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Try again later.';
          break;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-brand-card/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 border border-white/5 relative group hover:border-brand-yellow/30 transition-colors">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-yellow/10 transition-colors pointer-events-none"></div>
      
      <div className="flex items-center mb-8 relative z-10">
        <button 
          onClick={() => onViewChange('welcome')}
          className="p-2 mr-4 bg-white/5 hover:bg-white/10 rounded-full text-text-secondary hover:text-white transition-colors border border-white/10"
          title="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-serif text-white capitalize">{role} Login</h2>
          <p className="text-text-muted text-sm mt-1">Welcome back to the portal</p>
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
          <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-brand-bg border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent transition-all"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-brand-bg border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent transition-all"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg shadow-brand-yellow/20 text-sm font-bold text-black bg-brand-yellow hover:bg-[#F9EBD0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-yellow focus:ring-offset-brand-bg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-8 disabled:hover:scale-100"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </>
          )}
        </button>

        {role === 'student' && (
          <div className="mt-6 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <button 
              type="button"
              onClick={() => onViewChange('register')} 
              className="text-brand-yellow hover:underline font-medium"
            >
              Register here
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
