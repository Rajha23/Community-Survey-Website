import { GoogleGenAI } from "@google/genai";

function extractAndAggregate(submissions) {
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

export default async function handler(req, res) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing request data' });
    }

    const { analysisType, referenceId, communityData, submissions = [] } = data;
    
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    
    if (!apiKey) {
      console.error("AI_ERROR: GEMINI_API_KEY missing from environment.");
      return res.status(500).json({ error: 'Gemini API configuration error.' });
    }

    if (!analysisType || !referenceId) {
      console.error("AI_ERROR: Missing required parameters 'analysisType' or 'referenceId'.");
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    console.log(`Starting analysis. Type: ${analysisType}, Ref: ${referenceId}`);
    console.log(`Received ${submissions.length} records for ${referenceId}`);

    if (submissions.length === 0) {
      console.error(`AI_ERROR: No survey data found for type: ${analysisType}, ref: ${referenceId}`);
      return res.status(404).json({ error: 'Survey data could not be loaded. No records exist for this community/individual.' });
    }

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
      communityProfile: { 
        description: string; // A detailed 3-paragraph summary of the community based on data
        majorIssues: string[]; // List of specific issues identified (MUST NOT BE EMPTY)
      };
      stakeholderMap: { 
        highHigh: string[]; // High power, high interest stakeholders (MUST NOT BE EMPTY)
        highLow: string[]; // High power, low interest (MUST NOT BE EMPTY)
        lowHigh: string[]; // Low power, high interest (MUST NOT BE EMPTY)
        lowLow: string[]; // Low power, low interest (MUST NOT BE EMPTY)
      };
      empathyMap: { 
        says: string[]; // Direct quotes or sentiments (MUST NOT BE EMPTY)
        thinks: string[]; // (MUST NOT BE EMPTY)
        does: string[]; // (MUST NOT BE EMPTY)
        feels: string[]; // (MUST NOT BE EMPTY)
      };
      journeyMap: Array<{ 
        stage: string; // Name of stage
        experience: string; // Description of experience
        painPoint: string; // Specific pain point
        opportunity: string; // Opportunity for improvement
      }>; // (MUST NOT BE EMPTY - Generate at least 3 stages)
      communityAssetMap: { 
        human: string[]; // Human assets/skills (MUST NOT BE EMPTY)
        physical: string[]; // (MUST NOT BE EMPTY)
        natural: string[]; // (MUST NOT BE EMPTY)
        institutional: string[]; // (MUST NOT BE EMPTY)
        economic: string[]; // (MUST NOT BE EMPTY)
      };
      problemTree: { 
        mainProblem: string; // The core problem
        causes: string[]; // Root causes (MUST NOT BE EMPTY)
        effects: string[]; // Effects (MUST NOT BE EMPTY)
      };
      affinityDiagram: Array<{ 
        theme: string; // Emergent theme
        insights: string[]; // Deep insights for this theme
      }>; // (MUST NOT BE EMPTY)
      howMightWeStatements: string[]; // Actionable HMW statements (MUST NOT BE EMPTY)
      priorityMatrix: Array<{ 
        project: string; // Name of project
        impact: number; // 1 to 5 scale
        feasibility: number; // 1 to 5 scale
      }>; // (MUST NOT BE EMPTY)
      sdgMapping: Array<{ 
        sdg: string; // e.g. "SDG 6: Clean Water"
        score: number; // 0 to 100 alignment score
        reason: string; // Justification
      }>; // (MUST NOT BE EMPTY)
      communityPriorityIndex: Array<{ 
        problem: string; // Specific problem
        score: number; // Priority score 0 to 100
      }>; // (MUST NOT BE EMPTY)
      implementationRoadmap: Array<{ 
        month: string; // e.g. "Month 1"
        activity: string; // Specific actionable step
      }>; // (MUST NOT BE EMPTY)
      impactAssessment: Array<{ 
        metric: string; // Measurable indicator
        baseline: string; // Current state
        target: string; // Desired future state
      }>; // (MUST NOT BE EMPTY)
    }
    
    Output ONLY raw JSON, with no markdown codeblocks (\`\`\`).
    
    Context: ${JSON.stringify(communityData || {})}
    Community Profile Snapshot: ${JSON.stringify(latestCommunityProfile || {})}
    Total Respondents: ${safeAggregatedStats.totalResponses}
    Aggregated Survey Data: ${JSON.stringify(safeAggregatedStats)}
    `;

    console.log(`Contacting Gemini SDK with model: ${modelName}`);
    
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
        systemInstruction: "You are an expert Community Development and Design Thinking AI. Your ONLY job is to take the provided Aggregated Survey Data and synthesize a hyper-specific, data-driven, actionable analysis in JSON format. Do not use generic template text. Everything must be derived from the user's data."
      }
    });

    const responseText = response.text || "";
    if (!responseText) {
      console.error("AI_ERROR: Empty response from Gemini API.");
      return res.status(500).json({ error: 'AI returned invalid data format.' });
    }

    let aiResult;
    try {
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      aiResult = JSON.parse(cleanJsonStr);
      
      // Unwrap if Gemini incorrectly nested it under the interface name
      if (aiResult.AnalysisOutput) {
        aiResult = aiResult.AnalysisOutput;
      }
      if (aiResult.analysisOutput) {
        aiResult = aiResult.analysisOutput;
      }
      
      // Safety defaults: Ensure all arrays exist so UI doesn't crash or show empty boxes completely if one field fails
      aiResult.communityProfile = aiResult.communityProfile || { description: "No description generated.", majorIssues: ["Data insufficient to determine major issues."] };
      aiResult.stakeholderMap = aiResult.stakeholderMap || { highHigh: [], highLow: [], lowHigh: [], lowLow: [] };
      aiResult.empathyMap = aiResult.empathyMap || { says: [], thinks: [], does: [], feels: [] };
      aiResult.journeyMap = aiResult.journeyMap || [];
      aiResult.communityAssetMap = aiResult.communityAssetMap || { human: [], physical: [], natural: [], institutional: [], economic: [] };
      aiResult.problemTree = aiResult.problemTree || { mainProblem: "", causes: [], effects: [] };
      aiResult.affinityDiagram = aiResult.affinityDiagram || [];
      aiResult.howMightWeStatements = aiResult.howMightWeStatements || [];
      aiResult.priorityMatrix = aiResult.priorityMatrix || [];
      aiResult.sdgMapping = aiResult.sdgMapping || [];
      aiResult.communityPriorityIndex = aiResult.communityPriorityIndex || [];
      aiResult.implementationRoadmap = aiResult.implementationRoadmap || [];
      aiResult.impactAssessment = aiResult.impactAssessment || [];
      
    } catch (parseError) {
      console.error("AI_ERROR: Failed to parse Gemini response as JSON.", parseError);
      console.error("Raw response text was:", responseText);
      return res.status(500).json({ error: 'AI response could not be parsed. The AI output was malformed.' });
    }

    if (latestCommunityProfile) {
      aiResult._communityProfile = latestCommunityProfile;
    }

    const analysisDoc = {
      type: analysisType,
      referenceId: referenceId,
      version: 2,
      generatedAt: new Date().toISOString(),
      modelUsed: modelName,
      respondentCount: submissions.length,
      data: aiResult
    };

    const docId = `${analysisType}_${referenceId}`;
    console.log(`AI Analysis complete for ID: ${docId}`);
    
    return res.status(200).json({ data: aiResult });

  } catch (error) {
    console.error("AI_CRITICAL_ERROR: Unhandled exception in generateAiAnalysis:", error);
    
    if (error.message && error.message.includes('429')) {
      return res.status(429).json({ error: 'Gemini API Rate Limit Exceeded. Please wait 30 seconds and try again.' });
    }
    
    if (error.message && error.message.includes('503')) {
      return res.status(503).json({ error: 'The Google Gemini AI models are currently experiencing high demand. Please wait a minute and try again.' });
    }
    
    return res.status(500).json({ error: 'AI service temporarily unavailable due to a server error.' });
  }
}
