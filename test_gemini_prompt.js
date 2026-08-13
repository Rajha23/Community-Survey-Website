import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  const prompt = `
    You are an expert Community Development and Design Thinking AI.
    Analyze the following aggregated and anonymized survey data. Do NOT calculate basic statistics, focus entirely on qualitative interpretation, problem formulation, and synthesis.

    Aggregated Survey Data: {"totalResponses": 2, "questionFrequencies": {"What are the main problems?": {"texts": ["Lack of clean water", "No jobs for youth"]}}}

    Generate a complete Design Thinking analysis formatted STRICTLY as JSON with exactly this structure. 
    IMPORTANT INSTRUCTION: Do NOT output literal "..." or template placeholders. You MUST replace every "..." with your actual detailed, highly specific insights and comprehensive analysis derived directly from the Aggregated Survey Data. 
    
    {
      "communityProfile": { "description": "Write a detailed 3-paragraph summary of the community based on the data", "majorIssues": ["Identify specific issue 1", "Identify specific issue 2"] },
      "stakeholderMap": { "highHigh": ["Specific stakeholder 1", "Specific stakeholder 2"], "highLow": ["..."], "lowHigh": ["..."], "lowLow": ["..."] },
      "empathyMap": { "says": ["Direct quote or sentiment 1", "Quote 2"], "thinks": ["..."], "does": ["..."], "feels": ["..."] },
      "journeyMap": [{ "stage": "Name of stage (e.g. Seeking Water)", "experience": "Detailed description of experience", "painPoint": "Specific pain point", "opportunity": "Specific opportunity for improvement" }],
      "communityAssetMap": { "human": ["Specific skill/asset"], "physical": ["Specific physical asset"], "natural": ["..."], "institutional": ["..."], "economic": ["..."] },
      "problemTree": { "mainProblem": "The single most critical core problem", "causes": ["Root cause 1", "Root cause 2"], "effects": ["Immediate effect 1", "Long-term effect 2"] },
      "affinityDiagram": [{ "theme": "Name of emergent theme", "insights": ["Deep insight 1", "Deep insight 2"] }],
      "howMightWeStatements": ["How might we [action] so that [outcome]?", "How might we..."],
      "priorityMatrix": [{ "project": "Name of actionable project/intervention", "impact": 5, "feasibility": 4 }],
      "sdgMapping": [{ "sdg": "SDG 6: Clean Water", "score": 88, "reason": "Detailed justification based on data" }],
      "communityPriorityIndex": [{ "problem": "Specific problem", "score": 91 }],
      "implementationRoadmap": [{ "month": "Month 1", "activity": "Specific actionable step" }],
      "impactAssessment": [{ "metric": "Specific measurable indicator", "baseline": "Current state", "target": "Desired future state" }]
    }
    
    Ensure all JSON keys exactly match this schema. Generate multiple items for arrays where appropriate. Output ONLY raw JSON, with no markdown codeblocks (\`\`\`).
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.7
    }
  });

  console.log(response.text);
}
run();
