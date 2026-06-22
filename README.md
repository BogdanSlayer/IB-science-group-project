# DocChat — Ask your documents anything

A lightweight web app that lets users upload PDF or Word documents and ask Claude AI questions about them. Built with Node.js + Express on the backend and plain HTML/JS on the frontend.

![DocChat screenshot](https://placeholder.com/screenshot)

## Features

- 📄 Upload **PDF**, **Word (.docx)**, and **plain text** files (up to 20 MB)
- 💬 **Multi-turn chat** — ask follow-up questions and Claude remembers the conversation
- ⚡ **Streaming responses** — answers appear word-by-word in real time
- 🔒 No files stored on disk — text is extracted and held in memory only

---

## Quick start

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/ai-file-chat.git
cd ai-file-chat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your Anthropic API key

```bash
cp .env.example .env
```

Open `.env` and replace `your_api_key_here` with your key from [console.anthropic.com](https://console.anthropic.com).

### 4. Start the server

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

> For development with auto-reload: `npm run dev` (requires `nodemon`)

---

## Project structure

```
ai-file-chat/
├── public/
│   └── index.html       # Frontend UI
├── src/
│   ├── server.js        # Express server + API routes
│   └── extractor.js     # PDF / Word text extraction
├── uploads/             # Temp folder (auto-created, gitignored)
├── .env.example         # Environment variable template
├── .gitignore
└── package.json
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Upload a file; returns `sessionId` |
| `POST` | `/ask` | Ask a question (SSE streaming response) |
| `DELETE` | `/session/:id` | Clear a session |

---

## Deploying

### Railway / Render / Fly.io

1. Push to GitHub
2. Connect your repo to the platform
3. Set the `ANTHROPIC_API_KEY` environment variable in the platform dashboard
4. Deploy — the `npm start` command is used automatically

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | — | Your Anthropic API key |
| `PORT` | No | `3000` | Port the server listens on |

---

## Extending this project

- **Add authentication** — protect uploads with a login system (e.g. Passport.js)
- **Persist sessions** — store sessions in Redis or a database instead of memory
- **Support more file types** — add Excel, CSV, or images (via Claude's vision API)
- **Rate limiting** — add `express-rate-limit` to prevent abuse

---

## License

MIT
