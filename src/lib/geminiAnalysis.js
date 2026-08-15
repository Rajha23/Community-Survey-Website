export function extractAndAggregate(submissions) {
  const aggregatedStats = {
    totalResponses: submissions.length,
    questionFrequencies: {}
  };

  submissions.forEach(sub => {
    const safeResponses = sub.responses || {};
    
    Object.keys(safeResponses).forEach(key => {
      if (key.includes('name') || key.includes('email') || key.includes('phone') || key.includes('mobile')) return;

      const answer = safeResponses[key];
      if (!answer) return;

      if (!aggregatedStats.questionFrequencies[key]) {
        aggregatedStats.questionFrequencies[key] = { counts: {}, texts: [] };
      }

      if (Array.isArray(answer)) {
        answer.forEach(val => {
          aggregatedStats.questionFrequencies[key].counts[val] = (aggregatedStats.questionFrequencies[key].counts[val] || 0) + 1;
        });
      } else if (typeof answer === 'string') {
        if (answer.length < 50) {
          aggregatedStats.questionFrequencies[key].counts[answer] = (aggregatedStats.questionFrequencies[key].counts[answer] || 0) + 1;
        } else {
          aggregatedStats.questionFrequencies[key].texts.push(answer);
        }
      }
    });
  });

  return aggregatedStats;
}

