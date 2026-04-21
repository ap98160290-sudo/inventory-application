// import { useEffect, useState } from "react";
// import Layout from "../layout/Layout";
// import API from "../services/api";

// import {
//   AreaChart,
//   Area,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid,
//   PieChart,
//   Pie,
//   Cell,
//   BarChart,
//   Bar,
// } from "recharts";

// const COLORS     = ["#f59e0b", "#3b82f6", "#84cc16", "#f43f5e", "#22c55e", "#a78bfa"];
// const BAR_COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#f43f5e", "#22c55e", "#a78bfa"];

// const styles = `
//   @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

//   :root {
//     --bg-base:    #08090f;
//     --bg-card:    #0e1016;
//     --bg-hover:   #13151f;
//     --border:     rgba(255,255,255,0.06);
//     --border-hi:  rgba(255,255,255,0.12);
//     --text-1: #f1f5f9;
//     --text-2: #64748b;
//     --green:  #84cc16;
//     --yellow: #f59e0b;
//     --blue:   #3b82f6;
//     --red:    #f43f5e;
//     --sans:   'DM Sans', sans-serif;
//     --mono:   'JetBrains Mono', monospace;
//   }

//   *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

//   .dash-root {
//     font-family: var(--sans);
//     background: var(--bg-base);
//     min-height: 100vh;
//     padding: 28px 24px;
//     color: var(--text-1);
//   }

//   /* ── KPI ── */
//   .kpi-grid {
//     display: grid;
//     grid-template-columns: repeat(4, 1fr);
//     gap: 14px;
//     margin-bottom: 18px;
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
//     content:'';
//     position:absolute; top:0; left:0; right:0; height:2px; border-radius:16px 16px 0 0;
//   }
//   .kpi.g::after { background:var(--green); }
//   .kpi.y::after { background:var(--yellow); }
//   .kpi.b::after { background:var(--blue); }
//   .kpi.r::after { background:var(--red); }

//   .kpi-label { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--text-2); margin-bottom:10px; }
//   .kpi-val   { font-family:var(--mono); font-size:26px; font-weight:600; }
//   .kpi.g .kpi-val { color:var(--green); }
//   .kpi.y .kpi-val { color:var(--yellow); }
//   .kpi.b .kpi-val { color:var(--blue); }
//   .kpi.r .kpi-val { color:var(--red); }
//   .kpi-ico { position:absolute; bottom:14px; right:18px; font-size:26px; opacity:.07; }

//   /* ── GRID ── */
//   .row { display:grid; gap:14px; margin-bottom:14px; }
//   .row2 { grid-template-columns:1fr 1fr; }
//   @media(max-width:800px){ .row2{ grid-template-columns:1fr; } }

//   /* ── CARD ── */
//   .card {
//     background:var(--bg-card);
//     border:1px solid var(--border);
//     border-radius:16px;
//     padding:22px;
//     transition:border-color .2s;
//   }
//   .card:hover { border-color:var(--border-hi); }

//   .card-hd {
//     display:flex; align-items:center; justify-content:space-between;
//     margin-bottom:18px;
//   }
//   .card-title {
//     font-size:10px; font-weight:600; letter-spacing:.1em;
//     text-transform:uppercase; color:var(--text-2);
//   }
//   .badge {
//     font-size:10px; font-family:var(--mono); font-weight:600;
//     padding:3px 10px; border-radius:20px;
//   }
//   .bg { background:rgba(132,204,22,.1);  color:var(--green); }
//   .by { background:rgba(245,158,11,.1);  color:var(--yellow); }
//   .br { background:rgba(244,63,94,.1);   color:var(--red); }

//   /* ── TOOLTIP ── */
//   .tt {
//     background:#1a1d2a; border:1px solid var(--border-hi);
//     border-radius:10px; padding:10px 14px;
//     font-family:var(--mono); font-size:12px; color:var(--text-1);
//     box-shadow:0 8px 24px rgba(0,0,0,.5);
//     pointer-events:none;
//   }
//   .tt-lbl { font-size:9px; letter-spacing:.08em; text-transform:uppercase; color:var(--text-2); margin-bottom:3px; }

