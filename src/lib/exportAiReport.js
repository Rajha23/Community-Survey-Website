// Utility to generate and export professional, printable AI Intelligence Reports (PDF / HTML)

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const PALETTE = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'];

function renderVisualChart(chart, idx) {
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) return '';
  const total = chart.data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  const maxVal = Math.max(...chart.data.map(d => Number(d.value) || 0), 1);

  const barsHtml = chart.data.map((item, i) => {
    const val = Number(item.value) || 0;
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    const barWidth = Math.round((val / maxVal) * 100);
    const color = PALETTE[i % PALETTE.length];

    return `
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">
          <span>${escapeHtml(item.name)}</span>
          <span>${val} (${pct}%)</span>
        </div>
        <div style="background: #e2e8f0; border-radius: 9999px; height: 12px; overflow: hidden; width: 100%;">
          <div style="background: ${color}; width: ${Math.max(barWidth, 3)}%; height: 100%; border-radius: 9999px; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="report-card" style="page-break-inside: avoid; break-inside: avoid;">
      <h4 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0 0 14px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
        ${escapeHtml(chart.title || `Statistical Metric #${idx + 1}`)}
      </h4>
      ${barsHtml}
    </div>
  `;
}

export function generateAiReportHtml({ aiData, title, communityName, subtitle, generatedAt, author }) {
  if (!aiData) return '';

  const cp = aiData._communityProfile;
  const resolvedCommunityName = communityName || cp?.name || 'Target Community';
  const displayTitle = title || 'Community Development & Design Thinking Analysis';
  const displayDate = generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString();

  // Charts
  const chartsHtml = (aiData.graphicalData && aiData.graphicalData.length > 0)
    ? `
      <div class="section-title">Statistical Indicators & Demographic Charts</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 24px;">
        ${aiData.graphicalData.map((chart, idx) => renderVisualChart(chart, idx)).join('')}
      </div>
    `
    : '';

  // Community Profile & CPI
  let cpiHtml = '';
  if (aiData.communityProfile || aiData.communityPriorityIndex) {
    const profileDesc = aiData.communityProfile?.description ? `
      <div style="margin-bottom: 14px;">
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 8px 0;">${escapeHtml(aiData.communityProfile.description)}</p>
        <div style="font-size: 13px; color: #0f172a; font-weight: 600;">
          <strong>Major Challenges:</strong> ${escapeHtml((aiData.communityProfile.majorIssues || []).join(', '))}
        </div>
      </div>
    ` : '';

    const cpiBars = (aiData.communityPriorityIndex || []).map(item => {
      const score = Number(item.score) || 0;
      const color = score > 80 ? '#ef4444' : (score > 50 ? '#f59e0b' : '#10b981');
      return `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 3px;">
            <span style="color: #1e293b;">${escapeHtml(item.problem)}</span>
            <span style="color: ${color}; font-weight: bold;">${score}% Score</span>
          </div>
          <div style="background: #e2e8f0; border-radius: 9999px; height: 10px; overflow: hidden;">
            <div style="background: ${color}; width: ${score}%; height: 100%; border-radius: 9999px;"></div>
          </div>
        </div>
      `;
    }).join('');

    cpiHtml = `
      <div class="section-title">Community Profile & Priority Index (CPI)</div>
      <div class="report-grid-2">
        <div class="report-card">
          <h4 class="card-heading">Executive Summary</h4>
          ${profileDesc || '<p style="color:#64748b;font-size:13px;">No qualitative description available.</p>'}
        </div>
        <div class="report-card">
          <h4 class="card-heading">Community Priority Index (Weighted Severity)</h4>
          ${cpiBars || '<p style="color:#64748b;font-size:13px;">No CPI scores generated.</p>'}
        </div>
      </div>
    `;
  }

  // Stakeholder & Empathy
  let stakeholderEmpathyHtml = '';
  if (aiData.stakeholderMap || aiData.empathyMap) {
    const sMap = aiData.stakeholderMap || {};
    const eMap = aiData.empathyMap || {};

    stakeholderEmpathyHtml = `
      <div class="section-title">Human-Centered Framework (Stakeholders & Empathy)</div>
      <div class="report-grid-2">
        ${aiData.stakeholderMap ? `
          <div class="report-card">
            <h4 class="card-heading">Stakeholder Power-Interest Matrix</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 10px;">
                <div style="font-weight: bold; font-size: 11px; color: #92400e; margin-bottom: 6px;">★ High Power, High Interest</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #78350f;">
                  ${(sMap.highHigh || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>
              <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px;">
                <div style="font-weight: bold; font-size: 11px; color: #075985; margin-bottom: 6px;">👀 High Power, Low Interest</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #0369a1;">
                  ${(sMap.highLow || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>
              <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px;">
                <div style="font-weight: bold; font-size: 11px; color: #166534; margin-bottom: 6px;">🤝 Low Power, High Interest</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #15803d;">
                  ${(sMap.lowHigh || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>
              <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                <div style="font-weight: bold; font-size: 11px; color: #475569; margin-bottom: 6px;">ℹ️ Low Power, Low Interest</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #334155;">
                  ${(sMap.lowLow || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        ` : ''}

        ${aiData.empathyMap ? `
          <div class="report-card">
            <h4 class="card-heading">Citizen Empathy Map</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                <div style="font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 4px;">💬 Says</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #334155;">
                  ${(eMap.says || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                <div style="font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 4px;">💭 Thinks</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #334155;">
                  ${(eMap.thinks || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                <div style="font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 4px;">🏃 Does</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #334155;">
                  ${(eMap.does || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                <div style="font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 4px;">❤️ Feels</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #334155;">
                  ${(eMap.feels || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Journey Map
  let journeyMapHtml = '';
  if (aiData.journeyMap && aiData.journeyMap.length > 0) {
    journeyMapHtml = `
      <div class="section-title">Community Journey Map</div>
      <div class="report-card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 18%;">Stage</th>
              <th style="width: 27%;">Experience</th>
              <th style="width: 27%;">Pain Point</th>
              <th style="width: 28%;">Opportunity</th>
            </tr>
          </thead>
          <tbody>
            ${aiData.journeyMap.map(jm => `
              <tr>
                <td style="font-weight: 700; color: #0f172a;">${escapeHtml(jm.stage)}</td>
                <td style="color: #334155;">${escapeHtml(jm.experience)}</td>
                <td style="color: #dc2626; font-weight: 500;">${escapeHtml(jm.painPoint)}</td>
                <td style="color: #16a34a; font-weight: 500;">${escapeHtml(jm.opportunity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Problem Tree & Assets
  let problemAssetHtml = '';
  if (aiData.problemTree || aiData.communityAssetMap) {
    const pt = aiData.problemTree || {};
    const cam = aiData.communityAssetMap || {};

    problemAssetHtml = `
      <div class="section-title">Root Cause & Asset Mapping</div>
      <div class="report-grid-2">
        ${aiData.problemTree ? `
          <div class="report-card">
            <h4 class="card-heading">Problem Tree Analysis</h4>
            <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 12px; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #991b1b; margin-bottom: 4px;">Core Identified Problem</div>
              <div style="font-size: 14px; font-weight: 700; color: #7f1d1d;">${escapeHtml(pt.mainProblem || 'Community Problem')}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                <div style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Causes (Roots)</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #334155;">
                  ${(pt.causes || []).map(c => `<li>${escapeHtml(c)}</li>`).join('')}
                </ul>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                <div style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Effects (Branches)</div>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #334155;">
                  ${(pt.effects || []).map(e => `<li>${escapeHtml(e)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        ` : ''}

        ${aiData.communityAssetMap ? `
          <div class="report-card">
            <h4 class="card-heading">Community Asset Inventory</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${Object.entries(cam).map(([category, items]) => `
                <div>
                  <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 4px;">
                    ${escapeHtml(category)} Assets
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${(items || []).map(item => `
                      <span style="background: #f1f5f9; border: 1px solid #cbd5e1; color: #1e293b; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 500;">
                        ${escapeHtml(item)}
                      </span>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Affinity Diagram, HMW, Priority Matrix
  let ideationHtml = '';
  if (aiData.affinityDiagram || aiData.howMightWeStatements || aiData.priorityMatrix) {
    ideationHtml = `
      <div class="section-title">Ideation, Opportunities & Prioritization</div>
      <div class="report-grid-2">
        ${aiData.howMightWeStatements ? `
          <div class="report-card">
            <h4 class="card-heading">"How Might We" Design Statements</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${aiData.howMightWeStatements.map((hmw, i) => `
                <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #713f12; font-weight: 600;">
                  ✨ ${escapeHtml(hmw)}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${aiData.priorityMatrix ? `
          <div class="report-card" style="padding: 0; overflow: hidden;">
            <div style="padding: 14px 18px 8px 18px;">
              <h4 class="card-heading" style="margin: 0;">Priority Matrix (Impact vs Feasibility)</h4>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Intervention / Project</th>
                  <th style="text-align: center;">Impact</th>
                  <th style="text-align: center;">Feasibility / Effort</th>
                </tr>
              </thead>
              <tbody>
                ${aiData.priorityMatrix.map(pm => `
                  <tr>
                    <td style="font-weight: 600; color: #0f172a;">${escapeHtml(pm.project || pm.idea)}</td>
                    <td style="text-align: center;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #15803d;">
                        ${escapeHtml(pm.impact)}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1;">
                        ${escapeHtml(pm.feasibility || pm.effort)}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${aiData.affinityDiagram ? `
          <div class="report-card" style="grid-column: span 2;">
            <h4 class="card-heading">Affinity Diagram Categorized Themes</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
              ${aiData.affinityDiagram.map(ad => `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                  <div style="font-weight: bold; font-size: 13px; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                    ${escapeHtml(ad.theme)}
                  </div>
                  <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #334155;">
                    ${(ad.insights || []).map(ins => `<li>${escapeHtml(ins)}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // SDG Mapping, Roadmap, Impact Assessment
  let actionPlanHtml = '';
  if (aiData.sdgMapping || aiData.implementationRoadmap || aiData.impactAssessment) {
    actionPlanHtml = `
      <div class="section-title">Strategic Alignment, Roadmap & Impact Assessment</div>
      
      ${aiData.sdgMapping ? `
        <div class="report-card" style="margin-bottom: 20px;">
          <h4 class="card-heading">UN Sustainable Development Goals (SDG Alignment)</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            ${aiData.sdgMapping.map(sdg => `
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                  <span style="font-weight: 700; font-size: 13px; color: #166534;">${escapeHtml(sdg.sdg)}</span>
                  <span style="font-weight: 800; font-size: 16px; color: #15803d;">${escapeHtml(sdg.score)}%</span>
                </div>
                <div style="background: #dcfce7; border-radius: 9999px; height: 6px; overflow: hidden; margin-bottom: 6px;">
                  <div style="background: #16a34a; width: ${sdg.score}%; height: 100%;"></div>
                </div>
                <div style="font-size: 11px; color: #14532d; font-style: italic;">"${escapeHtml(sdg.reason)}"</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="report-grid-2">
        ${aiData.implementationRoadmap ? `
          <div class="report-card" style="padding: 0; overflow: hidden;">
            <div style="padding: 14px 18px 8px 18px;">
              <h4 class="card-heading" style="margin: 0;">Implementation Roadmap</h4>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 30%;">Phase / Month</th>
                  <th style="width: 70%;">Key Activities</th>
                </tr>
              </thead>
              <tbody>
                ${aiData.implementationRoadmap.map((rm, idx) => `
                  <tr>
                    <td style="font-weight: 700; color: #0284c7;">${escapeHtml(rm.month || `Phase ${idx + 1}`)}</td>
                    <td style="color: #334155;">${escapeHtml(rm.activity)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${aiData.impactAssessment ? `
          <div class="report-card" style="padding: 0; overflow: hidden;">
            <div style="padding: 14px 18px 8px 18px;">
              <h4 class="card-heading" style="margin: 0;">Impact Assessment & Target Metrics</h4>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Target Metric</th>
                  <th style="text-align: center;">Baseline</th>
                  <th style="text-align: center;">Projected Target</th>
                </tr>
              </thead>
              <tbody>
                ${aiData.impactAssessment.map(ia => `
                  <tr>
                    <td style="font-weight: 600; color: #0f172a;">${escapeHtml(ia.metric)}</td>
                    <td style="text-align: center; color: #64748b; font-weight: 500;">${escapeHtml(ia.baseline)}</td>
                    <td style="text-align: center; color: #16a34a; font-weight: 700;">${escapeHtml(ia.target)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(displayTitle)} - ${escapeHtml(resolvedCommunityName)}</title>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .report-container {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 32px 48px 32px;
      background: #ffffff;
      min-height: 100vh;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .action-btn {
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .action-btn-primary {
      background: #10b981;
      color: #000000;
    }
    .action-btn-primary:hover {
      background: #34d399;
    }
    .action-btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .action-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
    }
    .header-banner {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .college-name {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    .report-main-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }
    .report-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }
    .metadata-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      text-align: right;
      min-width: 200px;
    }
    .snapshot-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .snapshot-table th, .snapshot-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .snapshot-table th {
      width: 25%;
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      text-align: left;
    }
    .snapshot-table td {
      color: #0f172a;
      font-weight: 500;
    }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      border-left: 4px solid #10b981;
      padding-left: 10px;
      margin: 32px 0 16px 0;
      page-break-after: avoid;
      break-after: avoid;
    }
    .report-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-heading {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
      margin: 0 0 12px 0;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .report-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 18px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .report-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
      padding: 10px 14px;
      border-bottom: 2px solid #e2e8f0;
      text-align: left;
    }
    .report-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .footer-note {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background: #ffffff !important;
      }
      .report-container {
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .section-title {
        page-break-after: avoid;
        break-after: avoid;
      }
      .report-card, .report-grid-2, .snapshot-table {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div style="font-weight: 700; font-size: 14px; display: flex; items-center; gap: 8px;">
      <span>📑 Report Preview (${escapeHtml(resolvedCommunityName)})</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="action-btn action-btn-primary" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="action-btn action-btn-secondary" onclick="downloadHtmlReport()">
        💾 Download HTML
      </button>
      <button class="action-btn action-btn-secondary" onclick="window.close()">
        ✕ Close
      </button>
    </div>
  </div>

  <div class="report-container">
    <header class="header-banner">
      <div>
        <div class="college-name">Community Survey & Research Portal • SRM TRP</div>
        <h1 class="report-main-title">${escapeHtml(displayTitle)}</h1>
        <p class="report-subtitle">${escapeHtml(subtitle || `Comprehensive Community Intelligence Assessment for ${resolvedCommunityName}`)}</p>
      </div>
      <div class="metadata-box">
        <div><strong>Community:</strong> ${escapeHtml(resolvedCommunityName)}</div>
        ${cp?.district ? `<div><strong>District:</strong> ${escapeHtml(cp.district)}</div>` : ''}
        <div><strong>Generated:</strong> ${displayDate}</div>
        <div><strong>Status:</strong> <span style="color:#16a34a;font-weight:bold;">Verified AI Analysis</span></div>
      </div>
    </header>

    ${cp ? `
      <table class="snapshot-table">
        <tbody>
          <tr>
            <th>Community Name</th>
            <td>${escapeHtml(cp.name || resolvedCommunityName)}</td>
            <th>District / Region</th>
            <td>${escapeHtml(cp.district || 'N/A')}</td>
          </tr>
          <tr>
            <th>Total Population</th>
            <td>${escapeHtml(cp.population || 'N/A')}</td>
            <th>Major Identified Issues</th>
            <td style="color:#b45309;font-weight:bold;">${escapeHtml(cp.majorIssues || 'N/A')}</td>
          </tr>
        </tbody>
      </table>
    ` : ''}

    ${chartsHtml}
    ${cpiHtml}
    ${stakeholderEmpathyHtml}
    ${journeyMapHtml}
    ${problemAssetHtml}
    ${ideationHtml}
    ${actionPlanHtml}

    <div class="footer-note">
      This document is generated automatically by the Community Survey AI Intelligence System. Derived exclusively from field survey submissions.
    </div>
  </div>

  <script>
    function downloadHtmlReport() {
      const htmlContent = document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Community_Survey_Report_${escapeHtml(resolvedCommunityName).replace(/\s+/g, '_')}.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Auto-trigger print dialog after slight delay for styles to settle
    window.addEventListener('load', () => {
      setTimeout(() => {
        try {
          window.print();
        } catch (_) {}
      }, 500);
    });
  </script>
</body>
</html>`;
}

export function exportAiReportToPdf({ aiData, title, communityName, subtitle, generatedAt, author }) {
  if (!aiData) {
    alert("No AI analysis data available to export.");
    return;
  }

  try {
    const fullHtml = generateAiReportHtml({
      aiData,
      title,
      communityName,
      subtitle,
      generatedAt,
      author
    });

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert("Popup blocked! Please allow popups for this site to view and download the PDF report.");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(fullHtml);
    reportWindow.document.close();
  } catch (err) {
    console.error("Failed to export AI report:", err);
    alert("Could not export report: " + err.message);
  }
}
