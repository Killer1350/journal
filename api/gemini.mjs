const GEMINI_API_BASE = (
  process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta"
).replace(/\/$/, "");
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

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(String(dataUrl || ""));
  if (!match) {
    throw new Error("Invalid image format. Upload the screenshot again.");
  }

  return {
    mimeType: match[1],
    data: match[2]
  };
}

function buildGeminiParts(items) {
  const parts = [];

  (items || []).forEach((item) => {
    if (!item || typeof item !== "object") return;

    if (item.type === "input_text" && typeof item.text === "string" && item.text.trim()) {
      parts.push({ text: item.text.trim() });
      return;
    }

    if (item.type === "input_image" && typeof item.image_url === "string" && item.image_url.trim()) {
      const image = parseDataUrl(item.image_url.trim());
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }
  });

  return parts;
}

function translatePayloadToGemini(payload) {
  const messages = Array.isArray(payload?.input) ? payload.input : [];
  const systemText = [];
  const contents = [];

  messages.forEach((message) => {
    const parts = buildGeminiParts(message?.content);
    if (!parts.length) return;

    if (message?.role === "system") {
      parts.forEach((part) => {
        if (typeof part.text === "string" && part.text.trim()) {
          systemText.push(part.text.trim());
        }
      });
      return;
    }

    contents.push({
      role: message?.role === "assistant" ? "model" : "user",
      parts
    });
  });

  if (!contents.length) {
    throw new Error("Missing usable prompt content.");
  }

  const requestBody = {
    contents
  };

  if (systemText.length) {
    requestBody.systemInstruction = {
      role: "system",
      parts: [{ text: systemText.join("\n\n") }]
    };
  }

  const schema = payload?.text?.format?.schema;
  if (schema && typeof schema === "object") {
    requestBody.generationConfig = {
      responseMimeType: "application/json",
      responseJsonSchema: schema
    };
  }

  if (Array.isArray(payload?.tools) && payload.tools.some((tool) => tool?.type === "web_search")) {
    requestBody.tools = [
      {
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.7
          }
        }
      }
    ];
  }

  return requestBody;
}

function collectGeminiAnnotations(responseData) {
  const chunks = responseData?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const annotations = [];

  chunks.forEach((chunk) => {
    const source = chunk?.web || chunk?.retrievedContext || chunk?.maps || null;
    const url = source?.uri || "";
    if (!url || seen.has(url)) return;
    seen.add(url);
    annotations.push({
      url,
      title: source?.title || url
    });
  });

  return annotations;
}

function normalizeGeminiResponse(responseData) {
  const candidate = responseData?.candidates?.[0] || {};
  const parts = candidate?.content?.parts || [];
  const outputText = parts
    .map((part) => (typeof part?.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!outputText) {
    const blockReason = responseData?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error("Gemini blocked this request: " + blockReason + ".");
    }
    throw new Error("Gemini returned an empty response.");
  }

  return {
    output_text: outputText,
    output: [
      {
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: outputText,
            annotations: collectGeminiAnnotations(responseData)
          }
        ]
      }
    ]
  };
}

export async function POST(request) {
  if (!process.env.GEMINI_API_KEY) {
    return jsonResponse(503, {
      error: {
        message: "Server AI is not configured yet. Add GEMINI_API_KEY in your project environment variables."
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
    const model = String(payload.model || process.env.GEMINI_CHART_MODEL || "gemini-2.5-flash").trim();
    const modelPath = model.startsWith("models/") ? model : "models/" + model;
    const response = await fetch(GEMINI_API_BASE + "/" + modelPath + ":generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(translatePayloadToGemini(payload))
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonResponse(response.status, data?.error ? data : {
        error: {
          message: data?.error?.message || "Gemini request failed."
        }
      });
    }

    return jsonResponse(200, normalizeGeminiResponse(data));
  } catch (error) {
    return jsonResponse(502, {
      error: {
        message: "Unable to reach Gemini from the serverless function.",
        details: error.message
      }
    });
  }
}