//   /* ── ALERTS ── */
//   .alert-status {
//     display:flex; align-items:center; gap:12px;
//     padding:14px 16px; border-radius:12px; margin-bottom:12px;
//   }
//   .a-ok  { background:rgba(132,204,22,.07); border:1px solid rgba(132,204,22,.18); }
//   .a-bad { background:rgba(244,63,94,.07);  border:1px solid rgba(244,63,94,.18); }
//   .a-ico { font-size:18px; }
//   .a-msg { font-size:13px; font-weight:500; }
//   .a-ok  .a-msg { color:var(--green); }
//   .a-bad .a-msg { color:var(--red); }

//   .ls-list { display:flex; flex-direction:column; gap:7px; }
//   .ls-item {
//     display:flex; align-items:center; justify-content:space-between;
//     padding:9px 13px; background:var(--bg-hover);
//     border:1px solid var(--border); border-radius:10px;
//   }
//   .ls-name { font-size:13px; font-weight:500; }
//   .ls-qty  {
//     font-family:var(--mono); font-size:11px; font-weight:600;
//     padding:2px 8px; border-radius:6px;
//     background:rgba(244,63,94,.1); color:var(--red);
//   }

//   /* ── PIE ── */
//   .pie-layout { display:flex; gap:18px; align-items:center; }
//   .pie-wrap   { position:relative; flex-shrink:0; width:180px; height:180px; }
//   .donut-lbl  {
//     position:absolute; inset:0;
//     display:flex; flex-direction:column; align-items:center; justify-content:center;
//     pointer-events:none; text-align:center; padding:0 10px;
//   }
//   .donut-val { font-family:var(--mono); font-size:15px; font-weight:700; line-height:1.2; }
//   .donut-sub { font-size:9px; color:var(--text-2); margin-top:4px; text-transform:uppercase; letter-spacing:.06em; }

//   .legend { flex:1; display:flex; flex-direction:column; gap:6px; max-height:190px; overflow-y:auto; }
//   .legend::-webkit-scrollbar { width:3px; }
//   .legend::-webkit-scrollbar-thumb { background:var(--border-hi); border-radius:3px; }

//   .leg-item {
//     display:flex; align-items:center; gap:9px;
//     padding:7px 10px; border-radius:9px; cursor:pointer;
//     border:1px solid transparent; transition:background .15s;
//   }
//   .leg-item:hover, .leg-item.on { background:var(--bg-hover); border-color:var(--border-hi); }
//   .leg-dot  { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
//   .leg-name { font-size:12px; font-weight:500; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
//   .leg-pct  { font-family:var(--mono); font-size:10px; color:var(--text-2); }

//   /* ── PRODUCT DETAIL ── */
//   .pd {
//     margin-top:18px; padding:15px;
//     background:var(--bg-hover); border:1px solid var(--border-hi);
//     border-radius:12px; animation:up .18s ease;
//   }
//   @keyframes up { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }

//   .pd-name {
//     font-size:13px; font-weight:700; margin-bottom:11px;
//     display:flex; align-items:center; gap:8px;
//   }
//   .pd-dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
//   .pd-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
//   .pd-stat  {
//     background:var(--bg-card); border:1px solid var(--border);
//     border-radius:9px; padding:10px 12px;
//   }
//   .pd-lbl { font-size:9px; text-transform:uppercase; letter-spacing:.09em; color:var(--text-2); margin-bottom:4px; }
//   .pd-val { font-family:var(--mono); font-size:13px; font-weight:600; }
// `;

// export default function Dashboard() {
//   const [products, setProducts]         = useState([]);
//   const [activeIndex, setActiveIndex]   = useState(null);
//   const [selectedProduct, setSelectedProduct] = useState(null);
//   const [selectedColor, setSelectedColor]     = useState(null);
//   const [profitData, setProfitData]           = useState([]);
//   const [todaysProfit, setTodaysProfit]       = useState(0);

