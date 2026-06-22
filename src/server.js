require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Anthropic = require("@anthropic-ai/sdk");
const { extractText } = require("./extractor");

const app = express();
const PORT = process.env.PORT || 3000;

// Anthropic client
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory session store: sessionId -> { filename, text }
const sessions = new Map();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config — accept PDF and Word docs only
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, Word (.docx), and plain text files are allowed."));
    }
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── POST /upload ──────────────────────────────────────────────────────────────
// Receives a file, extracts its text, stores it in-memory, returns a sessionId.
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  try {
    const text = await extractText(req.file.path, req.file.mimetype);

    if (!text || text.trim().length === 0) {
      return res.status(422).json({ error: "Could not extract any text from this file." });
    }

    // Clean up the uploaded file — we only need the text
    fs.unlinkSync(req.file.path);

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessions.set(sessionId, {
      filename: req.file.originalname,
      text: text.slice(0, 100_000), // cap at ~100k chars to stay within context limits
      history: [],
    });

    return res.json({ sessionId, filename: req.file.originalname });
  } catch (err) {
    console.error("Upload error:", err);
    // Clean up on failure
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: err.message || "Failed to process file." });
  }
});

// ── POST /ask ─────────────────────────────────────────────────────────────────
// Accepts { sessionId, question } and streams Claude's answer back.
app.post("/ask", async (req, res) => {
  const { sessionId, question } = req.body;

  if (!sessionId || !question) {
    return res.status(400).json({ error: "sessionId and question are required." });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found. Please upload your file again." });
  }

  // Build conversation history for multi-turn Q&A
  const systemPrompt = `You are a helpful assistant that answers questions about an uploaded document.

Document name: ${session.filename}

Document content:
---
${session.text}
---

Answer questions based only on the document content above. If the answer isn't in the document, say so clearly. Be concise and accurate.`;

  const messages = [
    ...session.history,
    { role: "user", content: question },
  ];

  // Stream the response
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

    // Store exchange in history for follow-up questions
    session.history.push({ role: "user", content: question });
    session.history.push({ role: "assistant", content: fullReply });

    // Keep history from growing too large (last 10 exchanges)
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Claude API error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message || "AI request failed." })}\n\n`);
    res.end();
  }
});

// ── DELETE /session ───────────────────────────────────────────────────────────
// Clears a session (e.g. when user uploads a new file)
app.delete("/session/:sessionId", (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}\n`);
});
