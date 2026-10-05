import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Sparkles } from 'lucide-react';

const COLORS = ['#00E5FF', '#FFB800', '#FF3366', '#00E5FF80', '#FFB80080', '#FF336680'];

export default function AiAnalysisViewer({ aiData, children }) {
  if (!aiData) return null;
  
  const cp = aiData._communityProfile;
  return (
    <div className="space-y-6 mt-6">
      {children}
      
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
