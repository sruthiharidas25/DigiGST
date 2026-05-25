/* ══════════════════════════════════════════════════════════
   DigiGST — 4 NEW AI FEATURES
   ─────────────────────────────────────────────────────────
   Drop-in module. Adds to your existing project.

   FEATURES:
   1. DocumentDropPage     — Drag/drop invoice → AI extract → auto-fill
   2. WhyExplainer         — Universal (?) tooltip component for any number
   3. ReconcilePage        — 3-way reconciliation (Books / 2A / 2B)
   4. NoticeDrafterPage    — Paste notice → AI drafts reply

   INSTALL:
   1. Save this file as features.jsx in your project
   2. Add to DigiGST.html before pages.jsx:
        <script type="text/babel" src="features.jsx"></script>
   3. Extend NAV in DigiGST.html:
        {id:"docextract",  label:"Doc Extract",  icon:"📄"},
        {id:"reconcile",   label:"Reconcile",    icon:"⚖"},
        {id:"notices",     label:"Notice Reply", icon:"⚖"},
   4. In your renderPage() switch, add:
        case "docextract": return <DocumentDropPage .../>
        case "reconcile":  return <ReconcilePage .../>
        case "notices":    return <NoticeDrafterPage .../>
   5. Use WhyExplainer anywhere a number deserves explanation:
        <WhyExplainer label="ITC Balance" value="₹1.12L" context="..."/>
══════════════════════════════════════════════════════════ */

const {useState:useStateF, useRef:useRefF, useEffect:useEffectF, useCallback:useCallbackF, useMemo:useMemoF} = React;

/* ──────────────────────────────────────────────────────────
   SHARED: small AI helper that uses the same engine as chat
────────────────────────────────────────────────────────── */
async function callFeatureAI(prompt, systemOverride){
  try{
    if(window.__APIKEY){
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": window.__APIKEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true"
        },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens: 800,
          system: systemOverride || aiSystemPrompt(),
          messages: [{role:"user", content: prompt}]
        })
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({}));
        throw new Error(err?.error?.message || "API error");
      }
      const data = await res.json();
      return {source:"claude", text: data.content?.[0]?.text || ""};
    }
    throw new Error("NO_KEY");
  }catch(e){
    return {source:"local", text:null, error:e.message};
  }
}

