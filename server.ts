import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = 3000;

// Allow payloads up to 25MB for base64 images
app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({});

// OCR Endpoint to extract gold / coins numbers from pasted images
app.post('/api/ocr-gold', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Missing image payload' });
    }

    let mimeType = 'image/png';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    // Call Gemini 3.8 Flash to accurately read gold / coins count from game screenshot or crop
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            {
              text: `You are an OCR specialist extracting numeric gold/coin values from game screenshots or crops.
Look for numbers representing gold, coins, silver, or currency (e.g. "10,736", "10736", "5,200 Gold", "Coins: 150000").
Extract the single most prominent or relevant gold number.
Respond ONLY with a JSON object in this exact format:
{"number": <integer or null>, "rawText": "<digits and characters found>"}
Do not wrap in markdown or add explanations.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      // Clean fallback if response had extra formatting
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.json({
      success: true,
      number: typeof parsed.number === 'number' ? parsed.number : null,
      rawText: parsed.rawText || '',
    });
  } catch (err: any) {
    console.error('OCR Extraction error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to extract gold number from image',
    });
  }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

start();
