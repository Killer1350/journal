const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");

loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_API_BASE = (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
const CHART_MODEL = process.env.OPENAI_CHART_MODEL || "gpt-5-mini";
const NEWS_MODEL = process.env.OPENAI_NEWS_MODEL || "gpt-5-mini";
const COPILOT_MODEL = process.env.OPENAI_COPILOT_MODEL || "gpt-5-mini";
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

async function proxyOpenAI(req, res) {
  if (!OPENAI_API_KEY) {
    sendJson(res, 503, {
      error: {
        message: "Server AI is not configured yet. Add OPENAI_API_KEY to the .env file on the server."
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
    const response = await fetch(OPENAI_API_BASE + "/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "application/json; charset=utf-8";
    res.writeHead(response.status, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    res.end(text);
  } catch (error) {
    sendJson(res, 502, {
      error: {
        message: "Unable to reach OpenAI from the server.",
        details: error.message
      }
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      configured: Boolean(OPENAI_API_KEY),
      chartModel: CHART_MODEL,
      newsModel: NEWS_MODEL,
      copilotModel: COPILOT_MODEL,
      apiBase: OPENAI_API_BASE
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/openai") {
    await proxyOpenAI(req, res);
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
