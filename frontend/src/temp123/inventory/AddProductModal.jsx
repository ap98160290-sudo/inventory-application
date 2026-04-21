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
    width: 100%; max-width: 460px;
    animation: mSlideUp .18s ease;
    font-family: 'DM Sans', sans-serif;
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
  .form-input {
    width: 100%; padding: 11px 14px;
    background: #13151f;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    color: #f1f5f9;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; outline: none;
    transition: border-color .2s;
  }
  .form-input::placeholder { color: #475569; }
  .form-input:focus { border-color: rgba(255,255,255,0.2); }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

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

export default function AddProductModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ product_name: "", description: "", quantity: "", unit_price: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.product_name.trim()) return setError("Product name is required.");
    if (!form.quantity || isNaN(form.quantity)) return setError("Enter a valid quantity.");
    if (!form.unit_price || isNaN(form.unit_price)) return setError("Enter a valid unit price.");
    setError("");
    setLoading(true);
    try {
      await addProduct({
        product_name: form.product_name.trim(),
        description:  form.description.trim(),
        quantity:     Number(form.quantity),
        unit_price:   Number(form.unit_price),
      });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to add product. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{modalStyles}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-hd">
            <div className="modal-title">➕ Add New Product</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Wireless Mouse"
              value={form.product_name}
              onChange={e => set("product_name", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="Short description (optional)"
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                className="form-input"
                placeholder="0"
                type="number"
                min="0"
                value={form.quantity}
                onChange={e => set("quantity", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Price (₹) *</label>
              <input
                className="form-input"
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={e => set("unit_price", e.target.value)}
              />
            </div>
          </div>

          {error && <div className="form-err">⚠ {error}</div>}

          <div className="form-actions">
            <button className="f-btn f-btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="f-btn f-btn-green" onClick={handleSubmit} disabled={loading}>
              {loading ? "Adding…" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
