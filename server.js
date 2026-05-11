const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");

loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_BASE = (
  process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta"
).replace(/\/$/, "");
const CHART_MODEL = process.env.GEMINI_CHART_MODEL || "gemini-2.5-flash";
const NEWS_MODEL = process.env.GEMINI_NEWS_MODEL || "gemini-2.5-flash";
const COPILOT_MODEL = process.env.GEMINI_COPILOT_MODEL || "gemini-2.5-flash";
const ROOT = __dirname;
const JSON_LIMIT_BYTES = 20 * 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(text);
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > JSON_LIMIT_BYTES) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function safeJoin(root, requestedPath) {
  const cleanPath = requestedPath === "/" ? "/index.html" : requestedPath;
  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.some((segment) => segment.startsWith("."))) {
    return null;
  }

  const resolvedPath = path.normalize(path.join(root, cleanPath));
  if (!resolvedPath.startsWith(root)) {
    return null;
  }
  return resolvedPath;
}

async function serveStatic(url, res) {
  const filePath = safeJoin(ROOT, decodeURIComponent(url.pathname));
  if (!filePath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const ext = path.extname(finalPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";
    const data = await fsp.readFile(finalPath);
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(res, 404, "Not found");
      return;
    }
    sendText(res, 500, "Unable to load file");
  }
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

async function proxyGemini(req, res) {
  if (!GEMINI_API_KEY) {
    sendJson(res, 503, {
      error: {
        message: "Server AI is not configured yet. Add GEMINI_API_KEY to the .env file on the server."
      }
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: { message: error.message || "Invalid JSON body." } });
    return;
  }

  const payload = body && typeof body.payload === "object" ? body.payload : null;
  if (!payload) {
    sendJson(res, 400, { error: { message: "Missing payload object." } });
    return;
  }

  try {
    const model = String(payload.model || CHART_MODEL).trim();
    const modelPath = model.startsWith("models/") ? model : "models/" + model;
    const response = await fetch(GEMINI_API_BASE + "/" + modelPath + ":generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify(translatePayloadToGemini(payload))
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      sendJson(res, response.status, data?.error ? data : {
        error: {
          message: data?.error?.message || "Gemini request failed."
        }
      });
      return;
    }

    sendJson(res, 200, normalizeGeminiResponse(data));
  } catch (error) {
    sendJson(res, 502, {
      error: {
        message: "Unable to reach Gemini from the server.",
        details: error.message
      }
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      provider: "gemini",
      configured: Boolean(GEMINI_API_KEY),
      chartModel: CHART_MODEL,
      newsModel: NEWS_MODEL,
      copilotModel: COPILOT_MODEL,
      apiBase: GEMINI_API_BASE
    });
    return;
  }

  if (
    req.method === "POST" &&
    (url.pathname === "/api/gemini" || url.pathname === "/api/openai")
  ) {
    await proxyGemini(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(url, res);
    return;
  }

  sendText(res, 405, "Method not allowed");
});

server.listen(PORT, HOST, () => {
  console.log("SignalPro workbook server running at http://" + HOST + ":" + PORT);
});
