import 'dotenv/config';
import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const port = 3000;

// High payload limit for camera frames
app.use(express.json({ limit: '20mb' }));

// Helper to sanitize base64 image data
function parseBase64(dataUrl: string): { mimeType: string; data: string } {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2],
    };
  }
  // Default to JPEG
  return {
    mimeType: 'image/jpeg',
    data: dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''),
  };
}

// Initialize Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.1-flash-lite',
    timestamp: new Date().toISOString(),
  });
});

// Candidate low-latency models for real-time video translation
const FAST_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

async function generateWithFallback(parts: any[], config: any) {
  let lastError: any = null;
  for (const model of FAST_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config,
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const isTemporaryDemand =
        err?.status === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.status === 429;

      if (isTemporaryDemand) {
        console.warn(`Model ${model} is experiencing high demand (503/429). Falling back to next model...`);
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      console.warn(`Model ${model} error:`, err?.message);
    }
  }
  throw lastError;
}

// Continuous Real-Time Sign Language Translation Endpoint
app.post('/api/translate-sign', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {
      frame,
      previousFrame,
      activeGlossSequence = [],
      currentSentence = '',
      recentTranscripts = [],
      signSystem = 'American Sign Language (ASL)',
      signLanguage = 'ASL',
      targetLanguage = 'English',
      continuousMode = true,
      sensitivity = 'high',
    } = req.body;

    if (!frame) {
      return res.status(400).json({ error: 'Missing camera frame image payload' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please check the Secrets panel.',
      });
    }

    const currentImage = parseBase64(frame);
    const parts: any[] = [];

    // Temporal frame comparison
    if (previousFrame) {
      const prevImage = parseBase64(previousFrame);
      parts.push({
        inlineData: {
          mimeType: prevImage.mimeType,
          data: prevImage.data,
        },
      });
      parts.push({
        text: 'Previous frame (start of gesture motion). Observe hand path, shape change, and location relative to chest/face.',
      });
    }

    parts.push({
      inlineData: {
        mimeType: currentImage.mimeType,
        data: currentImage.data,
      },
    });

    const activeGlossStr = Array.isArray(activeGlossSequence) && activeGlossSequence.length > 0
      ? activeGlossSequence.join(' -> ')
      : 'None (beginning of new sentence)';

    const recentContextStr = Array.isArray(recentTranscripts) && recentTranscripts.length > 0
      ? recentTranscripts.slice(-4).join('; ')
      : 'None';

    // Sign language linguistic specialization
    let languageRules = '';
    if (signLanguage === 'BSL' || signLanguage === 'Auslan') {
      languageRules = `
BSL/AUSLAN SPECIALIZED RULES:
- 2-handed manual alphabet: non-dominant hand serves as base (vowels A,E,I,O,U on fingertips).
- BSL signs: 'Please' is drawn down the cheek/chin. 'Name' is 2 fingers tapping forehead. 'Hello' is open-palm wave or salute.
- Mark twoHandedSign: true whenever both hands participate.`;
    } else if (signLanguage === 'ISL') {
      languageRules = `
ISL SPECIALIZED RULES:
- Hybrid Indian Sign Language alphabet and cultural markers (Namaste greeting with pressed palms, Chai sipping, Water drinking).
- Pay attention to hand interactions centered in front of torso.`;
    } else if (signLanguage === 'LSF') {
      languageRules = `
LSF SPECIALIZED RULES:
- French Sign Language one-handed alphabet.
- European classical signs: 'Bonjour' (chin outward), 'Merci' (chin outward), 'Oui', 'Non'.`;
    } else {
      languageRules = `
ASL SPECIALIZED RULES:
- Standard 1-handed manual alphabet (A-Z) and topic-comment grammar.
- Common gestures: 'Hello' (forehead salute), 'Thank you' (chin outward), 'Please' (circular rub on chest), 'Help' (thumbs-up fist elevated on flat palm), 'I love you' (thumb, index, pinky extended), 'Yes' (fist nodding), 'No' (index+middle snapping onto thumb), 'Want' (curved claws pulling in).`;
    }

    const promptText = `You are an expert real-time Deaf Sign Language interpreter translating video input into continuous, fluid closed-caption subtitles in ${targetLanguage}.

TARGET SIGN SYSTEM: ${signSystem} (${signLanguage})
CURRENT SENTENCE ACCUMULATING GLOSSES: [${activeGlossStr}]
CURRENT PARTIAL SENTENCE: "${currentSentence}"
RECENT CONVERSATION CONTEXT: "${recentContextStr}"
SENSITIVITY: ${sensitivity}

${languageRules}

INTERPRETATION & SENTENCE ACCUMULATION INSTRUCTIONS:
1. EXAMINE THE HANDS & MOTION:
   - Identify handshapes, palm orientation, movement direction, and contact points.
   - Look for fingerspelling, conversational signs, compound signs, and non-manual facial cues (eyebrows raised for polar questions, furrowed for WH-questions, nodding/shaking).
   - Be tolerant of casual or rapid signing and everyday webcam/phone camera angles.

2. CONTINUOUS SENTENCE CONSTRUCTION:
   - Deaf signers communicate in sequences of signs to form complete thoughts.
   - If a new sign is recognized, append its meaning to the current thought and output a fluent, complete, grammatically natural sentence in "subtitle".
   - Examples of continuous accumulation:
     * Previous signs: ["ME"], New sign: "HUNGRY" -> subtitle: "I am hungry."
     * Previous signs: ["ME", "HUNGRY"], New sign: "WANT FOOD" -> subtitle: "I am hungry and would like some food."
     * Previous signs: ["NICE"], New sign: "MEET-YOU" -> subtitle: "It is very nice to meet you."
     * Previous signs: ["WHAT"], New sign: "YOUR NAME" -> subtitle: "What is your name?"
     * Previous signs: ["PLEASE"], New sign: "HELP ME" -> subtitle: "Please help me!"
   - If hands are returning to rest or lowering, mark isSentenceComplete: true so the subtitle finalizes.
   - If hands are actively transitioning to the next sign, mark isSentenceComplete: false.

3. IDLE / NO SIGN:
   - If hands are completely away, resting on lap/desk, typing, or touching face without signing:
     detected: false, gloss: "", subtitle: "${currentSentence}", handStatus: "resting" or "no_hands".

Output strictly valid JSON according to the schema.`;

    parts.push({ text: promptText });

    const { response, modelUsed } = await generateWithFallback(parts, {
      responseMimeType: 'application/json',
      temperature: 0.2, // Low temperature for high consistency and speed
      maxOutputTokens: 350,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detected: {
            type: Type.BOOLEAN,
            description: 'Whether a sign gesture or fingerspelling was recognized.',
          },
          gloss: {
            type: Type.STRING,
            description: 'The single new sign gloss detected in this frame (e.g., "HELP", "ME", "HELLO").',
          },
          currentWord: {
            type: Type.STRING,
            description: 'The specific spoken English word corresponding to the sign in this frame.',
          },
          subtitle: {
            type: Type.STRING,
            description: 'The complete, fluent, continuous natural subtitle sentence accumulated so far.',
          },
          isSentenceComplete: {
            type: Type.BOOLEAN,
            description: 'True if the signer completed their sentence/thought or hands are resting.',
          },
          confidence: {
            type: Type.STRING,
            description: 'Confidence rating: "high", "medium", or "low".',
          },
          twoHandedSign: {
            type: Type.BOOLEAN,
            description: 'True if both hands participate in this sign.',
          },
          nonManualMarkers: {
            type: Type.STRING,
            description: 'Facial expressions or head movements (e.g. "raised questioning eyebrows").',
          },
          gestureDescription: {
            type: Type.STRING,
            description: 'Concise description of the hand movement detected.',
          },
          handStatus: {
            type: Type.STRING,
            description: '"active_signing", "transition", "resting", or "no_hands".',
          },
        },
        required: ['detected', 'gloss', 'subtitle', 'isSentenceComplete', 'confidence', 'handStatus'],
      },
    });

    const latencyMs = Date.now() - startTime;
    const textOutput = response.text ? response.text.trim() : '{}';
    let parsedData = {};

    try {
      parsedData = JSON.parse(textOutput);
    } catch {
      parsedData = {
        detected: false,
        gloss: '',
        subtitle: currentSentence || '',
        isSentenceComplete: false,
        confidence: 'medium',
        handStatus: 'resting',
      };
    }

    return res.json({
      success: true,
      data: parsedData,
      modelUsed,
      latencyMs,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const isHighDemand =
      error?.status === 503 ||
      error?.message?.includes('503') ||
      error?.message?.includes('high demand') ||
      error?.message?.includes('UNAVAILABLE') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429;

    if (isHighDemand) {
      return res.status(200).json({
        success: true,
        highDemand: true,
        data: {
          detected: false,
          gloss: '',
          subtitle: '',
          isSentenceComplete: false,
          confidence: 'low',
          handStatus: 'resting',
        },
        latencyMs,
        message: 'Model is experiencing peak load. Backing off.',
        timestamp: Date.now(),
      });
    }

    console.error('Error translating sign:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process sign translation',
      latencyMs,
    });
  }
});

// Text-to-speech audio synthesis endpoint
app.post('/api/speak', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS synthesis' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key is not configured' });
    }

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: text,
      config: {
        responseMimeType: 'audio/wav',
      },
    });

    const candidates = ttsResponse.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts && parts.length > 0 && parts[0].inlineData) {
        return res.json({
          audioBase64: parts[0].inlineData.data,
          mimeType: parts[0].inlineData.mimeType || 'audio/wav',
        });
      }
    }

    return res.status(200).json({
      message: 'TTS generation audio part not directly provided; client can use Web Speech API',
    });
  } catch (ttsErr: any) {
    console.warn('TTS error (falling back to client synthesis):', ttsErr?.message);
    return res.status(200).json({
      message: 'Server TTS fallback triggered',
      error: ttsErr?.message,
    });
  }
});

// Mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(port, () => {
    console.log(`SignStream AI server running on http://localhost:${port}`);
  });
}

startServer();
