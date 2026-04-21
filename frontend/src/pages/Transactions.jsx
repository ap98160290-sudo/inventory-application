// import { useEffect, useState, useCallback } from "react";
// import Layout from "../layout/Layout";
// import {
//   getAllTransactions,
//   getSalesTransactions,
//   getPurchaseTransactions,
//   getWriteOffTransactions,
// } from "../services/Insightservice";

// /* ─────────────────────────────────────────────────────────────────────────
//    STYLES — identical design tokens as Dashboard / Inventory
//    ───────────────────────────────────────────────────────────────────────── */
// const styles = `
//   @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

//   :root {
//     --bg-base:   #08090f;
//     --bg-card:   #0e1016;
//     --bg-hover:  #13151f;
//     --border:    rgba(255,255,255,0.06);
//     --border-hi: rgba(255,255,255,0.12);
//     --text-1: #f1f5f9;
//     --text-2: #64748b;
//     --green:  #84cc16;
//     --yellow: #f59e0b;
//     --blue:   #3b82f6;
//     --red:    #f43f5e;
//     --lime:   #d4ff27;
//     --sans:   'DM Sans', sans-serif;
//     --mono:   'JetBrains Mono', monospace;
//   }

//   *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

//   .tx-root { font-family: var(--sans); color: var(--text-1); }

//   /* ── KPI GRID ── */
//   .kpi-grid {
//     display: grid;
//     grid-template-columns: repeat(4, 1fr);
//     gap: 14px;
//     margin-bottom: 22px;
//   }
//   @media (max-width:900px){ .kpi-grid{ grid-template-columns:repeat(2,1fr); } }
//   @media (max-width:500px){ .kpi-grid{ grid-template-columns:1fr; } }

//   .kpi {
//     background: var(--bg-card);
//     border: 1px solid var(--border);
//     border-radius: 16px;
//     padding: 20px 22px 18px;
//     position: relative;
//     overflow: hidden;
//     transition: border-color .2s, transform .2s;
//   }
//   .kpi:hover { border-color: var(--border-hi); transform: translateY(-2px); }
//   .kpi::after {
//     content:''; position:absolute; top:0; left:0; right:0; height:2px; border-radius:16px 16px 0 0;
//   }
//   .kpi.g::after { background: var(--green);  }
//   .kpi.y::after { background: var(--yellow); }
//   .kpi.b::after { background: var(--blue);   }
//   .kpi.r::after { background: var(--red);    }

//   .kpi-label { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--text-2); margin-bottom:10px; }
//   .kpi-val   { font-family:var(--mono); font-size:26px; font-weight:600; }
//   .kpi.g .kpi-val { color: var(--green);  }
//   .kpi.y .kpi-val { color: var(--yellow); }
//   .kpi.b .kpi-val { color: var(--blue);   }
//   .kpi.r .kpi-val { color: var(--red);    }
//   .kpi-ico { position:absolute; bottom:14px; right:18px; font-size:26px; opacity:.07; }

//   /* ── TOOLBAR ── */
//   .tx-toolbar {
//     display: flex;
//     align-items: center;
//     gap: 12px;
//     margin-bottom: 14px;
//     flex-wrap: wrap;
//   }

//   .tx-tabs {
//     display: flex;
//     gap: 4px;
//     background: var(--bg-card);
//     border: 1px solid var(--border);
//     border-radius: 12px;
//     padding: 4px;
//   }
//   .tx-tab {
//     font-family: var(--mono);
//     font-size: 10px;
//     font-weight: 600;
//     letter-spacing: .07em;
//     text-transform: uppercase;
//     padding: 7px 16px;
//     border-radius: 9px;
//     border: 1px solid transparent;
//     cursor: pointer;
//     color: var(--text-2);
//     background: transparent;
//     transition: all .15s;
//   }
//   .tx-tab:hover:not(.tx-tab-active) { color: var(--text-1); }
//   .tx-tab.tx-tab-active {
//     background: var(--bg-hover);
//     color: var(--text-1);
//     border-color: var(--border-hi);
//   }

