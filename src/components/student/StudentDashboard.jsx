import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Save, Send, Loader2, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { surveyQuestions } from '../../lib/surveyData';

export default function StudentDashboard({ user, userData }) {
  const [step, setStep] = useState('personal-details'); // personal-details, community-select, survey, success
  const [saving, setSaving] = useState(false);
  
  // 1. Personal Details
  const [personalDetails, setPersonalDetails] = useState({
    name: userData.name || '',
    mobile: userData.mobile || '',
    department: userData.department || '',
    year: userData.year || '',
    section: userData.section || ''
  });

  // 2. Communities
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');

  // 3. Survey
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [surveyOtherAnswers, setSurveyOtherAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 10;
  const totalPages = Math.ceil(surveyQuestions.length / questionsPerPage);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const snap = await getDocs(collection(db, 'communities'));
        const comms = [];
        snap.forEach(docSnap => {
          comms.push({ id: docSnap.id, ...docSnap.data() });
        });
        setCommunities(comms);
      } catch (err) {
        console.error("Failed to load communities:", err);
      }
    };
    fetchCommunities();
  }, []);

  const handlePdChange = (e) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setPersonalDetails({ ...personalDetails, mobile: numericValue });
    } else {
      setPersonalDetails({ ...personalDetails, [name]: value });
    }
  };

  const handlePdSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { ...personalDetails }, { merge: true });
      await setDoc(doc(db, 'personal_details', user.uid), { ...personalDetails, email: userData.email, id: userData.id }, { merge: true });
      setStep('community-select');
    } catch (err) {
      alert("Failed to save details: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCommunitySelect = (e) => {
    e.preventDefault();
    if (!selectedCommunityId) {
      alert("Please select a target community.");
      return;
    }
    setStep('survey');
  };

  const handleSurveyChange = (qId, option, type, isOtherText = false) => {
    if (isOtherText) {
      setSurveyOtherAnswers(prev => ({ ...prev, [qId]: option }));
      return;
    }

    setSurveyAnswers(prev => {
      if (type === 'radio') {
        return { ...prev, [qId]: option };
      }
      
      const current = prev[qId] || [];
      const isSelected = current.includes(option);
      
      if (isSelected) {
        return { ...prev, [qId]: current.filter(item => item !== option) };
      } else {
        const qDef = surveyQuestions.find(q => q.id === qId);
        if (current.length >= (qDef.limit || 5)) return prev;
        return { ...prev, [qId]: [...current, option] };
      }
    });
  };

  const handleSurveySubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const selectedComm = communities.find(c => c.id === selectedCommunityId);
      const finalResponses = { ...surveyAnswers };
      
      // Inject "Other" text into responses
      Object.keys(surveyOtherAnswers).forEach(qId => {
        const val = surveyOtherAnswers[qId];
        if (val) {
          const ans = finalResponses[qId];
          if (Array.isArray(ans)) {
            // It's a checkbox, replace "Other (Specify): ____" with the text if selected
            const idx = ans.findIndex(a => a.startsWith('Other'));
            if (idx !== -1) {
              ans[idx] = `Other: ${val}`;
            }
          } else if (typeof ans === 'string' && ans.startsWith('Other')) {
            finalResponses[qId] = `Other: ${val}`;
          }
        }
      });

      // The AI logic depends on communityProfile embedded in the survey object
      // We will spread selectedComm directly into it to mimic the old behaviour, minus the id.
      const cpToSave = { ...selectedComm };
      delete cpToSave.id;

      await addDoc(collection(db, 'surveys'), {
        userId: userData.id,
        userEmail: userData.email,
        communityId: selectedCommunityId,
        communityName: selectedComm?.name || '',
        date: new Date().toISOString(),
        responses: finalResponses,
        communityProfile: cpToSave
      });
      
      setStep('success');
    } catch (err) {
      alert("Error submitting survey: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const startIndex = (currentPage - 1) * questionsPerPage;
  const currentQuestions = surveyQuestions.slice(startIndex, startIndex + questionsPerPage);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 mt-10">
      
      {/* Header */}
      <div className="bg-brand-card/80 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white mb-2">Student Portal</h1>
          <p className="text-text-secondary">Welcome, <span className="text-white font-medium">{userData.name || userData.email}</span></p>
        </div>
        <div className="hidden sm:block text-right">
          <div className="text-sm text-text-muted mb-1">Register No / ID</div>
          <div className="font-mono text-brand-yellow bg-brand-yellow/10 px-3 py-1 rounded-lg border border-brand-yellow/20 inline-block">
            {userData.id}
          </div>
        </div>
      </div>

      {step === 'personal-details' && (
        <div className="bg-brand-card/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden">
          <div className="bg-brand-bg px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-serif text-white">1. Update Personal Details</h2>
          </div>
          <form onSubmit={handlePdSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Full Name *</label>
              <input required type="text" name="name" value={personalDetails.name} onChange={handlePdChange} className="w-full bg-brand-bg border border-white/10 rounded-lg px-4 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Mobile Number *</label>
              <input required type="text" pattern="[0-9]{10}" maxLength="10" title="Please enter exactly 10 digits" name="mobile" value={personalDetails.mobile} onChange={handlePdChange} className="w-full bg-brand-bg border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="10-digit number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Department *</label>
              <select required name="department" value={personalDetails.department} onChange={handlePdChange} className="w-full bg-brand-bg border border-white/10 rounded-lg px-4 py-2 text-white">
                <option value="" disabled>Select Department</option>
                <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                <option value="Artificial Intelligence and Data Science">Artificial Intelligence and Data Science</option>
                <option value="Artificial Intelligence and Machine Learning">Artificial Intelligence and Machine Learning</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics and Communication Engineering">Electronics and Communication Engineering</option>
                <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Year *</label>
              <select required name="year" value={personalDetails.year} onChange={handlePdChange} className="w-full bg-brand-bg border border-white/10 rounded-lg px-4 py-2 text-white">
                <option value="" disabled>Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Section *</label>
              <select required name="section" value={personalDetails.section} onChange={handlePdChange} className="w-full bg-brand-bg border border-white/10 rounded-lg px-4 py-2 text-white">
                <option value="" disabled>Select Section</option>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
              </select>
            </div>
            <div className="md:col-span-2 mt-4 flex justify-end">
              <button type="submit" disabled={saving} className="flex items-center px-6 py-2.5 bg-brand-yellow text-black hover:bg-[#F9EBD0] rounded-lg shadow-lg font-semibold transition-all">
                {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Continue
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'community-select' && (
        <div className="bg-brand-card/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden">
          <div className="bg-brand-bg px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-serif text-white">2. Select Target Community</h2>
          </div>
          <form onSubmit={handleCommunitySelect} className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">Community *</label>
              <select required value={selectedCommunityId} onChange={e => setSelectedCommunityId(e.target.value)} className="w-full bg-brand-bg border border-white/10 rounded-lg px-4 py-3 text-white">
                <option value="" disabled>Select Target Community</option>
                {communities.map(c => <option key={c.id} value={c.id}>{c.name} - {c.district}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => setStep('personal-details')} className="px-6 py-2.5 text-text-secondary hover:text-white transition-colors">Back</button>
              <button type="submit" className="px-6 py-2.5 bg-brand-yellow text-black rounded-lg font-semibold shadow-lg">Continue to Survey</button>
            </div>
          </form>
        </div>
      )}

      {step === 'survey' && (
        <div className="bg-brand-card/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden">
          <div className="bg-brand-bg px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-xl font-serif text-white">3. Community Survey Form</h2>
            <div className="text-sm font-mono text-brand-yellow bg-brand-yellow/10 px-3 py-1 rounded-full">
              Page {currentPage} / {totalPages}
            </div>
          </div>
          <form onSubmit={handleSurveySubmit} className="p-6">
            <div className="space-y-12">
              {currentQuestions.map((q, idx) => {
                const currentAns = surveyAnswers[q.id] || (q.type === 'checkbox' ? [] : '');
                const absoluteIdx = startIndex + idx + 1;
                
                return (
                  <div key={q.id} className="bg-brand-bg rounded-[1.5rem] p-6 border border-white/5 group hover:border-brand-yellow/30 transition-colors">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-brand-yellow/10 text-brand-yellow rounded-full flex items-center justify-center font-bold font-serif">
                        {absoluteIdx}
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-semibold text-white mb-1">{q.text.replace(/^Q\d+\.\s*/, '')}</h3>
                        {q.type === 'checkbox' && (
                          <p className="text-sm text-brand-yellow mb-4">(Select up to {q.limit})</p>
                        )}
                        
                        <div className="mt-4 space-y-3">
                          {q.options.map((opt, oIdx) => {
                            const isOther = opt.startsWith('Other');
                            const isSelectedRadio = currentAns === opt;
                            const isSelectedCheckbox = Array.isArray(currentAns) && currentAns.includes(opt);
                            const isSelected = q.type === 'radio' ? isSelectedRadio : isSelectedCheckbox;
                            
                            return (
                              <div key={oIdx}>
                                <label className="flex items-start gap-3 cursor-pointer group mb-2">
                                  <input 
                                    type={q.type}
                                    name={q.type === 'radio' ? q.id : `${q.id}-${oIdx}`}
                                    value={opt}
                                    checked={isSelected}
                                    onChange={() => handleSurveyChange(q.id, opt, q.type)}
                                    disabled={q.type === 'checkbox' && !isSelected && currentAns.length >= (q.limit || 5)}
                                    className={`mt-1 w-4 h-4 text-brand-yellow bg-gray-800 border-white/10 focus:ring-brand-yellow focus:ring-offset-gray-900 ${q.type === 'checkbox' ? 'rounded' : 'rounded-full'} disabled:opacity-50`} 
                                  />
                                  <span className="text-text-secondary group-hover:text-white transition-colors">{opt}</span>
                                </label>
                                {isOther && isSelected && (
                                  <input 
                                    type="text"
                                    required
                                    placeholder="Please specify"
                                    value={surveyOtherAnswers[q.id] || ''}
                                    onChange={(e) => handleSurveyChange(q.id, e.target.value, 'text', true)}
                                    className="ml-7 mt-2 w-full max-w-sm bg-gray-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-yellow"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center">
              <button 
                type="button" 
                disabled={currentPage === 1}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setCurrentPage(p => Math.max(1, p - 1));
                }}
                className="flex items-center px-4 py-2.5 text-white hover:text-brand-yellow transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-5 h-5 mr-1" /> Previous
              </button>

              {currentPage < totalPages ? (
                <button 
                  type="button" 
                  disabled={currentQuestions.some(q => {
                    const ans = surveyAnswers[q.id];
                    return !ans || (Array.isArray(ans) && ans.length === 0);
                  })}
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setCurrentPage(p => Math.min(totalPages, p + 1));
                  }}
                  className="flex items-center px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving || currentQuestions.some(q => {
                    const ans = surveyAnswers[q.id];
                    return !ans || (Array.isArray(ans) && ans.length === 0);
                  })}
                  className="flex items-center px-8 py-3 bg-brand-yellow text-black hover:bg-[#F9EBD0] rounded-xl shadow-lg shadow-brand-yellow/20 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <Send className="w-6 h-6 mr-3" />}
                  Submit Survey
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-brand-card/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden p-12 text-center">
          <div className="w-20 h-20 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-green">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-3xl font-serif text-white mb-4">Survey Completed!</h3>
          <p className="text-text-muted text-lg mb-8">Thank you for your valuable input. Your responses have been safely recorded.</p>
          <button 
            onClick={() => {
              setSurveyAnswers({});
              setSurveyOtherAnswers({});
              setCurrentPage(1);
              setSelectedCommunityId('');
              setStep('personal-details');
            }} 
            className="px-6 py-2.5 border border-white/20 text-white hover:bg-white/5 rounded-lg transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
