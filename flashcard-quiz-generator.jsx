import { useState, useRef } from "react";

const STAGES = { INPUT: "input", LOADING: "loading", STUDY: "study", QUIZ: "quiz", RESULTS: "results" };

function FlipCard({ card, index }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div onClick={() => setFlipped(!flipped)} style={{
      cursor: "pointer", perspective: "1000px", height: 180, marginBottom: 16
    }}>
      <div style={{
        position: "relative", width: "100%", height: "100%",
        transformStyle: "preserve-3d",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        transition: "transform 0.5s cubic-bezier(.4,2,.6,1)"
      }}>
        {/* Front */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%)",
          borderRadius: 14, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "24px 28px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)"
        }}>
          <div style={{ color: "#7eb8f7", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
            Card {index + 1} · tap to flip
          </div>
          <div style={{ color: "#fff", fontSize: 17, fontWeight: 600, textAlign: "center", lineHeight: 1.5 }}>
            {card.front}
          </div>
        </div>
        {/* Back */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "linear-gradient(135deg, #1a5c3a 0%, #2e8a58 100%)",
          borderRadius: 14, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "24px 28px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)"
        }}>
          <div style={{ color: "#7ef7b0", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
            Answer
          </div>
          <div style={{ color: "#fff", fontSize: 16, textAlign: "center", lineHeight: 1.6 }}>
            {card.back}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizQuestion({ q, index, onAnswer, answered }) {
  const [selected, setSelected] = useState(null);
  const handleSelect = (opt) => {
    if (answered) return;
    setSelected(opt);
    onAnswer(opt === q.answer);
  };
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "22px 26px",
      marginBottom: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      border: "1.5px solid #e8edf5"
    }}>
      <div style={{ fontWeight: 700, color: "#1e3a5f", marginBottom: 14, fontSize: 16, lineHeight: 1.5 }}>
        <span style={{ color: "#7eb8f7", marginRight: 8 }}>Q{index + 1}.</span>{q.question}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((opt, i) => {
          let bg = "#f4f7fb", border = "1.5px solid #dde4ef", color = "#334";
          if (selected) {
            if (opt === q.answer) { bg = "#e6f9ee"; border = "1.5px solid #2e8a58"; color = "#1a5c3a"; }
            else if (opt === selected) { bg = "#fde8e8"; border = "1.5px solid #c0392b"; color = "#7b1a1a"; }
          }
          return (
            <div key={i} onClick={() => handleSelect(opt)} style={{
              padding: "11px 16px", borderRadius: 9, cursor: answered ? "default" : "pointer",
              background: bg, border, color, fontWeight: 500, fontSize: 15,
              transition: "all 0.18s", display: "flex", alignItems: "center", gap: 10
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: "50%", display: "inline-flex",
                alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                background: selected && opt === q.answer ? "#2e8a58" : selected && opt === selected ? "#c0392b" : "#dde4ef",
                color: selected && (opt === q.answer || opt === selected) ? "#fff" : "#667"
              }}>
                {["A", "B", "C", "D"][i]}
              </span>
              {opt}
            </div>
          );
        })}
      </div>
      {selected && (
        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 8,
          background: selected === q.answer ? "#e6f9ee" : "#fde8e8",
          color: selected === q.answer ? "#1a5c3a" : "#7b1a1a",
          fontSize: 14, fontWeight: 600
        }}>
          {selected === q.answer ? "✓ Correct!" : `✗ Correct answer: ${q.answer}`}
          {q.explanation && <div style={{ fontWeight: 400, marginTop: 4, opacity: 0.85 }}>{q.explanation}</div>}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState(STAGES.INPUT);
  const [text, setText] = useState("");
  const [cards, setCards] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("cards");
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(file);
  };

  const generate = async () => {
    if (!text.trim()) { setError("Please paste or upload some study material first."); return; }
    setError(""); setStage(STAGES.LOADING);
    try {
      const prompt = `You are a study tool that creates educational flashcards and quiz questions.

Given the study material below, generate:
1. Exactly 8 flashcards — each with a concise question on the front and a clear answer on the back.
2. Exactly 6 multiple-choice quiz questions — each with 4 options (A/B/C/D), one correct answer, and a brief explanation.

Return ONLY valid JSON, no markdown, no explanation, just the raw JSON object:
{
  "flashcards": [
    { "front": "...", "back": "..." }
  ],
  "quiz": [
    { "question": "...", "options": ["...", "...", "...", "..."], "answer": "...", "explanation": "..." }
  ]
}

Study Material:
${text.slice(0, 6000)}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const raw = data.content.map(b => b.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setCards(parsed.flashcards || []);
      setQuestions(parsed.quiz || []);
      setAnswers([]);
      setStage(STAGES.STUDY);
      setTab("cards");
    } catch (err) {
      setError("Something went wrong generating your study set. Please try again.");
      setStage(STAGES.INPUT);
    }
  };

  const score = answers.filter(Boolean).length;

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg, #0f1f3d 0%, #1a3358 60%, #0d2b45 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "0 0 60px"
    }}>
      {/* Header */}
      <div style={{ padding: "36px 24px 24px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(126,184,247,0.12)", borderRadius: 12, padding: "6px 16px", marginBottom: 14 }}>
          <span style={{ color: "#7eb8f7", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>AI Study Tools</span>
        </div>
        <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 800, margin: "0 0 8px", letterSpacing: -0.5 }}>
          Flashcard & Quiz Generator
        </h1>
        <p style={{ color: "#8ba9c9", fontSize: 15, margin: 0 }}>
          Paste your notes — Claude turns them into flashcards and a scored quiz
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>

        {/* INPUT */}
        {stage === STAGES.INPUT && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 18, padding: 28, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{
              border: "2px dashed rgba(126,184,247,0.35)", borderRadius: 12,
              padding: "28px 24px", textAlign: "center", marginBottom: 18,
              cursor: "pointer", transition: "border-color 0.2s"
            }} onClick={() => fileRef.current.click()}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ color: "#7eb8f7", fontWeight: 600, fontSize: 15 }}>Upload a .txt file</div>
              <div style={{ color: "#5a7a9a", fontSize: 13, marginTop: 4 }}>or paste your material below</div>
              <input ref={fileRef} type="file" accept=".txt" style={{ display: "none" }} onChange={handleFile} />
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste your study material here — lecture notes, textbook excerpts, article text..."
              style={{
                width: "100%", minHeight: 180, padding: 16, borderRadius: 10,
                background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)",
                color: "#e8f0fb", fontSize: 15, resize: "vertical", lineHeight: 1.6,
                fontFamily: "inherit", boxSizing: "border-box", outline: "none"
              }}
            />
            {error && <div style={{ color: "#f87171", marginTop: 10, fontSize: 14 }}>{error}</div>}
            <button onClick={generate} style={{
              width: "100%", marginTop: 16, padding: "15px 0", borderRadius: 10,
              background: "linear-gradient(90deg, #2563eb, #3b82f6)",
              color: "#fff", border: "none", fontSize: 16, fontWeight: 700,
              cursor: "pointer", letterSpacing: 0.3, boxShadow: "0 4px 18px rgba(59,130,246,0.4)"
            }}>
              ✨ Generate Study Set
            </button>
          </div>
        )}

        {/* LOADING */}
        {stage === STAGES.LOADING && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 20, animation: "spin 1.2s linear infinite", display: "inline-block" }}>⚙️</div>
            <div style={{ color: "#7eb8f7", fontSize: 18, fontWeight: 600 }}>Claude is reading your material…</div>
            <div style={{ color: "#5a7a9a", fontSize: 14, marginTop: 8 }}>Generating flashcards and quiz questions</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* STUDY / QUIZ */}
        {(stage === STAGES.STUDY || stage === STAGES.QUIZ || stage === STAGES.RESULTS) && (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[
                { key: "cards", label: `📇 Flashcards (${cards.length})` },
                { key: "quiz", label: `🧠 Quiz (${questions.length} Qs)` }
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: "12px 0", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", transition: "all 0.2s",
                  background: tab === t.key ? "linear-gradient(90deg, #2563eb, #3b82f6)" : "rgba(255,255,255,0.07)",
                  color: tab === t.key ? "#fff" : "#8ba9c9",
                  boxShadow: tab === t.key ? "0 3px 14px rgba(59,130,246,0.35)" : "none"
                }}>{t.label}</button>
              ))}
            </div>

            {/* Flashcards tab */}
            {tab === "cards" && (
              <>
                <div style={{ color: "#8ba9c9", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                  Tap any card to reveal the answer
                </div>
                {cards.map((card, i) => <FlipCard key={i} card={card} index={i} />)}
                <button onClick={() => { setTab("quiz"); setAnswers([]); }} style={{
                  width: "100%", marginTop: 8, padding: "13px 0", borderRadius: 10,
                  background: "linear-gradient(90deg, #1a5c3a, #2e8a58)",
                  color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer"
                }}>
                  Ready to take the Quiz →
                </button>
              </>
            )}

            {/* Quiz tab */}
            {tab === "quiz" && (
              <>
                {answers.length < questions.length && (
                  <div style={{ color: "#8ba9c9", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                    {answers.length} of {questions.length} answered
                  </div>
                )}
                {questions.map((q, i) => (
                  <QuizQuestion
                    key={i} q={q} index={i}
                    answered={i < answers.length}
                    onAnswer={(correct) => {
                      const updated = [...answers];
                      updated[i] = correct;
                      setAnswers(updated);
                    }}
                  />
                ))}
                {answers.length === questions.length && (
                  <div style={{
                    background: "linear-gradient(135deg, #1e3a5f, #2d5986)",
                    borderRadius: 16, padding: "28px 24px", textAlign: "center",
                    marginTop: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.2)"
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>
                      {score === questions.length ? "🏆" : score >= questions.length * 0.7 ? "🎯" : "📚"}
                    </div>
                    <div style={{ color: "#fff", fontSize: 26, fontWeight: 800 }}>
                      {score} / {questions.length} correct
                    </div>
                    <div style={{ color: "#7eb8f7", fontSize: 15, marginTop: 6 }}>
                      {score === questions.length ? "Perfect score!" : score >= questions.length * 0.7 ? "Great work!" : "Keep studying!"}
                    </div>
                    <button onClick={() => { setText(""); setStage(STAGES.INPUT); }} style={{
                      marginTop: 20, padding: "11px 28px", borderRadius: 9,
                      background: "rgba(255,255,255,0.12)", color: "#fff",
                      border: "1.5px solid rgba(255,255,255,0.2)", fontSize: 14,
                      fontWeight: 600, cursor: "pointer"
                    }}>
                      ← Start over with new material
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