//   .tx-search {
//     flex: 1;
//     min-width: 180px;
//     max-width: 300px;
//     background: var(--bg-card);
//     border: 1px solid var(--border);
//     border-radius: 12px;
//     padding: 9px 14px;
//     font-family: var(--sans);
//     font-size: 13px;
//     color: var(--text-1);
//     outline: none;
//     transition: border-color .18s;
//   }
//   .tx-search::placeholder { color: var(--text-2); }
//   .tx-search:focus { border-color: var(--border-hi); }

//   .tx-refresh-btn {
//     font-family: var(--mono);
//     font-size: 10px;
//     font-weight: 600;
//     letter-spacing: .06em;
//     padding: 9px 16px;
//     border-radius: 12px;
//     border: 1px solid var(--border);
//     background: var(--bg-card);
//     color: var(--text-2);
//     cursor: pointer;
//     transition: all .18s;
//   }
//   .tx-refresh-btn:hover { border-color: var(--border-hi); color: var(--text-1); }

//   .tx-count {
//     margin-left: auto;
//     font-family: var(--mono);
//     font-size: 11px;
//     color: var(--text-2);
//   }

//   /* ── TABLE CARD ── */
//   .tx-card {
//     background: var(--bg-card);
//     border: 1px solid var(--border);
//     border-radius: 16px;
//     overflow: hidden;
//   }

//   .tx-table-wrap { overflow-x: auto; }

//   .tx-table {
//     width: 100%;
//     border-collapse: collapse;
//     font-size: 13px;
//   }

//   .tx-table thead tr { border-bottom: 1px solid var(--border); }
//   .tx-table thead th {
//     padding: 12px 16px;
//     font-family: var(--mono);
//     font-size: 9px;
//     font-weight: 600;
//     letter-spacing: .14em;
//     text-transform: uppercase;
//     color: var(--text-2);
//     text-align: left;
//     white-space: nowrap;
//   }

//   .tx-table tbody tr {
//     border-bottom: 1px solid var(--border);
//     transition: background .13s;
//   }
//   .tx-table tbody tr:hover { background: var(--bg-hover); }
//   .tx-table tbody tr:last-child { border-bottom: none; }
//   .tx-table tbody td {
//     padding: 12px 16px;
//     color: var(--text-1);
//     white-space: nowrap;
//   }

//   /* ── TYPE PILL ── */
//   .tx-pill {
//     display: inline-block;
//     font-family: var(--mono);
//     font-size: 9px;
//     font-weight: 600;
//     letter-spacing: .08em;
//     text-transform: uppercase;
//     padding: 3px 10px;
//     border-radius: 20px;
//   }
//   .tx-pill.sell     { background: rgba(132,204,22,.12); color: var(--green);  }
//   .tx-pill.purchase { background: rgba(59,130,246,.12); color: var(--blue);   }
//   .tx-pill.writeoff { background: rgba(244,63,94,.12);  color: var(--red);    }
//   .tx-pill.update   { background: rgba(245,158,11,.12); color: var(--yellow); }
//   .tx-pill.other    { background: rgba(100,116,139,.12); color: var(--text-2); }

//   .tx-mono  { font-family: var(--mono); font-size: 12px; }
//   .tx-pos   { font-family:var(--mono); font-size:12px; font-weight:600; color:var(--green); }
//   .tx-neg   { font-family:var(--mono); font-size:12px; font-weight:600; color:var(--red);   }
//   .tx-neu   { font-family:var(--mono); font-size:12px; color:var(--text-2); }
//   .tx-date  { font-family:var(--mono); font-size:11px; color:var(--text-2); }
//   .tx-num   { font-family:var(--mono); font-size:11px; color:var(--text-2); }

