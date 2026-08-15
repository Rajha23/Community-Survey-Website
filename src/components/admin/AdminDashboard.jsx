import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { auth, db, secondaryAuth } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import ProfileModal from './ProfileModal';
import { Users, FileText, UserPlus, Building, Sparkles, Loader2, Trash2, Calendar } from 'lucide-react';
import { surveyQuestions } from '../../lib/surveyData';
import { generateClientSideAnalysis } from '../../lib/geminiAnalysis';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#00E5FF', '#FFB800', '#FF3366', '#00E5FF80', '#FFB80080', '#FF336680'];

const AI_TOPICS = [
  { id: 'graphicalData', label: 'Statistical Charts (Graphs)' },
  { id: 'stakeholderMap', label: 'Stakeholder Map' },
  { id: 'empathyMap', label: 'Empathy Map' },
  { id: 'journeyMap', label: 'Journey Map' },
  { id: 'communityAssetMap', label: 'Community Asset Map' },
  { id: 'problemTree', label: 'Problem Tree Analysis' },
  { id: 'affinityDiagram', label: 'Affinity Diagram Themes' },
  { id: 'howMightWeStatements', label: '"How Might We" Statements' },
  { id: 'priorityMatrix', label: 'Priority Matrix' },
  { id: 'sdgMapping', label: 'SDG Mapping' },
  { id: 'communityPriorityIndex', label: 'Priority Index (CPI)' },
  { id: 'implementationRoadmap', label: 'Implementation Roadmap' },
  { id: 'impactAssessment', label: 'Impact Assessment' }
];

