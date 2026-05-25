/* ══════════════════════════════════════════════════════════
   HELPERS — formatting, badges, exports, small charts
══════════════════════════════════════════════════════════ */

window.fmt = function fmt(n){
  if (n === 0 || n == null) return "—";
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

window.fmtNum = function fmtNum(n){
  if (n === 0) return "—";
  return n.toLocaleString('en-IN');
};

window.SBadge = function SBadge({s}){
  const map = {
    Filed:      "bg-green-100 text-green-800 border-green-200",
    Pending:    "bg-amber-100 text-amber-800 border-amber-200",
    Processing: "bg-blue-100 text-blue-800 border-blue-200",
    Error:      "bg-red-100 text-red-800 border-red-200",
    Draft:      "bg-gray-100 text-gray-700 border-gray-200",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${map[s]||map.Draft}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${s==="Filed"?"bg-green-500":s==="Pending"?"bg-amber-500":s==="Processing"?"bg-blue-500":s==="Error"?"bg-red-500":"bg-gray-400"}`}></span>
    {s}
  </span>;
};

window.RiskBadge = function RiskBadge({r}){
  const map = { Low:"bg-green-100 text-green-800", Medium:"bg-amber-100 text-amber-800", High:"bg-red-100 text-red-800" };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${map[r]||map.Low}`}>{r}</span>;
};

/* ── Exports ─────────────────────────────────────────── */
window.exportXLSX = function(data, filename, sheet){
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet||"Sheet1");
  XLSX.writeFile(wb, filename);
};

window.exportCSV = function(data, filename){
  if(!data.length) return;
  const k = Object.keys(data[0]);
  const csv = [k.join(","), ...data.map(r => k.map(key => `"${r[key]}"`).join(","))].join("\n");
  const b = new Blob([csv], {type:"text/csv"});
  const u = URL.createObjectURL(b);
  const a = document.createElement("a"); a.href = u; a.download = filename; a.click();
  URL.revokeObjectURL(u);
};

window.exportPDF = function(title, cols, rows, filename){
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:"landscape"});
  doc.setFontSize(15); doc.setTextColor(26,26,46);
  doc.text("DigiGST — "+title, 14, 18);
  doc.setFontSize(8); doc.setTextColor(120,120,120);
  doc.text(`GSTIN: ${GSTIN} | ${COMPANY} | ${new Date().toLocaleDateString('en-IN')}`, 14, 25);
  doc.setDrawColor(255,212,0); doc.setLineWidth(0.8); doc.line(14,29,282,29);
  doc.autoTable({
    startY:33, head:[cols], body:rows,
    styles:{fontSize:8, cellPadding:3},
    headStyles:{fillColor:[26,26,46], textColor:[255,212,0], fontStyle:"bold"},
    alternateRowStyles:{fillColor:[255,253,230]},
    theme:"grid"
  });
  doc.save(filename);
};

/* ── Sparkline ──────────────────────────────────────── */
window.Sparkline = function Sparkline({data, color, height=32, width=120}){
  if(!data || data.length<2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v,i) => `${i*step},${height - ((v-min)/range)*height}`).join(" ");
  return (
    <svg width={width} height={height} className="block">
      <polyline points={pts} fill="none" stroke={color||"#1A1A2E"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={(data.length-1)*step} cy={height - ((data[data.length-1]-min)/range)*height} r="2.5" fill={color||"#1A1A2E"}/>
    </svg>
  );
};

/* ── Stat card ──────────────────────────────────────── */
window.StatCard = function StatCard({label, value, sub, trend, accent}){
  return (
    <div className="bg-white border border-ey-gray-mid rounded-xl p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent||"bg-ey-yellow"}`}></div>
      <p className="text-[10px] text-ey-gray-dark font-semibold uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between gap-2 mt-1.5">
        <p className="text-[22px] font-bold text-ey-charcoal leading-none font-mono tabular-nums">{value}</p>
        {trend && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${trend.startsWith("+")?"text-green-700 bg-green-50":trend.startsWith("-")?"text-red-700 bg-red-50":"text-ey-gray-dark bg-ey-gray"}`}>{trend}</span>}
      </div>
      <p className="text-[11px] text-ey-gray-dark mt-1.5">{sub}</p>
    </div>
  );
};
