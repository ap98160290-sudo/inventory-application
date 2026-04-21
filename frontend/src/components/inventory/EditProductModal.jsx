import { useState } from "react";
import { updateProduct } from "../../services/productService";

const modalStyles = `
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    animation: mFadeIn .15s ease;
  }
  .modal-box {
    background: #0e1016;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px;
    padding: 32px;
    width: 100%; max-width: 480px;
    animation: mSlideUp .18s ease;
    font-family: 'DM Sans', sans-serif;
    max-height: 90vh;
    overflow-y: auto;
  }
  @keyframes mFadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes mSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

  .modal-hd {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .modal-title { font-size: 17px; font-weight: 700; color: #f1f5f9; }
  .modal-sub   { font-size: 12px; color: #64748b; margin-bottom: 22px; font-family: 'JetBrains Mono', monospace; }
  .modal-close {
    width: 30px; height: 30px; border-radius: 8px; border: none;
    background: rgba(255,255,255,0.06); color: #64748b;
    cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  .modal-close:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }

  .form-group  { margin-bottom: 16px; }
  .form-label  {
    display: block; font-size: 10px; font-weight: 700;
    letter-spacing: .09em; text-transform: uppercase;
    color: #64748b; margin-bottom: 7px;
  }
  .form-input, .form-select {
    width: 100%; padding: 11px 14px;
    background: #13151f;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    color: #f1f5f9;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; outline: none;
    transition: border-color .2s;
    box-sizing: border-box;
  }
  .form-input::placeholder { color: #475569; }
  .form-input:focus, .form-select:focus { border-color: rgba(255,255,255,0.2); }
  .form-select option { background: #13151f; }

  .form-row-3 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }

  .form-hint { font-size: 11px; color: #475569; margin-top: 5px; }

  .info-banner {
    padding: 10px 14px;
    background: rgba(59,130,246,0.08);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 10px; color: #93c5fd; font-size: 12px;
    margin-bottom: 18px; line-height: 1.5;
  }

  .form-actions { display: flex; gap: 10px; margin-top: 24px; }
  .f-btn {
    flex: 1; padding: 12px;
    border: none; border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600;
    cursor: pointer; transition: opacity .15s;
  }
  .f-btn:hover { opacity: .85; }
  .f-btn-ghost  { background: rgba(255,255,255,0.06); color: #f1f5f9; }
  .f-btn-yellow { background: #f59e0b; color: #0a0a0a; }
  .f-btn:disabled { opacity: .5; cursor: not-allowed; }

  .form-err {
    margin-top: 12px; padding: 10px 14px;
    background: rgba(244,63,94,.1);
    border: 1px solid rgba(244,63,94,.2);
    border-radius: 10px; color: #f43f5e; font-size: 13px;
  }

  .edit-badge {
    display: inline-block;
    font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600;
    padding: 2px 9px; border-radius: 20px;
    background: rgba(245,158,11,.1); color: #f59e0b;
    margin-left: 8px;
  }
`;

const UNITS = ["kg", "g", "l", "ml", "pcs", "pkt", "dozen", "bottles"];

function extractUnit(quantityStr) {
  if (!quantityStr) return "pcs";
  const parts = String(quantityStr).trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : "pcs";
}

// ✅ Safely convert any error value to a display string
// FastAPI 422 errors return { detail: [ {type, loc, msg, input} ] }
// Trying to render that object directly as JSX crashes React
function safeErrorMsg(e) {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    // FastAPI validation error format
    if (Array.isArray(e)) {
      return e.map((item) => item?.msg || JSON.stringify(item)).join(", ");
    }
    return e?.message || e?.msg || e?.detail || JSON.stringify(e);
  }
  return String(e);
}

export default function EditProductModal({ product, onClose, onSuccess }) {
  const currentUnit = product.unit || extractUnit(product.quantity);

  const [form, setForm] = useState({
    product_name:    product.product_name || "",
    description:     product.description  || "",
    add_quantity:    "",
    unit_of_measure: currentUnit,
    unit_price:      "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError("");

    // ── Client-side validation ────────────────────────────────────────────────

    const nameChanged  = form.product_name.trim() !== (product.product_name || "").trim();
    const descChanged  = form.description.trim()  !== (product.description  || "").trim();
    const hasQty       = form.add_quantity !== "";
    const hasPrice     = form.unit_price   !== "";

    // ✅ FIX: if user changed nothing at all, show a helpful error instead of
    // sending an empty payload that causes a 422 and white-screen crash
    if (!nameChanged && !descChanged && !hasQty && !hasPrice) {
      setError("Nothing to update — make at least one change before saving.");
      return;
    }

    if (hasQty) {
      if (isNaN(form.add_quantity) || Number(form.add_quantity) <= 0) {
        setError("Add quantity must be a positive number.");
        return;
      }
    }

    if (hasPrice) {
      if (isNaN(form.unit_price) || Number(form.unit_price) <= 0) {
        setError("Unit price must be greater than 0.");
        return;
      }
    }

    // ── Build payload — only send fields that actually changed / were filled ──
    const payload = {};

    if (nameChanged) payload.product_name = form.product_name.trim();
    if (descChanged) payload.description  = form.description.trim();

    if (hasQty) {
      payload.quantity        = Number(form.add_quantity);
      payload.unit_of_measure = form.unit_of_measure;
    }

    if (hasPrice) {
      payload.unit_price      = Number(form.unit_price);
      // unit_of_measure is needed alongside price if no qty was given
      if (!hasQty) payload.unit_of_measure = form.unit_of_measure;
    }

    setLoading(true);
    try {
      await updateProduct(product.product_id, payload);
      onSuccess();
    } catch (e) {
      // ✅ FIX: safely extract error string — never assign a raw object to error state
      // FastAPI 422 returns: { detail: [ {type, loc, msg, input} ] }
      const raw = e?.response?.data;
      if (raw?.detail && Array.isArray(raw.detail)) {
        // Pick the first validation message
        setError(raw.detail[0]?.msg || "Validation error — check your inputs.");
      } else {
        setError(
          safeErrorMsg(raw?.message) ||
          safeErrorMsg(raw?.detail)  ||
          "Failed to update product. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{modalStyles}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="modal-hd">
            <div className="modal-title">
              ✏️ Edit Product
              <span className="edit-badge">#{product.product_id}</span>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-sub">
            Editing: {product.product_name} · Stock: {product.quantity}
          </div>

          <div className="info-banner">
            ℹ️ <strong>Adding stock:</strong> The quantity you enter will be <em>added</em> to
            existing stock — leave it blank to only update name/price.
          </div>

          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input
              className="form-input"
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="Short description (optional)"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Add Stock Quantity</label>
              <input
                className="form-input"
                placeholder="Leave blank to skip"
                type="number"
                min="0"
                step="any"
                value={form.add_quantity}
                onChange={(e) => set("add_quantity", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select
                className="form-select"
                value={form.unit_of_measure}
                onChange={(e) => set("unit_of_measure", e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              New Cost Price per {form.unit_of_measure} (₹)
            </label>
            <input
              className="form-input"
              placeholder="Leave blank to keep current price"
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={(e) => set("unit_price", e.target.value)}
            />
            <div className="form-hint">
              If you enter a new price with stock, a weighted-average cost is calculated automatically
            </div>
          </div>

          {/* ✅ FIX: error is always a string — never an object — so React won't crash */}
          {error && <div className="form-err">⚠ {error}</div>}

          <div className="form-actions">
            <button className="f-btn f-btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button className="f-btn f-btn-yellow" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}