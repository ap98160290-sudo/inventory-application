import { useEffect, useState, useMemo } from "react";
import Layout from "../layout/Layout";
import { getAllProducts, deleteProduct, archiveProduct } from "../services/productService";
import AddProductModal from "../components/inventory/AddProductModal";
import EditProductModal from "../components/inventory/EditProductModal";
import SellProductModal from "../components/inventory/SellProductModal";

/* ─────────────────────────────────────────────────────────────────────────
   STYLES
   ───────────────────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

  :root {
    --bg-base:   #08090f;
    --bg-card:   #0e1016;
    --bg-hover:  #13151f;
    --border:    rgba(255,255,255,0.06);
    --border-hi: rgba(255,255,255,0.12);
    --text-1: #f1f5f9;
    --text-2: #64748b;
    --green:  #84cc16;
    --yellow: #f59e0b;
    --blue:   #3b82f6;
    --red:    #f43f5e;
    --sans:   'DM Sans', sans-serif;
    --mono:   'JetBrains Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .inv-root { font-family: var(--sans); color: var(--text-1); }

  /* ── KPI ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 22px;
  }
  @media (max-width:900px){ .kpi-grid{ grid-template-columns:repeat(2,1fr); } }
  @media (max-width:500px){ .kpi-grid{ grid-template-columns:1fr; } }

  .kpi {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px 22px 18px;
    position: relative;
    overflow: hidden;
    transition: border-color .2s, transform .2s;
  }
  .kpi:hover { border-color: var(--border-hi); transform: translateY(-2px); }
  .kpi::after {
    content:''; position:absolute; top:0; left:0; right:0; height:2px; border-radius:16px 16px 0 0;
  }
  .kpi.g::after { background:var(--green); }
  .kpi.y::after { background:var(--yellow); }
  .kpi.b::after { background:var(--blue); }
  .kpi.r::after { background:var(--red); }

  .kpi-label { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--text-2); margin-bottom:10px; }
  .kpi-val   { font-family:var(--mono); font-size:26px; font-weight:600; }
  .kpi.g .kpi-val { color:var(--green); }
  .kpi.y .kpi-val { color:var(--yellow); }
  .kpi.b .kpi-val { color:var(--blue); }
  .kpi.r .kpi-val { color:var(--red); }
  .kpi-ico { position:absolute; bottom:14px; right:18px; font-size:26px; opacity:.07; }

  /* ── TOOLBAR ── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .search-wrap { flex: 1; min-width: 200px; position: relative; }
  .search-ico {
    position: absolute; left: 13px; top: 50%;
    transform: translateY(-50%);
    font-size: 14px; color: var(--text-2); pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 10px 14px 10px 36px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text-1);
    font-family: var(--sans); font-size: 13px;
    outline: none; transition: border-color .2s;
  }
  .search-input::placeholder { color: var(--text-2); }
  .search-input:focus { border-color: var(--border-hi); }

  .filter-select {
    padding: 10px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text-1);
    font-family: var(--sans); font-size: 13px;
    outline: none; cursor: pointer; transition: border-color .2s;
  }
  .filter-select:focus { border-color: var(--border-hi); }
  .filter-select option { background: #1a1d2a; }

  .btn {
    padding: 10px 18px;
    border: none; border-radius: 12px;
    font-family: var(--sans); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: opacity .15s, transform .15s; white-space: nowrap;
  }
  .btn:hover { opacity: .85; transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .btn-ghost  { background: var(--bg-card); color: var(--text-1); border: 1px solid var(--border); }
  .btn-green  { background: var(--green); color: #0a0a0a; }
  .btn-yellow { background: var(--yellow); color: #0a0a0a; }
  .btn-red    { background: var(--red); color: #fff; }

  /* ── TABLE CARD ── */
  .table-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
  }

  .table-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border);
  }
  .table-title { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--text-2); }
  .table-count { font-size:11px; font-family:var(--mono); font-weight:600; padding:3px 10px; border-radius:20px; background:rgba(59,130,246,.1); color:var(--blue); }

  .inv-table { width:100%; border-collapse:collapse; }
  .inv-table thead tr { border-bottom: 1px solid var(--border); }
  .inv-table thead th {
    padding: 12px 16px;
    font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
    color:var(--text-2); text-align:left; white-space:nowrap;
  }
  .inv-table tbody tr { border-bottom: 1px solid var(--border); transition: background .15s; }
  .inv-table tbody tr:last-child { border-bottom:none; }
  .inv-table tbody tr:hover { background: var(--bg-hover); }
  .inv-table tbody td { padding: 13px 16px; font-size:13px; color:var(--text-1); }

  /* ── inactive row dim ── */
  .inv-table tbody tr.row-inactive { opacity: 0.5; }

  .cell-mono  { font-family:var(--mono); font-size:11px; color:var(--text-2); }
  .cell-name  { font-weight:600; }
  .cell-desc  { color:var(--text-2); font-size:12px; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cell-qty   { font-family:var(--mono); font-weight:600; }
  .cell-price { font-family:var(--mono); color:var(--yellow); font-weight:600; }
  .cell-total { font-family:var(--mono); color:var(--green); font-weight:600; }

  .status-badge { display:inline-block; font-size:10px; font-weight:700; letter-spacing:.06em; padding:3px 9px; border-radius:20px; text-transform:uppercase; }
  .s-ok       { background:rgba(132,204,22,.1);  color:var(--green); }
  .s-low      { background:rgba(245,158,11,.1);  color:var(--yellow); }
  .s-out      { background:rgba(244,63,94,.1);   color:var(--red); }
  .s-inactive { background:rgba(100,116,139,.1); color:var(--text-2); }

  /* ── ACTIONS ── */
  .action-btns { display:flex; gap:7px; }
  .act-btn {
    width:32px; height:32px;
    display:flex; align-items:center; justify-content:center;
    border:none; border-radius:9px; cursor:pointer;
    font-size:14px; transition: background .15s, transform .1s;
    background: var(--bg-hover);
  }
  .act-btn:hover { transform:scale(1.1); }
  .act-sell:hover     { background:rgba(59,130,246,.2); }
  .act-edit:hover     { background:rgba(245,158,11,.2); }
  .act-archive:hover  { background:rgba(245,158,11,.15); }
  .act-del:hover      { background:rgba(244,63,94,.2); }

  /* ── EMPTY ── */
  .empty-state { text-align:center; padding:60px 20px; }
  .empty-ico   { font-size:40px; opacity:.3; margin-bottom:12px; }
  .empty-msg   { color:var(--text-2); font-size:14px; }

  /* ── FOOTER ── */
  .table-footer {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 20px; border-top:1px solid var(--border);
    font-size:12px; color:var(--text-2); font-family:var(--mono);
  }

  /* ── OVERLAY MODAL ── */
  .modal-overlay {
    position:fixed; inset:0;
    background:rgba(0,0,0,.75);
    display:flex; align-items:center; justify-content:center;
    z-index:999;
    animation: fadeIn .15s ease;
  }
  .modal-box {
    background: var(--bg-card);
    border: 1px solid var(--border-hi);
    border-radius: 18px;
    padding: 32px;
    max-width: 440px; width: 92%;
    animation: scaleIn .15s ease;
  }
  .modal-ico   { font-size:38px; margin-bottom:12px; text-align:center; }
  .modal-title { font-size:17px; font-weight:700; margin-bottom:8px; text-align:center; }
  .modal-msg   { font-size:13px; color:var(--text-2); margin-bottom:24px; line-height:1.6; text-align:center; }

  /* Two-option delete layout */
  .del-options { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
  .del-option {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 14px;
    cursor: pointer;
    transition: border-color .18s, background .18s;
    text-align: left;
    background: var(--bg-hover);
  }
  .del-option:hover { border-color: var(--border-hi); }
  .del-option.opt-yellow:hover { border-color: var(--yellow); background: rgba(245,158,11,.06); }
  .del-option.opt-red:hover    { border-color: var(--red);    background: rgba(244,63,94,.06);  }
  .del-option-icon  { font-size:22px; margin-bottom:8px; }
  .del-option-title { font-size:13px; font-weight:700; margin-bottom:4px; }
  .del-option-desc  { font-size:11px; color:var(--text-2); line-height:1.5; }
  .del-option.opt-yellow .del-option-title { color: var(--yellow); }
  .del-option.opt-red    .del-option-title { color: var(--red); }

  .del-cancel { display:block; width:100%; text-align:center; }

  /* confirm step */
  .confirm-btns { display:flex; gap:10px; justify-content:center; margin-top:8px; }

  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes scaleIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }

  /* ── TOAST ── */
  .toast-wrap {
    position:fixed; top:20px; right:20px; z-index:9999;
    display:flex; flex-direction:column; gap:8px; pointer-events:none;
  }
  .toast {
    background:#1a1d2a; border:1px solid var(--border-hi); border-radius:12px;
    padding:12px 18px; font-size:13px; font-weight:500; color:var(--text-1);
    box-shadow:0 8px 24px rgba(0,0,0,.5);
    animation:slideIn .2s ease; pointer-events:all;
    display:flex; align-items:center; gap:10px;
  }
  @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
`;

/* ─── helpers ───────────────────────────────────────────────────────────── */
const getQtyNum = (p) => parseFloat(String(p.quantity)) || 0;
const getPrice  = (p) => Number(p.unit_price)  || 0;
const getTotal  = (p) => Number(p.total_price) || 0;

const getStatus = (qty, isActive) => {
  if (!isActive)  return { label: "Inactive",     cls: "s-inactive" };
  if (qty === 0)  return { label: "Out of Stock", cls: "s-out" };
  if (qty < 5)    return { label: "Low Stock",    cls: "s-low" };
  return              { label: "In Stock",       cls: "s-ok" };
};

/* ─── Toast ─────────────────────────────────────────────────────────────── */
let _id = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, ico = "✅") => {
    const id = ++_id;
    setToasts((t) => [...t, { id, msg, ico }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return { toasts, show };
}

/* ─── Delete Modal ───────────────────────────────────────────────────────── */
// step: "choose" | "confirmArchive" | "confirmDelete"
function DeleteModal({ product, onClose, onArchived, onDeleted }) {
  const [step, setStep] = useState("choose");
  const [busy, setBusy] = useState(false);

  const handleArchive = async () => {
    setBusy(true);
    try {
      await archiveProduct(product.product_id);
      onArchived(product.product_name);
    } catch (e) {
      alert(e?.response?.data?.detail || "Archive failed");
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteProduct(product.product_id);
      onDeleted(product.product_name);
    } catch (e) {
      alert(e?.response?.data?.detail || "Delete failed");
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        {step === "choose" && (
          <>
            <div className="modal-ico">📦</div>
            <div className="modal-title">Remove "{product.product_name}"?</div>
            <div className="modal-msg">
              Choose how you want to remove this product.<br />
              Transaction history is always preserved.
            </div>

            <div className="del-options">
              {/* Option A — Mark Inactive */}
              <button
                className="del-option opt-yellow"
                type="button"
                onClick={() => setStep("confirmArchive")}
              >
                <div className="del-option-icon">🗂️</div>
                <div className="del-option-title">Mark Inactive</div>
                <div className="del-option-desc">
                  Hides from inventory. All transactions kept. Can be reactivated later.
                </div>
              </button>

              {/* Option B — Delete Permanently */}
              <button
                className="del-option opt-red"
                type="button"
                onClick={() => setStep("confirmDelete")}
              >
                <div className="del-option-icon">🗑️</div>
                <div className="del-option-title">Delete Permanently</div>
                <div className="del-option-desc">
                  Removes product from DB. Transactions remain visible in history.
                </div>
              </button>
            </div>

            <button className="btn btn-ghost del-cancel" onClick={onClose} type="button">
              Cancel
            </button>
          </>
        )}

        {step === "confirmArchive" && (
          <>
            <div className="modal-ico">🗂️</div>
            <div className="modal-title">Mark as Inactive?</div>
            <div className="modal-msg">
              <strong>{product.product_name}</strong> will be hidden from your inventory.<br />
              All transactions are preserved. You can reactivate it anytime.
            </div>
            <div className="confirm-btns">
              <button className="btn btn-ghost" onClick={() => setStep("choose")} type="button">← Back</button>
              <button
                className="btn btn-yellow"
                onClick={handleArchive}
                disabled={busy}
                type="button"
              >
                {busy ? "Archiving…" : "Yes, Mark Inactive"}
              </button>
            </div>
          </>
        )}

        {step === "confirmDelete" && (
          <>
            <div className="modal-ico">🗑️</div>
            <div className="modal-title">Delete Permanently?</div>
            <div className="modal-msg">
              <strong>{product.product_name}</strong> will be removed from your database.<br />
              This cannot be undone. All past transactions will still be visible in history.
            </div>
            <div className="confirm-btns">
              <button className="btn btn-ghost" onClick={() => setStep("choose")} type="button">← Back</button>
              <button
                className="btn btn-red"
                onClick={handleDelete}
                disabled={busy}
                type="button"
              >
                {busy ? "Deleting…" : "Yes, Delete Forever"}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Inventory() {
  const [products,    setProducts]    = useState([]);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all"); // all | low | out | inactive
  const [addOpen,     setAddOpen]     = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [sellTarget,  setSellTarget]  = useState(null);
  const [delTarget,   setDelTarget]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const { toasts, show: toast }       = useToast();

  /* ── fetch — include_inactive so we can show the "Inactive" filter tab ── */
  const load = async () => {
    setLoading(true);
    try {
      const res = await getAllProducts(true); // true = include inactive products
      const raw = res?.data?.data ?? res?.data ?? [];
      // Filter ghost products (belt-and-suspenders — backend also excludes them)
      setProducts(Array.isArray(raw) ? raw.filter(p => !String(p.product_id || "").startsWith("__ghost__")) : []);
    } catch {
      toast("Failed to load products", "❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── KPIs (active products only) ── */
  const active        = products.filter((p) => p.is_active !== false);
  const totalProducts = active.length;
  const stockValue    = active.reduce((a, p) => a + getTotal(p), 0);
  const lowStockCount = active.filter((p) => getQtyNum(p) > 0 && getQtyNum(p) < 5).length;
  const outOfStock    = active.filter((p) => getQtyNum(p) === 0).length;

  /* ── filtered list ── */
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const qty      = getQtyNum(p);
      const isActive = p.is_active !== false;

      const matchSearch =
        (p.product_name || "").toLowerCase().includes(q) ||
        (p.description  || "").toLowerCase().includes(q) ||
        String(p.product_id).includes(q);

      const matchFilter =
        filter === "all"      ? isActive :
        filter === "low"      ? isActive && qty > 0 && qty < 5 :
        filter === "out"      ? isActive && qty === 0 :
        filter === "inactive" ? !isActive : true;

      return matchSearch && matchFilter;
    });
  }, [products, search, filter]);

  return (
    <Layout>
      <style>{styles}</style>

      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.ico}</span><span>{t.msg}</span>
          </div>
        ))}
      </div>

      <div className="inv-root">

        {/* ── KPI row ── */}
        <div className="kpi-grid">
          <div className="kpi g">
            <div className="kpi-label">Active Products</div>
            <div className="kpi-val">{totalProducts}</div>
            <div className="kpi-ico">📦</div>
          </div>
          <div className="kpi y">
            <div className="kpi-label">Stock Value</div>
            <div className="kpi-val">₹{stockValue.toLocaleString()}</div>
            <div className="kpi-ico">💰</div>
          </div>
          <div className="kpi b">
            <div className="kpi-label">Low Stock</div>
            <div className="kpi-val">{lowStockCount}</div>
            <div className="kpi-ico">⚡</div>
          </div>
          <div className="kpi r">
            <div className="kpi-label">Out of Stock</div>
            <div className="kpi-val">{outOfStock}</div>
            <div className="kpi-ico">⚠️</div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-ico">🔍</span>
            <input
              className="search-input"
              placeholder="Search by name, description or barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Active Items</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
            <option value="inactive">Inactive / Archived</option>
          </select>

          <button className="btn btn-ghost" onClick={load} type="button">↺ Refresh</button>
          <button className="btn btn-green" onClick={() => setAddOpen(true)} type="button">+ Add Product</button>
        </div>

        {/* ── Table ── */}
        <div className="table-card">
          <div className="table-head">
            <div className="table-title">
              {filter === "inactive" ? "Inactive / Archived Products" : "Inventory"}
            </div>
            <div className="table-count">{visible.length} items</div>
          </div>

          <table className="inv-table">
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Product Name</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8">
                  <div className="empty-state">
                    <div className="empty-ico">⏳</div>
                    <div className="empty-msg">Loading inventory…</div>
                  </div>
                </td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="8">
                  <div className="empty-state">
                    <div className="empty-ico">📭</div>
                    <div className="empty-msg">
                      {search || filter !== "all"
                        ? "No products match your filters."
                        : "No products yet — add your first one!"}
                    </div>
                  </div>
                </td></tr>
              ) : (
                visible.map((p) => {
                  const qty      = getQtyNum(p);
                  const isActive = p.is_active !== false;
                  const status   = getStatus(qty, isActive);
                  return (
                    <tr key={p.product_id} className={!isActive ? "row-inactive" : ""}>
                      <td><span className="cell-mono">#{p.product_id}</span></td>
                      <td><span className="cell-name">{p.product_name}</span></td>
                      <td><span className="cell-desc">{p.description || "—"}</span></td>
                      <td>
                        <span className="cell-qty" style={{
                          color: qty === 0 ? "var(--red)" : qty < 5 ? "var(--yellow)" : "var(--green)"
                        }}>
                          {p.quantity}
                        </span>
                      </td>
                      <td><span className="cell-price">₹{getPrice(p).toLocaleString()} / {p.unit || "unit"}</span></td>
                      <td><span className="cell-total">₹{getTotal(p).toLocaleString()}</span></td>
                      <td><span className={`status-badge ${status.cls}`}>{status.label}</span></td>
                      <td>
                        <div className="action-btns">
                          {isActive && (
                            <>
                              <button
                                className="act-btn act-sell"
                                title="Sell"
                                onClick={() => setSellTarget(p)}
                                type="button"
                              >🛒</button>
                              <button
                                className="act-btn act-edit"
                                title="Edit / Restock"
                                onClick={() => setEditTarget(p)}
                                type="button"
                              >✏️</button>
                            </>
                          )}
                          {/* Always show the remove button — opens two-choice modal */}
                          <button
                            className="act-btn act-del"
                            title={isActive ? "Remove / Archive" : "Delete Permanently"}
                            onClick={() => setDelTarget(p)}
                            type="button"
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {!loading && visible.length > 0 && (
            <div className="table-footer">
              <span>Showing {visible.length} of {products.length} products</span>
              <span>Active Stock Value: ₹{stockValue.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {addOpen && (
        <AddProductModal
          onClose={() => setAddOpen(false)}
          onSuccess={() => { setAddOpen(false); load(); toast("Product added! 🎉"); }}
        />
      )}
      {editTarget && (
        <EditProductModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); load(); toast("Product updated!"); }}
        />
      )}
      {sellTarget && (
        <SellProductModal
          product={sellTarget}
          onClose={() => setSellTarget(null)}
          onSuccess={() => { setSellTarget(null); load(); toast("Sale recorded! 🎉", "💸"); }}
        />
      )}

      {/* ── Two-choice delete / archive modal ── */}
      {delTarget && (
        <DeleteModal
          product={delTarget}
          onClose={() => setDelTarget(null)}
          onArchived={(name) => {
            setDelTarget(null);
            toast(`"${name}" marked as inactive.`, "🗂️");
            load();
          }}
          onDeleted={(name) => {
            setDelTarget(null);
            toast(`"${name}" deleted permanently. History preserved.`, "🗑️");
            load();
          }}
        />
      )}
    </Layout>
  );
}