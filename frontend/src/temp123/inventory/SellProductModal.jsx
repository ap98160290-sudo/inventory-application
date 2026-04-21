import { useState } from "react";
import { sellProduct } from "../../services/productService";

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
    width: 100%; max-width: 440px;
    animation: mSlideUp .18s ease;
    font-family: 'DM Sans', sans-serif;
  }
  @keyframes mFadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes mSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

  .modal-hd {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
  }
  .modal-title { font-size: 17px; font-weight: 700; color: #f1f5f9; }
  .modal-sub   { font-size: 12px; color: #64748b; margin-bottom: 22px; }
  .modal-close {
    width: 30px; height: 30px; border-radius: 8px; border: none;
    background: rgba(255,255,255,0.06); color: #64748b;
    cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  .modal-close:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }

  /* product info card */
  .sell-info {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 10px; margin-bottom: 22px;
  }
  .sell-stat {
    background: #13151f;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; padding: 12px;
  }
  .sell-stat-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .09em; color: #64748b; margin-bottom: 5px; }
  .sell-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #f1f5f9; }
  .ss-green { color: #84cc16 !important; }
  .ss-yellow{ color: #f59e0b !important; }

  .form-group  { margin-bottom: 16px; }
  .form-label  {
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

  /* profit preview */
  .profit-preview {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    background: rgba(132,204,22,0.06);
    border: 1px solid rgba(132,204,22,0.15);
    border-radius: 12px; margin-bottom: 4px;
    font-size: 13px;
  }
  .profit-preview-label { color: #64748b; }
  .profit-preview-val   { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #84cc16; font-size: 15px; }
  .profit-preview.loss  { background: rgba(244,63,94,0.06); border-color: rgba(244,63,94,0.15); }
  .profit-preview.loss .profit-preview-val { color: #f43f5e; }

  .form-actions { display: flex; gap: 10px; margin-top: 20px; }
  .f-btn {
    flex: 1; padding: 12px;
    border: none; border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600;
    cursor: pointer; transition: opacity .15s;
  }
  .f-btn:hover { opacity: .85; }
  .f-btn-ghost { background: rgba(255,255,255,0.06); color: #f1f5f9; }
  .f-btn-blue  { background: #3b82f6; color: #fff; }
  .f-btn:disabled { opacity: .5; cursor: not-allowed; }

  .form-err {
    margin-top: 12px; padding: 10px 14px;
    background: rgba(244,63,94,.1);
    border: 1px solid rgba(244,63,94,.2);
    border-radius: 10px; color: #f43f5e; font-size: 13px;
  }
`;

export default function SellProductModal({ product, onClose, onSuccess }) {
  const maxQty      = parseFloat(product.quantity) || 0;
  const costPrice   = Number(product.unit_price)   || 0;

  const [qty,       setQty]       = useState("");
  const [sellPrice, setSellPrice] = useState(String(costPrice));
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const revenue  = Number(qty) * Number(sellPrice);
  const cost     = Number(qty) * costPrice;
  const profit   = revenue - cost;
  const isProfit = profit >= 0;

  const handleSubmit = async () => {
    if (!qty || isNaN(qty) || Number(qty) <= 0)        return setError("Enter a valid quantity.");
    if (Number(qty) > maxQty)                           return setError(`Only ${maxQty} units available.`);
    if (!sellPrice || isNaN(sellPrice) || Number(sellPrice) <= 0) return setError("Enter a valid selling price.");
    setError("");
    setLoading(true);
    try {
      await sellProduct(product.product_id, {
        quantity:      Number(qty),
        selling_price: Number(sellPrice),
      });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.detail || "Sale failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{modalStyles}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-hd">
            <div className="modal-title">🛒 Sell Product</div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-sub">{product.product_name}</div>

          {/* Stock info */}
          <div className="sell-info">
            <div className="sell-stat">
              <div className="sell-stat-lbl">In Stock</div>
              <div className={`sell-stat-val ${maxQty < 5 ? "ss-yellow" : "ss-green"}`}>{maxQty} units</div>
            </div>
            <div className="sell-stat">
              <div className="sell-stat-lbl">Cost Price</div>
              <div className="sell-stat-val ss-yellow">₹{costPrice.toLocaleString()}</div>
            </div>
            <div className="sell-stat">
              <div className="sell-stat-lbl">Stock Value</div>
              <div className="sell-stat-val">₹{(maxQty * costPrice).toLocaleString()}</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Qty to Sell *</label>
              <input
                className="form-input"
                placeholder={`Max ${maxQty}`}
                type="number" min="1" max={maxQty}
                value={qty}
                onChange={e => setQty(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price (₹) *</label>
              <input
                className="form-input"
                type="number" min="0" step="0.01"
                value={sellPrice}
                onChange={e => setSellPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Live P&L preview */}
          {qty && sellPrice && !isNaN(qty) && !isNaN(sellPrice) && (
            <div className={`profit-preview ${isProfit ? "" : "loss"}`}>
              <span className="profit-preview-label">
                {isProfit ? "📈 Estimated Profit" : "📉 Estimated Loss"}
              </span>
              <span className="profit-preview-val">
                {isProfit ? "+" : ""}₹{Math.abs(profit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {error && <div className="form-err">⚠ {error}</div>}

          <div className="form-actions">
            <button className="f-btn f-btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="f-btn f-btn-blue"  onClick={handleSubmit} disabled={loading}>
              {loading ? "Processing…" : "Confirm Sale"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