//   useEffect(() => {
//     const fetchProducts = async () => {
//       try {
//         const res = await API.get("/products");
//         setProducts(res.data.data || []);
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     const fetchSales = async () => {
//       try {
//         const res = await API.get("/sales");
//         const sales = res.data.data || [];

//         // Group by date and sum profit/loss per day
//         const grouped = {};
//         sales.forEach((sale) => {
//           const date = new Date(sale.created_at || sale.date)
//             .toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })
//             .replace("/", "-");
//           if (!grouped[date]) grouped[date] = { date, profit: 0, loss: 0 };
//           const revenue  = Number(sale.selling_price || sale.revenue || 0);
//           const cost     = Number(sale.cost_price    || sale.cost    || 0);
//           const diff     = revenue - cost;
//           if (diff >= 0) grouped[date].profit += diff;
//           else           grouped[date].loss   += Math.abs(diff);
//         });

//         const sorted = Object.values(grouped).sort((a, b) =>
//           a.date.localeCompare(b.date)
//         );

//         setProfitData(sorted);

//         // Today's profit = last entry's profit (most recent day)
//         if (sorted.length > 0) {
//           setTodaysProfit(sorted[sorted.length - 1].profit);
//         }
//       } catch (err) {
//         console.error("Failed to fetch sales:", err);
//       }
//     };

//     fetchProducts();
//     fetchSales();
//   }, []);

//   const getQty   = (p) => parseFloat(p.quantity)  || 0;
//   const getPrice = (p) => Number(p.unit_price)     || 0;
//   const getValue = (p) => getQty(p) * getPrice(p);

//   const totalProducts = products.length;
//   const stockValue    = products.reduce((acc, p) => acc + getValue(p), 0);
//   const lowStockItems = products.filter((p) => getQty(p) < 5);
//   const lowStock      = lowStockItems.length;

//   const pieData    = products.map((p) => ({ name: p.product_name, value: getValue(p), full: p }));
//   const totalValue = pieData.reduce((acc, p) => acc + p.value, 0);



//   const maxQty = Math.max(...products.map((p) => getQty(p)), 1);
//   const barData = products.map((p) => ({
//     name:       p.product_name,
//     quantity:   getQty(p),
//     normalized: (getQty(p) / maxQty) * 100,
//   }));

//   const activeEntry = activeIndex !== null ? pieData[activeIndex] : null;
//   const displayVal  = activeEntry?.value ?? totalValue;
//   const displayName = activeEntry?.name  ?? "Total Value";

//   /* ── Tooltips ── */
//   const ProfitTip = ({ active, payload, label }) => {
//     if (!active || !payload?.length) return null;
//     return (
//       <div className="tt">
//         <div className="tt-lbl">{label}</div>
//         {payload.map((p, i) => (
//           <div key={i} style={{ color: p.color, marginTop: 4 }}>
//             {p.name}: ₹{p.value}
//           </div>
//         ))}
//       </div>
//     );
//   };

//   const BarTip = ({ active, payload }) => {
//     if (!active || !payload?.length) return null;
//     const d   = payload[0].payload;
//     const idx = barData.indexOf(d);
//     return (
//       <div className="tt">
//         <div className="tt-lbl">Product</div>
//         <div>{d.name}</div>
//         <div className="tt-lbl" style={{ marginTop: 6 }}>Qty</div>
//         <div style={{ color: BAR_COLORS[idx % BAR_COLORS.length] }}>{d.quantity}</div>
//       </div>
//     );
//   };

//   return (
//     <Layout>
//       <style>{styles}</style>
//       <div className="dash-root">

//         {/* ── KPI ── */}
//         <div className="kpi-grid">
//           <div className="kpi g">
//             <div className="kpi-label">Total Products</div>
//             <div className="kpi-val">{totalProducts}</div>
//             <div className="kpi-ico">📦</div>
//           </div>
//           <div className="kpi y">
//             <div className="kpi-label">Stock Value</div>
//             <div className="kpi-val">₹{stockValue.toLocaleString()}</div>
//             <div className="kpi-ico">💰</div>
//           </div>
//           <div className="kpi b">
//             <div className="kpi-label">Today's Profit</div>
//             <div className="kpi-val">₹{todaysProfit.toLocaleString()}</div>
//             <div className="kpi-ico">📈</div>
//           </div>
//           <div className="kpi r">
//             <div className="kpi-label">Low Stock</div>
//             <div className="kpi-val">{lowStock}</div>
//             <div className="kpi-ico">⚠️</div>
//           </div>
//         </div>

//         {/* ── ROW 1 ── */}
//         <div className="row row2">

//           {/* Profit Trend */}
//           <div className="card">
//             <div className="card-hd">
//               <div className="card-title">Profit Trend</div>
//               <span className="badge bg">↑ Live</span>
//             </div>
//             <ResponsiveContainer width="100%" height={200}>
//               <AreaChart data={profitData}>
//                 <defs>
//                   <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="0%"   stopColor="#84cc16" stopOpacity={0.3}/>
//                     <stop offset="100%" stopColor="#84cc16" stopOpacity={0}/>
//                   </linearGradient>
//                   <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="0%"   stopColor="#f43f5e" stopOpacity={0.2}/>
//                     <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
//                 <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:11, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false}/>
//                 <YAxis tick={{ fill:"#475569", fontSize:11, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} width={28}/>
//                 <Tooltip content={<ProfitTip />}/>
//                 <Area type="monotone" dataKey="profit" stroke="#84cc16" strokeWidth={2} fill="url(#gP)" dot={{ r:4, fill:"#84cc16", strokeWidth:0 }}/>
//                 <Area type="monotone" dataKey="loss"   stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 4" fill="url(#gL)" dot={{ r:4, fill:"#f43f5e", strokeWidth:0 }}/>
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>

//           {/* Low Stock */}
//           <div className="card">
//             <div className="card-hd">
//               <div className="card-title">Low Stock Alerts</div>
//               {lowStock > 0
//                 ? <span className="badge br">{lowStock} Critical</span>
//                 : <span className="badge bg">All Clear</span>
//               }
//             </div>
//             <div className={`alert-status ${lowStock === 0 ? "a-ok" : "a-bad"}`}>
//               <span className="a-ico">{lowStock === 0 ? "✅" : "🚨"}</span>
//               <span className="a-msg">
//                 {lowStock === 0
//                   ? "All inventory levels healthy"
//                   : `${lowStock} item${lowStock > 1 ? "s" : ""} need restocking`}
//               </span>
//             </div>
//             {lowStock > 0 && (
//               <div className="ls-list">
//                 {lowStockItems.map((p, i) => (
//                   <div className="ls-item" key={i}>
//                     <span className="ls-name">{p.product_name}</span>
//                     <span className="ls-qty">{getQty(p)} left</span>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ── ROW 2 ── */}
//         <div className="row row2">

//           {/* Value Distribution */}
//           <div className="card">
//             <div className="card-hd">
//               <div className="card-title">Value Distribution</div>
//               <span className="badge by">₹{totalValue.toLocaleString()}</span>
//             </div>

//             <div className="pie-layout">
//               {/* Donut */}
//               <div className="pie-wrap">
//                 <div className="donut-lbl">
//                   <div className="donut-val">
//                     ₹{displayVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
//                   </div>
//                   <div className="donut-sub">{displayName}</div>
//                 </div>
//                 <ResponsiveContainer width={180} height={180}>
//                   <PieChart>
//                     <Pie
//                       data={pieData}
//                       dataKey="value"
//                       innerRadius={60}
//                       outerRadius={82}
//                       paddingAngle={2}
//                       strokeWidth={0}
//                       onMouseEnter={(_, i) => setActiveIndex(i)}
//                       onMouseLeave={()   => setActiveIndex(null)}
//                       onClick={(entry, i) => {
//                         setSelectedProduct(entry.full);
//                         setSelectedColor(COLORS[i % COLORS.length]);
//                       }}
//                     >
//                       {pieData.map((_, i) => (
//                         <Cell
//                           key={i}
//                           fill={COLORS[i % COLORS.length]}
//                           opacity={activeIndex === null || activeIndex === i ? 1 : 0.3}
//                           style={{ cursor:"pointer", transition:"opacity .2s" }}
//                         />
//                       ))}
//                     </Pie>
//                   </PieChart>
//                 </ResponsiveContainer>
//               </div>

//               {/* Legend */}
//               <div className="legend">
//                 {pieData.map((entry, i) => {
//                   const pct   = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : "0.0";
//                   const color = COLORS[i % COLORS.length];
//                   return (
//                     <div
//                       key={i}
//                       className={`leg-item ${activeIndex === i ? "on" : ""}`}
//                       onMouseEnter={() => setActiveIndex(i)}
//                       onMouseLeave={() => setActiveIndex(null)}
//                       onClick={() => { setSelectedProduct(entry.full); setSelectedColor(color); }}
//                     >
//                       <div className="leg-dot" style={{ background: color }}/>
//                       <div className="leg-name">{entry.name}</div>
//                       <div className="leg-pct">{pct}%</div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* Product detail on click */}
//             {selectedProduct && (
//               <div className="pd">
//                 <div className="pd-name">
//                   <div className="pd-dot" style={{ background: selectedColor }}/>
//                   {selectedProduct.product_name}
//                 </div>
//                 <div className="pd-stats">
//                   <div className="pd-stat">
//                     <div className="pd-lbl">Quantity</div>
//                     <div className="pd-val">{selectedProduct.quantity}</div>
//                   </div>
//                   <div className="pd-stat">
//                     <div className="pd-lbl">Unit Price</div>
//                     <div className="pd-val">₹{selectedProduct.unit_price}</div>
//                   </div>
//                   <div className="pd-stat">
//                     <div className="pd-lbl">Total Value</div>
//                     <div className="pd-val" style={{ color: selectedColor }}>
//                       ₹{(parseFloat(selectedProduct.quantity) * selectedProduct.unit_price).toLocaleString()}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Stock Levels Bar */}
//           <div className="card">
//             <div className="card-hd">
//               <div className="card-title">Stock Levels</div>
//               <span className="badge bg">{totalProducts} SKUs</span>
//             </div>
//             <ResponsiveContainer width="100%" height={200}>
//               <BarChart data={barData} barCategoryGap="30%">
//                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
//                 <XAxis
//                   dataKey="name"
//                   tick={{ fill:"#475569", fontSize:10, fontFamily:"DM Sans" }}
//                   axisLine={false} tickLine={false} interval={0}
//                   tickFormatter={(v) => v.length > 8 ? v.slice(0,8)+"…" : v}
//                 />
//                 <YAxis hide/>
//                 <Tooltip content={<BarTip />}/>
//                 <Bar dataKey="normalized" radius={[6,6,0,0]} maxBarSize={40}>
//                   {barData.map((_, i) => (
//                     <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]}/>
//                   ))}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>

//             {/* Mini colour legend */}
//             <div style={{ display:"flex", flexWrap:"wrap", gap:"10px", marginTop:"14px" }}>
//               {barData.map((item, i) => (
//                 <div key={i} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
//                   <div style={{ width:8, height:8, borderRadius:2, background:BAR_COLORS[i % BAR_COLORS.length] }}/>
//                   <span style={{ fontSize:11, color:"#64748b", fontFamily:"DM Sans" }}>
//                     {item.name.length > 10 ? item.name.slice(0,10)+"…" : item.name}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </div>

//         </div>
//       </div>
//     </Layout>
//   );
// }


import { useEffect, useState } from "react";
import Layout from "../layout/Layout";
import API from "../services/api";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const COLORS     = ["#f59e0b", "#3b82f6", "#84cc16", "#f43f5e", "#22c55e", "#a78bfa"];
const BAR_COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#f43f5e", "#22c55e", "#a78bfa"];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

  :root {
    --bg-base:    #08090f;
    --bg-card:    #0e1016;
    --bg-hover:   #13151f;
    --border:     rgba(255,255,255,0.06);
    --border-hi:  rgba(255,255,255,0.12);
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

  .dash-root {
    font-family: var(--sans);
    background: var(--bg-base);
    min-height: 100vh;
    padding: 28px 24px;
    color: var(--text-1);
  }

  /* ── KPI ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 18px;
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
    content:'';
    position:absolute; top:0; left:0; right:0; height:2px; border-radius:16px 16px 0 0;
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

  /* ── GRID ── */
  .row { display:grid; gap:14px; margin-bottom:14px; }
  .row2 { grid-template-columns:1fr 1fr; }
  @media(max-width:800px){ .row2{ grid-template-columns:1fr; } }

  /* ── CARD ── */
  .card {
    background:var(--bg-card);
    border:1px solid var(--border);
    border-radius:16px;
    padding:22px;
    transition:border-color .2s;
  }
  .card:hover { border-color:var(--border-hi); }

  .card-hd {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:18px;
  }
  .card-title {
    font-size:10px; font-weight:600; letter-spacing:.1em;
    text-transform:uppercase; color:var(--text-2);
  }
  .badge {
    font-size:10px; font-family:var(--mono); font-weight:600;
    padding:3px 10px; border-radius:20px;
  }
  .bg { background:rgba(132,204,22,.1);  color:var(--green); }
  .by { background:rgba(245,158,11,.1);  color:var(--yellow); }
  .br { background:rgba(244,63,94,.1);   color:var(--red); }

  /* ── TOOLTIP ── */
  .tt {
    background:#1a1d2a; border:1px solid var(--border-hi);
    border-radius:10px; padding:10px 14px;
    font-family:var(--mono); font-size:12px; color:var(--text-1);
    box-shadow:0 8px 24px rgba(0,0,0,.5);
    pointer-events:none;
  }
  .tt-lbl { font-size:9px; letter-spacing:.08em; text-transform:uppercase; color:var(--text-2); margin-bottom:3px; }

  /* ── ALERTS ── */
  .alert-status {
    display:flex; align-items:center; gap:12px;
    padding:14px 16px; border-radius:12px; margin-bottom:12px;
  }
  .a-ok  { background:rgba(132,204,22,.07); border:1px solid rgba(132,204,22,.18); }
  .a-bad { background:rgba(244,63,94,.07);  border:1px solid rgba(244,63,94,.18); }
  .a-ico { font-size:18px; }
  .a-msg { font-size:13px; font-weight:500; }
  .a-ok  .a-msg { color:var(--green); }
  .a-bad .a-msg { color:var(--red); }

  .ls-list { display:flex; flex-direction:column; gap:7px; }
  .ls-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:9px 13px; background:var(--bg-hover);
    border:1px solid var(--border); border-radius:10px;
  }
  .ls-name { font-size:13px; font-weight:500; }
  .ls-qty  {
    font-family:var(--mono); font-size:11px; font-weight:600;
    padding:2px 8px; border-radius:6px;
    background:rgba(244,63,94,.1); color:var(--red);
  }

  /* ── PIE ── */
  .pie-layout { display:flex; gap:18px; align-items:center; }
  .pie-wrap   { position:relative; flex-shrink:0; width:180px; height:180px; }
  .donut-lbl  {
    position:absolute; inset:0;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    pointer-events:none; text-align:center; padding:0 10px;
  }
  .donut-val { font-family:var(--mono); font-size:15px; font-weight:700; line-height:1.2; }
  .donut-sub { font-size:9px; color:var(--text-2); margin-top:4px; text-transform:uppercase; letter-spacing:.06em; }

  .legend { flex:1; display:flex; flex-direction:column; gap:6px; max-height:190px; overflow-y:auto; }
  .legend::-webkit-scrollbar { width:3px; }
  .legend::-webkit-scrollbar-thumb { background:var(--border-hi); border-radius:3px; }

  .leg-item {
    display:flex; align-items:center; gap:9px;
    padding:7px 10px; border-radius:9px; cursor:pointer;
    border:1px solid transparent; transition:background .15s;
  }
  .leg-item:hover, .leg-item.on { background:var(--bg-hover); border-color:var(--border-hi); }
  .leg-dot  { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
  .leg-name { font-size:12px; font-weight:500; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .leg-pct  { font-family:var(--mono); font-size:10px; color:var(--text-2); }

  /* ── PRODUCT DETAIL ── */
  .pd {
    margin-top:18px; padding:15px;
    background:var(--bg-hover); border:1px solid var(--border-hi);
    border-radius:12px; animation:up .18s ease;
  }
  @keyframes up { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }

  .pd-name {
    font-size:13px; font-weight:700; margin-bottom:11px;
    display:flex; align-items:center; gap:8px;
  }
  .pd-dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
  .pd-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
  .pd-stat  {
    background:var(--bg-card); border:1px solid var(--border);
    border-radius:9px; padding:10px 12px;
  }
  .pd-lbl { font-size:9px; text-transform:uppercase; letter-spacing:.09em; color:var(--text-2); margin-bottom:4px; }
  .pd-val { font-family:var(--mono); font-size:13px; font-weight:600; }
`;

export default function Dashboard() {
  const [products, setProducts]         = useState([]);
  const [activeIndex, setActiveIndex]   = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColor, setSelectedColor]     = useState(null);
  const [profitData, setProfitData]           = useState([]);
  const [todaysProfit, setTodaysProfit]       = useState(0);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await API.get("/products");
        setProducts(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchSales = async () => {
      try {
        const res = await API.get("insights/transactions");
        const allTx = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const grouped = {};

        const getTxType = (tx) =>
          String(tx?.transaction_type || "sell")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

        const getTxImpact = (tx) => {
          const profit = Number(tx?.profit || 0);
          if (!Number.isNaN(profit) && profit !== 0) return profit;

          const revenue = Number(tx?.revenue || tx?.selling_price || 0);
          const cost = Number(tx?.cost || tx?.cost_price || 0);
          return revenue - cost;
        };

        allTx.forEach((tx) => {
          const raw = tx.timestamp || tx.created_at || tx.date;
          const date = raw
            ? new Date(raw).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }).replace("/", "-")
            : "Today";

          if (!grouped[date]) {
            grouped[date] = {
              date,
              profit: 0,
              loss: 0,
              sellProfit: 0,
            };
          }

          const type = getTxType(tx);
          const impact = getTxImpact(tx);
          const isWriteOff =
            type.includes("write") ||
            type.includes("loss") ||
            type.includes("waste") ||
            type.includes("damage");

          if (isWriteOff) {
            const writeOffLoss = Math.abs(impact);
            grouped[date].loss += writeOffLoss;
            grouped[date].profit -= writeOffLoss;
            return;
          }

          grouped[date].sellProfit += impact;
          grouped[date].profit += impact;
        });

        const sorted = Object.values(grouped).sort((a, b) =>
          a.date.localeCompare(b.date)
        );

        setProfitData(sorted);

        const todayStr = new Date()
          .toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })
          .replace("/", "-");
        const todayEntry = grouped[todayStr];
        setTodaysProfit(todayEntry ? todayEntry.profit : 0);

      } catch (err) {
        console.error("Failed to fetch sales:", err);
      }
    };

    fetchProducts();
    fetchSales();
  }, []);

  const getQty   = (p) => parseFloat(p.quantity)  || 0;
  const getPrice = (p) => Number(p.unit_price)     || 0;
  const getValue = (p) => getQty(p) * getPrice(p);

  const totalProducts = products.length;
  const stockValue    = products.reduce((acc, p) => acc + getValue(p), 0);
  const lowStockItems = products.filter((p) => getQty(p) < 5);
  const lowStock      = lowStockItems.length;

  const pieData    = products.map((p) => ({ name: p.product_name, value: getValue(p), full: p }));
  const totalValue = pieData.reduce((acc, p) => acc + p.value, 0);



  const maxQty = Math.max(...products.map((p) => getQty(p)), 1);
  const barData = products.map((p) => ({
    name:       p.product_name,
    quantity:   getQty(p),
    normalized: (getQty(p) / maxQty) * 100,
  }));

  const activeEntry = activeIndex !== null ? pieData[activeIndex] : null;
  const displayVal  = activeEntry?.value ?? totalValue;
  const displayName = activeEntry?.name  ?? "Total Value";

  /* ── Tooltips ── */
  const ProfitTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="tt">
        <div className="tt-lbl">{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, marginTop: 4 }}>
            {p.name}: ₹{p.value}
          </div>
        ))}
      </div>
    );
  };

  const BarTip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d   = payload[0].payload;
    const idx = barData.indexOf(d);
    return (
      <div className="tt">
        <div className="tt-lbl">Product</div>
        <div>{d.name}</div>
        <div className="tt-lbl" style={{ marginTop: 6 }}>Qty</div>
        <div style={{ color: BAR_COLORS[idx % BAR_COLORS.length] }}>{d.quantity}</div>
      </div>
    );
  };

  return (
    <Layout>
      <style>{styles}</style>
      <div className="dash-root">

        {/* ── KPI ── */}
        <div className="kpi-grid">
          <div className="kpi g">
            <div className="kpi-label">Total Products</div>
            <div className="kpi-val">{totalProducts}</div>
            <div className="kpi-ico">📦</div>
          </div>
          <div className="kpi y">
            <div className="kpi-label">Stock Value</div>
            <div className="kpi-val">₹{stockValue.toLocaleString()}</div>
            <div className="kpi-ico">💰</div>
          </div>
          <div className="kpi b">
            <div className="kpi-label">Today's Profit</div>
            <div className="kpi-val">₹{todaysProfit.toLocaleString()}</div>
            <div className="kpi-ico">📈</div>
          </div>
          <div className="kpi r">
            <div className="kpi-label">Low Stock</div>
            <div className="kpi-val">{lowStock}</div>
            <div className="kpi-ico">⚠️</div>
          </div>
        </div>

        {/* ── ROW 1 ── */}
        <div className="row row2">

          {/* Profit Trend */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">Profit Trend</div>
              <span className="badge bg">↑ Live</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={profitData}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#84cc16" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#84cc16" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:11, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#475569", fontSize:11, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} width={28}/>
                <Tooltip content={<ProfitTip />}/>
                <Area type="monotone" dataKey="profit" stroke="#84cc16" strokeWidth={2} fill="url(#gP)" dot={{ r:4, fill:"#84cc16", strokeWidth:0 }}/>
                <Area type="monotone" dataKey="loss"   stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 4" fill="url(#gL)" dot={{ r:4, fill:"#f43f5e", strokeWidth:0 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Low Stock */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">Low Stock Alerts</div>
              {lowStock > 0
                ? <span className="badge br">{lowStock} Critical</span>
                : <span className="badge bg">All Clear</span>
              }
            </div>
            <div className={`alert-status ${lowStock === 0 ? "a-ok" : "a-bad"}`}>
              <span className="a-ico">{lowStock === 0 ? "✅" : "🚨"}</span>
              <span className="a-msg">
                {lowStock === 0
                  ? "All inventory levels healthy"
                  : `${lowStock} item${lowStock > 1 ? "s" : ""} need restocking`}
              </span>
            </div>
            {lowStock > 0 && (
              <div className="ls-list">
                {lowStockItems.map((p, i) => (
                  <div className="ls-item" key={i}>
                    <span className="ls-name">{p.product_name}</span>
                    <span className="ls-qty">{getQty(p)} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 2 ── */}
        <div className="row row2">

          {/* Value Distribution */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">Value Distribution</div>
              <span className="badge by">₹{totalValue.toLocaleString()}</span>
            </div>

            <div className="pie-layout">
              {/* Donut */}
              <div className="pie-wrap">
                <div className="donut-lbl">
                  <div className="donut-val">
                    ₹{displayVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="donut-sub">{displayName}</div>
                </div>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={82}
                      paddingAngle={2}
                      strokeWidth={0}
                      onMouseEnter={(_, i) => setActiveIndex(i)}
                      onMouseLeave={()   => setActiveIndex(null)}
                      onClick={(entry, i) => {
                        setSelectedProduct(entry.full);
                        setSelectedColor(COLORS[i % COLORS.length]);
                      }}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          opacity={activeIndex === null || activeIndex === i ? 1 : 0.3}
                          style={{ cursor:"pointer", transition:"opacity .2s" }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="legend">
                {pieData.map((entry, i) => {
                  const pct   = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : "0.0";
                  const color = COLORS[i % COLORS.length];
                  return (
                    <div
                      key={i}
                      className={`leg-item ${activeIndex === i ? "on" : ""}`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={() => { setSelectedProduct(entry.full); setSelectedColor(color); }}
                    >
                      <div className="leg-dot" style={{ background: color }}/>
                      <div className="leg-name">{entry.name}</div>
                      <div className="leg-pct">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product detail on click */}
            {selectedProduct && (
              <div className="pd">
                <div className="pd-name">
                  <div className="pd-dot" style={{ background: selectedColor }}/>
                  {selectedProduct.product_name}
                </div>
                <div className="pd-stats">
                  <div className="pd-stat">
                    <div className="pd-lbl">Quantity</div>
                    <div className="pd-val">{selectedProduct.quantity}</div>
                  </div>
                  <div className="pd-stat">
                    <div className="pd-lbl">Unit Price</div>
                    <div className="pd-val">₹{selectedProduct.unit_price}</div>
                  </div>
                  <div className="pd-stat">
                    <div className="pd-lbl">Total Value</div>
                    <div className="pd-val" style={{ color: selectedColor }}>
                      ₹{(parseFloat(selectedProduct.quantity) * selectedProduct.unit_price).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stock Levels Bar */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">Stock Levels</div>
              <span className="badge bg">{totalProducts} SKUs</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                <XAxis
                  dataKey="name"
                  tick={{ fill:"#475569", fontSize:10, fontFamily:"DM Sans" }}
                  axisLine={false} tickLine={false} interval={0}
                  tickFormatter={(v) => v.length > 8 ? v.slice(0,8)+"…" : v}
                />
                <YAxis hide/>
                <Tooltip content={<BarTip />}/>
                <Bar dataKey="normalized" radius={[6,6,0,0]} maxBarSize={40}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Mini colour legend */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:"10px", marginTop:"14px" }}>
              {barData.map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:BAR_COLORS[i % BAR_COLORS.length] }}/>
                  <span style={{ fontSize:11, color:"#64748b", fontFamily:"DM Sans" }}>
                    {item.name.length > 10 ? item.name.slice(0,10)+"…" : item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
