require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Anthropic = require("@anthropic-ai/sdk");
const { extractText } = require("./extractor");

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory session store: sessionId -> { filename, text, history }
const sessions = new Map();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only PDF, Word (.docx), and plain text files are allowed."));
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── POST /validate-key ────────────────────────────────────────────────────────
// Validates an Anthropic API key by making a minimal API call.
app.post("/validate-key", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return res.status(400).json({ valid: false, error: "Key must start with sk-ant-" });
  }
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 10,
      messages: [{ role: "user", content: "Hi" }],
    });
    return res.json({ valid: true });
  } catch (err) {
    const msg = err?.status === 401 ? "Invalid API key." : "Could not connect to Anthropic.";
    return res.status(400).json({ valid: false, error: msg });
  }
});

// ── POST /upload ──────────────────────────────────────────────────────────────
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  // API key comes from request header (sent by frontend from localStorage)
  const apiKey = req.headers["x-api-key"] || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(401).json({ error: "No API key provided." });

  try {
    const text = await extractText(req.file.path, req.file.mimetype);
    if (!text || text.trim().length === 0) {
      return res.status(422).json({ error: "Could not extract any text from this file." });
    }
    fs.unlinkSync(req.file.path);

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessions.set(sessionId, {
      filename: req.file.originalname,
      text: text.slice(0, 100_000),
      history: [],
      apiKey, // store key per session
    });

    return res.json({ sessionId, filename: req.file.originalname, charCount: text.length });
  } catch (err) {
    console.error("Upload error:", err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: err.message || "Failed to process file." });
  }
});

// ── POST /ask ─────────────────────────────────────────────────────────────────
app.post("/ask", async (req, res) => {
  const { sessionId, question } = req.body;
  if (!sessionId || !question) {
    return res.status(400).json({ error: "sessionId and question are required." });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found. Please upload your file again." });
  }

  const anthropic = new Anthropic({ apiKey: session.apiKey });

  const systemPrompt = `You are a helpful assistant that answers questions about an uploaded document.

Document name: ${session.filename}

Document content:
---
${session.text}
---

Answer questions based only on the document content above. If the answer isn't in the document, say so clearly.
Format your answers using markdown where appropriate (bold for key terms, bullet lists for enumerations, etc).`;

  const messages = [...session.history, { role: "user", content: question }];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    let fullReply = "";
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    stream.on("text", (chunk) => {
      fullReply += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    await stream.finalMessage();

    session.history.push({ role: "user", content: question });
    session.history.push({ role: "assistant", content: fullReply });
    if (session.history.length > 20) session.history = session.history.slice(-20);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Claude API error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message || "AI request failed." })}\n\n`);
    res.end();
  }
});

// ── DELETE /session/:id ───────────────────────────────────────────────────────
app.delete("/session/:sessionId", (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n🚀 DocChat running at http://localhost:${PORT}\n`);
});