//   /* ── PAGINATION ── */
//   .tx-pager {
//     display: flex;
//     align-items: center;
//     justify-content: space-between;
//     padding: 14px 16px;
//     border-top: 1px solid var(--border);
//     flex-wrap: wrap;
//     gap: 10px;
//   }
//   .tx-pager-info { font-family:var(--mono); font-size:11px; color:var(--text-2); }
//   .tx-pager-btns { display:flex; gap:6px; }
//   .tx-pager-btn {
//     font-family: var(--mono);
//     font-size: 11px;
//     font-weight: 600;
//     padding: 7px 14px;
//     border-radius: 9px;
//     border: 1px solid var(--border);
//     background: var(--bg-hover);
//     color: var(--text-2);
//     cursor: pointer;
//     transition: all .15s;
//   }
//   .tx-pager-btn:hover:not(:disabled) { border-color:var(--border-hi); color:var(--text-1); }
//   .tx-pager-btn:disabled { opacity:.32; cursor:not-allowed; }

//   /* ── SPINNER ── */
//   .tx-spin-wrap { display:flex; justify-content:center; align-items:center; padding:64px 0; }
//   .tx-spinner {
//     width:28px; height:28px;
//     border:3px solid var(--border);
//     border-top-color: var(--lime);
//     border-radius:50%;
//     animation: tx-rotate .65s linear infinite;
//   }
//   @keyframes tx-rotate { to { transform:rotate(360deg); } }

//   .tx-empty { text-align:center; padding:64px 20px; color:var(--text-2); font-size:14px; }
//   .tx-empty-icon { font-size:36px; margin-bottom:12px; }
// `;

// /* ─── helpers ───────────────────────────────────────────────────────────── */
// const PAGE_SZ = 20;

// const inr = (n) =>
//   `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// // Maps API transaction_type → CSS class for the pill
// function pillClass(raw) {
//   const t = String(raw || "").toLowerCase().trim();
//   if (t === "sell")                     return "sell";
//   if (t === "update" || t === "add")    return "update";
//   if (t === "writeoff")                 return "writeoff";
//   return "other";
// }

// function fmtDate(raw) {
//   if (!raw) return "—";
//   const d = new Date(raw);
//   if (isNaN(d)) return String(raw);
//   return d.toLocaleString("en-IN", {
//     day: "2-digit", month: "short", year: "numeric",
//     hour: "2-digit", minute: "2-digit",
//   });
// }

// const toArr = (res) => {
//   const d = res?.data;
//   if (Array.isArray(d)) return d;
//   if (Array.isArray(d?.data)) return d.data;
//   return [];
// };

// function Spinner() {
//   return <div className="tx-spin-wrap"><div className="tx-spinner" /></div>;
// }

// /* ═══════════════════════════════════════════════════════════════════════════
//    MAIN COMPONENT
//    ═══════════════════════════════════════════════════════════════════════════ */
// export default function Transactions() {
//   const [rows,    setRows]    = useState([]);
//   const [tab,     setTab]     = useState("all");
//   const [search,  setSearch]  = useState("");
//   const [page,    setPage]    = useState(1);
//   const [loading, setLoading] = useState(true);

//   const fetchData = useCallback(async () => {
//     setLoading(true);
//     try {
//       let res;
//       if      (tab === "sales")     res = await getSalesTransactions();
//       else if (tab === "purchases") res = await getPurchaseTransactions();
//       else if (tab === "writeoffs") res = await getWriteOffTransactions();
//       else                          res = await getAllTransactions();
//       setRows(toArr(res));
//       setPage(1);
//     } catch (e) {
//       console.error("Transactions:", e);
//       setRows([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [tab]);

//   useEffect(() => { fetchData(); }, [fetchData]);

//   /* ── filter ── */
//   const filtered = rows.filter((tx) => {
//     if (!search.trim()) return true;
//     const q = search.toLowerCase();
//     return (
//       String(tx.product_name     || "").toLowerCase().includes(q) ||
//       String(tx.transaction_type || "").toLowerCase().includes(q) ||
//       String(tx.reason           || "").toLowerCase().includes(q)
//     );
//   });

