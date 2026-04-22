import { useEffect, useState, useCallback } from "react";
import Layout from "../layout/Layout";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import {
  getMonthlyProfit,
  getMonthlySales,
  getAllWriteOffs,
  getTopSellingProducts,
} from "../services/Insightservice";

/* ─────────────────────────────────────────────────────────────────────────
   STYLES — exact same design tokens as Dashboard / Inventory / Transactions
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
    --lime:   #d4ff27;
    --sans:   'DM Sans', sans-serif;
    --mono:   'JetBrains Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ci-root { font-family: var(--sans); color: var(--text-1); }

  /* ── KPI GRID ── */
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
  .kpi.g::after { background: var(--green);  }
  .kpi.y::after { background: var(--yellow); }
  .kpi.b::after { background: var(--blue);   }
  .kpi.r::after { background: var(--red);    }

  .kpi-label { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--text-2); margin-bottom:10px; }
  .kpi-val   { font-family:var(--mono); font-size:26px; font-weight:600; }
  .kpi.g .kpi-val { color: var(--green);  }
  .kpi.y .kpi-val { color: var(--yellow); }
  .kpi.b .kpi-val { color: var(--blue);   }
  .kpi.r .kpi-val { color: var(--red);    }
  .kpi-ico { position:absolute; bottom:14px; right:18px; font-size:26px; opacity:.07; }

  /* ── LAYOUT ── */
  .ci-row  { display:grid; gap:16px; margin-bottom:16px; }
  .ci-2col { grid-template-columns: 2fr 1fr; }
  .ci-2eq  { grid-template-columns: 1fr 1fr; }
  @media(max-width:860px){ .ci-2col, .ci-2eq { grid-template-columns: 1fr; } }

  /* ── CARD ── */
  .ci-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px;
    transition: border-color .2s;
  }
  .ci-card:hover { border-color: var(--border-hi); }

  .ci-card-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .ci-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--text-2);
  }

  /* ── BADGES ── */
  .badge {
    font-size: 10px;
    font-family: var(--mono);
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
  }
  .badge.g { background:rgba(132,204,22,.1);  color:var(--green);  }
  .badge.y { background:rgba(245,158,11,.1);  color:var(--yellow); }
  .badge.r { background:rgba(244,63,94,.1);   color:var(--red);    }
  .badge.b { background:rgba(59,130,246,.1);  color:var(--blue);   }

  /* ── REFRESH BTN ── */
  .ci-refresh {
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg-hover);
    color: var(--text-2);
    cursor: pointer;
    transition: all .18s;
    letter-spacing: .05em;
  }
  .ci-refresh:hover { border-color:var(--border-hi); color:var(--text-1); }

  /* ── RECHARTS TOOLTIP ── */
  .ci-tt {
    background: #1a1d2a;
    border: 1px solid var(--border-hi);
    border-radius: 10px;
    padding: 10px 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-1);
    box-shadow: 0 8px 24px rgba(0,0,0,.5);
    pointer-events: none;
  }
  .ci-tt-label { font-size:9px; letter-spacing:.08em; text-transform:uppercase; color:var(--text-2); margin-bottom:4px; }
  .ci-tt-row   { margin-top:3px; }

  /* ── TOP SELLING BARS ── */
  .top-list { display:flex; flex-direction:column; gap:12px; }
  .top-meta { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
  .top-name {
    font-size: 13px; font-weight: 500; color: var(--text-1);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%;
  }
  .top-rev  { font-family:var(--mono); font-size:11px; color:var(--yellow); font-weight:600; }
  .top-track { height:6px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; }
  .top-fill  { height:100%; border-radius:4px; transition:width .6s ease; }

  /* ── WRITE-OFF LIST ── */
  .wo-total-row {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--red);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .wo-total-val { font-size: 15px; font-weight: 700; }

  .wo-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 240px;
    overflow-y: auto;
  }
  .wo-list::-webkit-scrollbar { width: 3px; }
  .wo-list::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 3px; }

  .wo-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 10px;
    transition: border-color .15s;
  }
  .wo-item:hover { border-color: var(--border-hi); }
  .wo-item-name { font-size:13px; font-weight:500; color:var(--text-1); }
  .wo-item-qty  { font-size:11px; color:var(--text-2); margin-top:2px; font-family:var(--mono); }
  .wo-item-amt  {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--red);
    background: rgba(244,63,94,.1);
    padding: 3px 9px;
    border-radius: 6px;
    white-space: nowrap;
  }

  /* ── SPINNER ── */
  .ci-spin-wrap { display:flex; justify-content:center; align-items:center; padding: 48px 0; }
  .ci-spinner {
    width: 28px; height: 28px;
    border: 3px solid var(--border);
    border-top-color: var(--lime);
    border-radius: 50%;
    animation: ci-rotate .65s linear infinite;
  }
  @keyframes ci-rotate { to { transform: rotate(360deg); } }

  /* ── EMPTY ── */
  .ci-empty { text-align: center; padding: 40px 20px; color: var(--text-2); font-size: 13px; }
  .ci-empty-icon { font-size: 32px; margin-bottom: 10px; }