/* ──────────────────────────────────────────────────────────
   FEATURE 1 — DOCUMENT DROP & EXTRACT
   Drag invoice PDF/image → simulated OCR → AI parsed fields
────────────────────────────────────────────────────────── */
window.DocumentDropPage = function DocumentDropPage({goNav}){
  const [stage, setStage]   = useStateF("idle"); // idle | uploading | extracting | done
  const [filename, setFilename] = useStateF("");
  const [fileSize, setFileSize] = useStateF(0);
  const [progress, setProgress] = useStateF(0);
  const [extracted, setExtracted] = useStateF(null);
  const [aiSource, setAiSource] = useStateF("local");
  const [dragOver, setDragOver] = useStateF(false);
  const inputRef = useRefF(null);

  /* mock extraction — uses AI to "generate" a plausible invoice
     for the demo, or returns a hand-crafted realistic record */
  async function runExtraction(name){
    setStage("extracting");
    setProgress(0);

    /* step animation */
    const steps = [
      {pct: 20, label:"OCR text recognition"},
      {pct: 45, label:"Identifying invoice fields"},
      {pct: 70, label:"Validating GSTIN format"},
      {pct: 90, label:"Cross-checking with vendor master"},
    ];
    for(const s of steps){
      await new Promise(r => setTimeout(r, 550));
      setProgress(s.pct);
    }

    /* try AI extraction with structured prompt */
    const prompt = `Generate a realistic GST invoice data extraction for a file named "${name}". Return ONLY a JSON object (no markdown, no prose) with these exact fields:
{
  "supplier": "company name",
  "gstin": "valid 15-char GSTIN",
  "invoiceNo": "string",
  "invoiceDate": "DD MMM YYYY",
  "taxableValue": number,
  "igst": number,
  "cgst": number,
  "sgst": number,
  "total": number,
  "placeOfSupply": "state name",
  "hsn": "8-digit code",
  "confidence": 0-100
}

Make it realistic — match a manufacturing/industrial supplier. Use INR amounts between ₹50,000 to ₹3,00,000. Pick CGST+SGST OR IGST (not both). Return ONLY valid JSON.`;

    const result = await callFeatureAI(prompt);

    let data;
    if(result.text){
      try{
        /* try to extract JSON if AI wrapped it */
        const match = result.text.match(/\{[\s\S]*\}/);
        if(match) data = JSON.parse(match[0]);
        setAiSource("claude");
      }catch(e){
        data = null;
      }
    }
    if(!data){
      /* deterministic fallback */
      const samples = [
        {supplier:"TechParts India Ltd",gstin:"29AABCT1234A1Z5",invoiceNo:"TP/2024/0428",invoiceDate:"18 Apr 2024",taxableValue:184500,igst:33210,cgst:0,sgst:0,total:217710,placeOfSupply:"Karnataka",hsn:"84818090",confidence:96},
        {supplier:"Bharat Steel Corp",gstin:"24AABCB5678B1Z3",invoiceNo:"BSC-1142",invoiceDate:"22 Apr 2024",taxableValue:92800,igst:0,cgst:8352,sgst:8352,total:109504,placeOfSupply:"Maharashtra",hsn:"72142000",confidence:94},
        {supplier:"Mumbai Logistics Co",gstin:"27AABCM9012C1Z1",invoiceNo:"ML-INV-2024-7821",invoiceDate:"15 Apr 2024",taxableValue:48200,igst:0,cgst:4338,sgst:4338,total:56876,placeOfSupply:"Maharashtra",hsn:"99680000",confidence:91},
      ];
      data = samples[Math.floor(Math.random()*samples.length)];
      setAiSource("local");
    }

    setProgress(100);
    await new Promise(r => setTimeout(r, 300));
    setExtracted(data);
    setStage("done");
  }

  function handleFile(file){
    if(!file) return;
    setFilename(file.name);
    setFileSize(file.size);
    setStage("uploading");
    setTimeout(()=>runExtraction(file.name), 600);
  }

  function reset(){
    setStage("idle"); setExtracted(null); setProgress(0); setFilename(""); setFileSize(0);
  }

  function pushToGSTR1(){
    alert(`✓ Invoice ${extracted.invoiceNo} pushed to GSTR-1 Apr 2024 draft.\nGSTIN ${extracted.gstin} added to outward supplies.`);
    reset();
    goNav && goNav("returnreports");
  }

  return (
    <div>
      <PageHeader
        title="Document Extract"
        subtitle="Drop invoice. AI extracts fields. One click to push to GSTR-1."
        badge="AI-powered"
      />

      {stage === "idle" && (
        <>
          {/* drop zone */}
          <div
            onDragOver={(e)=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={(e)=>{
              e.preventDefault();setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            onClick={()=>inputRef.current?.click()}
            className={`bg-white rounded-2xl border-2 border-dashed cursor-pointer transition-all
              ${dragOver ? "border-ey-yellow bg-ey-yellow-pale" : "border-ey-gray-mid hover:border-ey-yellow"}
              p-12 text-center mb-6`}
          >
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-base font-semibold text-ey-charcoal mb-1">
              Drop invoice PDF, image or scan here
            </h3>
            <p className="text-sm text-ey-gray-dark mb-4">
              or click to browse • Supports PDF, JPG, PNG • Max 10 MB
            </p>
            <button className="bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy text-sm font-semibold px-5 py-2 rounded-lg">
              Choose file
            </button>
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={(e)=>handleFile(e.target.files[0])}/>
          </div>

          {/* how it works */}
          <div className="bg-white rounded-xl border border-ey-gray-mid p-5">
            <h4 className="text-sm font-semibold text-ey-charcoal mb-4">How it works</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {n:"1",t:"Drop document",s:"PDF, image, scan"},
                {n:"2",t:"AI extracts fields",s:"Supplier, GSTIN, tax breakdown"},
                {n:"3",t:"Review & edit",s:"Catch any low-confidence fields"},
                {n:"4",t:"Push to GSTR-1",s:"One click — auto-fill outward supplies"},
              ].map((s,i)=>(
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-ey-yellow rounded-lg flex items-center justify-center text-ey-navy text-sm font-bold flex-shrink-0">{s.n}</div>
                  <div>
                    <div className="text-sm font-medium text-ey-charcoal">{s.t}</div>
                    <div className="text-xs text-ey-gray-dark mt-0.5">{s.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* sample files for demo */}
          <div className="bg-ey-yellow-pale border border-yellow-200 rounded-xl p-4 mt-4">
            <p className="text-xs text-ey-charcoal">
              <strong>💡 Demo tip:</strong> Drop any file to simulate extraction. The AI will generate realistic invoice data based on your existing supplier patterns.
            </p>
          </div>
        </>
      )}

      {(stage === "uploading" || stage === "extracting") && (
        <div className="bg-white rounded-2xl border border-ey-gray-mid p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-3xl">📄</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ey-charcoal">{filename}</div>
              <div className="text-xs text-ey-gray-dark">{(fileSize/1024).toFixed(1)} KB</div>
            </div>
            <button onClick={reset} className="text-xs text-ey-gray-dark hover:text-red-600">Cancel</button>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-ey-gray-dark mb-2">
              <span>AI extracting fields…</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="h-2 bg-ey-gray-mid rounded-full overflow-hidden">
              <div className="h-full bg-ey-yellow transition-all duration-300" style={{width:`${progress}%`}}/>
            </div>
          </div>

          <div className="space-y-2 mt-6">
            {[
              {pct:20, label:"OCR text recognition"},
              {pct:45, label:"Identifying invoice fields"},
              {pct:70, label:"Validating GSTIN format"},
              {pct:90, label:"Cross-checking with vendor master"},
            ].map((s,i)=>(
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={progress >= s.pct ? "text-green-600" : "text-ey-gray-dark"}>
                  {progress >= s.pct ? "✓" : "○"}
                </span>
                <span className={progress >= s.pct ? "text-ey-charcoal" : "text-ey-gray-dark"}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stage === "done" && extracted && (
        <ExtractedReview data={extracted} aiSource={aiSource} onPush={pushToGSTR1} onCancel={reset}/>
      )}
    </div>
  );
};

function ExtractedReview({data, aiSource, onPush, onCancel}){
  const [edited, setEdited] = useStateF(data);
  function update(field, val){ setEdited(e => ({...e, [field]: val})); }
  const conf = edited.confidence || 92;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-ey-gray-mid overflow-hidden mb-4">
        <div className="bg-green-50 border-b border-green-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">✓</div>
            <div>
              <div className="text-sm font-semibold text-green-900">Extraction complete</div>
              <div className="text-xs text-green-700">
                Confidence: {conf}% • Source: {aiSource === "claude" ? "Claude AI" : "Smart fallback"}
              </div>
            </div>
          </div>
          <button onClick={onCancel} className="text-xs text-ey-gray-dark hover:text-ey-charcoal">Start over</button>
        </div>

        <div className="p-6">
          <h4 className="text-sm font-semibold text-ey-charcoal mb-4">Review extracted fields</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField label="Supplier"       value={edited.supplier}     onChange={(v)=>update("supplier",v)} conf={conf}/>
            <FormField label="GSTIN"          value={edited.gstin}        onChange={(v)=>update("gstin",v)} mono conf={Math.min(conf+3,100)}/>
            <FormField label="Invoice no."    value={edited.invoiceNo}    onChange={(v)=>update("invoiceNo",v)} mono conf={conf}/>
            <FormField label="Invoice date"   value={edited.invoiceDate}  onChange={(v)=>update("invoiceDate",v)} conf={conf}/>
            <FormField label="Place of supply" value={edited.placeOfSupply} onChange={(v)=>update("placeOfSupply",v)} conf={conf-5}/>
            <FormField label="HSN code"       value={edited.hsn}          onChange={(v)=>update("hsn",v)} mono conf={conf-8}/>
          </div>

          <div className="mt-6 pt-6 border-t border-ey-gray-mid">
            <h5 className="text-xs font-semibold text-ey-gray-dark uppercase tracking-wide mb-3">Tax breakdown</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <TaxField label="Taxable value" value={edited.taxableValue} onChange={(v)=>update("taxableValue",v)}/>
              <TaxField label="IGST"          value={edited.igst}         onChange={(v)=>update("igst",v)}/>
              <TaxField label="CGST"          value={edited.cgst}         onChange={(v)=>update("cgst",v)}/>
              <TaxField label="SGST"          value={edited.sgst}         onChange={(v)=>update("sgst",v)}/>
            </div>
            <div className="mt-3 flex items-center justify-between bg-ey-yellow-pale border border-yellow-200 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-ey-charcoal">Invoice total</span>
              <span className="text-lg font-bold font-mono text-ey-charcoal">{fmt(edited.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onPush}
          className="flex-1 bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy font-semibold py-3 rounded-xl text-sm">
          ✓ Push to GSTR-1 (Apr 2024)
        </button>
        <button onClick={onCancel}
          className="px-6 border border-ey-gray-mid text-ey-charcoal py-3 rounded-xl text-sm hover:bg-ey-gray">
          Discard
        </button>
      </div>
    </div>
  );
}

function FormField({label, value, onChange, mono, conf=95}){
  const low = conf < 85;
  return (
    <div>
      <label className="text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide flex items-center gap-2">
        {label}
        {low && <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full">Verify</span>}
      </label>
      <input
        value={value || ""} onChange={(e)=>onChange(e.target.value)}
        className={`mt-1 w-full border ${low?"border-amber-300 bg-amber-50":"border-ey-gray-mid"} rounded-lg px-3 py-2 text-sm ${mono?"font-mono":""} text-ey-charcoal`}
      />
    </div>
  );
}

function TaxField({label, value, onChange}){
  return (
    <div>
      <label className="text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide">{label}</label>
      <div className="mt-1 flex items-center border border-ey-gray-mid rounded-lg overflow-hidden">
        <span className="px-2 text-xs text-ey-gray-dark bg-ey-gray">₹</span>
        <input
          type="number" value={value || 0} onChange={(e)=>onChange(Number(e.target.value))}
          className="flex-1 px-2 py-2 text-sm font-mono text-ey-charcoal"
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   FEATURE 2 — "WHY?" EXPLAINER
   Universal small component — wrap any number to get AI explanation
   Usage:
     <WhyExplainer label="ITC Balance" value="₹1.12L" context="..."/>
────────────────────────────────────────────────────────── */
window.WhyExplainer = function WhyExplainer({label, value, context, children}){
  const [open, setOpen] = useStateF(false);
  const [explanation, setExplanation] = useStateF("");
  const [loading, setLoading] = useStateF(false);
  const [source, setSource] = useStateF("local");
  const popoverRef = useRefF(null);

  useEffectF(() => {
    function onClickOut(e){
      if(popoverRef.current && !popoverRef.current.contains(e.target)){
        setOpen(false);
      }
    }
    if(open) document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, [open]);

  async function explain(){
    if(explanation) return; // already loaded
    setLoading(true);
    const prompt = `Explain in 2-3 short sentences why "${label}" is "${value}" for our GST data. ${context || ""}\n\nBe specific — reference actual transactions, dates or amounts. Use Indian number format (₹1,97,500). No fluff. Just the explanation, no preamble.`;
    const result = await callFeatureAI(prompt);
    if(result.text){
      setExplanation(result.text);
      setSource(result.source);
    } else {
      /* sensible fallback per label */
      const fallbacks = {
        "ITC Balance": "₹1.12L is the Apr 2024 closing balance after offsetting ₹1.80L of GSTR-3B liability and a ₹8,400 Rule 42 reversal. The drop from ₹2.85L (Feb close) reflects higher liability claims this month.",
        "Tax Paid": "₹10.70L is the cumulative net GST for the selected period — gross liability of ₹13.92L offset against ₹3.22L of available ITC. Mar contributed ₹3.31L (+13.2% MoM).",
        "Filed": "4 of 7 returns Filed = 57% completion. Outstanding: 1 Draft (GSTR-4 Mar), 1 Error (GSTR-3B Feb mismatch), 1 Processing (GSTR-2B Mar pending portal sync).",
        "Pending / Error": "1 return needs attention: GSTR-3B Feb 2024 has a ₹2.15L turnover mismatch with GSTR-1. Resolve before next 3B filing.",
        "AI Score": "87/100 — strong but not perfect. Deductions: −5 GSTR-3B Feb Error unresolved, −3 GSTR-4 Mar still Draft, −3 CMP-08 late filing history.",
      };
      setExplanation(fallbacks[label] || `${value} reflects the current calculation for ${label} based on filed returns, IMS records and ledger entries. Open AI Insights for a deeper analysis.`);
      setSource("local");
    }
    setLoading(false);
  }

  return (
    <span className="relative inline-flex items-center" ref={popoverRef}>
      {children}
      <button
        onClick={(e)=>{e.stopPropagation();setOpen(!open); if(!open) explain();}}
        className="ml-1.5 w-4 h-4 rounded-full bg-ey-gray hover:bg-ey-yellow text-ey-gray-dark hover:text-ey-navy text-[10px] font-bold flex items-center justify-center transition-colors"
        title={`Why is ${label} ${value}?`}
      >?</button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-ey-navy text-white rounded-xl shadow-2xl border border-ey-navy-mid overflow-hidden">
          <div className="px-4 py-3 border-b border-ey-navy-mid flex items-center gap-2">
            <div className="w-6 h-6 bg-ey-yellow rounded-md flex items-center justify-center text-ey-navy text-[10px] font-bold">AI</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">Why is {label} {value}?</div>
              {source === "claude" && !loading && <div className="text-[10px] text-green-400">Claude • live</div>}
              {source === "local" && !loading && <div className="text-[10px] text-yellow-400">Smart fallback</div>}
            </div>
            <button onClick={()=>setOpen(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
          </div>
          <div className="px-4 py-3 text-xs leading-relaxed text-gray-100 max-h-56 overflow-y-auto" style={{whiteSpace:"pre-wrap"}}>
            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <span className="inline-block w-1.5 h-1.5 bg-ey-yellow rounded-full animate-pulse"/>
                <span className="inline-block w-1.5 h-1.5 bg-ey-yellow rounded-full animate-pulse" style={{animationDelay:"0.2s"}}/>
                <span className="inline-block w-1.5 h-1.5 bg-ey-yellow rounded-full animate-pulse" style={{animationDelay:"0.4s"}}/>
                <span className="text-gray-400 ml-1">Analysing the number…</span>
              </div>
            ) : explanation}
          </div>
        </div>
      )}
    </span>
  );
};

/* ──────────────────────────────────────────────────────────
   FEATURE 3 — RECONCILIATION ENGINE
   3-way: Books vs GSTR-2A vs GSTR-2B
   AI highlights mismatches with severity
────────────────────────────────────────────────────────── */
window.ReconcilePage = function ReconcilePage({goNav, period}){
  const [aiInsight, setAiInsight] = useStateF(null);
  const [loading, setLoading] = useStateF(false);
  const [filter, setFilter] = useStateF("all"); /* all | mismatch | match */

  /* mock 3-way data — derives from your existing IMS data */
  const rows = useMemoF(() => {
    return IMS.filter(i => i.period === "Mar 2024" || i.period === "Apr 2024").map((s,idx) => {
      const books = s.itc + (idx % 3 === 0 ? -2200 : idx % 3 === 1 ? 4500 : 0);
      const r2a   = s.itc;
      const r2b   = s.itc + (idx % 4 === 0 ? -3100 : 0);
      const diff  = Math.max(Math.abs(books-r2a), Math.abs(books-r2b), Math.abs(r2a-r2b));
      let severity = "match";
      if(diff > 4000) severity = "high";
      else if(diff > 1000) severity = "medium";
      else if(diff > 0) severity = "low";
      return {id:s.id, supplier:s.supplier, gstin:s.gstin, period:s.period, books, r2a, r2b, diff, severity};
    });
  }, []);

  const filtered = filter === "all" ? rows : filter === "mismatch" ? rows.filter(r => r.severity !== "match") : rows.filter(r => r.severity === "match");

  const totals = useMemoF(() => ({
    books: rows.reduce((s,r)=>s+r.books,0),
    r2a:   rows.reduce((s,r)=>s+r.r2a,0),
    r2b:   rows.reduce((s,r)=>s+r.r2b,0),
    mismatches: rows.filter(r=>r.severity !== "match").length,
    atRisk: rows.filter(r=>r.severity === "high").reduce((s,r)=>s+r.diff,0),
  }), [rows]);

  async function runAIAnalysis(){
    setLoading(true);
    const data = filtered.map(r => `${r.supplier} (${r.gstin}, ${r.period}): Books ₹${r.books.toLocaleString('en-IN')}, 2A ₹${r.r2a.toLocaleString('en-IN')}, 2B ₹${r.r2b.toLocaleString('en-IN')}, diff ₹${r.diff.toLocaleString('en-IN')}, severity ${r.severity}`).join("\n");
    const prompt = `You are reviewing a 3-way GST reconciliation. Compare books vs GSTR-2A vs GSTR-2B for these suppliers:\n\n${data}\n\nIdentify the top 3 issues. Be specific — name suppliers, amounts. Recommend exact action (e.g., "raise debit note to TechParts for ₹2,200" not "fix mismatch"). Keep it under 150 words. Use bullet format with bold supplier names.`;

    const result = await callFeatureAI(prompt);
    if(result.text){
      setAiInsight({source:"claude", text: result.text});
    }else{
      setAiInsight({source:"local", text:
`**Top 3 reconciliation issues**

• **TechParts India Ltd** (Mar 2024) — Books shows ₹2,200 less than 2A. Likely missed credit note from supplier. Request copy and amend books.

• **Mumbai Logistics Co** (Mar 2024) — 2B is ₹3,100 short of 2A. Supplier hasn't filed GSTR-1 yet. Follow up before 11 May to claim ITC in Apr 3B.

• **Bharat Steel Corp** (Apr 2024) — Books +₹4,500 vs 2A. Either invoice missing in 2A (supplier delay) or duplicate booking. Reconcile invoice register.`
      });
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        title="3-Way Reconciliation"
        subtitle="Books vs GSTR-2A vs GSTR-2B — AI catches mismatches before you do"
        badge="Critical"
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <StatCard label="Books ITC"      value={fmt(totals.books)} sub="Recorded"/>
        <StatCard label="GSTR-2A ITC"    value={fmt(totals.r2a)} sub="Supplier-reported"/>
        <StatCard label="GSTR-2B ITC"    value={fmt(totals.r2b)} sub="Auto-drafted"/>
        <StatCard label="Mismatches"     value={totals.mismatches} sub="Need action" accent="bg-amber-500"/>
        <StatCard label="ITC at risk"    value={fmt(totals.atRisk)} sub="High severity" accent="bg-red-500"/>
      </div>

      {/* AI insight banner */}
      <div className="bg-white rounded-xl border border-ey-gray-mid p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-ey-navy rounded-lg flex items-center justify-center text-ey-yellow text-xs font-bold flex-shrink-0">AI</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-ey-charcoal">AI mismatch analysis</h3>
              {aiInsight && <span className={`text-[10px] px-2 py-0.5 rounded-full ${aiInsight.source==="claude"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-800"}`}>
                {aiInsight.source === "claude" ? "Claude AI" : "Smart fallback"}
              </span>}
            </div>
            {!aiInsight && !loading && (
              <div>
                <p className="text-sm text-ey-gray-dark mb-3">Click below to have AI analyse the mismatches and recommend specific actions for each supplier.</p>
                <button onClick={runAIAnalysis}
                  className="bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy text-xs font-semibold px-4 py-2 rounded-lg">
                  ✦ Run AI analysis
                </button>
              </div>
            )}
            {loading && (
              <div className="text-xs text-ey-gray-dark flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-ey-yellow rounded-full animate-pulse"/>
                <span className="inline-block w-1.5 h-1.5 bg-ey-yellow rounded-full animate-pulse" style={{animationDelay:"0.2s"}}/>
                <span className="inline-block w-1.5 h-1.5 bg-ey-yellow rounded-full animate-pulse" style={{animationDelay:"0.4s"}}/>
                <span className="ml-1">Analysing mismatches…</span>
              </div>
            )}
            {aiInsight && (
              <div className="text-sm text-ey-charcoal leading-relaxed bg-ey-yellow-pale border border-yellow-200 rounded-lg p-3" style={{whiteSpace:"pre-wrap"}}
                dangerouslySetInnerHTML={{__html: aiInsight.text.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>
            )}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-3">
        {[{v:"all",l:"All",c:rows.length},{v:"mismatch",l:"Mismatches",c:rows.filter(r=>r.severity!=="match").length},{v:"match",l:"Matched",c:rows.filter(r=>r.severity==="match").length}].map(t => (
          <button key={t.v} onClick={()=>setFilter(t.v)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter===t.v?"bg-ey-navy text-ey-yellow":"bg-white border border-ey-gray-mid text-ey-gray-dark hover:bg-ey-gray"}`}>
            {t.l} • {t.c}
          </button>
        ))}
      </div>

      {/* Reconcile table */}
      <div className="bg-white rounded-xl border border-ey-gray-mid overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{borderCollapse:"collapse"}}>
            <thead>
              <tr className="bg-ey-gray">
                {["Supplier","Period","Books","GSTR-2A","GSTR-2B","Difference","Severity","Action"].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-ey-gray-dark uppercase tracking-wide border-b border-ey-gray-mid">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className={`border-b border-ey-gray-mid hover:bg-ey-yellow-pale transition-colors ${r.severity==="high"?"bg-red-50/40":r.severity==="medium"?"bg-amber-50/40":""}`}>
                  <td className="px-4 py-3">
                    <div className="text-xs font-semibold text-ey-charcoal">{r.supplier}</div>
                    <div className="text-[10px] font-mono text-ey-gray-dark">{r.gstin}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.period}</td>
                  <td className="px-4 py-3 text-xs font-mono">{fmt(r.books)}</td>
                  <td className="px-4 py-3 text-xs font-mono">{fmt(r.r2a)}</td>
                  <td className="px-4 py-3 text-xs font-mono">{fmt(r.r2b)}</td>
                  <td className="px-4 py-3 text-xs font-mono font-semibold">
                    {r.diff > 0 ? <span className="text-red-700">±{fmt(r.diff)}</span> : <span className="text-green-700">₹0</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.severity === "high"   && <span className="badge bg-red-100 text-red-800">High</span>}
                    {r.severity === "medium" && <span className="badge bg-amber-100 text-amber-800">Medium</span>}
                    {r.severity === "low"    && <span className="badge bg-yellow-100 text-yellow-700">Low</span>}
                    {r.severity === "match"  && <span className="badge bg-green-100 text-green-800">Matched ✓</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.severity !== "match" ? (
                      <button onClick={()=>alert(`Action workflow for ${r.supplier}:\n• Email supplier requesting correction\n• Update books with reference\n• Mark for next 2A reconciliation`)}
                        className="text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-100">
                        Resolve →
                      </button>
                    ) : <span className="text-xs text-ey-gray-dark">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-xs text-ey-gray-dark">No rows match filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   FEATURE 4 — NOTICE RESPONSE DRAFTER
   Paste notice → AI drafts structured reply with section refs
────────────────────────────────────────────────────────── */
window.NoticeDrafterPage = function NoticeDrafterPage({goNav}){
  const [notice, setNotice]     = useStateF("");
  const [draft, setDraft]       = useStateF("");
  const [analysis, setAnalysis] = useStateF(null);
  const [loading, setLoading]   = useStateF(false);
  const [source, setSource]     = useStateF("local");

  const SAMPLE = `GSTIN: 27AABCU9603R1ZX
Notice ref: GST/MUM/2024-25/0418

Subject: Discrepancy in ITC claimed in GSTR-3B vs GSTR-2B for period Feb 2024

This is to inform you that on verification of returns filed by your company for the tax period February 2024, a difference of ₹2,15,000 has been observed between ITC claimed in GSTR-3B (₹3,42,800) and ITC reflected in GSTR-2B (₹1,27,800).

You are hereby requested to:
1. Explain the reason for the discrepancy
2. Submit supporting documents within 15 days
3. Reverse excess ITC claimed if applicable, along with interest under Section 50

Failure to respond may result in proceedings under Section 73 of the CGST Act, 2017.

Issued: 22 Apr 2024
Officer: A. Patel, Asst. Commissioner`;

  async function draftReply(){
    if(!notice.trim()) return;
    setLoading(true); setDraft(""); setAnalysis(null);

    const prompt = `You are drafting a formal reply to a GST notice from the GST Department on behalf of Acme Enterprises Pvt. Ltd. (GSTIN 27AABCU9603R1ZX).

NOTICE TEXT:
${notice}

OUR COMPANY DATA (for reference):
- GSTR-3B Feb 2024: Filed with Error status, ₹2.15L mismatch flagged
- GSTR-1 Feb 2024: Filed normally, taxable ₹16.25L, tax ₹2.92L
- GSTR-2B Feb 2024: Filed, ITC ₹1.46L
- Supplier IMS pending: TechParts (4 invoices), Mumbai Logistics (5 invoices) — may explain part of the gap
- Mismatch is likely from supplier invoices not appearing in 2B yet

Generate TWO outputs separated by "===":

PART 1 — Brief analysis of the notice (3 bullets max):
- What's being asked
- Likely root cause based on our data
- Risk level (Low/Medium/High) and timeline

===

PART 2 — Formal reply letter (200-300 words) addressed to the Officer:
- Professional formal tone
- Reference the notice number
- Explain reason for discrepancy citing specific supplier issues
- Quote relevant CGST sections (Section 16, Rule 36(4), Section 73)
- Request 30-day extension if needed
- Commit to submitting reconciliation documents
- Sign off as "Authorized Signatory, Acme Enterprises Pvt. Ltd."`;

    const result = await callFeatureAI(prompt);

    if(result.text){
      const parts = result.text.split(/===\s*/);
      setAnalysis(parts[0] || "");
      setDraft(parts[1] || result.text);
      setSource(result.source);
    } else {
      /* fallback */
      setSource("local");
      setAnalysis(`**Notice analysis**

• **What's asked:** Explain ₹2.15L gap between GSTR-3B Feb ITC (₹3.42L claimed) and GSTR-2B (₹1.27L reflected). Submit docs in 15 days or risk Section 73 proceedings.

• **Likely root cause:** Supplier invoices yet to appear in 2B — TechParts (4 invoices, ~₹1.45L) and Mumbai Logistics (5 invoices, ~₹62K) are pending in IMS. This explains most of the gap legitimately.

• **Risk level: MEDIUM** — Genuine timing difference, not excess claim. Respond within 15 days with reconciliation statement. Likely no penalty if documented properly.`);

      setDraft(`To,
The Assistant Commissioner
GST Department, Mumbai
Reference: GST/MUM/2024-25/0418

Subject: Reply to notice regarding ITC discrepancy in GSTR-3B vs GSTR-2B for Feb 2024

Sir/Madam,

With reference to your notice dated 22 Apr 2024 regarding the discrepancy of ₹2,15,000 between Input Tax Credit claimed in GSTR-3B and reflected in GSTR-2B for the tax period February 2024, we respectfully submit the following:

1. The said difference arises from invoices that were genuinely received and accounted for in our books during February 2024, but the corresponding supplier filings (GSTR-1) were delayed, causing the credit to appear in subsequent months' 2B.

2. As per Section 16(2) and Rule 36(4) of the CGST Act/Rules, we have claimed ITC against documents in our possession with valid tax invoices and reasonable belief of supplier compliance.

3. We are reconciling the gap with our suppliers — primarily TechParts India Ltd (Inv 4 nos.) and Mumbai Logistics Co (Inv 5 nos.) — and the credit has subsequently reflected in March 2B.

4. We respectfully request a 30-day extension to submit complete reconciliation statements along with supplier confirmations and copies of all underlying invoices.

5. We commit to reversing any portion of ITC that cannot be substantiated, along with interest under Section 50, if applicable.

We trust the above clarifies the position. Should you require any further information, please feel free to contact the undersigned.

Thanking you,

Yours faithfully,

For Acme Enterprises Pvt. Ltd.

Authorized Signatory
Date: ${new Date().toLocaleDateString("en-IN")}
Place: Mumbai`);
    }
    setLoading(false);
  }

  function exportPDF(){
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(draft, 180);
    doc.text(lines, 15, 20);
    doc.save(`GST_Reply_${Date.now()}.pdf`);
  }

  function copyDraft(){
    navigator.clipboard.writeText(draft);
    alert("Draft copied to clipboard");
  }

  return (
    <div>
      <PageHeader
        title="Notice Response Drafter"
        subtitle="Paste any GST notice. AI drafts a formal reply with section references."
        badge="Saves 2-3 hours"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: notice input */}
        <div className="bg-white rounded-2xl border border-ey-gray-mid p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ey-charcoal">📥 Paste notice text</h3>
            <button onClick={()=>setNotice(SAMPLE)}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-100">
              ✦ Use sample notice
            </button>
          </div>
          <textarea
            value={notice} onChange={(e)=>setNotice(e.target.value)}
            placeholder="Paste the full notice text here — including reference number, period, issue and any specific demands..."
            className="w-full h-72 border border-ey-gray-mid rounded-xl p-4 text-sm font-mono text-ey-charcoal resize-none"
          />
          <button onClick={draftReply} disabled={!notice.trim() || loading}
            className="mt-4 w-full bg-ey-yellow hover:bg-ey-yellow-dark disabled:opacity-40 text-ey-navy font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            {loading ? <>
              <span className="inline-block w-1.5 h-1.5 bg-ey-navy rounded-full animate-pulse"/>
              <span className="inline-block w-1.5 h-1.5 bg-ey-navy rounded-full animate-pulse" style={{animationDelay:"0.2s"}}/>
              <span className="inline-block w-1.5 h-1.5 bg-ey-navy rounded-full animate-pulse" style={{animationDelay:"0.4s"}}/>
              <span className="ml-1">AI is drafting your reply…</span>
            </> : <>✦ Generate AI reply</>}
          </button>
        </div>

        {/* Right: draft output */}
        <div className="bg-white rounded-2xl border border-ey-gray-mid p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ey-charcoal">📤 AI-drafted reply</h3>
            {draft && <span className={`text-[10px] px-2 py-0.5 rounded-full ${source==="claude"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-800"}`}>
              {source === "claude" ? "Claude AI" : "Smart fallback"}
            </span>}
          </div>

          {!draft && !loading && (
            <div className="h-72 border border-dashed border-ey-gray-mid rounded-xl flex items-center justify-center p-6 text-center">
              <div>
                <div className="text-3xl mb-2 opacity-40">✦</div>
                <p className="text-sm text-ey-gray-dark">Paste a notice and click Generate.<br/>AI will analyse it and draft a formal reply with section references.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-72 border border-ey-gray-mid rounded-xl flex items-center justify-center p-6">
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center mb-3">
                  <span className="inline-block w-2 h-2 bg-ey-yellow rounded-full animate-pulse"/>
                  <span className="inline-block w-2 h-2 bg-ey-yellow rounded-full animate-pulse" style={{animationDelay:"0.2s"}}/>
                  <span className="inline-block w-2 h-2 bg-ey-yellow rounded-full animate-pulse" style={{animationDelay:"0.4s"}}/>
                </div>
                <p className="text-xs text-ey-gray-dark">Analysing notice • Drafting reply • Citing sections…</p>
              </div>
            </div>
          )}

          {draft && (
            <>
              {analysis && (
                <div className="bg-ey-yellow-pale border border-yellow-200 rounded-xl p-4 mb-3 text-xs text-ey-charcoal leading-relaxed"
                  style={{whiteSpace:"pre-wrap"}}
                  dangerouslySetInnerHTML={{__html: analysis.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>
              )}
              <textarea value={draft} onChange={(e)=>setDraft(e.target.value)}
                className="w-full h-72 border border-ey-gray-mid rounded-xl p-4 text-xs font-mono text-ey-charcoal resize-none leading-relaxed"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={copyDraft}
                  className="flex-1 border border-ey-gray-mid hover:bg-ey-gray text-ey-charcoal text-xs font-semibold py-2 rounded-lg">
                  📋 Copy
                </button>
                <button onClick={exportPDF}
                  className="flex-1 bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy text-xs font-semibold py-2 rounded-lg">
                  📄 Export PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   SHARED — small UI primitives used across the new features
────────────────────────────────────────────────────────── */
function PageHeader({title, subtitle, badge}){
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-semibold text-ey-charcoal">{title}</h2>
        {badge && <span className="text-[10px] bg-ey-yellow text-ey-navy font-bold px-2 py-0.5 rounded uppercase tracking-wider">{badge}</span>}
      </div>
      <p className="text-sm text-ey-gray-dark">{subtitle}</p>
    </div>
  );
}

/* Note: StatCard, fmt, badge styles are reused from your existing helpers.jsx */
