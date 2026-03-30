import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-2.5-flash';

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set in your .env file');
  return new GoogleGenAI({ apiKey: key });
}

function canvasToBase64(canvasId = 'drawing-canvas'): string {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas not found');
  return canvas.toDataURL('image/png').split(',')[1];
}

export async function analyzeDrawing(): Promise<string> {
  const ai = getClient();
  const base64 = canvasToBase64();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64 } },
        {
          text: `You are looking at a drawing made using hand gestures on a virtual whiteboard.
          Describe what you see in a fun, enthusiastic, and creative way!
          Be specific about shapes, lines, and what they could represent.
          Keep it to 2-3 sentences max. Start with something like "I see..." or "This looks like..."`
        }
      ]
    }]
  });
  return response.text ?? 'Hmm, I can\'t quite make that out!';
}

export async function generateChallenge(): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      parts: [{
        text: `Give me ONE single simple object, animal, or food that would be fun and possible to draw using hand gestures on a whiteboard.
        Choose something recognizable and drawable in under 60 seconds.
        Reply with ONLY the word or short phrase (2 words max). Nothing else, no punctuation.
        Examples: cat, sun, pizza, house, rocket, fish, tree, star`
      }]
    }]
  });
  return (response.text ?? 'cat').trim().toLowerCase();
}

export async function judgeDrawing(target: string): Promise<{ score: number; feedback: string; emoji: string }> {
  const ai = getClient();
  const base64 = canvasToBase64();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64 } },
        {
          text: `The person was supposed to draw: "${target}".
          Look at their hand-gesture drawing and judge it!
          Be fun, encouraging but honest.
          Reply ONLY with valid JSON in this exact format (no markdown, no extra text):
          {"score": 7, "feedback": "Your feedback here in 1-2 sentences.", "emoji": "🎨"}
          Use a fitting emoji for the score (🏆 for 9-10, 🎨 for 7-8, 👍 for 5-6, 😅 for 3-4, 💀 for 1-2).`
        }
      ]
    }]
  });

  const text = response.text ?? '{}';
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // fall through
    }
  }
  return { score: 5, feedback: 'Interesting interpretation! Keep practicing!', emoji: '🎨' };
}

export async function roastDrawing(): Promise<string> {
  const ai = getClient();
  const base64 = canvasToBase64();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64 } },
        {
          text: `You are a hilariously savage but lovable art critic looking at a hand-gesture drawing on a whiteboard.
          Roast this drawing in the most entertaining way possible! Be funny, witty, and creative.
          Compare it to ridiculous things. But end with one tiny compliment.
          Keep it to 3-4 sentences. Make it FUNNY!`
        }
      ]
    }]
  });
  return response.text ?? 'I\'ve seen better art from a blindfolded octopus... but you\'ve got spirit! 🦑';
}