`;

/* ─── colour palette for top-selling bars ───────────────────────────────── */
const PALETTE = ["#84cc16", "#22d3ee", "#f59e0b", "#f43f5e", "#a78bfa", "#22c55e"];

/* ─── INR formatter ─────────────────────────────────────────────────────── */
const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/* ─────────────────────────────────────────────────────────────────────────
   BULLETPROOF DATA EXTRACTORS
   ───────────────────────────────────────────────────────────────────────── */
const toArr = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

const extractWoBreakdown = (res) => {
  if (!res) return [];
  // 1. If service stripped all wrappers
  if (Array.isArray(res.breakdown)) return res.breakdown;
  // 2. If service stripped Axios wrapper but kept backend wrapper
  if (Array.isArray(res.data?.breakdown)) return res.data.breakdown;
  // 3. Standard shape: Axios wrapper + Backend wrapper
  if (Array.isArray(res.data?.data?.breakdown)) return res.data.data.breakdown;
  
  // Fallbacks if it returned a flat array somehow
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  
  return [];
};

const extractWoTotal = (res) => {
  if (!res) return null;
  // Deep search for the total value
  if (res.total_stock_value_lost != null) return Math.abs(Number(res.total_stock_value_lost));
  if (res.data?.total_stock_value_lost != null) return Math.abs(Number(res.data.total_stock_value_lost));
  if (res.data?.data?.total_stock_value_lost != null) return Math.abs(Number(res.data.data.total_stock_value_lost));
  return null; 
};

/* ─── Tooltips ──────────────────────────────────────────────────────────── */
function ProfitTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ci-tt">
      <div className="ci-tt-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="ci-tt-row" style={{ color: p.color }}>
          {p.name}: {inr(p.value)}
        </div>
      ))}
    </div>
  );
}

function SalesTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ci-tt">
      <div className="ci-tt-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="ci-tt-row" style={{ color: p.color }}>
          {p.name}: {inr(p.value)}
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div className="ci-spin-wrap">
      <div className="ci-spinner" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ChartsInsights() {
  const [profitData,  setProfitData]  = useState([]);
  const [salesData,   setSalesData]   = useState([]);
  const [writeOffs,   setWriteOffs]   = useState([]);   // breakdown array
  const [woTotal,     setWoTotal]     = useState(null);  // from backend or null
  const [topProducts, setTopProducts] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profitRes, salesRes, woRes, topRes] = await Promise.allSettled([
        getMonthlyProfit(),
        getMonthlySales(),
        getAllWriteOffs(),
        getTopSellingProducts(),
      ]);

      if (profitRes.status === "fulfilled") setProfitData(toArr(profitRes.value));
      if (salesRes.status  === "fulfilled") setSalesData(toArr(salesRes.value));
      if (woRes.status     === "fulfilled") {
        setWriteOffs(extractWoBreakdown(woRes.value));
        setWoTotal(extractWoTotal(woRes.value));
      }
      if (topRes.status    === "fulfilled") setTopProducts(toArr(topRes.value));
    } catch (e) {
      console.error("ChartsInsights fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── KPI derivations ── */
  const totalNetProfit  = profitData.reduce((s, m) => s + Number(m.net_profit   || 0), 0);
  const totalSellProfit = profitData.reduce((s, m) => s + Number(m.sell_profit  || 0), 0);
  const totalSalesRev   = salesData.reduce( (s, m) => s + Number(m.total_revenue || 0), 0);
  // prefer backend-provided total; fall back to summing breakdown rows
  const totalLoss = woTotal != null
    ? woTotal
    : writeOffs.reduce((s, w) => s + Number(w.stock_value_lost || w.total_loss || w.loss_amount || 0), 0);

  /* ── chart data ── */
  const profitChart = profitData.map((m) => ({
    month:          m.month_name || `${m.year}-${String(m.month).padStart(2,"0")}`,
    "Net Profit":   Number(m.net_profit   || 0),
    "Sell Profit":  Number(m.sell_profit  || 0),
    "Write-off":   -Math.abs(Number(m.write_off_loss || 0)),
  }));

  const salesChart = salesData.map((m) => ({
    month:   m.month_name || `${m.year}-${String(m.month).padStart(2,"0")}`,
    Revenue: Number(m.total_revenue || 0),
  }));

  const maxRev = Math.max(...topProducts.map((p) => Number(p.total_revenue || 0)), 1);

  return (
    <Layout>
      <style>{styles}</style>
      <div className="ci-root">

        {/* ══ KPI ROW ══════════════════════════════════════════════════════ */}
        <div className="kpi-grid">
          <div className="kpi g">
            <div className="kpi-label">Net Profit</div>
            <div className="kpi-val">{inr(totalNetProfit)}</div>
            <div className="kpi-ico">📈</div>
          </div>
          <div className="kpi b">
            <div className="kpi-label">Total Revenue</div>
            <div className="kpi-val">{inr(totalSalesRev)}</div>
            <div className="kpi-ico">💰</div>
          </div>
          <div className="kpi y">
            <div className="kpi-label">Sell Profit</div>
            <div className="kpi-val">{inr(totalSellProfit)}</div>
            <div className="kpi-ico">🛒</div>
          </div>
          <div className="kpi r">
            <div className="kpi-label">Write-off Loss</div>
            <div className="kpi-val">{inr(totalLoss)}</div>
            <div className="kpi-ico">🗑️</div>
          </div>
        </div>

        {/* ══ ROW 1 — Monthly Profit Breakdown + Top Selling ══════════════ */}
        <div className="ci-row ci-2col">

          {/* Monthly Profit Breakdown */}
          <div className="ci-card">
            <div className="ci-card-hd">
              <div className="ci-card-title">
                <span>📊</span> Monthly Profit Breakdown
              </div>
              <button className="ci-refresh" onClick={fetchAll} type="button">
                ↻ Refresh
              </button>
            </div>

            {loading ? <Spinner /> : profitChart.length === 0 ? (
              <div className="ci-empty">
                <div className="ci-empty-icon">📉</div>
                No profit data yet. Make some sales!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={profitChart} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill:"#475569", fontSize:11, fontFamily:"JetBrains Mono" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill:"#475569", fontSize:11, fontFamily:"JetBrains Mono" }}
                    axisLine={false} tickLine={false} width={52}
                    tickFormatter={(v) => `₹${(Math.abs(v)/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ProfitTip />} />
                  <Legend wrapperStyle={{ fontSize:11, fontFamily:"JetBrains Mono", paddingTop:14 }} />
                  <Bar dataKey="Net Profit"  fill="#84cc16" radius={[4,4,0,0]} maxBarSize={32} />
                  <Bar dataKey="Sell Profit" fill="#22d3ee" radius={[4,4,0,0]} maxBarSize={32} />
                  <Bar dataKey="Write-off"   fill="#f43f5e" radius={[4,4,0,0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Selling Products */}
          <div className="ci-card">
            <div className="ci-card-hd">
              <div className="ci-card-title">
                <span>🏆</span> Top Selling Products
              </div>
              <span className="badge y">{topProducts.length} items</span>
            </div>

            {loading ? <Spinner /> : topProducts.length === 0 ? (
              <div className="ci-empty">
                <div className="ci-empty-icon">🛍️</div>
                No sales recorded yet.
              </div>
            ) : (
              <div className="top-list">
                {topProducts.slice(0, 8).map((p, i) => {
                  const rev = Number(p.total_revenue || 0);
                  const pct = (rev / maxRev) * 100;
                  return (
                    <div key={i}>
                      <div className="top-meta">
                        <span className="top-name">{p.product_name || p.name || "—"}</span>
                        <span className="top-rev">{inr(rev)}</span>
                      </div>
                      <div className="top-track">
                        <div
                          className="top-fill"
                          style={{ width:`${pct}%`, background: PALETTE[i % PALETTE.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══ ROW 2 — Monthly Sales + Write-off Summary ═══════════════════ */}
        <div className="ci-row ci-2eq">

          {/* Monthly Sales Revenue */}
          <div className="ci-card">
            <div className="ci-card-hd">
              <div className="ci-card-title">
                <span>📉</span> Monthly Sales (Units Sold)
              </div>
              <span className="badge g">Live</span>
            </div>

            {loading ? <Spinner /> : salesChart.length === 0 ? (
              <div className="ci-empty">
                <div className="ci-empty-icon">📦</div>
                No sales data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill:"#475569", fontSize:11, fontFamily:"JetBrains Mono" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill:"#475569", fontSize:11, fontFamily:"JetBrains Mono" }}
                    axisLine={false} tickLine={false} width={52}
                    tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<SalesTip />} />
                  <Line
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r:4, fill:"#f59e0b", strokeWidth:0 }}
                    activeDot={{ r:6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Write-off Summary */}
          <div className="ci-card">
            <div className="ci-card-hd">
              <div className="ci-card-title">
                <span>🛡️</span> Write-off Summary
              </div>
              <span className="badge r">All Time</span>
            </div>

            {loading ? <Spinner /> : writeOffs.length === 0 ? (
              <div className="ci-empty">
                <div className="ci-empty-icon">🎉</div>
                No write-offs recorded!
              </div>
            ) : (
              <>
                <div className="wo-total-row">
                  Total lost:&nbsp;
                  <span className="wo-total-val">{inr(totalLoss)}</span>
                </div>
                <div className="wo-list">
                  {writeOffs.map((w, i) => {
                    const loss = Number(w.stock_value_lost || w.total_loss || w.loss_amount || 0);
                    const qty  = w.total_written_off || "";
                    return (
                      <div className="wo-item" key={i}>
                        <div>
                          <div className="wo-item-name">{w.product_name || w.name || "—"}</div>
                          {qty && <div className="wo-item-qty">{qty}</div>}
                        </div>
                        <div className="wo-item-amt">{inr(loss)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}