import { useEffect, useRef, useState } from "react";
import Layout from "../layout/Layout";
import { voiceCommand } from "../services/productService";

/* ─────────────────────────────────────────────────────────────────── STYLES */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');

  :root {
    --voice-bg: #08090f;
    --voice-panel: rgba(14, 16, 22, 0.94);
    --voice-soft: rgba(23, 29, 39, 0.96);
    --voice-border: rgba(148, 163, 184, 0.12);
    --voice-text: #edf3fb;
    --voice-muted: #64748b;
    --voice-lime: #d4ff27;
    --voice-blue: #4c8dff;
    --voice-red: #ff4d6d;
    --voice-yellow: #f5c243;
    --voice-mono: 'JetBrains Mono', monospace;
    --voice-sans: 'DM Sans', sans-serif;
  }

  .voice-root {
    min-height: 100%;
    background:
      linear-gradient(rgba(16, 21, 31, 0.54) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16, 21, 31, 0.54) 1px, transparent 1px),
      var(--voice-bg);
    background-size: 60px 60px, 60px 60px, auto;
    color: var(--voice-text);
    font-family: var(--voice-sans);
  }

  .voice-shell {
    width: min(860px, 100%);
    margin: 0 auto;
  }

  .voice-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin-bottom: 26px;
  }

  .voice-mic {
    width: 78px; height: 78px;
    border-radius: 50%;
    border: 2px solid rgba(212, 255, 39, 0.3);
    background: rgba(212, 255, 39, 0.07);
    font-size: 34px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    position: relative;
  }
  .voice-mic:hover {
    border-color: rgba(212, 255, 39, 0.65);
    background: rgba(212, 255, 39, 0.14);
    transform: scale(1.05);
  }
  .voice-mic.active {
    border-color: var(--voice-red);
    background: rgba(255, 77, 109, 0.12);
    animation: mic-pulse 1.1s infinite;
  }
  @keyframes mic-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 109, 0.35); }
    50%       { box-shadow: 0 0 0 14px rgba(255, 77, 109, 0); }
  }

  .voice-hint {
    font-family: var(--voice-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--voice-muted);
  }

  .voice-transcript {
    font-family: var(--voice-mono);
    font-size: 16px;
    font-style: italic;
    color: var(--voice-lime);
    text-align: center;
    min-height: 26px;
    max-width: 600px;
    word-break: break-word;
  }

  .voice-section-label {
    font-family: var(--voice-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--voice-muted);
    margin-bottom: 8px;
  }

  .voice-manual {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
  }

  .voice-input {
    flex: 1;
    height: 48px;
    padding: 0 18px;
    border-radius: 14px;
    border: 1px solid var(--voice-border);
    background: rgba(23, 29, 39, 0.96);
    color: var(--voice-text);
    font-family: var(--voice-sans);
    font-size: 15px;
    outline: none;
    transition: border-color 0.18s;
  }
  .voice-input:focus { border-color: rgba(212, 255, 39, 0.4); }
  .voice-input::placeholder { color: var(--voice-muted); }

  .voice-button {
    height: 48px;
    padding: 0 26px;
    border-radius: 14px;
    border: none;
    background: var(--voice-lime);
    color: #121826;
    font-family: var(--voice-sans);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    white-space: nowrap;
  }
  .voice-button:hover   { opacity: 0.88; transform: translateY(-1px); }
  .voice-button:active  { transform: translateY(0); }
  .voice-button:disabled{ opacity: 0.45; cursor: not-allowed; transform: none; }

  /* ── INTERPRETER NOTES banner ── */
  .voice-interp {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(76, 141, 255, 0.08);
    border: 1px solid rgba(76, 141, 255, 0.2);
    margin-bottom: 10px;
    font-size: 12px;
    color: var(--voice-blue);
    font-family: var(--voice-mono);
    line-height: 1.6;
  }
  .voice-interp-icon { font-size: 14px; flex-shrink: 0; }

  /* ── STATUS messages ── */
  .voice-message {
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 14px;
    border: 1px solid transparent;
  }
  .voice-message.error {
    background: rgba(255, 77, 109, 0.1);
    border-color: rgba(255, 77, 109, 0.22);
    color: #ff93a8;
  }
  .voice-message.success {
    background: rgba(212, 255, 39, 0.07);
    border-color: rgba(212, 255, 39, 0.18);
    color: var(--voice-lime);
  }
  .voice-message.loading {
    background: rgba(76, 141, 255, 0.07);
    border-color: rgba(76, 141, 255, 0.18);
    color: var(--voice-blue);
    display: flex; align-items: center; gap: 10px;
  }

  /* ── SPINNER ── */
  .voice-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(76,141,255,0.25);
    border-top-color: var(--voice-blue);
    border-radius: 50%;
    animation: vspin 0.6s linear infinite;
    flex-shrink: 0;
  }
  @keyframes vspin { to { transform: rotate(360deg); } }

  /* ── RESPONSE panel ── */
  .voice-response {
    background: rgba(14, 16, 22, 0.94);
    border: 1px solid var(--voice-border);
    border-radius: 16px;
    padding: 20px 22px;
    margin-bottom: 22px;
    min-height: 130px;
    position: relative;
    overflow: hidden;
  }
  .voice-response::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--voice-lime);
    border-radius: 16px 16px 0 0;
    opacity: 0.4;
  }
  .voice-response pre {
    font-family: var(--voice-mono);
    font-size: 13px;
    color: #94a3b8;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    line-height: 1.7;
  }
  .voice-response .key   { color: #60a5fa; }
  .voice-response .str   { color: #86efac; }
  .voice-response .num   { color: var(--voice-lime); }
  .voice-response .bool  { color: #f59e0b; }
  .voice-response .null  { color: #f43f5e; }

  /* ── EXAMPLE chips ── */
  .voice-example-group  { margin-bottom: 18px; }
  .voice-example-stack  { display: flex; flex-wrap: wrap; gap: 8px; }
  .voice-example {
    padding: 7px 14px;
    border-radius: 20px;
    border: 1px solid var(--voice-border);
    background: rgba(23, 29, 39, 0.96);
    color: var(--voice-muted);
    font-family: var(--voice-mono);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .voice-example:hover {
    border-color: rgba(212, 255, 39, 0.35);
    color: var(--voice-lime);
    background: rgba(212, 255, 39, 0.05);
  }
`;

/* ─────────────────────────────────────────────────── SYNTAX-HIGHLIGHT JSON */
function highlight(json) {
  return json
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          return /:$/.test(match)
            ? `<span class="key">${match}</span>`
            : `<span class="str">${match}</span>`;
        }
        if (/true|false/.test(match)) return `<span class="bool">${match}</span>`;
        if (/null/.test(match))       return `<span class="null">${match}</span>`;
        return `<span class="num">${match}</span>`;
      });
}

/* ──────────────────────────────────────────────────── EXAMPLE COMMAND GROUPS */
const exampleGroups = [
  {
    label: "Sell Examples",
    items: [
      "sell 2 kg sugar for 57 rupees",
      "cell 5 pcs soap at 30",
      "sel half dozen egg for 120",
      "please sell me 3 litres oil for 90",
      "becho 2 kilo namak 65",
    ],
  },
  {
    label: "Add / Update Examples",
    items: [
      "add 10 kg sugar",
      "ad two dozen eggs",
      "restock 5 litres oil",
      "refill twenty five packets salt",
      "please add 100 pieces vim liquid",
    ],
  },
  {
    label: "Delete / Write-Off Examples",
    items: [
      "delete sugar",
      "delet 5 kg sugar",
      "remove 2 dozen egg",
      "damaged ten pcs soap",
    ],
  },
];

/* ═══════════════════════════════════════════════════════ MAIN COMPONENT */
export default function VoiceCommand() {
  const [command,      setCommand]      = useState("");
  const [transcript,   setTranscript]   = useState("sell 2 kg sugar for 57 rupees");
  const [responseHTML, setResponseHTML] = useState("");
  const [interpNotes,  setInterpNotes]  = useState([]);
  const [message,      setMessage]      = useState({ type: "", text: "" });
  const [listening,    setListening]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  /* ── Send command straight to backend — no client-side parsing ── */
  const executeCommand = async (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setMessage({ type: "error", text: "Type or speak a command first." });
      return;
    }

    setLoading(true);
    setMessage({ type: "loading", text: "Processing command…" });
    setInterpNotes([]);
    setResponseHTML("");

    try {
      // ── Single call to backend — backend handles ALL fuzzy matching ──────
      const res = await voiceCommand(trimmed);
      const data = res.data?.data ?? res.data;

      // Pull out interpreter notes if backend corrected anything
      if (data?.interpreter_notes?.length) {
        setInterpNotes(data.interpreter_notes);
      }

      // Pretty-print the full response
      const pretty = JSON.stringify(data, null, 2);
      setResponseHTML(highlight(pretty));
      setMessage({ type: "success", text: res.data?.message || "Command executed successfully." });

    } catch (err) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail   ||
        err?.message                  ||
        "Voice command failed.";
      setMessage({ type: "error", text: String(serverMsg) });
      setResponseHTML("");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (raw = command) => {
    const trimmed = raw.trim();
    setTranscript(trimmed || transcript);
    await executeCommand(trimmed);
  };

  /* ── Web Speech API mic ── */
  const handleMicClick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessage({ type: "error", text: "Speech recognition is not supported in this browser. Use Chrome or Edge." });
      return;
    }
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }

    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart  = () => { setListening(true);  setMessage({ type: "success", text: "Listening…" }); };
    rec.onend    = () => { setListening(false); };
    rec.onerror  = () => { setMessage({ type: "error", text: "Could not capture voice. Try again or type the command." }); };
    rec.onresult = async (e) => {
      const spoken = e.results?.[0]?.[0]?.transcript || "";
      setTranscript(spoken);
      setCommand(spoken);
      await handleSubmit(spoken);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <Layout>
      <style>{styles}</style>
      <div className="voice-root">
        <div className="voice-shell">

          {/* ── MIC BUTTON ── */}
          <div className="voice-center">
            <button
              className={`voice-mic ${listening ? "active" : ""}`}
              type="button"
              onClick={handleMicClick}
            >
              🎙
            </button>
            <div className="voice-hint">Click the mic to listen</div>
            <div className="voice-transcript">{transcript}</div>
          </div>

          {/* ── MANUAL INPUT ── */}
          <div className="voice-section-label">Type Command Manually</div>
          <div className="voice-manual">
            <input
              className="voice-input"
              placeholder="e.g. sell 2 kg sugar for 57 — or say it with the mic"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleSubmit(); }}
              disabled={loading}
            />
            <button
              className="voice-button"
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
            >
              {loading ? "…" : "Send"}
            </button>
          </div>

          {/* ── STATUS MESSAGE ── */}
          {message.text && (
            <div className={`voice-message ${message.type}`}>
              {message.type === "loading" && <div className="voice-spinner" />}
              {message.text}
            </div>
          )}

          {/* ── INTERPRETER NOTES (shows what backend corrected) ── */}
          {interpNotes.length > 0 && (
            <div className="voice-interp">
              <span className="voice-interp-icon">🔧</span>
              <div>{interpNotes.join(" • ")}</div>
            </div>
          )}

          {/* ── RESPONSE JSON PANEL ── */}
          <div className="voice-response">
            <pre
              dangerouslySetInnerHTML={{
                __html: responseHTML ||
                  `<span class="key">"product"</span>: <span class="str">"sugar"</span>,\n<span class="key">"sold_qty"</span>: <span class="str">"2.00 kg"</span>,\n<span class="key">"unit_price"</span>: <span class="str">"₹57.00 per kg"</span>,\n<span class="key">"total_revenue"</span>: <span class="str">"₹114.00"</span>,\n<span class="key">"remaining_qty"</span>: <span class="str">"82.00 kg"</span>`,
              }}
            />
          </div>

          {/* ── EXAMPLE CHIPS ── */}
          {exampleGroups.map((group) => (
            <div className="voice-example-group" key={group.label}>
              <div className="voice-section-label">{group.label}</div>
              <div className="voice-example-stack">
                {group.items.map((item) => (
                  <button
                    className="voice-example"
                    type="button"
                    key={item}
                    onClick={() => {
                      setCommand(item);
                      setTranscript(item);
                      handleSubmit(item);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
    </Layout>
  );
}