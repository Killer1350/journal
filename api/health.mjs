const CHART_MODEL = process.env.OPENAI_CHART_MODEL || "gpt-5-mini";
const NEWS_MODEL = process.env.OPENAI_NEWS_MODEL || "gpt-5-mini";
const COPILOT_MODEL = process.env.OPENAI_COPILOT_MODEL || "gpt-5-mini";
const OPENAI_API_BASE = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");

export async function GET() {
  return Response.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    chartModel: CHART_MODEL,
    newsModel: NEWS_MODEL,
    copilotModel: COPILOT_MODEL,
    apiBase: OPENAI_API_BASE
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
