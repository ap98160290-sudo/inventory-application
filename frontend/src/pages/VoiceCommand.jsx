import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Layout from "../layout/Layout";
import {
  deleteProduct,
  getAllProducts,
  sellProduct,
  updateProduct,
} from "../services/productService";

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
    width: 118px;
    height: 118px;
    border-radius: 50%;
    border: 2px solid rgba(110, 132, 161, 0.28);
    background: radial-gradient(circle at top, rgba(255,255,255,0.04), rgba(15,18,25,0.98));
    color: #f8fafc;
    font-size: 48px;
    cursor: pointer;
    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  }

  .voice-mic.active {
    border-color: rgba(212,255,39,0.45);
    box-shadow: 0 0 0 10px rgba(212,255,39,0.08);
    transform: scale(1.03);
  }

  .voice-hint {
    font-family: var(--voice-mono);
    font-size: 13px;
    color: var(--voice-muted);
    letter-spacing: 0.08em;
  }

  .voice-transcript,
  .voice-response,
  .voice-example {
    background: var(--voice-panel);
    border: 1px solid var(--voice-border);
    border-radius: 14px;
  }

  .voice-transcript {
    width: min(600px, 100%);
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 22px;
    color: #9fb1c8;
    font-size: 18px;
    font-style: italic;
    text-align: center;
  }

  .voice-section-label {
    margin: 0 0 10px;
    font-family: var(--voice-mono);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #708198;
  }

  .voice-manual {
    display: grid;
    grid-template-columns: 1fr 110px;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .voice-input {
    height: 42px;
    padding: 0 16px;
    border-radius: 12px;
    border: 1px solid var(--voice-border);
    background: var(--voice-soft);
    color: var(--voice-text);
    font-family: var(--voice-sans);
    font-size: 16px;
    outline: none;
  }

  .voice-button {
    height: 42px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: var(--voice-lime);
    color: #121826;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
  }

  .voice-message {
    margin-bottom: 16px;
    padding: 11px 14px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.5;
  }

  .voice-message.error {
    background: rgba(244, 63, 94, 0.1);
    border: 1px solid rgba(244, 63, 94, 0.2);
    color: #ff93a8;
  }

  .voice-message.success {
    background: rgba(157, 220, 47, 0.1);
    border: 1px solid rgba(157, 220, 47, 0.18);
    color: #ddff7c;
  }

  .voice-response {
    padding: 18px 20px;
    min-height: 132px;
    margin-bottom: 22px;
    overflow: auto;
  }

  .voice-response pre {
    margin: 0;
    color: var(--voice-lime);
    font-family: var(--voice-mono);
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .voice-example-group {
    margin-bottom: 18px;
  }

  .voice-example-stack {
    display: grid;
    gap: 10px;
  }

  .voice-example {
    width: 100%;
    padding: 12px 16px;
    color: #b9c7d9;
    background: var(--voice-soft);
    text-align: left;
    cursor: pointer;
    font-family: var(--voice-mono);
    font-size: 15px;
  }

  @media (max-width: 720px) {
    .voice-manual {
      grid-template-columns: 1fr;
    }
  }
`;

const units = ["kg", "g", "l", "ml", "pcs", "pkt", "dozen", "bottles"];

const exampleGroups = [
  {
    label: "Sell Examples",
    items: ["sell 2 kg sugar for 57 rupees", "sell 5 pcs juice at 115"],
  },
  {
    label: "Add / Update Examples",
    items: ["add 10 kg sugar", "update 50 pcs real juice"],
  },
  {
    label: "Delete / Write-Off Examples",
    items: ["delete sugar", "delete 3 kg sugar"],
  },
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findProductByName(products, rawName) {
  const target = normalize(rawName);
  return (
    products.find((product) => normalize(product.product_name) === target) ||
    products.find((product) => normalize(product.product_name).includes(target)) ||
    products.find((product) => target.includes(normalize(product.product_name)))
  );
}

function parseVoiceCommand(input) {
  const text = normalize(input).replace(/\s+rupees?$/, "");

  let match = text.match(/^sell\s+(\d+(?:\.\d+)?)\s+([a-z]+)\s+(.+?)\s+(?:for|at)\s+(\d+(?:\.\d+)?)$/i);
  if (match) {
    return {
      type: "sell",
      quantity: Number(match[1]),
      unit: match[2],
      productName: match[3],
      unitPrice: Number(match[4]),
      raw: input,
    };
  }

  match = text.match(/^(?:add|update)\s+(\d+(?:\.\d+)?)\s+([a-z]+)\s+(.+)$/i);
  if (match) {
    return {
      type: "update",
      quantity: Number(match[1]),
      unit: match[2],
      productName: match[3],
      raw: input,
    };
  }

  match = text.match(/^delete\s+(\d+(?:\.\d+)?)\s+([a-z]+)\s+(.+)$/i);
  if (match) {
    return {
      type: "delete_qty",
      quantity: Number(match[1]),
      unit: match[2],
      productName: match[3],
      raw: input,
    };
  }

  match = text.match(/^delete\s+(.+)$/i);
  if (match) {
    return {
      type: "delete_full",
      productName: match[1],
      raw: input,
    };
  }

  return null;
}

function formatResult(data) {
  return JSON.stringify(data, null, 2);
}

export default function VoiceCommand() {
  const [command, setCommand] = useState("");
  const [transcript, setTranscript] = useState("sell 2 kg sugar for 57 rupees");
  const [responseText, setResponseText] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const loadProducts = async () => {
    const res = await getAllProducts();
    return res.data?.data || [];
  };

  const executeCommand = async (rawCommand) => {
    const parsed = parseVoiceCommand(rawCommand);
    if (!parsed) {
      setMessage({
        type: "error",
        text: "Command not understood. Try one of the examples below.",
      });
      return;
    }

    if (parsed.unit && !units.includes(parsed.unit)) {
      setMessage({
        type: "error",
        text: `Unsupported unit "${parsed.unit}".`,
      });
      return;
    }

    const products = await loadProducts();
    const product = findProductByName(products, parsed.productName);

    if (!product) {
      setMessage({
        type: "error",
        text: `Could not find product "${parsed.productName}" in inventory.`,
      });
      return;
    }

    if (parsed.type === "sell") {
      await sellProduct(product.product_id, {
        quantity: parsed.quantity,
        unit_of_measure: parsed.unit,
        selling_price: parsed.unitPrice,
      });

      const refreshed = findProductByName(await loadProducts(), parsed.productName);
      const totalRevenue = parsed.quantity * parsed.unitPrice;
      setResponseText(
        formatResult({
          product: product.product_name,
          sold_qty: `${parsed.quantity.toFixed(2)} ${parsed.unit}`,
          unit_price: `₹${parsed.unitPrice.toFixed(2)} per ${parsed.unit}`,
          total_revenue: `₹${totalRevenue.toFixed(2)}`,
          remaining_qty: refreshed?.quantity || product.quantity,
          stock_value: Number(refreshed?.total_price || product.total_price || 0),
        })
      );
      setMessage({ type: "success", text: "Sell command executed successfully." });
      return;
    }

    if (parsed.type === "update") {
      await updateProduct(product.product_id, {
        quantity: parsed.quantity,
        unit_of_measure: parsed.unit,
      });

      const refreshed = findProductByName(await loadProducts(), parsed.productName);
      setResponseText(
        formatResult({
          action: "stock_updated",
          product: product.product_name,
          added_qty: `${parsed.quantity.toFixed(2)} ${parsed.unit}`,
          latest_qty: refreshed?.quantity || product.quantity,
          stock_value: Number(refreshed?.total_price || product.total_price || 0),
        })
      );
      setMessage({ type: "success", text: "Stock update command executed successfully." });
      return;
    }

    if (parsed.type === "delete_qty") {
      await deleteProduct(product.product_id, {
        quantity: parsed.quantity,
        unit_of_measure: parsed.unit,
        reason: "Voice command write-off",
      });

      const refreshed = findProductByName(await loadProducts(), parsed.productName);
      setResponseText(
        formatResult({
          action: "write_off",
          product: product.product_name,
          deleted_qty: `${parsed.quantity.toFixed(2)} ${parsed.unit}`,
          remaining_qty: refreshed?.quantity || "0",
          stock_value: Number(refreshed?.total_price || 0),
        })
      );
      setMessage({ type: "success", text: "Write-off command executed successfully." });
      return;
    }

    if (parsed.type === "delete_full") {
      await deleteProduct(product.product_id);
      setResponseText(
        formatResult({
          action: "full_delete",
          product: product.product_name,
          barcode: product.product_id,
          status: "deleted",
        })
      );
      setMessage({ type: "success", text: "Delete command executed successfully." });
    }
  };

  const handleSubmit = async (raw = command) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setMessage({ type: "error", text: "Type or speak a command first." });
      return;
    }

    setMessage({ type: "", text: "" });
    setTranscript(trimmed);
    try {
      await executeCommand(trimmed);
      setCommand(trimmed);
    } catch (error) {
      const serverMsg =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "Voice command failed.";
      setMessage({ type: "error", text: String(serverMsg) });
    }
  };

  const handleMicClick = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage({
        type: "error",
        text: "Speech recognition is not supported in this browser.",
      });
      return;
    }

    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setMessage({ type: "success", text: "Listening for a voice command..." });
    };

    recognition.onresult = async (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript || "";
      setTranscript(spoken);
      setCommand(spoken);
      await handleSubmit(spoken);
    };

    recognition.onerror = () => {
      setMessage({
        type: "error",
        text: "Could not capture voice input. Try again or type the command manually.",
      });
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <Layout>
      <style>{styles}</style>

      <div className="voice-root">
        <div className="voice-shell">
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

          <div className="voice-section-label">Type Command Manually</div>
          <div className="voice-manual">
            <input
              className="voice-input"
              placeholder="e.g. sell 2 kg sugar for 57 rupees"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
            <button className="voice-button" type="button" onClick={() => handleSubmit()}>
              Send
            </button>
          </div>

          {message.text ? (
            <div className={`voice-message ${message.type}`}>{message.text}</div>
          ) : null}

          <div className="voice-response">
            <pre>
              {responseText ||
                `{\n  "product": "sugar",\n  "sold_qty": "2.00 kg",\n  "unit_price": "₹57.00 per kg",\n  "total_revenue": "₹114.00",\n  "remaining_qty": "82.00 kg",\n  "stock_value": 4510\n}`}
            </pre>
          </div>

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
