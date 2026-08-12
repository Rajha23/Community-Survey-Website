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
    You are an expert Community Development and Design Thinking AI.
    Analyze the following aggregated and anonymized survey data. Do NOT calculate basic statistics, focus entirely on qualitative interpretation, problem formulation, and synthesis.
    
    Context: ${JSON.stringify(communityData || {})}
    Community Profile Snapshot: ${JSON.stringify(latestCommunityProfile || {})}
    Total Respondents: ${safeAggregatedStats.totalResponses}
    Aggregated Survey Data: ${JSON.stringify(safeAggregatedStats)}
    
    Generate a complete Design Thinking analysis formatted STRICTLY as JSON with exactly this structure:
    {
      "communityProfile": { "description": "...", "majorIssues": ["..."] },
      "stakeholderMap": { "highHigh": ["..."], "highLow": ["..."], "lowHigh": ["..."], "lowLow": ["..."] },
      "empathyMap": { "says": ["..."], "thinks": ["..."], "does": ["..."], "feels": ["..."] },
      "journeyMap": [{ "stage": "...", "experience": "...", "painPoint": "...", "opportunity": "..." }],
      "communityAssetMap": { "human": ["..."], "physical": ["..."], "natural": ["..."], "institutional": ["..."], "economic": ["..."] },
      "problemTree": { "mainProblem": "...", "causes": ["..."], "effects": ["..."] },
      "affinityDiagram": [{ "theme": "...", "insights": ["..."] }],
      "howMightWeStatements": ["How might we..."],
      "priorityMatrix": [{ "project": "...", "impact": 5, "feasibility": 4 }],
      "sdgMapping": [{ "sdg": "SDG 6", "score": 88, "reason": "..." }],
      "communityPriorityIndex": [{ "problem": "...", "score": 91 }],
      "implementationRoadmap": [{ "month": "Month 1", "activity": "..." }],
      "impactAssessment": [{ "metric": "...", "baseline": "...", "target": "..." }]
    }
    
    Ensure all JSON keys exactly match this schema. Output ONLY raw JSON, with no markdown codeblocks (\`\`\`).
    `;

    console.log(`Contacting Gemini SDK with model: ${modelName}`);
    
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
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
    } catch (parseError) {
      console.error("AI_ERROR: Failed to parse Gemini response as JSON.", parseError);
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
    
    return res.status(200).json({ data: { success: true, docId: docId, analysis: analysisDoc } });

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
