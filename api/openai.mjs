const OPENAI_API_BASE = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
const JSON_LIMIT_BYTES = 20 * 1024 * 1024;

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(503, {
      error: {
        message: "Server AI is not configured yet. Add OPENAI_API_KEY in your Vercel project environment variables."
      }
    });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > JSON_LIMIT_BYTES) {
    return jsonResponse(413, {
      error: {
        message: "Request body is too large."
      }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return jsonResponse(400, {
      error: {
        message: "Invalid JSON body."
      }
    });
  }

  const payload = body && typeof body.payload === "object" ? body.payload : null;
  if (!payload) {
    return jsonResponse(400, {
      error: {
        message: "Missing payload object."
      }
    });
  }

  try {
    const response = await fetch(OPENAI_API_BASE + "/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return jsonResponse(502, {
      error: {
        message: "Unable to reach OpenAI from the Vercel function.",
        details: error.message
      }
    });
  }
}