export default function AdminDashboard({ user, userData }) {
  const [activeTab, setActiveTab] = useState('profiles');
  const [profiles, setProfiles] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [surveyRecords, setSurveyRecords] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedSurveyView, setSelectedSurveyView] = useState(null);
  const [surveyDateFilter, setSurveyDateFilter] = useState('');
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
  const [aiProgressText, setAiProgressText] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiData, setAiData] = useState(null);
  const [selectedAiSurveys, setSelectedAiSurveys] = useState([]);
  const [selectedAiTopics, setSelectedAiTopics] = useState([]);

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

    if (selectedAiTopics.length === 0) {
      setAiError("Please select at least one Analysis Topic from the list.");
      setAiLoading(false);
      return;
    }

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

      // Chunking logic (bypassing Vercel allows us to process all topics in one request to avoid Google API Rate Limits)
      const chunkSize = 15;
      const chunks = [];
      for (let i = 0; i < selectedAiTopics.length; i += chunkSize) {
        chunks.push(selectedAiTopics.slice(i, i + chunkSize));
      }

      let mergedData = null;
      let completedTopics = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setAiProgressText(`Generating ${completedTopics + 1} to ${Math.min(completedTopics + chunk.length, selectedAiTopics.length)} of ${selectedAiTopics.length} topics...`);
        
        let success = false;
        let retries = 4; // 5 total attempts
        let delay = 3000;
        while (!success && retries >= 0) {
          try {
            // Client-side AI generation - bypasses Vercel 10s timeout
            const resultData = await generateClientSideAnalysis({
              analysisType: type,
              referenceId: referenceId,
              communityData: type === 'community' ? communities.find(c => c.id === referenceId) : null,
              submissions,
              selectedTopics: chunk
            });

            if (!mergedData) {
              mergedData = resultData;
            } else {
              // Merge object fields
              mergedData = { ...mergedData, ...resultData };
            }
            
            // Update UI progressively
            setAiData({ ...mergedData });
            success = true;
          } catch (e) {
            // Check if it's a transient Google API error or a Vercel 504 Timeout
            if (e.message.includes('demand') || e.message.includes('503') || e.message.includes('timeout') || e.message.includes('Rate Limit') || e.message.includes('UNAVAILABLE')) {
              retries--;
              if (retries < 0) throw e;
              const isRateLimit = e.message.includes('Rate Limit');
              setAiProgressText(`${isRateLimit ? 'Rate limit reached (15/min).' : 'Google servers busy.'} Retrying in ${Math.round(delay/1000)}s... (${retries + 1} attempts left)`);
              await new Promise(r => setTimeout(r, delay));
              delay = Math.min(delay * 1.5, 10000); // exponential backoff, max 10s
            } else {
              throw e;
            }
          }
        }
        completedTopics += chunk.length;
      }
      setAiProgressText('Analysis Complete!');
      setTimeout(() => setAiProgressText(''), 2000);
    } catch (err) {
      setAiError(err.message || 'An unknown error occurred.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderTopicSelector = () => {
    if (!aiCommunityId) return null;
    return (
      <div className="mb-8 p-6 bg-black/40 border border-white/10 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Select Analysis Topics</h3>
          <button 
            onClick={() => setSelectedAiTopics(selectedAiTopics.length === AI_TOPICS.length ? [] : AI_TOPICS.map(t => t.id))}
            className="text-sm text-brand-green hover:text-brand-yellow transition-colors"
          >
            {selectedAiTopics.length === AI_TOPICS.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {AI_TOPICS.map(topic => {
            const isSelected = selectedAiTopics.includes(topic.id);
            return (
              <button
                key={topic.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedAiTopics(selectedAiTopics.filter(id => id !== topic.id));
                  } else {
                    setSelectedAiTopics([...selectedAiTopics, topic.id]);
                  }
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  isSelected 
                    ? 'bg-brand-green/20 text-brand-green border-brand-green/50' 
                    : 'bg-white/5 text-text-muted border-white/10 hover:bg-white/10'
                }`}
              >
                {topic.label}
              </button>
            );
          })}
        </div>
      </div>
    );
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
          <p className="text-text-muted mt-2">{aiProgressText || 'Preparing survey data and generating insights.'}</p>
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

          {aiData.graphicalData && aiData.graphicalData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {aiData.graphicalData.map((chart, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                  <h4 className="text-text-muted text-sm uppercase font-mono mb-4 text-center">{chart.title}</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === 'bar' ? (
                        <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: '#00E5FF' }}
                          />
                          <Bar dataKey="value" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={chart.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chart.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', color: '#a3a3a3' }} />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {aiData.communityProfile && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Community Profile</h4>
                <p className="text-white text-sm mb-4">{aiData.communityProfile.description}</p>
                <div className="text-brand-yellow text-sm">
                  <strong>Major Issues:</strong> {(aiData.communityProfile.majorIssues || []).join(', ')}
                </div>
              </div>
            )}
            
            {aiData.communityPriorityIndex && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:col-span-2">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-6">Priority Index (CPI)</h4>
                <div className="space-y-5">
                  {(aiData.communityPriorityIndex || []).map((item, i) => {
                    const isCritical = item.score > 80;
                    const isHigh = item.score > 50;
                    const barColor = isCritical ? 'bg-red-500' : isHigh ? 'bg-brand-yellow' : 'bg-brand-green';
                    
                    return (
                      <div key={i} className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-white bg-black/40 border border-white/10">
                              {item.problem}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold inline-block text-white">
                              {item.score}%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-white/10">
                          <div style={{ width: `${item.score}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${barColor}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiData.stakeholderMap && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Stakeholder Map</h4>
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="bg-brand-yellow/10 border border-brand-yellow/20 rounded-xl p-4">
                    <h5 className="text-brand-yellow font-bold text-sm mb-3">★ High Power, High Interest</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-white/90">
                      {(aiData.stakeholderMap.highHigh || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <h5 className="text-blue-400 font-bold text-sm mb-3">👀 High Power, Low Interest</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-white/90">
                      {(aiData.stakeholderMap.highLow || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4">
                    <h5 className="text-brand-green font-bold text-sm mb-3">🤝 Low Power, High Interest</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-white/90">
                      {(aiData.stakeholderMap.lowHigh || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4">
                    <h5 className="text-gray-400 font-bold text-sm mb-3">ℹ️ Low Power, Low Interest</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-white/90">
                      {(aiData.stakeholderMap.lowLow || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {aiData.empathyMap && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Empathy Map</h4>
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h5 className="text-white font-bold text-sm mb-3">💬 Says</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-white/70">
                      {(aiData.empathyMap.says || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h5 className="text-white font-bold text-sm mb-3">💭 Thinks</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-white/70">
                      {(aiData.empathyMap.thinks || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h5 className="text-white font-bold text-sm mb-3">🏃 Does</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-white/70">
                      {(aiData.empathyMap.does || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h5 className="text-white font-bold text-sm mb-3">❤️ Feels</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-white/70">
                      {(aiData.empathyMap.feels || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* New Additions */}
          
          {aiData.journeyMap && (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Journey Map</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-white">
                    <thead className="text-xs text-text-muted uppercase border-b border-white/10 bg-black/20">
                      <tr>
                        <th className="py-3 px-4 rounded-tl-lg">Stage</th>
                        <th className="py-3 px-4">Experience</th>
                        <th className="py-3 px-4">Pain Point</th>
                        <th className="py-3 px-4 rounded-tr-lg">Opportunity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(aiData.journeyMap || []).map((jm, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-bold text-brand-yellow whitespace-nowrap">{jm.stage}</td>
                          <td className="py-4 px-4">{jm.experience}</td>
                          <td className="py-4 px-4 text-red-300">{jm.painPoint}</td>
                          <td className="py-4 px-4 text-brand-green">{jm.opportunity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiData.communityAssetMap && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Community Asset Map</h4>
                <div className="space-y-4">
                  {Object.entries(aiData.communityAssetMap || {}).map(([key, items]) => (
                    <div key={key}>
                      <h5 className="text-white font-bold text-sm mb-2 capitalize">{key} Assets</h5>
                      <div className="flex flex-wrap gap-2">
                        {(items || []).map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-white/10 rounded-md text-xs text-white/80">{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiData.problemTree && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Problem Tree Analysis</h4>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-center">
                  <h5 className="text-red-400 font-bold text-sm mb-1">Core Problem</h5>
                  <p className="text-white">{aiData.problemTree.mainProblem}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <h5 className="text-text-muted font-bold text-sm mb-3 text-center uppercase tracking-wider">Causes (Roots)</h5>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(aiData.problemTree.causes || []).map((c, i) => (
                        <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/90 border border-white/5">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                    <h5 className="text-text-muted font-bold text-sm mb-3 text-center uppercase tracking-wider">Effects (Branches)</h5>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(aiData.problemTree.effects || []).map((e, i) => (
                        <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/90 border border-white/5">{e}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiData.affinityDiagram && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Affinity Diagram Themes</h4>
                <div className="space-y-4">
                  {(aiData.affinityDiagram || []).map((ad, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h5 className="text-brand-yellow font-bold text-sm mb-2">{ad.theme}</h5>
                      <ul className="list-disc pl-4 space-y-1 text-sm text-white/80">
                        {(ad.insights || []).map((insight, i) => <li key={i}>{insight}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(aiData.howMightWeStatements || aiData.priorityMatrix) && (
              <div className="space-y-6">
                {aiData.howMightWeStatements && (
                  <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-2xl p-6 shadow-lg shadow-brand-yellow/5">
                    <h4 className="text-brand-yellow text-sm uppercase font-bold font-mono mb-4">"How Might We" Statements</h4>
                    <ul className="space-y-3">
                      {(aiData.howMightWeStatements || []).map((hmw, i) => (
                        <li key={i} className="flex gap-3 items-start text-white/90">
                          <span className="text-brand-yellow mt-0.5">✨</span>
                          <span>{hmw}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiData.priorityMatrix && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Priority Matrix (Impact x Feasibility)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-white">
                        <thead className="text-xs text-text-muted uppercase border-b border-white/10 bg-black/20">
                          <tr>
                            <th className="py-2 px-3">Project</th>
                            <th className="py-2 px-3 text-center">Impact (1-5)</th>
                            <th className="py-2 px-3 text-center">Feas. (1-5)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(aiData.priorityMatrix || []).map((pm, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="py-3 px-3 font-medium">{pm.project}</td>
                              <td className="py-3 px-3 text-center text-brand-green font-bold">{pm.impact}</td>
                              <td className="py-3 px-3 text-center text-blue-400 font-bold">{pm.feasibility}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {aiData.sdgMapping && (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">SDG Mapping Dashboard</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {(aiData.sdgMapping || []).map((sdg, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-white text-sm pr-2">{sdg.sdg}</h5>
                        <span className="text-xl font-black text-brand-green">{sdg.score}</span>
                      </div>
                      <div className="overflow-hidden h-1.5 mb-3 text-xs flex rounded bg-white/10">
                        <div style={{ width: `${sdg.score}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-brand-green"></div>
                      </div>
                      <p className="text-xs text-white/70 italic">"{sdg.reason}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiData.implementationRoadmap && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Implementation Roadmap</h4>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/20 before:to-transparent">
                  {(aiData.implementationRoadmap || []).map((rm, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-900 group-[.is-active]:bg-brand-green text-slate-500 group-[.is-active]:text-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                        <span className="font-bold text-sm">{i+1}</span>
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-white/5 shadow">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-brand-yellow text-sm">{rm.month}</div>
                        </div>
                        <div className="text-white/80 text-sm">{rm.activity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiData.impactAssessment && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-text-muted text-sm uppercase font-mono mb-4">Before-and-After Impact Assessment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(aiData.impactAssessment || []).map((impact, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
                      <h5 className="font-bold text-white text-sm mb-4 text-center">{impact.metric}</h5>
                      <div className="flex justify-between items-center px-4">
                        <div className="text-center">
                          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Baseline</p>
                          <p className="text-xl font-black text-red-400">{impact.baseline}</p>
                        </div>
                        <div className="text-white/20">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Target</p>
                          <p className="text-xl font-black text-brand-green">{impact.target}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
    // Group surveys by communityName and sort by date descending
    const groupedSurveys = {};
    let sortedRecords = [...surveyRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (surveyDateFilter) {
      // Filter by the exact date (YYYY-MM-DD)
      sortedRecords = sortedRecords.filter(s => {
        // Handle potentially different date formats by parsing and formatting
        try {
          const d = new Date(s.date);
          const formattedDate = d.toISOString().split('T')[0];
          return formattedDate === surveyDateFilter;
        } catch(e) {
          return false;
        }
      });
    }

    sortedRecords.forEach(s => {
      const commName = s.communityName || 'Unknown Community';
      if (!groupedSurveys[commName]) groupedSurveys[commName] = [];
      groupedSurveys[commName].push(s);
    });

    return (
      <div>
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-serif text-white">Survey Submissions by Community</h2>
          <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            <Calendar className="w-4 h-4 text-text-muted" />
            <label htmlFor="surveyDateFilter" className="text-sm text-text-muted font-medium whitespace-nowrap hidden sm:block">Filter by Date:</label>
            <input
              type="date"
              id="surveyDateFilter"
              value={surveyDateFilter}
              onChange={(e) => setSurveyDateFilter(e.target.value)}
              className="bg-transparent border-none text-white text-sm focus:ring-0 outline-none w-auto cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-opacity"
              style={{ colorScheme: 'dark' }}
            />
            {surveyDateFilter && (
              <button 
                onClick={() => setSurveyDateFilter('')}
                className="text-text-muted hover:text-white transition-colors"
                title="Clear Filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>
        
        {Object.keys(groupedSurveys).length === 0 ? (
          <p className="text-text-secondary text-sm">
            {surveyDateFilter ? "No survey submissions found for this date." : "No survey submissions yet."}
          </p>
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
                        <td className="py-3 pr-6 flex justify-end gap-2">
                          <button onClick={() => setSelectedSurveyView(s)} className="text-blue-400 hover:underline flex items-center text-xs border border-blue-400/30 px-2 py-1 rounded bg-blue-400/10">
                            <FileText className="w-3 h-3 mr-1" /> View
                          </button>
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

        {selectedSurveyView && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 shadow-2xl">
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-2xl font-serif text-white">Survey Record</h3>
                  <p className="text-text-muted mt-1">Submitted by {selectedSurveyView.userEmail} on {new Date(selectedSurveyView.date).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setSelectedSurveyView(null)} className="text-text-muted hover:text-white">&times;</button>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="text-brand-yellow font-bold text-sm mb-3">Community Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-white/60">Community Name: <span className="text-white">{selectedSurveyView.communityName}</span></div>
                    {selectedSurveyView.communityProfile && (
                      <>
                        <div className="text-white/60">District: <span className="text-white">{selectedSurveyView.communityProfile.district}</span></div>
                        <div className="text-white/60">Population: <span className="text-white">{selectedSurveyView.communityProfile.population}</span></div>
                        <div className="text-white/60">Occupation: <span className="text-white">{selectedSurveyView.communityProfile.occupation}</span></div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="text-brand-green font-bold text-sm mb-3">Survey Responses</h4>
                  <div className="space-y-4">
                    {surveyQuestions.map((q, idx) => {
                      const answer = selectedSurveyView.responses?.[q.id];
                      if (answer === undefined || answer === null || answer === '') return null;
                      
                      return (
                        <div key={q.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                          <div className="text-white/60 text-xs mb-1 font-mono uppercase">{q.text}</div>
                          <div className="text-white text-sm">
                            {Array.isArray(answer) ? answer.join(', ') : (typeof answer === 'object' ? JSON.stringify(answer) : answer.toString())}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedSurveyView(null)}
                  className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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
                
                {renderTopicSelector()}
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
