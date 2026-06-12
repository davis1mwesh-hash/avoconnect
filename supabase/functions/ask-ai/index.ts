import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    const { query } = await req.json();

    // 1. Google Search via Serper (Market/Trend Data)
    const searchResponse = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": Deno.env.get("SERPER_API_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });
    const searchData = await searchResponse.json();

    // 2. Gemini Analysis (The Brain)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Answer this based on this market data: ${JSON.stringify(searchData)}. Question: ${query}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const aiData = await geminiResponse.json();
    return Response.json(aiData);
  }),
};