const CHART_MODEL = process.env.GEMINI_CHART_MODEL || "gemini-2.5-flash";
const NEWS_MODEL = process.env.GEMINI_NEWS_MODEL || "gemini-2.5-flash";
const COPILOT_MODEL = process.env.GEMINI_COPILOT_MODEL || "gemini-2.5-flash";
const GEMINI_API_BASE = (
  process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta"
).replace(/\/$/, "");

export async function GET() {
  return Response.json({
    provider: "gemini",
    configured: Boolean(process.env.GEMINI_API_KEY),
    chartModel: CHART_MODEL,
    newsModel: NEWS_MODEL,
    copilotModel: COPILOT_MODEL,
    apiBase: GEMINI_API_BASE
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
