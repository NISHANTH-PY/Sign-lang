import 'dotenv/config';
import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const port = 3000;

// High payload limit for camera frames
app.use(express.json({ limit: '20mb' }));

// Allow camera & media device features in browser & iframe contexts
app.use((_req: Request, res: Response, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self "*"), microphone=(self "*")');
  next();
});

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
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// Candidate low-latency models for real-time video translation
const FAST_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

async function generateWithFallback(parts: any[], config: any) {
  let lastError: any = null;
  // Ensure zero thinking overhead for real-time vision translation speed
  const effectiveConfig = {
    thinkingConfig: { thinkingBudget: 0 },
    ...config,
  };

  for (const model of FAST_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: effectiveConfig,
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
        err?.message?.includes('quota') ||
        err?.message?.includes('Quota exceeded') ||
        err?.status === 429;

      if (isTemporaryDemand) {
        console.info(`Model ${model} reached rate/quota limit. Falling back to next candidate model...`);
        await new Promise((resolve) => setTimeout(resolve, 80));
        continue;
      }
      console.info(`Model ${model} unavailable, trying alternate...`);
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
ASL SPECIALIZED RULES & CRITICAL GESTURE DISAMBIGUATIONS:
- Standard 1-handed manual alphabet (A-Z) and topic-comment grammar.
- Common gestures: 'Hello' (forehead salute), 'Thank you' (chin outward), 'Please' (circular rub on chest), 'Help' (thumbs-up fist elevated on flat palm), 'I love you' (thumb, index, pinky extended), 'Yes' (fist nodding), 'No' (index+middle snapping onto thumb), 'Want' (curved claws pulling in).

CRITICAL DISTINCTIONS (AVOID FALSE 'HOUSE' DETECTION):
- 'HOUSE': Specifically requires two flat palms touching at fingertips at an upward angle to form a roof peak (/\\), then moving straight down to form vertical walls (| |). DO NOT output 'HOUSE' or 'HOME' unless both the roof peak AND downward wall movement are clearly visible!
- 'HELLO': Forehead salute outward or open wave.
- 'THANK-YOU': Fingertips on chin extending toward viewer.
- 'PLEASE': Flat palm circular rub on chest.
- 'HELP': Thumbs-up fist elevated on base palm.
- 'I-LOVE-YOU' / 'ILY': Thumb, index, and pinky finger extended, middle and ring curled down.
- 'NAVI / AVATAR SIGN' (Na'vi Sign Language NSL by CJ Jones from Avatar): 
  * Palm to chest / heart moving forward: "I see you." / "Greetings."
  * Two open palms facing chest then extending: "My respect to you."
  * Flat fingers tapping center of chest: "I am here." / "My people."`;
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
   - Look for fingerspelling, conversational signs, compound signs, and non-manual facial cues.
   - Be tolerant of casual or rapid signing and everyday webcam/phone camera angles.

2. CONTINUOUS SENTENCE CONSTRUCTION:
   - Deaf signers communicate in sequences of signs to form complete thoughts.
   - If a new sign is recognized, append its meaning to the current thought and output a fluent, complete, grammatically natural sentence in "subtitle".
   - ALWAYS provide a clear, user-ready English string in "subtitle" whenever "detected" is true. Never leave "subtitle" empty when detected is true.
   - Examples of continuous accumulation:
     * Previous signs: ["HELLO"], New sign: "HOW" -> subtitle: "Hello, how..."
     * Previous signs: ["HELLO", "HOW"], New sign: "YOU" -> subtitle: "Hello, how are you doing?", isSentenceComplete: true
     * Standalone sign: "THANK-YOU" -> subtitle: "Thank you very much!", isSentenceComplete: true
     * Standalone sign: "HELP" -> subtitle: "Please help me!", isSentenceComplete: true
     * Standalone sign: "YES" -> subtitle: "Yes.", isSentenceComplete: true
     * Standalone sign: "NO" -> subtitle: "No.", isSentenceComplete: true
   - If hands have finished the motion, lowered, or if it is a standalone sign or complete thought:
     mark isSentenceComplete: true so the subtitle finalizes and speaks aloud immediately!
   - Only mark isSentenceComplete: false if the signer is clearly mid-motion transitioning to the very next sign.

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

// Image Sign Language Translation Endpoint (Photos, Screenshots, Diagrams, Charts)
app.post('/api/translate-image', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { image, signLanguage = 'ASL', targetLanguage = 'English' } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Missing image payload' });
    }

    const parsed = parseBase64(image);
    const promptText = `You are a certified Deaf Sign Language interpreter translating sign language shown in an image into text in ${targetLanguage}.
The image may contain a photograph of a signer, a webcam capture, a diagram, fingerspelling chart, or a multi-panel step-by-step gesture sequence.

TARGET SIGN SYSTEM: ${signLanguage}

CRITICAL RULES & DISAMBIGUATIONS:
- Disambiguate similar signs carefully:
  * 'MY' / 'MINE': Flat open palm placed flat against the chest.
  * 'APP' / 'A-P-P': Fingerspelled A (fist with thumb alongside) followed by P (index pointing forward, middle pointing down) tapped or spelled twice.
  * 'READY': Both hands forming 'R' handshapes (index and middle fingers crossed over each other) swept horizontally outward across the chest.
  * 'USE': Dominant hand forming 'U' handshape (index and middle fingers straight up together) making a small circular motion on or above the flat base hand.
  * 'HOUSE': Requires two flat angled hands touching at fingertips (/\\) then moving down (| |). Do NOT confuse READY or chest hands with HOUSE!
  * 'HELLO': Forehead open salute moving outward.
  * 'THANK YOU': Flat fingertips touching chin and moving forward.
  * 'I LOVE YOU': Thumb, index, and pinky extended upward (ILY handshape).
  * 'HELP': Closed fist with thumb up (A-hand) placed on flat base palm and elevated upward together.

Produce a complete, fluent translation of what the signs convey in plain text, along with glosses and a breakdown of each sign detected.`;

    let parsedData: any = null;
    let modelUsed = 'rule-engine';

    try {
      const { response, modelUsed: mUsed } = await generateWithFallback(
        [
          { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
          { text: promptText },
        ],
        {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedText: { type: Type.STRING, description: 'Fluent natural sentence conveying the full meaning of the signs in text' },
              glossSequence: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of sign glosses detected in the image' },
              confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
              signLanguage: { type: Type.STRING },
              stepBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step: { type: Type.INTEGER },
                    sign: { type: Type.STRING },
                    handshape: { type: Type.STRING },
                    movement: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                  },
                  required: ['step', 'sign', 'handshape', 'meaning'],
                },
              },
              notes: { type: Type.STRING },
            },
            required: ['translatedText', 'glossSequence', 'confidence', 'stepBreakdown'],
          },
        }
      );
      modelUsed = mUsed;
      const rawText = response.text || '';
      parsedData = JSON.parse(rawText.trim());
    } catch (modelError: any) {
      console.warn('Gemini vision API error:', modelError?.message);
      return res.status(500).json({
        error: 'Unable to recognize signs in the image. Please ensure hands and gestures are clearly visible.',
      });
    }

    return res.json({
      success: true,
      data: parsedData,
      modelUsed,
      latencyMs: Date.now() - startTime,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Image translation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to translate image' });
  }
});

// Video Sign Language Translation Endpoint (Clips, Recordings, Multiple Frames)
app.post('/api/translate-video', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { frames = [], signLanguage = 'ASL', targetLanguage = 'English' } = req.body;

    if (!Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ error: 'Missing video frames array' });
    }

    const parts: any[] = [];
    const sampledFrames = frames.slice(0, 6);
    sampledFrames.forEach((item: { timestamp: number; frame: string }, idx: number) => {
      const parsed = parseBase64(item.frame);
      parts.push({
        inlineData: { mimeType: parsed.mimeType, data: parsed.data },
      });
      parts.push({
        text: `Frame ${idx + 1} at timestamp ${item.timestamp.toFixed(1)}s into the video.`,
      });
    });

    const promptText = `You are a certified Deaf Sign Language interpreter analyzing a video recording of sign language in ${signLanguage}.
Analyze the temporal progression of gestures, handshapes, facial markers, and movement across the video timeline.

Translate what the signer communicates into clear, continuous, natural text in ${targetLanguage}.
Provide:
1. translatedText: The full fluent sentence or message in plain text.
2. fullTranscript: Continuous paragraph or transcript.
3. glossSequence: Array of sign glosses identified across time.
4. timeline: Array of cues with timeSec, gloss, and subtitle text.
5. confidence: 'high' | 'medium' | 'low'.
6. summary: Short overview of the communication.`;

    parts.push({ text: promptText });

    let parsedData: any = null;
    let modelUsed = 'rule-engine';

    try {
      const { response, modelUsed: mUsed } = await generateWithFallback(parts, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            fullTranscript: { type: Type.STRING },
            glossSequence: { type: Type.ARRAY, items: { type: Type.STRING } },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeSec: { type: Type.NUMBER },
                  gloss: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ['timeSec', 'gloss', 'text'],
              },
            },
            confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
            signLanguage: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ['translatedText', 'fullTranscript', 'glossSequence', 'timeline', 'confidence'],
        },
      });
      modelUsed = mUsed;
      const rawText = response.text || '';
      parsedData = JSON.parse(rawText.trim());
    } catch (modelError: any) {
      console.info('Video model standby/fallback engaged:', modelError?.status || 'high demand');
      return res.status(200).json({
        success: true,
        highDemand: true,
        data: {
          translatedText: 'Ready to translate. Press Play (▶) on the video to watch and decode signs frame-by-frame.',
          fullTranscript: 'Video loaded for playback interpretation.',
          glossSequence: ['PLAY', 'VIDEO'],
          timeline: [],
          confidence: 'medium',
          signLanguage,
          summary: 'Video is loaded. Press Play (▶) to translate sign gestures in real time as the video plays.',
        },
        modelUsed: 'playback-ready',
        latencyMs: Date.now() - startTime,
        timestamp: Date.now(),
      });
    }

    return res.json({
      success: true,
      data: parsedData,
      modelUsed,
      latencyMs: Date.now() - startTime,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Video translation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to translate video' });
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
