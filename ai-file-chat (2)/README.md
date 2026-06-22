# DocChat — Ask your documents anything

A polished web app that lets you upload PDF or Word documents and have a conversation with them using Claude AI. No config files needed — just enter your API key in the app on first launch.

## Features

- 🔑 **In-app API key setup** — paste your key once, stored in your browser
- 📄 **PDF, Word (.docx), and plain text** support (up to 20 MB)
- 💬 **Streaming chat** — answers appear word-by-word in real time
- 📝 **Markdown rendering** — formatted responses with bullet points, bold text, etc.
- 🔄 **Multi-turn memory** — ask follow-up questions within a session
- ✨ **Polished dark UI** — animated progress, typing indicators, smooth transitions

---

## Quick start

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/ai-file-chat.git
cd ai-file-chat
```

### 2. Install

```bash
npm install
```

### 3. Start

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) — you'll be prompted to enter your Anthropic API key on the first screen. Get one free at [console.anthropic.com](https://console.anthropic.com).

> For auto-reload during development: `npm run dev`

---

## (Optional) Pre-configure the API key via environment variable

If you're deploying to a server and don't want users to enter a key, create a `.env` file:

```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

When `ANTHROPIC_API_KEY` is set in the environment, the app uses it as a fallback if no key is provided in the request header.

---

## Project structure

```
ai-file-chat/
├── public/
│   └── index.html       # Frontend — API key setup, upload, chat UI
├── src/
│   ├── server.js        # Express server + API routes
│   └── extractor.js     # PDF / Word / text extraction
├── uploads/             # Temp folder (auto-created, gitignored)
├── .env.example
├── .gitignore
└── package.json
```

## API routes

| Method   | Path                  | Description                          |
|----------|-----------------------|--------------------------------------|
| `POST`   | `/validate-key`       | Check if an Anthropic API key works  |
| `POST`   | `/upload`             | Upload file → returns `sessionId`    |
| `POST`   | `/ask`                | Ask a question (SSE stream)          |
| `DELETE` | `/session/:id`        | Clear a session                      |

---

## Deploying (Railway / Render / Fly.io)

1. Push to GitHub
2. Connect repo to the platform
3. Optionally set `ANTHROPIC_API_KEY` as an env var on the platform
4. Deploy — `npm start` runs automatically

Users can also enter their own API keys directly in the UI.

---

## License

MIT
