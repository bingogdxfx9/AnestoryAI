import { GoogleGenAI, Type } from "@google/genai";
import { Ancestor, TimelineEvent, SESResult } from "../types";

// Initialize the client. 
// NOTE: In a production app, never expose API keys on the client side.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface HistoricalContextResponse {
    text: string;
    sources: { uri: string; title: string }[];
}

export const generateGroundedHistory = async (ancestor: Ancestor): Promise<HistoricalContextResponse> => {
  if (!process.env.API_KEY) {
    return { text: "API Key is missing.", sources: [] };
  }

  const birth = ancestor.birthYear ? ancestor.birthYear : 'Unknown';
  const death = ancestor.deathYear ? ancestor.deathYear : 'Present';
  const country = ancestor.country ? `in ${ancestor.country}` : '';
  
  const prompt = `
    I am researching an ancestor named ${ancestor.name} who lived from ${birth} to ${death} ${country}.
    Please provide a summary of major historical, cultural, or geographical events that occurred during their lifetime.
    Focus on events that would have impacted the daily life of a person in that era.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Use Grounding
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
        .map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
        .filter((s: any) => s !== null);

    return {
        text: response.text || "No context generated.",
        sources
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Failed to retrieve historical context.", sources: [] };
  }
};

export const generateFamilyStory = async (ancestor: Ancestor, allAncestors: Ancestor[], style: string = 'Standard'): Promise<string> => {
    if (!process.env.API_KEY) return "API Key missing.";

    // Simple context builder
    const father = allAncestors.find(a => a.id === ancestor.fatherId);
    const mother = allAncestors.find(a => a.id === ancestor.motherId);
    const children = allAncestors.filter(a => a.fatherId === ancestor.id || a.motherId === ancestor.id);
    
    const contextLines = [
        `Name: ${ancestor.name}`,
        `Born: ${ancestor.birthYear || 'Unknown'}`,
        `Died: ${ancestor.deathYear || 'Unknown'}`,
        `Gender: ${ancestor.gender}`,
        `Country: ${ancestor.country || 'Unknown'}`,
        `Notes: ${ancestor.notes}`,
        `Father: ${father ? father.name : 'Unknown'}`,
        `Mother: ${mother ? mother.name : 'Unknown'}`,
        `Children: ${children.length > 0 ? children.map(c => c.name).join(', ') : 'None recorded'}`
    ];

    const prompt = `
        Based on the provided genealogical data, write a biographical narrative for ${ancestor.name}.
        Data:
        ${contextLines.join('\n')}
    `;

    let systemInstruction = "You are a skilled biographer.";
    switch (style) {
        case 'Academic':
            systemInstruction = "You are a formal academic researcher. Write an objective, fact-based report focusing on dates, lineage, and verifiable details.";
            break;
        case 'Novel':
            systemInstruction = "You are a historical novelist. Write a detailed, emotive narrative that sets the scene and atmosphere, using creative license for descriptions while adhering to the provided facts.";
            break;
        case 'Children':
             systemInstruction = "You are a storyteller for children. Use simple, engaging language, explain historical concepts gently, and focus on family connection.";
             break;
        case 'Summary':
             systemInstruction = "You are a concise archivist. Provide a bulleted summary or a very short paragraph of the key facts only.";
             break;
        default:
             systemInstruction = "You are a helpful historian. Write a balanced, engaging, and informative biography.";
             break;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction
            }
        });
        return response.text || "Could not generate story.";
    } catch (error) {
        console.error("Story Generation Error:", error);
        return "Error generating story.";
    }
};

export const analyzeMissingData = async (ancestor: Ancestor): Promise<string> => {
    if (!process.env.API_KEY) return "API Key missing.";

    const prompt = `
        Analyze the following ancestor record and suggest high-probability missing information or areas for research.
        For example, if they were born in 1890, suggest checking WWI records.
        
        Record:
        Name: ${ancestor.name}
        Born: ${ancestor.birthYear || 'Unknown'}
        Died: ${ancestor.deathYear || 'Unknown'}
        Gender: ${ancestor.gender}
        Country: ${ancestor.country || 'Unknown'}
        Notes: ${ancestor.notes}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No suggestions found.";
    } catch (error) {
        return "Error analyzing data.";
    }
};

export const parseNaturalLanguageData = async (text: string): Promise<any> => {
    if (!process.env.API_KEY) return null;

    const prompt = `
    Extract genealogical data from the text provided below. 
    Analyze the text to find the primary subject's name, birth year, death year, and gender.
    Extract country of residence if mentioned.
    Extract any biographical details, relationships (spouse, military service, location), or other facts into the 'notes' field.
    If parents are mentioned by name, extract them into fatherName/motherName so we can try to link them later.
    
    Text: "${text}"
    `;

    try {
        const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: prompt,
             config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                         name: { type: Type.STRING },
                         birthYear: { type: Type.STRING, description: "Year as string, e.g. '1905'" },
                         deathYear: { type: Type.STRING, description: "Year as string, e.g. '1980'" },
                         gender: { type: Type.STRING, description: "Male, Female, or Unknown" },
                         country: { type: Type.STRING, description: "Country of residence, e.g. 'France'" },
                         notes: { type: Type.STRING, description: "Summary of biographical info" },
                         fatherName: { type: Type.STRING, description: "Name of father if mentioned" },
                         motherName: { type: Type.STRING, description: "Name of mother if mentioned" }
                     },
                     required: ["name", "gender"]
                 }
             }
        });
        
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Parse error", e);
        throw new Error("Failed to parse text input.");
    }
};

