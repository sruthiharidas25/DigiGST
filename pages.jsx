/* ══════════════════════════════════════════════════════════
   PAGES — Dashboard, Returns, IMS, Ledger, E-Invoice, Util, AI
   Plus ReportModal.
══════════════════════════════════════════════════════════ */

const {useState:useStateP, useMemo:useMemoP, useEffect:useEffectP, useRef:useRefP} = React;

/* ────── filter helper: any period name → return list ────── */
function filterByPeriod(rows, period){
  if(period === "All") return rows;
  const months = resolvePeriod(period);
  return rows.filter(r => months.includes(r.period) || r.period === period);
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
window.DashboardPage = function DashboardPage({period, goNav, highlightId, openInlineAI, aiLayout}){
  const data = useMemoP(()=>filterByPeriod(RETURNS, period), [period]);
  const stats = useMemoP(()=>{
    return {
      total: data.length,
      filed: data.filter(r=>r.status==="Filed").length,
      pending: data.filter(r=>["Pending","Error","Draft"].includes(r.status)).length,
      tax: data.reduce((s,r)=>s+r.tax,0),
    };
  }, [data]);
  const taxRate = stats.total ? Math.round((stats.filed/stats.total)*100) : 0;

  return (
    <>
      {aiLayout === "inline" && (
        <AIInlineBar contextLabel="this dashboard" onOpen={openInlineAI} suggestions={SMART_QUESTIONS}/>
      )}

      {/* Top stat row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <StatCard label="Total returns"  value={stats.total} sub="Selected period"/>
        <WhyExplainer label="Filed" value={`${stats.filed}/${stats.total}`}>
          <StatCard label="Filed"          value={stats.filed} sub={`${taxRate}% completion`} trend="+12%" accent="bg-green-500"/>
        </WhyExplainer>
        <WhyExplainer label="Pending / Error" value={String(stats.pending)}>
          <StatCard label="Pending / Error" value={stats.pending} sub="Action needed" accent="bg-amber-500"/>
        </WhyExplainer>
        <WhyExplainer label="Tax Paid" value={fmt(stats.tax)}>
          <StatCard label="Tax paid"        value={fmt(stats.tax)} sub="Net GST" trend="+13.2%"/>
        </WhyExplainer>
        <WhyExplainer label="ITC Balance" value="₹1.12L">
          <StatCard label="ITC balance"     value="₹1.12L" sub="Apr 2024 live" trend="-43%" accent="bg-blue-500"/>
        </WhyExplainer>
        <WhyExplainer label="AI Score" value="87/100">
          <StatCard label="AI score"        value="87" sub="↑4 vs last qtr" accent="bg-purple-500"/>
        </WhyExplainer>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2"><MonthlyChart/></div>
        <StatusBreakdown returns={data}/>
      </div>

      {/* Returns table */}
      <ReturnsTable rows={data} period={period} highlightId={highlightId} goNav={goNav}/>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <DueDatesCard goNav={goNav}/>
        <QuickActionsCard goNav={goNav}/>
        <AISignalsCard goNav={goNav}/>
      </div>
    </>
  );
};

/* ── Monthly chart (Oct → Apr) ─────────────────────────── */
function MonthlyChart(){
  const months = [
    {l:"Oct '23", tax:213840, taxable:1188000},
    {l:"Nov '23", tax:227160, taxable:1262000},
    {l:"Dec '23", tax:251100, taxable:1395000},
    {l:"Jan '24", tax:266400, taxable:1480000},
    {l:"Feb '24", tax:292500, taxable:1625000},
    {l:"Mar '24", tax:331200, taxable:1840000},
    {l:"Apr '24", tax:353700, taxable:1965000, draft:true},
  ];
  const maxTaxable = Math.max(...months.map(m=>m.taxable));
  const maxTax = Math.max(...months.map(m=>m.tax));

  return (
    <div className="bg-white rounded-xl border border-ey-gray-mid p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-ey-charcoal">Monthly tax & turnover</h3>
          <p className="text-[11px] text-ey-gray-dark mt-0.5">7-month trend · Apr 2024 in draft</p>
        </div>
        <div className="flex gap-3 text-[10px]">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-ey-gray-mid"></div><span className="text-ey-gray-dark">Turnover</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-ey-yellow"></div><span className="text-ey-gray-dark">Tax</span></div>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 pt-2" style={{height:160}}>
        {months.map((m,i)=>(
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-end gap-1 w-full justify-center" style={{height:120}}>
              <div title={fmt(m.taxable)} style={{width:14, height:`${(m.taxable/maxTaxable)*120}px`, background:"#E8E8E4", borderRadius:"2px 2px 0 0"}}></div>
              <div title={fmt(m.tax)} style={{width:14, height:`${(m.tax/maxTax)*120}px`, background:m.draft?"#FFD400AA":"#FFD400", borderRadius:"2px 2px 0 0", border:m.draft?"1px dashed #b08800":""}}></div>
            </div>
            <span className="text-[10px] text-ey-gray-dark font-medium">{m.l}</span>
            <span className="text-[10px] font-bold text-ey-charcoal font-mono">{fmt(m.tax)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBreakdown({returns}){
  const c = {Filed:0,Pending:0,Processing:0,Error:0,Draft:0};
  returns.forEach(r=>{ if(c[r.status]!==undefined) c[r.status]++; });
  const t = returns.length || 1;
  const items = [
    {l:"Filed", v:c.Filed, col:"#22c55e"},
    {l:"Processing", v:c.Processing, col:"#3b82f6"},
    {l:"Pending", v:c.Pending, col:"#f59e0b"},
    {l:"Error", v:c.Error, col:"#ef4444"},
    {l:"Draft", v:c.Draft, col:"#9ca3af"},
  ];
  return (
    <div className="bg-white rounded-xl border border-ey-gray-mid p-5">
      <h3 className="text-[13px] font-semibold text-ey-charcoal">Status breakdown</h3>
      <p className="text-[11px] text-ey-gray-dark mt-0.5 mb-4">{t} returns in filter</p>
      {/* segmented bar */}
      <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-100 mb-4">
        {items.filter(i=>i.v>0).map((b,i)=>(
          <div key={i} title={`${b.l}: ${b.v}`} style={{width:`${(b.v/t)*100}%`, background:b.col, transition:"width .5s"}}></div>
        ))}
      </div>
      <div className="space-y-2.5">
        {items.map((b,i)=>(
          <div key={i} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm" style={{background:b.col}}></span>
              <span className="text-ey-charcoal">{b.l}</span>
            </div>
            <span className="font-mono font-semibold text-ey-charcoal">{b.v} <span className="text-ey-gray-dark font-normal">({Math.round((b.v/t)*100)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Bottom dashboard cards ────────────────────────────── */
function DueDatesCard({goNav}){
  return (
    <div className="bg-white rounded-xl border border-ey-gray-mid p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><span className="w-1 h-4 bg-ey-yellow rounded"></span><h3 className="text-[12px] font-semibold uppercase tracking-wider text-ey-charcoal">Upcoming due dates</h3></div>
        <button onClick={()=>goNav("returnreports")} className="text-[10px] text-ey-gray-dark hover:text-ey-charcoal">View all →</button>
      </div>
      <div className="space-y-1">
        {DUE_DATES.map(d=>{
          const overdue = d.days < 0;
          const urgent = !overdue && d.days <= 7;
          return (
            <div key={d.id} onClick={()=>d.refId && goNav("returnreports", d.refId)}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-ey-gray cursor-pointer">
              <div className="flex items-center gap-2.5">
                <div className={`w-1 h-8 rounded-full ${overdue?"bg-red-600":urgent?"bg-red-400":d.days<=30?"bg-amber-400":"bg-green-400"}`}></div>
                <div>
                  <div className="font-mono text-[12px] font-semibold text-ey-charcoal">{d.return}</div>
                  <div className="text-[10px] text-ey-gray-dark">{d.period} · due {d.due}</div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${overdue?"bg-red-100 text-red-700":urgent?"bg-red-50 text-red-700":d.days<=30?"bg-amber-50 text-amber-700":"bg-green-50 text-green-700"}`}>
                {overdue?`${Math.abs(d.days)}d late`:d.filed?"✓ Filed":`${d.days}d`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickActionsCard({goNav}){
  const a = [
    {l:"File a return", i:"📤", n:"returnreports"},
    {l:"Reconcile ITC", i:"🔁", n:"imsreport"},
    {l:"AI analysis",   i:"✦",  n:"aiinsights"},
    {l:"View ledgers",  i:"📒", n:"ledgers"},
    {l:"E-invoices",    i:"🖨", n:"einvoice"},
    {l:"Utilities",     i:"🔧", n:"utilities"},
  ];
  return (
    <div className="bg-white rounded-xl border border-ey-gray-mid p-5">
      <div className="flex items-center gap-2 mb-3"><span className="w-1 h-4 bg-ey-yellow rounded"></span><h3 className="text-[12px] font-semibold uppercase tracking-wider text-ey-charcoal">Quick actions</h3></div>
      <div className="grid grid-cols-2 gap-1.5">
        {a.map((x,i)=>(
          <button key={i} onClick={()=>goNav(x.n)} className="flex items-center gap-2 py-2 px-2.5 text-[12px] text-ey-charcoal hover:bg-ey-yellow-pale rounded-lg border border-transparent hover:border-yellow-200 transition-colors text-left">
            <span className="text-sm">{x.i}</span>{x.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function AISignalsCard({goNav}){
  const signals = [
    {t:"GSTR-4 Mar is overdue — file today", sev:"high",  rid:7},
    {t:"GSTR-3B Feb Error unresolved",        sev:"high",  rid:10},
    {t:"10 IMS invoices pending · ₹2.3L ITC", sev:"med",   rid:null, page:"imsreport"},
    {t:"Mar compliance 87/100 — above avg",   sev:"ok",    rid:null},
  ];
  return (
    <div className="bg-white rounded-xl border border-ey-gray-mid p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><div className="w-6 h-6 bg-ey-navy rounded-md flex items-center justify-center text-ey-yellow text-[10px] font-bold">AI</div><h3 className="text-[12px] font-semibold uppercase tracking-wider text-ey-charcoal">AI signals</h3></div>
        <button onClick={()=>goNav("aiinsights")} className="text-[10px] text-blue-600 hover:underline font-semibold">Open →</button>
      </div>
      {signals.map((s,i)=>(
        <button key={i} onClick={()=>s.page ? goNav(s.page) : s.rid && goNav("returnreports", s.rid)}
          className={`w-full flex items-start gap-2 p-2.5 rounded-lg text-[11px] mb-1.5 border text-left transition-colors ${s.sev==="high"?"bg-red-50 border-red-100 hover:bg-red-100":s.sev==="med"?"bg-amber-50 border-amber-100 hover:bg-amber-100":"bg-green-50 border-green-100 hover:bg-green-100"}`}>
          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${s.sev==="high"?"bg-red-500":s.sev==="med"?"bg-amber-500":"bg-green-500"}`}></span>
          <span className={s.sev==="high"?"text-red-900":s.sev==="med"?"text-amber-900":"text-green-900"}>{s.t}</span>
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RETURNS TABLE (reused)
══════════════════════════════════════════════════════════ */
window.ReturnsTable = function ReturnsTable({rows, period, highlightId, goNav, title}){
  const [search, setSearch] = useStateP("");
  const [fStatus, setFStatus] = useStateP("All");
  const [showFilter, setShowFilter] = useStateP(false);
  const filterRef = useRefP(null);
  const rowRefs = useRefP({});

  useEffectP(()=>{
    const fn = e => { if(filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffectP(()=>{
    if(highlightId && rowRefs.current[highlightId]){
      rowRefs.current[highlightId].scrollIntoView({block:"center", behavior:"smooth"});
    }
  }, [highlightId]);

  const filtered = useMemoP(()=>rows.filter(r => {
    if(fStatus !== "All" && r.status !== fStatus) return false;
    if(search && ![r.type, r.period, r.status, r.by].some(v=>String(v).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [rows, search, fStatus]);

  return (
    <div className="bg-white rounded-xl border border-ey-gray-mid overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-ey-gray-mid">
        <div className="flex items-center gap-3">
          <span className="w-1 h-4 bg-ey-yellow rounded"></span>
          <div>
            <h2 className="text-[13px] font-semibold text-ey-charcoal">{title || "GST Return Register"}</h2>
            <p className="text-[11px] text-ey-gray-dark mt-0.5">{filtered.length} of {rows.length} records · {period}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              className="text-[12px] border border-ey-gray-mid rounded-lg pl-7 pr-3 py-1.5 w-44 focus:border-ey-yellow"/>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2 top-2 text-ey-gray-dark"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <div className="relative" ref={filterRef}>
            <button onClick={()=>setShowFilter(!showFilter)} className="flex items-center gap-1.5 text-[12px] border border-ey-gray-mid hover:bg-ey-gray text-ey-charcoal px-3 py-1.5 rounded-lg font-medium">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              Filter{fStatus!=="All"&&<span className="w-1.5 h-1.5 rounded-full bg-ey-yellow"></span>}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-9 z-50 bg-white border border-ey-gray-mid rounded-xl shadow-xl p-3 w-44">
                <p className="text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider mb-1.5">Status</p>
                {["All","Filed","Pending","Processing","Error","Draft"].map(s=>(
                  <label key={s} className="flex items-center gap-2 py-1 cursor-pointer text-[12px] text-ey-charcoal hover:text-ey-navy">
                    <input type="radio" name="st" checked={fStatus===s} onChange={()=>setFStatus(s)} className="accent-yellow-400"/>{s}
                  </label>
                ))}
                <button onClick={()=>{setFStatus("All"); setShowFilter(false);}} className="w-full text-center text-[10px] text-ey-gray-dark hover:text-red-600 border-t border-ey-gray-mid mt-2 pt-2">Clear</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ey-gray border-b border-ey-gray-mid">
              {["#","Return","Period","Status","Tax","IGST","CGST+SGST","Updated","By"].map(h=>(
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider">{h}</th>
              ))}
              <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-ey-gray-dark text-sm">No records match.</td></tr>
            ) : filtered.map((r,i)=>{
              const isHL = highlightId === r.id;
              return (
                <tr key={r.id} ref={el=>rowRefs.current[r.id]=el}
                  className={`border-b border-ey-gray-mid last:border-0 transition-colors ${isHL?"bg-ey-yellow-pale animate-[flash_1.8s_ease]":r.status==="Error"?"bg-red-50/60 hover:bg-red-50":r.status==="Pending"||r.status==="Draft"?"bg-amber-50/30 hover:bg-amber-50":"hover:bg-ey-gray"}`}>
                  <td className="px-4 py-2.5 text-[11px] text-ey-gray-dark font-mono">{String(i+1).padStart(2,"0")}</td>
                  <td className="px-4 py-2.5 font-semibold text-ey-charcoal font-mono text-[12px]">{r.type}</td>
                  <td className="px-4 py-2.5 text-[12px] text-ey-charcoal">{r.period}</td>
                  <td className="px-4 py-2.5"><SBadge s={r.status}/></td>
                  <td className="px-4 py-2.5 text-[12px] font-mono font-semibold tabular-nums">{fmt(r.tax)}</td>
                  <td className="px-4 py-2.5 text-[12px] font-mono text-ey-gray-dark tabular-nums">{fmt(r.igst)}</td>
                  <td className="px-4 py-2.5 text-[12px] font-mono text-ey-gray-dark tabular-nums">{r.cgst>0?fmt(r.cgst+r.sgst):"—"}</td>
                  <td className="px-4 py-2.5 text-[11px] text-ey-gray-dark">{r.updated}</td>
                  <td className="px-4 py-2.5 text-[11px] text-ey-gray-dark">{r.by}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={()=>alert(`${r.type} – ${r.period}\nStatus: ${r.status}\nTax: ${fmt(r.tax)}\nFiled by ${r.by} on ${r.updated}`)}
                      className="text-[11px] font-semibold text-ey-navy bg-ey-gray hover:bg-ey-yellow px-2.5 py-1 rounded-md transition-colors">View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   RETURN REPORTS PAGE
══════════════════════════════════════════════════════════ */
window.ReturnReportsPage = function ReturnReportsPage({period, highlightId, goNav, openInlineAI, aiLayout}){
  const data = useMemoP(()=>filterByPeriod(RETURNS, period), [period]);
  return (
    <div>
      {aiLayout==="inline" && <AIInlineBar contextLabel="these returns" onOpen={openInlineAI} suggestions={SMART_QUESTIONS}/>}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total" value={data.length} sub="In period"/>
        <StatCard label="Filed" value={data.filter(r=>r.status==="Filed").length} sub="Closed" accent="bg-green-500"/>
        <StatCard label="Errors" value={data.filter(r=>r.status==="Error").length} sub="Need fix" accent="bg-red-500"/>
        <StatCard label="Tax paid" value={fmt(data.reduce((s,r)=>s+r.tax,0))} sub="Period total"/>
      </div>
      <ReturnsTable rows={data} period={period} highlightId={highlightId} goNav={goNav}/>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   RETURN DASHBOARD PAGE (by type)
══════════════════════════════════════════════════════════ */
window.ReturnDashPage = function ReturnDashPage({period, openInlineAI, aiLayout}){
  const data = useMemoP(()=>filterByPeriod(RETURNS, period), [period]);
  const byType = {};
  data.forEach(r=>{
    if(!byType[r.type]) byType[r.type] = {total:0, filed:0, pending:0, tax:0};
    byType[r.type].total++;
    if(r.status==="Filed") byType[r.type].filed++;
    if(["Pending","Error","Draft"].includes(r.status)) byType[r.type].pending++;
    byType[r.type].tax += r.tax;
  });
  return (
    <div>
      {aiLayout==="inline" && <AIInlineBar contextLabel="this summary" onOpen={openInlineAI} suggestions={SMART_QUESTIONS}/>}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total returns" value={data.length} sub="In period"/>
        <StatCard label="Filed" value={data.filter(r=>r.status==="Filed").length} sub="Closed" accent="bg-green-500"/>
        <StatCard label="Pending" value={data.filter(r=>["Pending","Error","Draft"].includes(r.status)).length} sub="Action" accent="bg-amber-500"/>
        <StatCard label="Tax paid" value={fmt(data.reduce((s,r)=>s+r.tax,0))} sub="Period"/>
      </div>
      <div className="bg-white rounded-xl border border-ey-gray-mid overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ey-gray-mid flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-1 h-4 bg-ey-yellow rounded"></span>
            <h2 className="text-[13px] font-semibold text-ey-charcoal">Return type summary</h2>
          </div>
          <button onClick={()=>exportXLSX(data.map(r=>({Type:r.type, Period:r.period, Status:r.status, Tax:r.tax, By:r.by})),"ReturnDashboard.xlsx","Summary")} className="text-[11px] bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy px-3 py-1.5 rounded-lg font-semibold">Excel ⬇</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-ey-gray border-b border-ey-gray-mid">{["Return type","Filings","Filed","Pending/Error","Total tax","Coverage"].map(h=><th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {Object.entries(byType).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-ey-gray-dark text-sm">No returns in this period.</td></tr>
            ) : Object.entries(byType).map(([type,d],i)=>(
              <tr key={i} className="border-b border-ey-gray-mid hover:bg-ey-gray">
                <td className="px-5 py-3 font-mono font-semibold text-[12px] text-ey-charcoal">{type}</td>
                <td className="px-5 py-3 text-[12px]">{d.total}</td>
                <td className="px-5 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-[10px] font-semibold">{d.filed}</span></td>
                <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${d.pending>0?"bg-amber-100 text-amber-800":"bg-gray-100 text-gray-600"} text-[10px] font-semibold`}>{d.pending}</span></td>
                <td className="px-5 py-3 font-mono text-[12px] tabular-nums">{fmt(d.tax)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{width:`${d.total?(d.filed/d.total)*100:0}%`}}></div>
                    </div>
                    <span className="text-[11px] text-ey-gray-dark font-mono">{d.total?Math.round((d.filed/d.total)*100):0}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   IMS PAGE
══════════════════════════════════════════════════════════ */
window.IMSPage = function IMSPage({period, highlightId, goNav, openInlineAI, aiLayout}){
  const data = useMemoP(()=>filterByPeriod(IMS, period), [period]);
  const rowRefs = useRefP({});
  useEffectP(()=>{
    if(highlightId && rowRefs.current[highlightId]){
      rowRefs.current[highlightId].scrollIntoView({block:"center", behavior:"smooth"});
    }
  }, [highlightId]);

  return (
    <div>
      {aiLayout==="inline" && <AIInlineBar contextLabel="these suppliers" onOpen={openInlineAI} suggestions={SMART_QUESTIONS}/>}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Suppliers" value={new Set(data.map(d=>d.gstin)).size} sub="Unique GSTINs"/>
        <StatCard label="Invoices" value={data.reduce((s,r)=>s+r.invoices,0)} sub="In period"/>
        <StatCard label="ITC eligible" value={fmt(data.reduce((s,r)=>s+r.itc,0))} sub="Total" accent="bg-green-500"/>
        <StatCard label="Pending action" value={data.reduce((s,r)=>s+r.pending,0)} sub="Invoices" accent="bg-amber-500"/>
      </div>
      <div className="bg-white rounded-xl border border-ey-gray-mid overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ey-gray-mid flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="w-1 h-4 bg-ey-yellow rounded"></span><h2 className="text-[13px] font-semibold text-ey-charcoal">Invoice Management System</h2></div>
          <div className="flex gap-2">
            <button onClick={()=>exportXLSX(data,"IMS.xlsx","IMS")} className="text-[11px] bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy px-3 py-1.5 rounded-lg font-semibold">Excel</button>
            <button onClick={()=>exportPDF("IMS Report",["Supplier","GSTIN","Period","Inv","Elig","Pend","Rej","ITC","Risk"],data.map(r=>[r.supplier,r.gstin,r.period,r.invoices,r.eligible,r.pending,r.rejected,fmt(r.itc),r.risk]),"IMS.pdf")} className="text-[11px] bg-ey-navy hover:bg-ey-navy-light text-ey-yellow px-3 py-1.5 rounded-lg font-semibold">PDF</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-ey-gray border-b border-ey-gray-mid">{["Supplier","GSTIN","Period","Inv","Elig","Pending","Rejected","ITC","Risk","Action"].map(h=><th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-ey-gray-dark text-sm">No IMS records.</td></tr>
              ) : data.map((r,i)=>{
                const isHL = highlightId === r.id;
                return (
                  <tr key={r.id} ref={el=>rowRefs.current[r.id]=el}
                    className={`border-b border-ey-gray-mid transition-colors ${isHL?"bg-ey-yellow-pale animate-[flash_1.8s_ease]":r.risk==="High"?"bg-red-50/40":r.pending>0?"bg-amber-50/30":""} hover:bg-ey-gray`}>
                    <td className="px-4 py-3 text-[12px] font-semibold text-ey-charcoal">{r.supplier}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-ey-gray-dark">{r.gstin}</td>
                    <td className="px-4 py-3 text-[12px]">{r.period}</td>
                    <td className="px-4 py-3 text-[12px] text-center font-mono">{r.invoices}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-[10px] font-semibold">{r.eligible}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${r.pending>0?"bg-amber-100 text-amber-800":"bg-gray-100 text-gray-500"}`}>{r.pending}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${r.rejected>0?"bg-red-100 text-red-800":"bg-gray-100 text-gray-500"}`}>{r.rejected}</span></td>
                    <td className="px-4 py-3 text-[12px] font-mono font-semibold text-green-700 tabular-nums">{fmt(r.itc)}</td>
                    <td className="px-4 py-3"><RiskBadge r={r.risk}/></td>
                    <td className="px-4 py-3">{r.pending>0?<button className="text-[11px] bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-md font-semibold">Take action</button>:<span className="text-[11px] text-green-600 font-semibold">✓ Done</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   LEDGER PAGE
══════════════════════════════════════════════════════════ */
window.LedgerPage = function LedgerPage({period, openInlineAI, aiLayout}){
  const data = useMemoP(()=>filterByPeriod(LEDGER, period), [period]);
  const tc = data.reduce((s,l)=>s+l.credit, 0);
  const td = data.reduce((s,l)=>s+l.debit, 0);
  const bal = data[data.length-1]?.balance || 0;

  return (
    <div>
      {aiLayout==="inline" && <AIInlineBar contextLabel="this ledger" onOpen={openInlineAI} suggestions={SMART_QUESTIONS}/>}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total credits" value={fmt(tc)} sub="ITC received" accent="bg-green-500"/>
        <StatCard label="Total debits" value={fmt(td)} sub="Offsets & reversals" accent="bg-red-500"/>
        <StatCard label="Closing balance" value={fmt(bal)} sub="Available ITC" accent="bg-blue-500"/>
      </div>
      <div className="bg-white rounded-xl border border-ey-gray-mid overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ey-gray-mid flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="w-1 h-4 bg-ey-yellow rounded"></span><h2 className="text-[13px] font-semibold text-ey-charcoal">Electronic credit ledger</h2></div>
          <div className="flex gap-2">
            <button onClick={()=>exportXLSX(data,"Ledger.xlsx","Ledger")} className="text-[11px] bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy px-3 py-1.5 rounded-lg font-semibold">Excel</button>
            <button onClick={()=>exportPDF("Credit Ledger",["Date","Description","Type","Debit","Credit","Balance"],data.map(r=>[r.date,r.desc,r.type,r.debit>0?fmt(r.debit):"—",r.credit>0?fmt(r.credit):"—",fmt(r.balance)]),"Ledger.pdf")} className="text-[11px] bg-ey-navy hover:bg-ey-navy-light text-ey-yellow px-3 py-1.5 rounded-lg font-semibold">PDF</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-ey-gray border-b border-ey-gray-mid">{["Date","Description","Type","Debit","Credit","Balance"].map(h=><th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-ey-gray-dark text-sm">No ledger entries.</td></tr>
            ) : data.map((r,i)=>(
              <tr key={i} className={`border-b border-ey-gray-mid hover:bg-ey-gray ${r.type==="balance"?"bg-ey-yellow-pale font-medium":""}`}>
                <td className="px-5 py-3 text-[11px] font-mono text-ey-gray-dark">{r.date}</td>
                <td className="px-5 py-3 text-[12px] text-ey-charcoal">{r.desc}</td>
                <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${r.type==="credit"?"bg-green-100 text-green-800":r.type==="debit"?"bg-red-100 text-red-800":"bg-blue-100 text-blue-800"}`}>{r.type}</span></td>
                <td className="px-5 py-3 text-[12px] font-mono text-red-600 font-semibold tabular-nums">{r.debit>0?fmt(r.debit):"—"}</td>
                <td className="px-5 py-3 text-[12px] font-mono text-green-600 font-semibold tabular-nums">{r.credit>0?fmt(r.credit):"—"}</td>
                <td className="px-5 py-3 text-[12px] font-mono font-bold text-ey-charcoal tabular-nums">{fmt(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   E-INVOICE PAGE
══════════════════════════════════════════════════════════ */
window.EInvoicePage = function EInvoicePage({openInlineAI, aiLayout}){
  return (
    <div>
      {aiLayout==="inline" && <AIInlineBar contextLabel="these e-invoices" onOpen={openInlineAI} suggestions={SMART_QUESTIONS}/>}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="E-invoices" value={EINVOICES.length} sub="Issued"/>
        <StatCard label="Active" value={EINVOICES.filter(i=>i.status==="Active").length} sub="Valid IRNs" accent="bg-green-500"/>
        <StatCard label="Total value" value={fmt(EINVOICES.reduce((s,i)=>s+i.value,0))} sub="Sum of invoices"/>
      </div>
      <div className="bg-white rounded-xl border border-ey-gray-mid overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ey-gray-mid flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="w-1 h-4 bg-ey-yellow rounded"></span><h2 className="text-[13px] font-semibold text-ey-charcoal">E-invoice register</h2></div>
          <button onClick={()=>exportXLSX(EINVOICES,"EInvoices.xlsx","E-Invoices")} className="text-[11px] bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy px-3 py-1.5 rounded-lg font-semibold">Excel ⬇</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-ey-gray border-b border-ey-gray-mid">{["IRN","Date","Buyer","GSTIN","Value","Status","Action"].map(h=><th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>{EINVOICES.map((r,i)=>(
            <tr key={i} className="border-b border-ey-gray-mid hover:bg-ey-gray">
              <td className="px-4 py-3 text-[11px] font-mono text-blue-700">{r.irn}</td>
              <td className="px-4 py-3 text-[12px]">{r.date}</td>
              <td className="px-4 py-3 text-[12px] font-semibold text-ey-charcoal">{r.buyer}</td>
              <td className="px-4 py-3 text-[11px] font-mono text-ey-gray-dark">{r.gstin}</td>
              <td className="px-4 py-3 text-[12px] font-mono font-semibold tabular-nums">{fmt(r.value)}</td>
              <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${r.status==="Active"?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{r.status}</span></td>
              <td className="px-4 py-3 text-right"><button onClick={()=>alert("Print IRN: "+r.irn)} className="text-[11px] font-semibold text-ey-navy bg-ey-gray hover:bg-ey-yellow px-2.5 py-1 rounded-md">Print</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   UTILITIES PAGE
══════════════════════════════════════════════════════════ */
window.UtilPage = function UtilPage(){
  const tools = [
    {i:"📦",n:"Bulk upload",        d:"Upload returns via JSON or Excel files"},
    {i:"🔁",n:"ITC reconciliation",  d:"Auto-match GSTR-2A vs 2B vs books"},
    {i:"{}",n:"JSON validator",      d:"Validate GST JSON files before filing"},
    {i:"📊",n:"GSTR-9 compiler",     d:"Compile annual return from monthly data"},
    {i:"🔍",n:"GSTIN lookup",        d:"Verify supplier GSTIN status and details"},
    {i:"📧",n:"Notice manager",      d:"Track and respond to GST department notices"},
  ];
  return (
    <div>
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-ey-navy via-ey-navy-mid to-ey-navy rounded-2xl p-7 mb-6 flex items-center gap-6 overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-ey-yellow/10 rounded-full"></div>
        <div className="absolute right-16 bottom-0 w-24 h-24 bg-ey-yellow/5 rounded-full"></div>
        <div className="w-16 h-16 rounded-2xl bg-ey-yellow text-ey-navy flex items-center justify-center text-3xl flex-shrink-0 relative z-10">🔧</div>
        <div className="flex-1 relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.15em] bg-ey-yellow text-ey-navy font-bold px-2 py-0.5 rounded">Coming soon</span>
            <span className="text-[10px] uppercase tracking-wider text-ey-yellow/70 font-semibold">v2.6 · Q3 FY26</span>
          </div>
          <h2 className="text-white text-[20px] font-semibold leading-tight">Utilities are shipping in the next release</h2>
          <p className="text-gray-300 text-[12px] mt-1.5 max-w-2xl">Six standalone tools to handle the long-tail of GST work — bulk uploads, JSON validation, GSTIN lookups, annual return compilation and more. Previewed below.</p>
        </div>
        <button onClick={()=>alert("We'll email you when Utilities go live.")}
          className="relative z-10 bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy font-semibold text-[12px] px-4 py-2.5 rounded-xl flex items-center gap-2 flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 6 12 13 2 6"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
          Notify me
        </button>
      </div>

      {/* Tool preview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((t,i)=>(
          <div key={i} className="bg-white rounded-xl border border-ey-gray-mid p-5 relative overflow-hidden">
            {/* Diagonal stripe band — subtle "WIP" texture */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{backgroundImage:"repeating-linear-gradient(135deg, #1A1A2E 0 8px, transparent 8px 18px)"}}></div>

            <div className="flex items-start justify-between mb-3 relative">
              <div className="text-3xl opacity-60">{t.i}</div>
              <span className="text-[9px] bg-ey-yellow-pale border border-yellow-200 text-amber-900 font-bold uppercase tracking-wider px-2 py-0.5 rounded">Coming soon</span>
            </div>
            <h3 className="text-[14px] font-semibold text-ey-charcoal mb-1 relative">{t.n}</h3>
            <p className="text-[12px] text-ey-gray-dark mb-4 leading-relaxed relative">{t.d}</p>
            <button disabled
              className="relative text-[12px] bg-ey-gray text-ey-gray-dark px-4 py-2 rounded-lg font-semibold cursor-not-allowed inline-flex items-center gap-2 opacity-70">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              In development
            </button>
          </div>
        ))}
      </div>

      {/* Roadmap strip */}
      <div className="mt-6 bg-white rounded-xl border border-ey-gray-mid p-5">
        <div className="flex items-center gap-2 mb-4"><span className="w-1 h-4 bg-ey-yellow rounded"></span><h3 className="text-[12px] font-semibold uppercase tracking-wider text-ey-charcoal">Release timeline</h3></div>
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {[
            {ver:"v2.5", q:"Current", st:"shipped",  items:["AI Assistant","Doc Extract","DRC Replies","Reconcile"]},
            {ver:"v2.6", q:"Q3 FY26", st:"next",     items:["Bulk upload","JSON validator","ITC reconciliation"]},
            {ver:"v2.7", q:"Q4 FY26", st:"planned",  items:["GSTR-9 compiler","GSTIN lookup","Notice manager"]},
            {ver:"v3.0", q:"FY27",    st:"planned",  items:["E-way bill","Multi-GSTIN","Audit trail"]},
          ].map((m,i)=>(
            <div key={i} className={`flex-1 min-w-[200px] rounded-lg p-3 border ${m.st==="shipped"?"bg-green-50 border-green-200":m.st==="next"?"bg-ey-yellow-pale border-yellow-300":"bg-ey-gray border-ey-gray-mid"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[11px] font-bold font-mono ${m.st==="shipped"?"text-green-800":m.st==="next"?"text-amber-900":"text-ey-charcoal"}`}>{m.ver}</span>
                <span className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${m.st==="shipped"?"bg-green-200 text-green-900":m.st==="next"?"bg-ey-yellow text-ey-navy":"bg-white text-ey-gray-dark"}`}>{m.st==="shipped"?"✓ Live":m.st==="next"?"Next":m.q}</span>
              </div>
              <div className="text-[10px] text-ey-gray-dark mb-2">{m.q}</div>
              <ul className="space-y-1">
                {m.items.map((it,j)=>(
                  <li key={j} className="text-[11px] text-ey-charcoal flex items-center gap-1.5">
                    <span className={`w-1 h-1 rounded-full ${m.st==="shipped"?"bg-green-600":m.st==="next"?"bg-amber-600":"bg-ey-gray-dark"}`}></span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   AI INSIGHTS PAGE — uses AIFullPageLayout (no matter the
   chosen layout, this tab always gets the rich AI canvas)
   Plus anomaly table below.
══════════════════════════════════════════════════════════ */
window.AIInsightsPage = function AIInsightsPage({chat, onRefClick, onOpenKey, goNav}){
  return (
    <div className="space-y-5">
      <div style={{minHeight:600}}>
        <AIFullPageLayout chat={chat} onRefClick={onRefClick} onOpenKey={onOpenKey}/>
      </div>
      <div className="bg-white rounded-xl border border-ey-gray-mid overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ey-gray-mid flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="w-1 h-4 bg-ey-yellow rounded"></span><h3 className="text-[13px] font-semibold text-ey-charcoal">Detected anomalies</h3></div>
          <span className="text-[11px] text-ey-gray-dark">{ANOMALIES.length} items · auto-detected</span>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-ey-gray border-b border-ey-gray-mid">{["Type","Description","Period","Severity","Action"].map(h=><th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {ANOMALIES.map(a=>(
              <tr key={a.id} className={`border-b border-ey-gray-mid hover:bg-ey-gray cursor-pointer ${a.severity==="High"?"bg-red-50/40":""}`}
                onClick={()=>a.refId && goNav("returnreports", a.refId)}>
                <td className="px-5 py-3 text-[12px] font-semibold text-ey-charcoal">{a.type}</td>
                <td className="px-5 py-3 text-[12px] text-ey-charcoal">{a.desc}</td>
                <td className="px-5 py-3 text-[11px] text-ey-gray-dark">{a.period}</td>
                <td className="px-5 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${a.severity==="High"?"bg-red-100 text-red-800":a.severity==="Medium"?"bg-amber-100 text-amber-800":"bg-gray-100 text-gray-700"}`}>{a.severity}</span></td>
                <td className="px-5 py-3 text-[11px] text-ey-gray-dark">{a.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   REPORT EXPORT MODAL
══════════════════════════════════════════════════════════ */
window.ReportModal = function ReportModal({period, onClose}){
  const [fmt2, setFmt2] = useStateP("excel");
  const [scope, setScope] = useStateP("returns");
  const [done, setDone] = useStateP(false);
  const [gen, setGen] = useStateP(false);

  const filtered = useMemoP(()=>filterByPeriod(RETURNS, period), [period]);

  function doExport(){
    setGen(true);
    setTimeout(()=>{
      try{
        if(scope==="returns"){
          const rows = filtered.map(r=>({"Return Type":r.type, Period:r.period, Status:r.status, "Taxable Amount":r.taxable, "Tax Amount":r.tax, IGST:r.igst, CGST:r.cgst, SGST:r.sgst, "Last Updated":r.updated, "Filed By":r.by}));
          if(fmt2==="excel") exportXLSX(rows, `DigiGST_Returns_${new Date().toISOString().slice(0,10)}.xlsx`, "Returns");
          else if(fmt2==="csv") exportCSV(rows, `DigiGST_Returns_${new Date().toISOString().slice(0,10)}.csv`);
          else exportPDF("GST Return Register", ["Return","Period","Status","Taxable","Tax","IGST","CGST","SGST","Updated","By"], filtered.map(r=>[r.type,r.period,r.status,fmt(r.taxable),fmt(r.tax),fmt(r.igst),fmt(r.cgst),fmt(r.sgst),r.updated,r.by]), `DigiGST_Returns_${new Date().toISOString().slice(0,10)}.pdf`);
        } else if(scope==="ims"){
          if(fmt2==="excel") exportXLSX(IMS, "DigiGST_IMS.xlsx", "IMS");
          else if(fmt2==="csv") exportCSV(IMS, "DigiGST_IMS.csv");
          else exportPDF("IMS Report", ["Supplier","GSTIN","Period","Inv","Elig","Pend","Rej","ITC","Risk"], IMS.map(r=>[r.supplier,r.gstin,r.period,r.invoices,r.eligible,r.pending,r.rejected,fmt(r.itc),r.risk]), "DigiGST_IMS.pdf");
        } else {
          if(fmt2==="excel") exportXLSX(LEDGER, "DigiGST_Ledger.xlsx", "Ledger");
          else if(fmt2==="csv") exportCSV(LEDGER, "DigiGST_Ledger.csv");
          else exportPDF("Credit Ledger", ["Date","Description","Type","Debit","Credit","Balance"], LEDGER.map(r=>[r.date,r.desc,r.type,r.debit>0?fmt(r.debit):"—",r.credit>0?fmt(r.credit):"—",fmt(r.balance)]), "DigiGST_Ledger.pdf");
        }
      }catch(e){ console.error(e); }
      setGen(false); setDone(true);
    }, 800);
  }

  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="bg-white rounded-2xl p-7 w-full max-w-lg mx-4 shadow-2xl" onClick={e=>e.stopPropagation()}>
        {!done ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-ey-yellow-pale rounded-xl flex items-center justify-center text-2xl">📥</div>
              <div><h3 className="text-[15px] font-semibold text-ey-charcoal">Generate report</h3><p className="text-[12px] text-ey-gray-dark">Download as Excel, PDF or CSV</p></div>
            </div>
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider mb-2">Scope</p>
              <div className="grid grid-cols-3 gap-2">
                {[{v:"returns",l:"Returns",i:"📋"},{v:"ims",l:"IMS",i:"🏭"},{v:"ledger",l:"Ledger",i:"📒"}].map(o=>(
                  <button key={o.v} onClick={()=>setScope(o.v)} className={`p-3 rounded-xl border text-[12px] font-medium flex flex-col items-center gap-1 transition-all ${scope===o.v?"border-ey-yellow bg-ey-yellow-pale":"border-ey-gray-mid text-ey-gray-dark hover:border-yellow-300"}`}>
                    <span className="text-xl">{o.i}</span>{o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <p className="text-[10px] font-semibold text-ey-gray-dark uppercase tracking-wider mb-2">Format</p>
              <div className="grid grid-cols-3 gap-2">
                {[{v:"excel",l:"Excel"},{v:"pdf",l:"PDF"},{v:"csv",l:"CSV"}].map(f=>(
                  <button key={f.v} onClick={()=>setFmt2(f.v)} className={`py-2.5 rounded-lg border text-[12px] font-semibold transition-all ${fmt2===f.v?"border-ey-yellow bg-ey-yellow text-ey-navy":"border-ey-gray-mid text-ey-gray-dark hover:bg-ey-gray"}`}>{f.l}</button>
                ))}
              </div>
            </div>
            <div className="bg-ey-gray rounded-xl p-3 mb-5 grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-ey-gray-dark block">Company</span><span className="font-medium text-ey-charcoal">{COMPANY}</span></div>
              <div><span className="text-ey-gray-dark block">GSTIN</span><span className="font-mono text-ey-charcoal">{GSTIN}</span></div>
              <div><span className="text-ey-gray-dark block">Period</span><span className="font-medium text-ey-charcoal">{period}</span></div>
              <div><span className="text-ey-gray-dark block">Records</span><span className="font-medium text-ey-charcoal">{scope==="returns"?filtered.length:scope==="ims"?IMS.length:LEDGER.length} rows</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={doExport} disabled={gen} className="flex-1 bg-ey-yellow hover:bg-ey-yellow-dark disabled:opacity-50 text-ey-navy font-semibold py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2">
                {gen ? "Generating…" : `Download ${fmt2.toUpperCase()}`}
              </button>
              <button onClick={onClose} className="px-5 border border-ey-gray-mid text-ey-charcoal font-medium py-2.5 rounded-xl text-[13px] hover:bg-ey-gray">Cancel</button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto bg-green-100 rounded-full flex items-center justify-center text-2xl mb-3">✓</div>
            <h3 className="text-[15px] font-semibold text-ey-charcoal mb-1">Downloaded</h3>
            <p className="text-[12px] text-ey-gray-dark mb-5">Your {fmt2.toUpperCase()} file has been saved.</p>
            <button onClick={onClose} className="bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy font-semibold px-8 py-2 rounded-xl text-[13px]">Done</button>
          </div>
        )}
      </div>
    </div>
  );
};
