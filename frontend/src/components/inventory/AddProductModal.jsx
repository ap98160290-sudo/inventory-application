import { useState } from "react";
import { addProduct } from "../../services/productService";

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
    margin-bottom: 24px;
  }
  .modal-title { font-size: 17px; font-weight: 700; color: #f1f5f9; }
  .modal-close {
    width: 30px; height: 30px; border-radius: 8px; border: none;
    background: rgba(255,255,255,0.06); color: #64748b;
    cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  .modal-close:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }

  .form-group { margin-bottom: 16px; }
  .form-label {
    display: block; font-size: 10px; font-weight: 700;
    letter-spacing: .09em; text-transform: uppercase;
    color: #64748b; margin-bottom: 7px;
  }
  .form-label span { color: #f43f5e; margin-left: 2px; }
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

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-row-3 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }

  .form-hint { font-size: 11px; color: #475569; margin-top: 5px; }

  .form-actions { display: flex; gap: 10px; margin-top: 24px; }
  .f-btn {
    flex: 1; padding: 12px;
    border: none; border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600;
    cursor: pointer; transition: opacity .15s;
  }
  .f-btn:hover { opacity: .85; }
  .f-btn-ghost { background: rgba(255,255,255,0.06); color: #f1f5f9; }
  .f-btn-green { background: #84cc16; color: #0a0a0a; }
  .f-btn:disabled { opacity: .5; cursor: not-allowed; }

  .form-err {
    margin-top: 12px; padding: 10px 14px;
    background: rgba(244,63,94,.1);
    border: 1px solid rgba(244,63,94,.2);
    border-radius: 10px; color: #f43f5e; font-size: 13px;
  }
`;

const UNITS = ["kg", "g", "l", "ml", "pcs", "pkt", "dozen", "bottles"];

export default function AddProductModal({ onClose, onSuccess, initialBarcode = "" }) {
  const [form, setForm] = useState({
    barcode: initialBarcode,
    product_name: "",
    description: "",
    quantity: "",
    unit_of_measure: "pcs",   // ✅ required by backend
    unit_price: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.barcode.trim())       return setError("Barcode is required. Scan or enter the product barcode.");
    if (!form.product_name.trim())  return setError("Product name is required.");
    if (!form.quantity || isNaN(form.quantity) || Number(form.quantity) <= 0)
      return setError("Enter a valid quantity (must be > 0).");
    if (!form.unit_price || isNaN(form.unit_price) || Number(form.unit_price) <= 0)
      return setError("Enter a valid unit price (must be > 0).");

    setError("");
    setLoading(true);
    try {
      // ✅ Payload matches backend ProductCreate schema exactly
      await addProduct({
        barcode:          form.barcode.trim(),
        product_name:     form.product_name.trim(),
        description:      form.description.trim(),
        quantity:         Number(form.quantity),
        unit_of_measure:  form.unit_of_measure,   // ✅ backend requires this
        unit_price:       Number(form.unit_price), // ✅ cost price per display unit
      });
      onSuccess();
    } catch (e) {
      const raw = e?.response?.data;
      if (raw?.detail && Array.isArray(raw.detail)) {
        setError(raw.detail[0]?.msg || "Validation error — check your inputs.");
      } else {
        const msg = typeof raw?.message === "string" ? raw.message
                  : typeof raw?.detail  === "string" ? raw.detail
                  : null;
        setError(msg || "Failed to add product. Please try again.");
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
            <div className="modal-title">➕ Add New Product</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          {/* ✅ Barcode — required by backend to identify the product */}
          <div className="form-group">
            <label className="form-label">Barcode <span>*</span></label>
            <input
              className="form-input"
              placeholder="e.g. 8901234567890"
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
            />
            <div className="form-hint">Scan or type the barcode printed on the product</div>
          </div>

          <div className="form-group">
            <label className="form-label">Product Name <span>*</span></label>
            <input
              className="form-input"
              placeholder="e.g. Sugar, Rice, Detergent"
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

          {/* ✅ Quantity + Unit together — backend converts to base units internally */}
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Quantity <span>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. 50"
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit <span>*</span></label>
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
            <label className="form-label">Cost Price per {form.unit_of_measure} (₹) <span>*</span></label>
            <input
              className="form-input"
              placeholder={`e.g. ₹55 per ${form.unit_of_measure}`}
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={(e) => set("unit_price", e.target.value)}
            />
            <div className="form-hint">Your purchase/cost price per {form.unit_of_measure}, not the selling price</div>
          </div>

          {error && <div className="form-err">⚠ {error}</div>}

          <div className="form-actions">
            <button className="f-btn f-btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button className="f-btn f-btn-green" onClick={handleSubmit} disabled={loading}>
              {loading ? "Adding…" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