//   /* ── pagination ── */
//   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SZ));
//   const paginated  = filtered.slice((page - 1) * PAGE_SZ, page * PAGE_SZ);

//   /* ── KPIs computed from ALL rows regardless of active tab ── */
//   const allSells     = rows.filter(t => t.transaction_type === "sell");
//   const allWriteOffs = rows.filter(t => t.transaction_type === "writeoff");

//   // Revenue: backend sends total_price for sell transactions
//   const totalRevenue  = allSells.reduce((s, t) => s + Number(t.total_price || 0), 0);
//   // Profit: net across all types (writeoffs are negative)
//   const totalProfit   = rows.reduce((s, t) => s + Number(t.profit || 0), 0);
//   // Write-off loss: sum of absolute value of writeoff profits
//   const totalLoss     = allWriteOffs.reduce((s, t) => s + Math.abs(Number(t.profit || 0)), 0);

//   return (
//     <Layout>
//       <style>{styles}</style>
//       <div className="tx-root">

//         {/* ══ KPI ROW ══════════════════════════════════════════════════════ */}
//         <div className="kpi-grid">
//           <div className="kpi g">
//             <div className="kpi-label">Total Records</div>
//             <div className="kpi-val">{rows.length}</div>
//             <div className="kpi-ico">🔢</div>
//           </div>
//           <div className="kpi b">
//             <div className="kpi-label">Total Revenue</div>
//             <div className="kpi-val">{inr(totalRevenue)}</div>
//             <div className="kpi-ico">💳</div>
//           </div>
//           <div className="kpi y">
//             <div className="kpi-label">Net Profit</div>
//             <div className="kpi-val">{inr(totalProfit)}</div>
//             <div className="kpi-ico">📈</div>
//           </div>
//           <div className="kpi r">
//             <div className="kpi-label">Write-off Loss</div>
//             <div className="kpi-val">{inr(totalLoss)}</div>
//             <div className="kpi-ico">🗑️</div>
//           </div>
//         </div>

//         {/* ══ TOOLBAR ══════════════════════════════════════════════════════ */}
//         <div className="tx-toolbar">
//           <div className="tx-tabs">
//             {[
//               { key: "all",       label: "All"        },
//               { key: "sales",     label: "Sales"      },
//               { key: "purchases", label: "Purchases"  },
//               { key: "writeoffs", label: "Write-offs" },
//             ].map((t) => (
//               <button
//                 key={t.key}
//                 className={`tx-tab ${tab === t.key ? "tx-tab-active" : ""}`}
//                 onClick={() => { setTab(t.key); setPage(1); }}
//                 type="button"
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>

//           <input
//             className="tx-search"
//             placeholder="Search product, type…"
//             value={search}
//             onChange={(e) => { setSearch(e.target.value); setPage(1); }}
//           />

//           <button className="tx-refresh-btn" onClick={fetchData} type="button">
//             ↻ Refresh
//           </button>

//           <span className="tx-count">{filtered.length} records</span>
//         </div>

//         {/* ══ TABLE ════════════════════════════════════════════════════════ */}
//         <div className="tx-card">
//           {loading ? <Spinner /> : filtered.length === 0 ? (
//             <div className="tx-empty">
//               <div className="tx-empty-icon">📋</div>
//               {search.trim()
//                 ? "No transactions match your search."
//                 : "No transactions yet — start selling!"}
//             </div>
//           ) : (
//             <>
//               <div className="tx-table-wrap">
//                 <table className="tx-table">
//                   <thead>
//                     <tr>
//                       <th>#</th>
//                       <th>Product</th>
//                       <th>Type</th>
//                       <th>Quantity</th>
//                       <th>Unit</th>
//                       <th>Revenue</th>
//                       <th>Profit / Loss</th>
//                       <th>Reason</th>
//                       <th>Date & Time</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {paginated.map((tx, i) => {
//                       const profit   = Number(tx.profit     || 0);
//                       // total_price is revenue for sell, cost for update/add
//                       const revenue  = Number(tx.total_price || 0);
//                       const pc       = pillClass(tx.transaction_type);
//                       const rowNum   = (page - 1) * PAGE_SZ + i + 1;

