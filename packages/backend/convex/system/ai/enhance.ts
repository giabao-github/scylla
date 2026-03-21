import { v } from "convex/values";

import { action } from "@workspace/backend/_generated/server";

export const enhancePrompt = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Enhance this prompt to be clearer and more effective. Return only the enhanced prompt, nothing else:\n\n${args.text}`,
                },
              ],
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  },
});
