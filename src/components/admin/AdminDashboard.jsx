import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, secondaryAuth, functions } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import ProfileModal from './ProfileModal';
import { Users, FileText, UserPlus, Building, Sparkles, Loader2, Trash2 } from 'lucide-react';

export default function AdminDashboard({ user, userData }) {
  const [activeTab, setActiveTab] = useState('profiles');
  const [profiles, setProfiles] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [surveyRecords, setSurveyRecords] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newUserRole, setNewUserRole] = useState('student');
  const [userViewFilter, setUserViewFilter] = useState('students'); // 'students' or 'admins'

  // Community Creation
  const [showCommunityForm, setShowCommunityForm] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '', district: '', panchayat: '', population: '', respondents: '', studentsInvolved: '',
    occupation: '', crops: '', schools: '', phc: '', waterBodies: '', majorIssues: ''
  });

  // AI Intelligence
  const [aiCommunityId, setAiCommunityId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiData, setAiData] = useState(null);
  const [selectedAiSurveys, setSelectedAiSurveys] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected surveys whenever the aiCommunityId changes
  useEffect(() => {
    if (aiCommunityId) {
      const commSurveys = surveyRecords.filter(s => s.communityId === aiCommunityId);
      // Auto-select all by default
      setSelectedAiSurveys(commSurveys.map(s => s.id));
      setAiData(null);
      setAiError('');
    } else {
      setSelectedAiSurveys([]);
    }
  }, [aiCommunityId, surveyRecords]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Fetch Profiles
      const pSnap = await getDocs(collection(db, 'users'));
      const pData = [];
      pSnap.forEach(d => pData.push({ uid: d.id, ...d.data() }));
      setProfiles(pData);

      // Fetch Communities
      const cSnap = await getDocs(collection(db, 'communities'));
      const cData = [];
      cSnap.forEach(d => cData.push({ id: d.id, ...d.data() }));
      setCommunities(cData);

      // Fetch Survey Records
      const sSnap = await getDocs(collection(db, 'surveys'));
      const sData = [];
      sSnap.forEach(d => sData.push({ id: d.id, ...d.data() }));
      setSurveyRecords(sData);

    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCommunityChange = (e) => {
    setNewCommunity({ ...newCommunity, [e.target.name]: e.target.value });
  };

  const handleAddCommunity = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'communities'), newCommunity);
      setNewCommunity({
        name: '', district: '', panchayat: '', population: '', respondents: '', studentsInvolved: '',
        occupation: '', crops: '', schools: '', phc: '', waterBodies: '', majorIssues: ''
      });
      setShowCommunityForm(false);
      fetchData();
    } catch (err) {
      alert("Error adding community: " + err.message);
    }
  };

  const handleDeleteCommunity = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the community "${name}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'communities', id));
        fetchData();
        if (aiCommunityId === id) setAiCommunityId('');
      } catch (err) {
        alert("Error deleting community: " + err.message);
      }
    }
  };

  const triggerAiAnalysis = async (type, referenceId) => {
    setActiveTab('ai-intelligence');
    setAiLoading(true);
    setAiError('');
    setAiData(null);

    try {
      let submissions = [];
      
      if (type === 'individual') {
        const q = query(collection(db, 'surveys'), where('userId', '==', referenceId));
        const snap = await getDocs(q);
        snap.forEach(d => submissions.push(d.data()));
      } else {
        if (selectedAiSurveys.length === 0) {
          throw new Error("Please select at least one survey record for analysis.");
        }
        submissions = surveyRecords
          .filter(s => selectedAiSurveys.includes(s.id))
          .map(s => {
            // Re-create the object to pass clean data to the cloud function
            // just to be safe, omitting any UI specific states.
            const clean = { ...s };
            delete clean.id; // not strictly necessary but keeps it clean
            return clean;
          });
      }

      if (submissions.length === 0) {
        throw new Error("No survey records found for this selection.");
      }

      const generateAiAnalysis = httpsCallable(functions, 'generateAiAnalysis');
      const result = await generateAiAnalysis({
        submissions,
        analysisType: type,
        referenceId: referenceId
      });

      setAiData(result.data);
    } catch (err) {
      setAiError(err.message || 'An unknown error occurred.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderAiSurveysList = () => {
    if (!aiCommunityId) return null;
    
    const commSurveys = surveyRecords.filter(s => s.communityId === aiCommunityId);
    if (commSurveys.length === 0) return (
      <div className="text-text-muted text-sm mt-4">No survey records available for this community.</div>
    );

    const allSelected = selectedAiSurveys.length === commSurveys.length;
    const someSelected = selectedAiSurveys.length > 0 && !allSelected;

    const handleSelectAll = (e) => {
      if (e.target.checked) {
        setSelectedAiSurveys(commSurveys.map(s => s.id));
      } else {
        setSelectedAiSurveys([]);
      }
    };

    const handleSelectOne = (id, checked) => {
      if (checked) {
        setSelectedAiSurveys(prev => [...prev, id]);
      } else {
        setSelectedAiSurveys(prev => prev.filter(sId => sId !== id));
      }
    };

    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8 shadow-lg">
        <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
          <h3 className="text-white font-serif text-lg">Select Surveys for Analysis</h3>
          <span className="text-brand-yellow text-sm font-mono">{selectedAiSurveys.length} / {commSurveys.length} selected</span>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm text-white">
            <thead className="text-text-muted border-b border-white/10 uppercase font-mono bg-black/10 sticky top-0">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={allSelected}
                    ref={input => { if (input) input.indeterminate = someSelected; }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-brand-green bg-gray-800 border-white/10 rounded focus:ring-brand-green"
                  />
                </th>
                <th className="py-3 pr-4">Student</th>
                <th className="py-3 pr-4">Date Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {commSurveys.map(s => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => handleSelectOne(s.id, !selectedAiSurveys.includes(s.id))}>
                  <td className="py-2 px-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedAiSurveys.includes(s.id)}
                      onChange={(e) => { e.stopPropagation(); handleSelectOne(s.id, e.target.checked); }}
                      className="w-4 h-4 text-brand-green bg-gray-800 border-white/10 rounded focus:ring-brand-green"
                    />
                  </td>
                  <td className="py-2 pr-4">{s.userId} <span className="text-text-muted text-xs ml-2">({s.userEmail})</span></td>
                  <td className="py-2 pr-4 text-text-secondary">{new Date(s.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAiContent = () => {
    if (aiLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-yellow animate-spin mb-4" />
          <h3 className="text-xl text-white font-serif">Analyzing Data with Gemini AI...</h3>
          <p className="text-text-muted mt-2">Preparing survey data and generating insights.</p>
        </div>
      );
    }

    if (aiError) {
      return (
        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 text-center mt-6">
          <h3 className="text-red-400 font-bold text-2xl mb-2">AI Analysis Failed</h3>
          <p className="text-white text-lg">Reason: {aiError}</p>
        </div>
      );
    }

    if (aiData) {
      const cp = aiData._communityProfile;
      return (
        <div className="space-y-6 mt-6">
          {cp && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-brand-green/20 px-6 py-4 border-b border-white/10">
                <h4 className="text-brand-green font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Community Profile Snapshot
                </h4>
              </div>
              <table className="w-full text-left text-sm text-white">
                <tbody className="divide-y divide-white/5">
                  <tr><td className="py-3 px-6 text-text-secondary w-1/3">Name</td><td className="py-3 px-6">{cp.name}</td></tr>
                  <tr><td className="py-3 px-6 text-text-secondary">District</td><td className="py-3 px-6">{cp.district}</td></tr>
                  <tr><td className="py-3 px-6 text-text-secondary">Population</td><td className="py-3 px-6">{cp.population}</td></tr>
                  <tr><td className="py-3 px-6 text-text-secondary">Major Issues</td><td className="py-3 px-6 text-brand-yellow">{cp.majorIssues}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h4 className="text-text-muted text-sm uppercase font-mono mb-2">Community Profile</h4>
              <div className="text-white text-sm" dangerouslySetInnerHTML={{ __html: aiData.communityProfile?.description }} />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:col-span-2">
              <h4 className="text-text-muted text-sm uppercase font-mono mb-2">Priority Index (CPI)</h4>
              <div className="text-white text-sm" dangerouslySetInnerHTML={{ __html: aiData.communityPriorityIndex }} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h4 className="text-text-muted text-sm uppercase font-mono mb-2">Stakeholder Map</h4>
              <div className="text-white text-sm" dangerouslySetInnerHTML={{ __html: aiData.stakeholderMap }} />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h4 className="text-text-muted text-sm uppercase font-mono mb-2">Empathy Map</h4>
              <div className="text-white text-sm" dangerouslySetInnerHTML={{ __html: aiData.empathyMap }} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="py-20 text-center text-text-muted">
        Select a community and click "Generate AI Analysis" to begin.
      </div>
    );
  };

  const renderSurveys = () => {
    // Group surveys by communityName
    const groupedSurveys = {};
    surveyRecords.forEach(s => {
      const commName = s.communityName || 'Unknown Community';
      if (!groupedSurveys[commName]) groupedSurveys[commName] = [];
      groupedSurveys[commName].push(s);
    });

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif text-white">Survey Submissions by Community</h2>
        </div>
        
        {Object.keys(groupedSurveys).length === 0 ? (
          <p className="text-text-secondary text-sm">No survey submissions yet.</p>
        ) : (
          Object.entries(groupedSurveys).map(([commName, records]) => (
            <div key={commName} className="mb-8 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-brand-green/20 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-brand-green font-bold text-lg">{commName}</h3>
                <span className="text-brand-green text-sm">{records.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-white">
                  <thead className="text-text-muted border-b border-white/10 uppercase font-mono">
                    <tr>
                      <th className="pb-3 pt-3 pl-6 pr-4">Date</th>
                      <th className="pb-3 pt-3 pr-4">Student</th>
                      <th className="pb-3 pt-3 pr-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {records.map(s => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 pl-6 pr-4">{new Date(s.date).toLocaleDateString()}</td>
                        <td className="py-3 pr-4">{s.userId} <br/><span className="text-xs text-text-muted">{s.userEmail}</span></td>
                        <td className="py-3 pr-6 flex justify-end">
                          <button onClick={() => triggerAiAnalysis('individual', s.userId)} className="text-brand-green hover:underline flex items-center text-xs border border-brand-green/30 px-2 py-1 rounded bg-brand-green/10">
                            <Sparkles className="w-3 h-3 mr-1" /> AI Analyze
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 mt-10">
      <div className="flex gap-4 border-b border-white/5 pb-2 overflow-x-auto">
        <button onClick={() => setActiveTab('profiles')} className={`whitespace-nowrap flex items-center px-4 py-2 font-semibold ${activeTab === 'profiles' ? 'text-brand-yellow border-b-2 border-brand-yellow' : 'text-text-secondary'}`}><Users className="w-5 h-5 mr-2" /> Profiles</button>
        <button onClick={() => setActiveTab('communities')} className={`whitespace-nowrap flex items-center px-4 py-2 font-semibold ${activeTab === 'communities' ? 'text-brand-yellow border-b-2 border-brand-yellow' : 'text-text-secondary'}`}><Building className="w-5 h-5 mr-2" /> Communities</button>
        <button onClick={() => setActiveTab('surveys')} className={`whitespace-nowrap flex items-center px-4 py-2 font-semibold ${activeTab === 'surveys' ? 'text-brand-yellow border-b-2 border-brand-yellow' : 'text-text-secondary'}`}><FileText className="w-5 h-5 mr-2" /> Survey Records</button>
        <button onClick={() => setActiveTab('ai-intelligence')} className={`whitespace-nowrap flex items-center px-4 py-2 font-semibold ${activeTab === 'ai-intelligence' ? 'text-brand-green border-b-2 border-brand-green' : 'text-text-secondary'}`}><Sparkles className="w-5 h-5 mr-2" /> AI Intelligence</button>
      </div>

      <div className="bg-brand-card/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-6">
        {loadingData ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-brand-yellow animate-spin" /></div>
        ) : (
          <>
            {activeTab === 'profiles' && (
              <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-serif text-white">Registered Users</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-black/50 border border-white/10 rounded-lg p-1 flex">
                      <button 
                        onClick={() => setUserViewFilter('students')}
                        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${userViewFilter === 'students' ? 'bg-white/10 text-white shadow-sm' : 'text-text-secondary hover:text-white'}`}
                      >
                        Students
                      </button>
                      <button 
                        onClick={() => setUserViewFilter('admins')}
                        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${userViewFilter === 'admins' ? 'bg-white/10 text-white shadow-sm' : 'text-text-secondary hover:text-white'}`}
                      >
                        Admins
                      </button>
                    </div>
                    {userViewFilter === 'admins' ? (
                      <button onClick={() => { setSelectedProfile(null); setNewUserRole('admin'); setIsProfileModalOpen(true); }} className="px-4 py-2 bg-brand-yellow text-black rounded-lg font-semibold flex items-center text-sm">
                        <UserPlus className="w-4 h-4 mr-2" /> Add Admin
                      </button>
                    ) : (
                      <button onClick={() => { setSelectedProfile(null); setNewUserRole('student'); setIsProfileModalOpen(true); }} className="px-4 py-2 bg-brand-yellow text-black rounded-lg font-semibold flex items-center text-sm">
                        <UserPlus className="w-4 h-4 mr-2" /> Add Student
                      </button>
                    )}
                  </div>
                </div>

                {userViewFilter === 'admins' ? (
                  <div className="overflow-x-auto mb-10">
                    <table className="w-full text-left text-sm text-white">
                      <thead className="text-text-muted border-b border-white/10 uppercase font-mono">
                        <tr><th className="pb-3 pr-4">ID / Reg No</th><th className="pb-3 pr-4">Email</th><th className="pb-3 pr-4">Role</th><th className="pb-3 pr-4">Name</th><th className="pb-3 text-right">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {profiles.filter(p => p.role === 'admin').map(p => (
                          <tr key={p.uid} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 pr-4">{p.id || p.uid.substring(0,6)}</td>
                            <td className="py-3 pr-4">{p.email}</td>
                            <td className="py-3 pr-4"><span className="px-2 py-1 rounded text-xs bg-brand-green/20 text-brand-green">admin</span></td>
                            <td className="py-3 pr-4">{p.name || '-'}</td>
                            <td className="py-3 text-right"><button onClick={() => { setSelectedProfile(p); setIsProfileModalOpen(true); }} className="text-brand-yellow hover:underline">Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-white">
                      <thead className="text-text-muted border-b border-white/10 uppercase font-mono">
                        <tr><th className="pb-3 pr-4">Reg No</th><th className="pb-3 pr-4">Email</th><th className="pb-3 pr-4">Role</th><th className="pb-3 pr-4">Name</th><th className="pb-3 text-right">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {profiles.filter(p => p.role !== 'admin').map(p => (
                          <tr key={p.uid} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 pr-4">{p.id || p.uid.substring(0,6)}</td>
                            <td className="py-3 pr-4">{p.email}</td>
                            <td className="py-3 pr-4"><span className="px-2 py-1 rounded text-xs bg-white/10 text-white">student</span></td>
                            <td className="py-3 pr-4">{p.name || '-'}</td>
                            <td className="py-3 text-right"><button onClick={() => { setSelectedProfile(p); setIsProfileModalOpen(true); }} className="text-brand-yellow hover:underline">Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'communities' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-serif text-white">Target Communities</h2>
                  <button onClick={() => setShowCommunityForm(!showCommunityForm)} className="px-4 py-2 bg-brand-yellow text-black rounded-lg font-semibold flex items-center">
                    <Building className="w-4 h-4 mr-2" /> Add Community
                  </button>
                </div>
                
                {showCommunityForm && (
                  <form onSubmit={handleAddCommunity} className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-8 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4">Create New Community</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm text-text-secondary mb-1">Name *</label><input required name="name" value={newCommunity.name} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">District *</label><input required name="district" value={newCommunity.district} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Panchayat / Town *</label><input required name="panchayat" value={newCommunity.panchayat} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Total Population *</label><input type="number" required name="population" value={newCommunity.population} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Number of Respondents *</label><input type="number" required name="respondents" value={newCommunity.respondents} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Students Involved *</label><input type="number" required name="studentsInvolved" value={newCommunity.studentsInvolved} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Primary Occupation *</label><input required name="occupation" value={newCommunity.occupation} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Major Crops (if any) *</label><input required name="crops" value={newCommunity.crops} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Number of Schools *</label><input type="number" required name="schools" value={newCommunity.schools} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Primary Health Centres *</label><input type="number" required name="phc" value={newCommunity.phc} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div><label className="block text-sm text-text-secondary mb-1">Major Water Bodies *</label><input required name="waterBodies" value={newCommunity.waterBodies} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" /></div>
                      <div className="md:col-span-2"><label className="block text-sm text-text-secondary mb-1">Major Issues Identified (Brief) *</label><textarea required name="majorIssues" value={newCommunity.majorIssues} onChange={handleCommunityChange} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white h-20" /></div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button type="button" onClick={() => setShowCommunityForm(false)} className="px-6 py-2.5 text-text-secondary hover:text-white transition-colors">Cancel</button>
                      <button type="submit" className="px-6 py-2.5 bg-brand-green text-black font-bold rounded-lg shadow-lg">Save Community</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-white">
                    <thead className="text-text-muted border-b border-white/10 uppercase font-mono">
                      <tr><th className="pb-3 pr-4">Community Name</th><th className="pb-3 pr-4">District</th><th className="pb-3 pr-4">Population</th><th className="pb-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {communities.map(c => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 pr-4 font-medium">{c.name}</td>
                          <td className="py-3 pr-4 text-text-secondary">{c.district}</td>
                          <td className="py-3 pr-4 text-text-secondary">{c.population || '-'}</td>
                          <td className="py-3 text-right">
                            <button onClick={() => handleDeleteCommunity(c.id, c.name)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded transition-colors inline-flex items-center" title="Delete Community">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'surveys' && renderSurveys()}

            {activeTab === 'ai-intelligence' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-8">
                  <div className="w-full max-w-sm">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Analyze Community</label>
                    <select value={aiCommunityId} onChange={e => setAiCommunityId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green">
                      <option value="" disabled>Select a community to analyze</option>
                      {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {aiCommunityId && (
                    <button 
                      onClick={() => triggerAiAnalysis('community', aiCommunityId)} 
                      disabled={selectedAiSurveys.length === 0}
                      className="px-6 py-3 bg-brand-green text-black font-bold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-5 h-5" /> Generate AI Analysis
                    </button>
                  )}
                </div>
                
                {renderAiSurveysList()}
                {renderAiContent()}
              </div>
            )}
          </>
        )}
      </div>

      {isProfileModalOpen && (
        <ProfileModal
          profile={selectedProfile}
          newUserRole={newUserRole}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