//                       return (
//                         <tr key={i}>
//                           <td className="tx-num">{rowNum}</td>

//                           <td style={{ fontWeight: 500 }}>
//                             {tx.product_name || "—"}
//                           </td>

//                           <td>
//                             <span className={`tx-pill ${pc}`}>
//                               {tx.transaction_type || "—"}
//                             </span>
//                           </td>

//                           <td className="tx-mono">{tx.quantity ?? "—"}</td>

//                           <td className="tx-mono" style={{ color:"var(--text-2)" }}>
//                             {tx.unit || "—"}
//                           </td>

//                           <td className="tx-mono">
//                             {tx.transaction_type === "sell" && revenue > 0
//                               ? inr(revenue)
//                               : "—"}
//                           </td>

//                           <td>
//                             {profit > 0 ? (
//                               <span className="tx-pos">+{inr(profit)}</span>
//                             ) : profit < 0 ? (
//                               <span className="tx-neg">₹{profit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
//                             ) : (
//                               <span className="tx-neu">—</span>
//                             )}
//                           </td>
                          
//                           <td>
//                             {tx.transaction_type === "writeoff" && tx.reason ? (
//                                 <span className="tx-pill writeoff" style={{ fontSize: '10px' }}>
//                                 {tx.reason}
//                                 </span>
//                             ) : (
//                                 <span className="tx-neu">—</span>
//                             )}
//                           </td>

//                           <td className="tx-date">
//                             {fmtDate(tx.timestamp || tx.created_at || tx.date)}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>

//               {totalPages > 1 && (
//                 <div className="tx-pager">
//                   <span className="tx-pager-info">
//                     Page {page} of {totalPages} &nbsp;·&nbsp; {filtered.length} total
//                   </span>
//                   <div className="tx-pager-btns">
//                     <button
//                       className="tx-pager-btn"
//                       onClick={() => setPage((p) => Math.max(1, p - 1))}
//                       disabled={page === 1}
//                       type="button"
//                     >← Prev</button>
//                     <button
//                       className="tx-pager-btn"
//                       onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//                       disabled={page === totalPages}
//                       type="button"
//                     >Next →</button>
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>

//       </div>
//     </Layout>
//   );
// }