export interface PredictionResult {
    ancestorId: string;
    field: string;
    predictedValue: any;
    reasoning: string;
}

export const getPredictiveAnalysis = async (ancestors: Ancestor[]): Promise<PredictionResult[]> => {
    if (!process.env.API_KEY) return [];

    const simplifiedData = ancestors.map(a => ({
        id: a.id,
        name: a.name,
        birth: a.birthYear,
        death: a.deathYear,
        country: a.country,
        fatherId: a.fatherId,
        motherId: a.motherId
    }));

    const prompt = `
    Analyze this genealogy tree data (JSON below).
    Identify missing birth years or death years.
    Using logic (generation gaps, family structure) AND historical trends (via Google Search if needed), predict the missing values.
    
    Return a JSON array ONLY in the following format:
    [
      { "ancestorId": "id", "field": "birthYear", "predictedValue": 1900, "reasoning": "Child born 1925..." }
    ]
    
    Only provide predictions with high confidence or clear logical basis.
    
    Data:
    ${JSON.stringify(simplifiedData)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || "[]";
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            return JSON.parse(jsonStr);
        }
        return [];

    } catch (error) {
        console.error("Predictive Analysis Error:", error);
        return [];
    }
};

export const generateTimeline = async (ancestor: Ancestor): Promise<TimelineEvent[]> => {
    if (!process.env.API_KEY) return [];

    const countryContext = ancestor.country ? `in ${ancestor.country}` : '';
    const prompt = `
    Create a timeline of 5 to 7 major world, regional, or cultural events that occurred during the lifetime of ${ancestor.name} (${ancestor.birthYear || 'Unknown'} - ${ancestor.deathYear || 'Present'}) ${countryContext}.
    Use Google Search to find relevant events.
    Return a strictly formatted JSON array:
    [
        { "year": 1945, "event": "End of World War II" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                // responseMimeType: "application/json" // REMOVED: Cannot be used with tools
            }
        });

        const text = response.text || "[]";
        // Extract JSON from potential markdown code block
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text.replace(/```json|```/g, "").trim();
        
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Timeline Generation Error", e);
        return [];
    }
};

export const predictSES = async (ancestor: Ancestor): Promise<SESResult> => {
    if (!process.env.API_KEY) return { socialClass: "Unknown", reasoning: "Unable to analyze." };

    const prompt = `
    Predict the likely Socio-Economic Status (SES) of this ancestor based on their data and historical context.
    Use Google Search to cross-reference their era, notes (which might contain occupation/location), and family structure.
    
    Data:
    Name: ${ancestor.name}
    Born: ${ancestor.birthYear || '?'}
    Died: ${ancestor.deathYear || '?'}
    Country: ${ancestor.country || '?'}
    Notes: ${ancestor.notes}
    
    Return a strict JSON object:
    {
        "socialClass": "e.g., Working Class / Landed Gentry / Urban Professional",
        "reasoning": "Brief explanation citing historical context or clues."
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                // responseMimeType: "application/json" // REMOVED: Cannot be used with tools
            }
        });

        const text = response.text || "{}";
        // Extract JSON from potential markdown code block
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text.replace(/```json|```/g, "").trim();

        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("SES Prediction Error", e);
        return { socialClass: "Analysis Failed", reasoning: "AI error." };
    }
};

export const naturalLanguageSearch = async (query: string, ancestors: Ancestor[]): Promise<string[]> => {
    if (!process.env.API_KEY) return [];

    // Simplified payload for token efficiency
    const simplified = ancestors.map(a => ({
        id: a.id,
        name: a.name,
        birth: a.birthYear,
        death: a.deathYear,
        fatherId: a.fatherId,
        motherId: a.motherId,
        country: a.country,
        notes: a.notes,
        gender: a.gender
    }));

    const prompt = `
    You are a query engine for a genealogy database.
    
    Query: "${query}"
    
    Database (JSON):
    ${JSON.stringify(simplified)}
    
    Task: Return a JSON array containing ONLY the 'id' strings of the ancestors that match the query logic.
    Handle complex logic like "Second cousins of X", "Born in 19th century", "Died same place as father" (infer from notes or country).
    If logic is "siblings of X", find X, find parents, find other children of parents.
    
    Return format: ["id1", "id2"]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                 responseMimeType: "application/json"
            }
        });

        const text = response.text || "[]";
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("RQL Search Error", e);
        return [];
    }
};

export const generateStylizedImage = async (base64Image: string, style: string): Promise<string | null> => {
    if (!process.env.API_KEY) return null;

    // IMPORTANT: Strip the prefix if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: cleanBase64
                        }
                    },
                    {
                        text: `Transform this portrait to look like a ${style}. Maintain the person's facial features and identity strictly, but change the clothing, hairstyle, background, and photographic medium to match the specified era or style. High quality, photorealistic.`
                    }
                ]
            }
        });

        // Loop to find image part
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/jpeg;base64,${part.inlineData.data}`;
            }
        }
        return null;

    } catch (e) {
        console.error("Image Stylization Error", e);
        return null;
    }
};