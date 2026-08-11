const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const { GoogleGenAI } = require("@google/genai");

initializeApp();
const db = getFirestore();

/**
 * Task 5: Minimal Gemini Health Test
 * Verifies API key, model selection, and basic communication.
 */
exports.testGeminiConnection = onCall({ cors: true, timeoutSeconds: 30 }, async (request) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';

    if (!apiKey) {
      console.error("TEST_ERROR: GEMINI_API_KEY is not defined in the environment.");
      throw new HttpsError('failed-precondition', 'Gemini API configuration error.');
    }

    console.log(`Testing Gemini connection with model: ${modelName}`);

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Send a minimal request
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Reply with exactly: GEMINI_CONNECTION_OK"
    });

    const responseText = response.text ? response.text.trim() : "";
    console.log("TEST_SUCCESS: Gemini responded:", responseText);

    return { 
      status: "success", 
      message: "Gemini connection successful", 
      response: responseText,
      model: modelName
    };
  } catch (error) {
    console.error("TEST_ERROR: Failed to connect to Gemini API.", error);
    throw new HttpsError('internal', 'Gemini API test failed. Check server logs.');
  }
});


/**
 * Task 10: Deterministic Calculations
 * Extracts only non-PII data and calculates basic statistics
 */
function extractAndAggregate(submissions) {
  const aggregatedStats = {
    totalResponses: submissions.length,
    questionFrequencies: {}
  };

  submissions.forEach(sub => {
    // TASK 7: Do NOT send entire Firebase User object to Gemini.
    // Strip emails, names, phone numbers, passwords, etc.
    const safeResponses = sub.responses || {};
    
    Object.keys(safeResponses).forEach(key => {
      // Exclude obvious PII or raw unstructured text if needed, but for now we safely aggregate counts
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
        // If it's a short categorical answer, count it. If it's long text, push to texts.
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


/**
 * Main AI Analysis Function
 */
exports.generateAiAnalysis = onCall({ cors: true, timeoutSeconds: 300 }, async (request) => {
  try {
    const { analysisType, referenceId, communityData } = request.data;
    
    // TASK 4: Verify Environment Variable
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    
    if (!apiKey) {
      console.error("AI_ERROR: GEMINI_API_KEY missing from environment.");
      throw new HttpsError('failed-precondition', 'Gemini API configuration error.');
    }
    
    // TASK 3: Verify Model Configuration

    if (!analysisType || !referenceId) {
      console.error("AI_ERROR: Missing required parameters 'analysisType' or 'referenceId'.");
      throw new HttpsError('invalid-argument', 'Missing required parameters.');
    }

    // TASK 6 & 8: Data is passed from frontend to avoid local Firebase Admin ADC timeout issues
    const submissions = request.data.submissions || [];
    console.log(`Starting analysis. Type: ${analysisType}, Ref: ${referenceId}`);
    console.log(`Received ${submissions.length} records for ${referenceId}`);

    if (submissions.length === 0) {
      console.error(`AI_ERROR: No survey data found for type: ${analysisType}, ref: ${referenceId}`);
      throw new HttpsError('not-found', 'Survey data could not be loaded. No records exist for this community/individual.');
    }

    // TASK 7 & 10: Aggregate and clean data deterministically
    const safeAggregatedStats = extractAndAggregate(submissions);

    // Extract latest communityProfile from submissions
    let latestCommunityProfile = null;
    const subsWithProfiles = submissions.filter(s => s.communityProfile);
    if (subsWithProfiles.length > 0) {
      // Assuming submissions might be chronological, we take the last available profile
      latestCommunityProfile = subsWithProfiles[subsWithProfiles.length - 1].communityProfile;
    }

    // TASK 9: Structured Prompt
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
      throw new HttpsError('internal', 'AI returned invalid data format.');
    }

    // TASK 9: Validate JSON before storing
    let aiResult;
    try {
      // Strip potential markdown backticks just in case the model ignores instructions
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      aiResult = JSON.parse(cleanJsonStr);
    } catch (parseError) {
      console.error("AI_ERROR: Failed to parse Gemini response as JSON.", parseError);
      console.error("Raw response snippet:", responseText.substring(0, 500));
      throw new HttpsError('internal', 'AI response could not be parsed. The AI output was malformed.');
    }

    if (latestCommunityProfile) {
      aiResult._communityProfile = latestCommunityProfile;
    }

    // TASK 13: Analysis document is returned to frontend, where it will be saved using client SDK
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
    
    // Return to frontend to handle Firestore write securely
    return { success: true, docId: docId, analysis: analysisDoc };

  } catch (error) {
    // TASK 14: Strict Error Sanitization
    console.error("AI_CRITICAL_ERROR: Unhandled exception in generateAiAnalysis:", error);
    
    if (error.message && error.message.includes('429')) {
      throw new HttpsError('resource-exhausted', 'Gemini API Rate Limit Exceeded. Please wait 30 seconds and try again.');
    }
    
    if (error.message && error.message.includes('503')) {
      throw new HttpsError('unavailable', 'The Google Gemini AI models are currently experiencing high demand. Please wait a minute and try again.');
    }
    
    // If it's already an HttpsError, just re-throw it (it's safe)
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Return a generic, safe error message to the client
    throw new HttpsError('internal', 'AI service temporarily unavailable due to a server error.');
  }
});