import { useEffect, useState, useCallback } from "react";
import Layout from "../layout/Layout";
import {
  getAllTransactions,
  getSalesTransactions,
  getPurchaseTransactions,
  getWriteOffTransactions,
} from "../services/Insightservice";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
  :root {
    --bg-base:#08090f; --bg-card:#0e1016; --bg-hover:#13151f;
    --border:rgba(255,255,255,0.06); --border-hi:rgba(255,255,255,0.12);
    --text-1:#f1f5f9; --text-2:#64748b;
    --green:#84cc16; --yellow:#f59e0b; --blue:#3b82f6; --red:#f43f5e; --lime:#d4ff27;
    --sans:'DM Sans',sans-serif; --mono:'JetBrains Mono',monospace;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  .tx-root{font-family:var(--sans);color:var(--text-1);}

  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;}
  @media(max-width:900px){.kpi-grid{grid-template-columns:repeat(2,1fr);}}
  @media(max-width:500px){.kpi-grid{grid-template-columns:1fr;}}
  .kpi{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px 22px 18px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s;}
  .kpi:hover{border-color:var(--border-hi);transform:translateY(-2px);}
  .kpi::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:16px 16px 0 0;}
  .kpi.g::after{background:var(--green);} .kpi.y::after{background:var(--yellow);}
  .kpi.b::after{background:var(--blue);}  .kpi.r::after{background:var(--red);}
  .kpi-label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text-2);margin-bottom:10px;}
  .kpi-val{font-family:var(--mono);font-size:26px;font-weight:600;}
  .kpi.g .kpi-val{color:var(--green);} .kpi.y .kpi-val{color:var(--yellow);}
  .kpi.b .kpi-val{color:var(--blue);}  .kpi.r .kpi-val{color:var(--red);}
  .kpi-ico{position:absolute;bottom:14px;right:18px;font-size:26px;opacity:.07;}

  .tx-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;}
  .tx-tabs{display:flex;gap:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:4px;}
  .tx-tab{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;padding:7px 16px;border-radius:9px;border:1px solid transparent;cursor:pointer;color:var(--text-2);background:transparent;transition:all .15s;}
  .tx-tab:hover:not(.tx-tab-active){color:var(--text-1);}
  .tx-tab.tx-tab-active{background:var(--bg-hover);color:var(--text-1);border-color:var(--border-hi);}
  .tx-search{flex:1;min-width:200px;max-width:320px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:9px 14px;font-family:var(--sans);font-size:13px;color:var(--text-1);outline:none;transition:border-color .18s;}
  .tx-search::placeholder{color:var(--text-2);}
  .tx-search:focus{border-color:var(--border-hi);}
  .tx-refresh-btn{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.06em;padding:9px 16px;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-2);cursor:pointer;transition:all .18s;}
  .tx-refresh-btn:hover{border-color:var(--border-hi);color:var(--text-1);}
  .tx-count{margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--text-2);}

  .tx-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden;}
  .tx-table-wrap{overflow-x:auto;}
  .tx-table{width:100%;border-collapse:collapse;font-size:13px;}
  .tx-table thead tr{border-bottom:1px solid var(--border);}
  .tx-table thead th{padding:12px 16px;font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-2);text-align:left;white-space:nowrap;}
  .tx-table tbody tr{border-bottom:1px solid var(--border);transition:background .13s;}
  .tx-table tbody tr:hover{background:var(--bg-hover);}
  .tx-table tbody tr:last-child{border-bottom:none;}
  .tx-table tbody td{padding:12px 16px;color:var(--text-1);white-space:nowrap;}

  .tx-pill{display:inline-block;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:3px 10px;border-radius:20px;}
  .tx-pill.sell    {background:rgba(132,204,22,.14);color:var(--green);}
  .tx-pill.update  {background:rgba(59,130,246,.14); color:var(--blue);}
  .tx-pill.add     {background:rgba(59,130,246,.14); color:var(--blue);}
  .tx-pill.writeoff{background:rgba(244,63,94,.14);  color:var(--red);}
  .tx-pill.other   {background:rgba(100,116,139,.14);color:var(--text-2);}

  .reason-tag{display:inline-block;font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:6px;background:rgba(244,63,94,.1);color:var(--red);border:1px solid rgba(244,63,94,.2);}

  .tx-mono{font-family:var(--mono);font-size:12px;}
  .tx-pos {font-family:var(--mono);font-size:12px;font-weight:700;color:var(--green);}
  .tx-neg {font-family:var(--mono);font-size:12px;font-weight:700;color:var(--red);}
  .tx-neu {font-family:var(--mono);font-size:12px;color:var(--text-2);}
  .tx-total-sell    {font-family:var(--mono);font-size:12px;font-weight:600;color:var(--green);}
  .tx-total-writeoff{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--red);}
  .tx-total-other   {font-family:var(--mono);font-size:12px;color:var(--text-2);}
  .tx-date{font-family:var(--mono);font-size:11px;color:var(--text-2);}
  .tx-num {font-family:var(--mono);font-size:11px;color:var(--text-2);}
  .tx-product{font-weight:600;font-size:13px;}
  .tx-price{font-family:var(--mono);font-size:12px;color:var(--yellow);}

  .tx-pager{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-top:1px solid var(--border);flex-wrap:wrap;gap:10px;}
  .tx-pager-info{font-family:var(--mono);font-size:11px;color:var(--text-2);}
  .tx-pager-btns{display:flex;gap:6px;}
  .tx-pager-btn{font-family:var(--mono);font-size:11px;font-weight:600;padding:7px 14px;border-radius:9px;border:1px solid var(--border);background:var(--bg-hover);color:var(--text-2);cursor:pointer;transition:all .15s;}
  .tx-pager-btn:hover:not(:disabled){border-color:var(--border-hi);color:var(--text-1);}
  .tx-pager-btn:disabled{opacity:.32;cursor:not-allowed;}

  .tx-spin-wrap{display:flex;justify-content:center;align-items:center;padding:64px 0;}
  .tx-spinner{width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--lime);border-radius:50%;animation:tx-rotate .65s linear infinite;}
  @keyframes tx-rotate{to{transform:rotate(360deg);}}
  .tx-empty{text-align:center;padding:64px 20px;color:var(--text-2);font-size:14px;}
  .tx-empty-icon{font-size:36px;margin-bottom:12px;}