export const generateClientSideAnalysis = async ({ analysisType, referenceId, communityData, submissions, selectedTopics }) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not defined in your environment.");
  }

  const TOPIC_SCHEMAS = {
    communityProfile: `      communityProfile: { \n        description: string; // A detailed 3-paragraph summary of the community based on data\n        majorIssues: string[]; // List of specific issues identified (MUST NOT BE EMPTY)\n      };`,
    _communityProfile: `      _communityProfile: { \n        name: string;\n        district: string;\n        population: string;\n        majorIssues: string; // VERY brief summary of major issues\n      }; // Base data (always requested)`,
    communityProfile: `      communityProfile: { \n        description: string; // Max 2 sentences, ultra-brief summary\n        majorIssues: string[]; // 1-3 word bullet points ONLY\n      }; // (MUST NOT BE EMPTY)`,
    stakeholderMap: `      stakeholderMap: { \n        highHigh: string[]; // Max 3 words per item\n        highLow: string[]; // Max 3 words per item\n        lowHigh: string[]; // Max 3 words per item\n        lowLow: string[]; // Max 3 words per item\n      }; // (MUST NOT BE EMPTY)`,
    empathyMap: `      empathyMap: { \n        says: string[]; // Max 3-5 words each\n        thinks: string[]; // Max 3-5 words each\n        does: string[]; // Max 3-5 words each\n        feels: string[]; // Max 3-5 words each\n      }; // (MUST NOT BE EMPTY)`,
    journeyMap: `      journeyMap: Array<{ \n        stage: string; // 1-2 words\n        experience: string; // Max 3 words\n        painPoint: string; // Max 3 words\n        opportunity: string; // Max 3 words\n      }>; // (MUST NOT BE EMPTY)`,
    communityAssetMap: `      communityAssetMap: { \n        human: string[]; // Max 3 words each\n        physical: string[]; // Max 3 words each\n        financial: string[]; // Max 3 words each\n      }; // (MUST NOT BE EMPTY)`,
    problemTree: `      problemTree: { \n        mainProblem: string; // 2-4 words\n        causes: string[]; // Max 3 words each\n        effects: string[]; // Max 3 words each\n      }; // (MUST NOT BE EMPTY)`,
    affinityDiagram: `      affinityDiagram: Array<{ \n        theme: string; // 1-3 words\n        insights: string[]; // Max 5 words each\n      }>; // (MUST NOT BE EMPTY)`,
    howMightWeStatements: `      howMightWeStatements: string[]; // Generate exactly 3 statements. Max 10 words each.`,
    priorityMatrix: `      priorityMatrix: Array<{ \n        idea: string; // Max 5 words\n        impact: "High" | "Low"; \n        effort: "High" | "Low"; \n      }>; // (MUST NOT BE EMPTY)`,
    sdgMapping: `      sdgMapping: Array<{ \n        sdg: string; // e.g. "SDG 6"\n        score: number; // 0 to 100\n        reason: string; // Max 5 words\n      }>; // (MUST NOT BE EMPTY)`,
    communityPriorityIndex: `      communityPriorityIndex: Array<{ \n        problem: string; // Max 3 words\n        score: number; // 0 to 100\n      }>; // (MUST NOT BE EMPTY)`,
    implementationRoadmap: `      implementationRoadmap: Array<{ \n        month: string; // e.g. "Month 1"\n        activity: string; // Max 5 words\n      }>; // (MUST NOT BE EMPTY)`,
    impactAssessment: `      impactAssessment: Array<{ \n        metric: string; // Max 3 words\n        baseline: string; // 1 word/number\n        target: string; // 1 word/number\n      }>; // (MUST NOT BE EMPTY)`,
    graphicalData: `      graphicalData: Array<{ \n        title: string; // e.g., "Top Demographics", "Water Scarcity Severity"\n        type: "bar" | "pie"; // Must be bar or pie\n        data: Array<{ name: string; value: number }>; \n      }>; // Generate 6 to 8 insightful charts covering demographics, challenges, income, resources, education, etc.`
  };

  const requestedTopics = selectedTopics && selectedTopics.length > 0 ? selectedTopics : Object.keys(TOPIC_SCHEMAS);
  const interfaceBody = requestedTopics.map(t => TOPIC_SCHEMAS[t]).filter(Boolean).join('\n');

  const safeAggregatedStats = extractAndAggregate(submissions);

  let latestCommunityProfile = null;
  const subsWithProfiles = submissions.filter(s => s.communityProfile);
  if (subsWithProfiles.length > 0) {
    latestCommunityProfile = subsWithProfiles[subsWithProfiles.length - 1].communityProfile;
  }

  const prompt = `
  Generate a complete Design Thinking analysis formatted STRICTLY as JSON. 
  IMPORTANT: You MUST generate actual, deep insights derived exclusively from the Aggregated Survey Data. DO NOT under any circumstances output placeholder text or generic templates. 
  CRITICAL: Even if the provided data is sparse, you MUST extrapolate and infer reasonable Design Thinking insights to COMPLETELY populate the entire JSON structure. Do NOT leave any array empty. Every single array MUST have at least 1-3 highly detailed items. Be creative and analytical.
  
  The JSON output MUST perfectly conform to the following TypeScript interface. All fields are REQUIRED.

  interface AnalysisOutput {
${interfaceBody}
  }
  
  Output ONLY raw JSON, with no markdown codeblocks (\`\`\`).
  
  Context: ${JSON.stringify(communityData || {})}
  Community Profile Snapshot: ${JSON.stringify(latestCommunityProfile || {})}
  Total Respondents: ${safeAggregatedStats.totalResponses}
  Aggregated Survey Data: ${JSON.stringify(safeAggregatedStats)}
  `;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json"
    },
    systemInstruction: {
      parts: [{ text: "You are an expert Community Development and Design Thinking AI. Your ONLY job is to take the provided Aggregated Survey Data and synthesize a hyper-specific, data-driven, actionable analysis in JSON format. Do not use generic template text. Everything must be derived from the user's data." }]
    }
  };

  const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-lite-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const responseData = await response.json();

  if (!response.ok) {
    if (response.status === 503) throw new Error("The Google Gemini AI models are currently experiencing high demand. Please try again later. (503)");
    if (response.status === 429) throw new Error("Gemini API Rate Limit Exceeded. (429)");
    throw new Error(responseData.error?.message || "Failed to generate AI analysis");
  }

  const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  if (!responseText) {
    throw new Error('AI returned invalid data format. Empty text.');
  }

  let aiResult;
  try {
    const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    aiResult = JSON.parse(cleanJsonStr);
    
    if (aiResult.AnalysisOutput) {
      aiResult = aiResult.AnalysisOutput;
    }
    if (aiResult.analysisOutput) {
      aiResult = aiResult.analysisOutput;
    }
    
    // Safety defaults
    if (requestedTopics.includes('communityProfile')) aiResult.communityProfile = aiResult.communityProfile || { description: "No description generated.", majorIssues: ["Data insufficient to determine major issues."] };
    if (requestedTopics.includes('stakeholderMap')) aiResult.stakeholderMap = aiResult.stakeholderMap || { highHigh: [], highLow: [], lowHigh: [], lowLow: [] };
    if (requestedTopics.includes('empathyMap')) aiResult.empathyMap = aiResult.empathyMap || { says: [], thinks: [], does: [], feels: [] };
    if (requestedTopics.includes('journeyMap')) aiResult.journeyMap = aiResult.journeyMap || [];
    if (requestedTopics.includes('communityAssetMap')) aiResult.communityAssetMap = aiResult.communityAssetMap || { human: [], physical: [], natural: [], institutional: [], economic: [] };
    if (requestedTopics.includes('problemTree')) aiResult.problemTree = aiResult.problemTree || { mainProblem: "", causes: [], effects: [] };
    if (requestedTopics.includes('affinityDiagram')) aiResult.affinityDiagram = aiResult.affinityDiagram || [];
    if (requestedTopics.includes('howMightWeStatements')) aiResult.howMightWeStatements = aiResult.howMightWeStatements || [];
    if (requestedTopics.includes('priorityMatrix')) aiResult.priorityMatrix = aiResult.priorityMatrix || [];
    if (requestedTopics.includes('sdgMapping')) aiResult.sdgMapping = aiResult.sdgMapping || [];
    if (requestedTopics.includes('communityPriorityIndex')) aiResult.communityPriorityIndex = aiResult.communityPriorityIndex || [];
    if (requestedTopics.includes('implementationRoadmap')) aiResult.implementationRoadmap = aiResult.implementationRoadmap || [];
    if (requestedTopics.includes('impactAssessment')) aiResult.impactAssessment = aiResult.impactAssessment || [];
    if (requestedTopics.includes('graphicalData')) aiResult.graphicalData = aiResult.graphicalData || [];
    
  } catch (parseError) {
    throw new Error('AI response could not be parsed. The AI output was malformed.');
  }

  if (latestCommunityProfile) {
    aiResult._communityProfile = latestCommunityProfile;
  }

  return aiResult;
};
