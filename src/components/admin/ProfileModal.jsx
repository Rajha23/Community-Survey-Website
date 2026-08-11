import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from '../../lib/firebase';
import { X, Save, Loader2, UserPlus } from 'lucide-react';

export default function ProfileModal({ profile, newUserRole, onClose, onSave }) {
  const isNew = !profile;
  const initialRole = isNew ? newUserRole : (profile?.role || 'student');

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    id: profile?.id || '',
    email: profile?.email || '',
    password: '', // Only used for new users
    year: profile?.year || '',
    department: profile?.department || '',
    section: profile?.section || '',
    role: initialRole
  });
  
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let uid = profile?.uid;

      // If creating a new user, we must register them with Firebase Auth first
      if (isNew) {
        if (!formData.password || formData.password.length < 6) {
          alert("Please provide a password of at least 6 characters.");
          setSaving(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        uid = userCredential.user.uid;
      }

      // Now create/update Firestore documents
      await setDoc(doc(db, 'personal_details', uid), {
        name: formData.name,
        id: formData.id,
        email: formData.email,
        year: formData.year,
        department: formData.department,
        section: formData.section
      }, { merge: true });

      await setDoc(doc(db, 'users', uid), {
        name: formData.name,
        id: formData.id,
        email: formData.email,
        role: formData.role
      }, { merge: true });

      onSave();
    } catch (err) {
      console.error("Failed to save profile", err);
      alert("Failed to save profile details: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-brand-card rounded-[2rem] border border-white/5 shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-brand-bg">
          <h2 className="text-xl font-serif font-bold text-white flex items-center">
            {isNew ? (
              <><UserPlus className="w-5 h-5 mr-2 text-brand-yellow" /> Create New {formData.role === 'admin' ? 'Admin' : 'Student'}</>
            ) : (
              `Edit Profile: ${formData.email}`
            )}
          </h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Full Name</label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">College ID</label>
              <input
                required
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              />
            </div>
            
            <div className={isNew ? "md:col-span-1" : "md:col-span-2"}>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
              <input
                required
                type="email"
                name="email"
                disabled={!isNew}
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow ${!isNew ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            {isNew && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
                <input
                  required={isNew}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Year of Study</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              >
                <option value="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              >
                <option value="">Select Department</option>
                <option value="Artificial Intelligence and Data Science">Artificial Intelligence and Data Science</option>
                <option value="Artificial Intelligence and Machine Learning">Artificial Intelligence and Machine Learning</option>
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Section</label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              >
                <option value="">Select Section</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Role (Locked)</label>
              <input
                type="text"
                disabled
                value={formData.role}
                className="w-full bg-brand-bg/50 border border-white/5 rounded-xl px-4 py-3 text-text-muted capitalize cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-text-secondary hover:text-white mr-4 border border-transparent rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-6 py-2.5 bg-brand-yellow text-black hover:bg-[#F9EBD0] rounded-xl font-semibold transition-all shadow-lg shadow-brand-yellow/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
              {isNew ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