`;

/* ── helpers ─────────────────────────────────────────────────────────── */
const PAGE_SZ = 20;

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function pillClass(raw) {
  const t = String(raw || "").toLowerCase().trim();
  if (t === "sell")     return "sell";
  if (t === "update")   return "update";
  if (t === "add")      return "add";
  if (t === "writeoff") return "writeoff";
  return "other";
}

function pillLabel(raw) {
  const t = String(raw || "").toLowerCase().trim();
  if (t === "update" || t === "add") return "ADD";
  return t.toUpperCase();
}

function fmtDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d)) return String(raw);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const toArr = (res) => {
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data))       return res.data;
  return [];
};

function Spinner() {
  return <div className="tx-spin-wrap"><div className="tx-spinner" /></div>;
}

/* ═════════════════════════════════════════════════════════════════════════ */
export default function Transactions() {
  const [rows,    setRows]    = useState([]);
  const [tab,     setTab]     = useState("all");
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if      (tab === "sales")     res = await getSalesTransactions();
      else if (tab === "purchases") res = await getPurchaseTransactions();
      else if (tab === "writeoffs") res = await getWriteOffTransactions();
      else                          res = await getAllTransactions();
      setRows(toArr(res));
      setPage(1);
    } catch (e) {
      console.error("Transactions:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = rows.filter((tx) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(tx.product_name     || "").toLowerCase().includes(q) ||
      String(tx.transaction_type || "").toLowerCase().includes(q) ||
      String(tx.reason           || "").toLowerCase().includes(q) ||
      String(tx.unit             || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SZ));
  const paginated  = filtered.slice((page - 1) * PAGE_SZ, page * PAGE_SZ);

  const sellRows     = rows.filter(t => t.transaction_type === "sell");
  const writeoffRows = rows.filter(t => t.transaction_type === "writeoff");
  const totalRevenue = sellRows.reduce((s, t) => s + Number(t.total_price || 0), 0);
  const totalProfit  = rows.reduce((s, t) => s + Number(t.profit || 0), 0);
  const totalLoss    = writeoffRows.reduce((s, t) => s + Math.abs(Number(t.profit || 0)), 0);

  return (
    <Layout>
      <style>{styles}</style>
      <div className="tx-root">

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi g">
            <div className="kpi-label">Total Records</div>
            <div className="kpi-val">{rows.length}</div>
            <div className="kpi-ico">🔢</div>
          </div>
          <div className="kpi b">
            <div className="kpi-label">Total Revenue</div>
            <div className="kpi-val">{inr(totalRevenue)}</div>
            <div className="kpi-ico">💳</div>
          </div>
          <div className="kpi y">
            <div className="kpi-label">Net Profit</div>
            <div className="kpi-val">{inr(totalProfit)}</div>
            <div className="kpi-ico">📈</div>
          </div>
          <div className="kpi r">
            <div className="kpi-label">Write-off Loss</div>
            <div className="kpi-val">{inr(totalLoss)}</div>
            <div className="kpi-ico">🗑️</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="tx-toolbar">
          <div className="tx-tabs">
            {[
              { key: "all",       label: "All"        },
              { key: "sales",     label: "Sales"      },
              { key: "purchases", label: "Purchases"  },
              { key: "writeoffs", label: "Write-offs" },
            ].map((t) => (
              <button
                key={t.key}
                className={`tx-tab ${tab === t.key ? "tx-tab-active" : ""}`}
                onClick={() => { setTab(t.key); setPage(1); }}
                type="button"
              >{t.label}</button>
            ))}
          </div>

          <input
            className="tx-search"
            placeholder="Search product, type, reason…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />

          <button className="tx-refresh-btn" onClick={fetchData} type="button">
            ↻ Refresh
          </button>

          <span className="tx-count">{filtered.length} records</span>
        </div>

        {/* Table */}
        <div className="tx-card">
          {loading ? <Spinner /> : filtered.length === 0 ? (
            <div className="tx-empty">
              <div className="tx-empty-icon">📋</div>
              {search.trim() ? "No transactions match your search." : "No transactions yet — start selling!"}
            </div>
          ) : (
            <>
              <div className="tx-table-wrap">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Time</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Price / Unit</th>
                      <th>Total</th>
                      <th>Profit / Loss</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((tx, i) => {
                      const profit = Number(tx.profit      || 0);
                      const total  = Number(tx.total_price || 0);
                      const type   = String(tx.transaction_type || "").toLowerCase();
                      const pc     = pillClass(type);
                      const rowNum = (page - 1) * PAGE_SZ + i + 1;

                      const totalClass =
                        type === "sell"     ? "tx-total-sell"     :
                        type === "writeoff" ? "tx-total-writeoff"  :
                        "tx-total-other";

                      return (
                        <tr key={i}>
                          <td className="tx-num">{rowNum}</td>

                          <td className="tx-date">
                            {fmtDate(tx.timestamp || tx.created_at)}
                          </td>

                          <td className="tx-product">
                            {tx.product_name || "—"}
                          </td>

                          <td>
                            <span className={`tx-pill ${pc}`}>
                              {pillLabel(tx.transaction_type)}
                            </span>
                          </td>

                          <td className="tx-mono">{tx.quantity || "—"}</td>

                          <td className="tx-price">
                            {tx.price_per_unit != null && tx.price_per_unit !== 0
                              ? `₹${Number(tx.price_per_unit).toLocaleString("en-IN",{maximumFractionDigits:2})} / ${tx.unit || ""}`
                              : "—"}
                          </td>

                          <td>
                            <span className={totalClass}>
                              {total !== 0 ? inr(total) : "—"}
                            </span>
                          </td>

                          <td>
                            {profit > 0 ? (
                              <span className="tx-pos">+{inr(profit)}</span>
                            ) : profit < 0 ? (
                              <span className="tx-neg">−{inr(Math.abs(profit))}</span>
                            ) : (
                              <span className="tx-neu">—</span>
                            )}
                          </td>

                          <td>
                            {tx.reason
                              ? <span className="reason-tag">{tx.reason}</span>
                              : <span style={{color:"var(--text-2)",fontSize:12}}>—</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="tx-pager">
                  <span className="tx-pager-info">
                    Page {page} of {totalPages}&nbsp;·&nbsp;{filtered.length} total
                  </span>
                  <div className="tx-pager-btns">
                    <button className="tx-pager-btn" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} type="button">← Prev</button>
                    <button className="tx-pager-btn" onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} type="button">Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </Layout>
  );
}
