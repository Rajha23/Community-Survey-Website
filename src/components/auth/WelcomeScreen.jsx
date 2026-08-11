import React from 'react';
import { LogIn, UserPlus, Shield } from 'lucide-react';

export default function WelcomeScreen({ onViewChange }) {
  return (
    <div className="w-full max-w-md bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700/50 transform transition-all hover:scale-[1.01]">
      <div className="text-center mb-10">
        <div className="bg-brand-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/20 border border-brand-500/30">
          <Shield className="w-10 h-10 text-brand-400" />
        </div>
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500 mb-3 tracking-tight">Community Survey</h1>
        <p className="text-gray-400 text-lg">Help us shape a better tomorrow</p>
      </div>

      <div className="space-y-4">
        <button 
          onClick={() => onViewChange('student-login')}
          className="w-full group relative flex items-center justify-center px-6 py-4 bg-gray-700/50 hover:bg-brand-600 text-white rounded-xl font-semibold transition-all duration-300 overflow-hidden border border-gray-600 hover:border-brand-500 hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-400/0 via-white/10 to-brand-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <LogIn className="w-5 h-5 mr-3 text-brand-400 group-hover:text-white transition-colors" />
          <span className="relative z-10">Student Login</span>
        </button>

        <button 
          onClick={() => onViewChange('register')}
          className="w-full group relative flex items-center justify-center px-6 py-4 bg-transparent hover:bg-gray-700/50 text-brand-400 hover:text-white rounded-xl font-semibold transition-all duration-300 border border-brand-500/50 hover:border-gray-500"
        >
          <UserPlus className="w-5 h-5 mr-3" />
          <span>Create Student Account</span>
        </button>
      </div>

      <div className="mt-10 pt-6 border-t border-gray-700">
        <button 
          onClick={() => onViewChange('admin-login')}
          className="w-full flex items-center justify-center px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors border border-transparent hover:border-gray-600"
        >
          <Shield className="w-4 h-4 mr-2" />
          Admin Portal Access
        </button>
      </div>
    </div>
  );
}
