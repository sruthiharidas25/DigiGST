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
        {supplier:"Client 1",gstin:"29AABCT1234A1Z5",invoiceNo:"TP/2024/0428",invoiceDate:"18 Apr 2024",taxableValue:184500,igst:33210,cgst:0,sgst:0,total:217710,placeOfSupply:"Karnataka",hsn:"84818090",confidence:96},
        {supplier:"Client 2",gstin:"24AABCB5678B1Z3",invoiceNo:"BSC-1142",invoiceDate:"22 Apr 2024",taxableValue:92800,igst:0,cgst:8352,sgst:8352,total:109504,placeOfSupply:"Maharashtra",hsn:"72142000",confidence:94},
        {supplier:"Client 3",gstin:"27AABCM9012C1Z1",invoiceNo:"ML-INV-2024-7821",invoiceDate:"15 Apr 2024",taxableValue:48200,igst:0,cgst:4338,sgst:4338,total:56876,placeOfSupply:"Maharashtra",hsn:"99680000",confidence:91},
      ];
      data = samples[Math.floor(Math.random()*samples.length)];
      setAiSource("local");
    }

    setProgress(100);
    await new Promise(r => setTimeout(r, 300));

    /* DUPLICATE DETECTION — simulate matching against existing purchase register.
       For demo: every ~3rd extraction is flagged as a duplicate.
       In production, this would query the live inward register by (GSTIN + invoiceNo). */
    const dupCounter = (window.__docExtractCount = (window.__docExtractCount || 0) + 1);
    const isDuplicate = dupCounter % 3 === 0;
    if(isDuplicate){
      data = {
        ...data,
        originalInvoiceNo: data.invoiceNo,
        invoiceNo: data.invoiceNo + "A",
        isDuplicate: true,
        duplicateNote: "A duplicate line is detected"
      };
    }

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

  function pushToPurchaseRegister(){
    const dupNote = extracted.isDuplicate
      ? `\n\n⚠ Duplicate line detected — suffix 'A' applied to invoice no. (${extracted.invoiceNo}). Please verify manually in IMS.`
      : "";
    alert(`✓ Invoice ${extracted.invoiceNo} pushed to Purchase Register (Apr 2024).\nGSTIN ${extracted.gstin} added to inward supplies.${dupNote}`);
    reset();
    goNav && goNav("imsreport");
  }

  return (
    <div>
      <PageHeader
        title="Document Extract"
        subtitle="Drop purchase invoice. AI extracts fields. One click to push to Purchase Register."
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
                {n:"4",t:"Push to Purchase Register",s:"One click — auto-fill inward supplies"},
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
        <ExtractedReview data={extracted} aiSource={aiSource} onPush={pushToPurchaseRegister} onCancel={reset}/>
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
          {edited.isDuplicate && (
            <div className="mb-5 bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0">⚠</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-amber-900 mb-1">
                    A duplicate line is detected
                  </div>
                  <div className="text-xs text-amber-800 leading-relaxed">
                    An invoice with the same supplier + invoice number already exists in the inward register.
                    Suffix <span className="font-mono font-bold bg-amber-200 px-1 rounded">'A'</span> has been appended
                    ({edited.originalInvoiceNo} → <span className="font-mono font-bold">{edited.invoiceNo}</span>) so the document can still be uploaded.
                    Please verify the match manually in IMS after upload.
                  </div>
                </div>
              </div>
            </div>
          )}

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
          ✓ Push to Purchase Register (Apr 2024)
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

  /* mock 3-way data — derives from your existing IMS data.
     Duplicate detection: when the same supplier+invoice number appears twice in the
     inward register, we suffix the second one with 'A' so the upload doesn't fail,
     and flag it in the Comment column for manual matching. */
  const rows = useMemoF(() => {
    const seen = {}; // key: supplier+baseInvNo
    return IMS.filter(i => i.period === "Mar 2024" || i.period === "Apr 2024").map((s,idx) => {
      const books = s.itc + (idx % 3 === 0 ? -2200 : idx % 3 === 1 ? 4500 : 0);
      const r2a   = s.itc;
      const r2b   = s.itc + (idx % 4 === 0 ? -3100 : 0);
      const diff  = Math.max(Math.abs(books-r2a), Math.abs(books-r2b), Math.abs(r2a-r2b));
      let severity = "match";
      if(diff > 4000) severity = "high";
      else if(diff > 1000) severity = "medium";
      else if(diff > 0) severity = "low";

      /* generate a base invoice number for this supplier+period combo */
      const baseInv = `INV/${s.gstin.slice(0,4)}/${100 + idx}`;
      const seenKey = `${s.gstin}|${baseInv}`;
      const isDuplicate = seen[seenKey] >= 1;
      seen[seenKey] = (seen[seenKey] || 0) + 1;
      const invNo = isDuplicate ? baseInv + "A" : baseInv;

      /* every 5th row simulates a duplicate to make demo visible */
      const forceDup = idx > 0 && idx % 5 === 0;
      const finalIsDup = isDuplicate || forceDup;
      const finalInvNo = forceDup && !isDuplicate ? baseInv + "A" : invNo;

      let comment = "—";
      if(finalIsDup) comment = "A duplicate line is detected";
      else if(severity === "high")   comment = "Significant ITC variance — review urgently";
      else if(severity === "medium") comment = "Vendor filing delay or credit note pending";
      else if(severity === "low")    comment = "Minor rounding diff — auto-reconcile";

      return {
        id:s.id, supplier:s.supplier, gstin:s.gstin, period:s.period,
        invoiceNo: finalInvNo, isDuplicate: finalIsDup,
        books, r2a, r2b, diff, severity, comment
      };
    });
  }, []);

  const filtered = useMemoF(() => {
    if(filter === "all")       return rows;
    if(filter === "mismatch")  return rows.filter(r => r.severity !== "match");
    if(filter === "duplicate") return rows.filter(r => r.isDuplicate);
    return rows.filter(r => r.severity === "match");
  }, [filter, rows]);

  const totals = useMemoF(() => ({
    books: rows.reduce((s,r)=>s+r.books,0),
    r2a:   rows.reduce((s,r)=>s+r.r2a,0),
    r2b:   rows.reduce((s,r)=>s+r.r2b,0),
    mismatches: rows.filter(r=>r.severity !== "match").length,
    atRisk: rows.filter(r=>r.severity === "high").reduce((s,r)=>s+r.diff,0),
    duplicates: rows.filter(r=>r.isDuplicate).length,
  }), [rows]);

  async function runAIAnalysis(){
    setLoading(true);
    const data = filtered.map(r => `${r.supplier} (${r.gstin}, ${r.period}): Books ₹${r.books.toLocaleString('en-IN')}, 2A ₹${r.r2a.toLocaleString('en-IN')}, 2B ₹${r.r2b.toLocaleString('en-IN')}, diff ₹${r.diff.toLocaleString('en-IN')}, severity ${r.severity}`).join("\n");
    const prompt = `You are reviewing a 3-way GST reconciliation. Compare books vs GSTR-2A vs GSTR-2B for these suppliers:\n\n${data}\n\nIdentify the top 3 issues. Be specific — name suppliers, amounts. Recommend exact action (e.g., "raise debit note to Client 1 for ₹2,200" not "fix mismatch"). Keep it under 150 words. Use bullet format with bold supplier names.`;

    const result = await callFeatureAI(prompt);
    if(result.text){
      setAiInsight({source:"claude", text: result.text});
    }else{
      setAiInsight({source:"local", text:
`**Top 3 reconciliation issues**

• **Client 1** (Mar 2024) — Books shows ₹2,200 less than 2A. Likely missed credit note from supplier. Request copy and amend books.

• **Client 3** (Mar 2024) — 2B is ₹3,100 short of 2A. Supplier hasn't filed GSTR-1 yet. Follow up before 11 May to claim ITC in Apr 3B.

• **Client 2** (Apr 2024) — Books +₹4,500 vs 2A. Either invoice missing in 2A (supplier delay) or duplicate booking. Reconcile invoice register.`
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <StatCard label="Books ITC"      value={fmt(totals.books)} sub="Recorded"/>
        <StatCard label="GSTR-2A ITC"    value={fmt(totals.r2a)} sub="Supplier-reported"/>
        <StatCard label="GSTR-2B ITC"    value={fmt(totals.r2b)} sub="Auto-drafted"/>
        <StatCard label="Mismatches"     value={totals.mismatches} sub="Need action" accent="bg-amber-500"/>
        <StatCard label="Duplicates"     value={totals.duplicates} sub="Suffix 'A' applied" accent="bg-orange-500"/>
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
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {[
          {v:"all",       l:"All",         c:rows.length},
          {v:"mismatch",  l:"Mismatches",  c:rows.filter(r=>r.severity!=="match").length},
          {v:"duplicate", l:"⚠ Duplicates",c:rows.filter(r=>r.isDuplicate).length},
          {v:"match",     l:"Matched",     c:rows.filter(r=>r.severity==="match").length},
        ].map(t => (
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
                {["Supplier","Invoice No.","Period","Books","GSTR-2A","GSTR-2B","Diff","Severity","Comment","Action"].map(h=>(
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide border-b border-ey-gray-mid whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={`${r.id}-${r.invoiceNo}`} className={`border-b border-ey-gray-mid hover:bg-ey-yellow-pale transition-colors ${r.isDuplicate?"bg-orange-50/60":r.severity==="high"?"bg-red-50/40":r.severity==="medium"?"bg-amber-50/40":""}`}>
                  <td className="px-3 py-3">
                    <div className="text-xs font-semibold text-ey-charcoal">{r.supplier}</div>
                    <div className="text-[10px] font-mono text-ey-gray-dark">{r.gstin}</div>
                  </td>
                  <td className="px-3 py-3 text-xs font-mono">
                    <span className={r.isDuplicate ? "text-orange-800 font-bold" : "text-ey-charcoal"}>
                      {r.invoiceNo}
                    </span>
                    {r.isDuplicate && <span className="ml-1 text-[9px] bg-orange-200 text-orange-900 px-1 py-0.5 rounded">+A</span>}
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap">{r.period}</td>
                  <td className="px-3 py-3 text-xs font-mono whitespace-nowrap">{fmt(r.books)}</td>
                  <td className="px-3 py-3 text-xs font-mono whitespace-nowrap">{fmt(r.r2a)}</td>
                  <td className="px-3 py-3 text-xs font-mono whitespace-nowrap">{fmt(r.r2b)}</td>
                  <td className="px-3 py-3 text-xs font-mono font-semibold whitespace-nowrap">
                    {r.diff > 0 ? <span className="text-red-700">±{fmt(r.diff)}</span> : <span className="text-green-700">₹0</span>}
                  </td>
                  <td className="px-3 py-3">
                    {r.severity === "high"   && <span className="badge bg-red-100 text-red-800">High</span>}
                    {r.severity === "medium" && <span className="badge bg-amber-100 text-amber-800">Medium</span>}
                    {r.severity === "low"    && <span className="badge bg-yellow-100 text-yellow-700">Low</span>}
                    {r.severity === "match"  && <span className="badge bg-green-100 text-green-800">Matched ✓</span>}
                  </td>
                  <td className="px-3 py-3 max-w-[220px]">
                    {r.isDuplicate ? (
                      <div className="flex items-start gap-1.5">
                        <span className="text-orange-600 text-sm flex-shrink-0">⚠</span>
                        <span className="text-[11px] text-orange-900 font-medium leading-tight">{r.comment}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-ey-gray-dark leading-tight">{r.comment}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {r.isDuplicate ? (
                      <button onClick={()=>alert(`Manual match required for ${r.supplier}\n\nDuplicate detected — invoice ${r.invoiceNo} was uploaded with suffix 'A' to avoid collision with existing entry.\n\nNext steps:\n• Open IMS for this supplier\n• Compare both invoice entries side-by-side\n• Mark one as final and reject/delete the other\n• Update books with the kept reference`)}
                        className="text-[11px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md border border-orange-200">
                        Match manually →
                      </button>
                    ) : r.severity !== "match" ? (
                      <button onClick={()=>alert(`Action workflow for ${r.supplier}:\n• Email supplier requesting correction\n• Update books with reference\n• Mark for next 2A reconciliation`)}
                        className="text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-100">
                        Resolve →
                      </button>
                    ) : <span className="text-xs text-ey-gray-dark">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-xs text-ey-gray-dark">No rows match filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        {totals.duplicates > 0 && (
          <div className="px-5 py-3 bg-orange-50 border-t border-orange-200 text-[11px] text-orange-900 flex items-start gap-2">
            <span className="text-sm flex-shrink-0">ℹ</span>
            <span>
              <strong>{totals.duplicates}</strong> duplicate line{totals.duplicates>1?"s":""} detected.
              Suffix <span className="font-mono font-bold bg-orange-200 px-1 rounded">'A'</span> has been auto-applied
              to allow upload. These rows must be matched manually in IMS before filing.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   FEATURE 4 — DRC-01B / DRC-01C REPLY DRAFTER
   Two GST forms with structured replies:
   - DRC-01B: GSTR-1 vs GSTR-3B liability mismatch
   - DRC-01C: GSTR-3B ITC > GSTR-2B ITC (excess ITC)
────────────────────────────────────────────────────────── */
window.NoticeDrafterPage = function NoticeDrafterPage({goNav}){
  const [formType, setFormType] = useStateF("DRC-01B");
  const [drcRef, setDrcRef]     = useStateF("");
  const [period, setPeriod]     = useStateF("Feb 2024");
  const [varianceAmt, setVarianceAmt] = useStateF(0);
  const [reasonCode, setReasonCode] = useStateF("");
  const [explanation, setExplanation] = useStateF("");
  const [paidPortion, setPaidPortion] = useStateF(0);
  const [draft, setDraft]       = useStateF("");
  const [analysis, setAnalysis] = useStateF(null);
  const [loading, setLoading]   = useStateF(false);
  const [source, setSource]     = useStateF("local");

  /* DRC-01B reason codes (Part B / Table B of the form) */
  const DRC01B_REASONS = [
    {code:"R1", label:"Liability paid in previous tax period via DRC-03"},
    {code:"R2", label:"Liability mistakenly declared in a different tax period"},
    {code:"R3", label:"Liability paid via subsequent GSTR-3B"},
    {code:"R4", label:"Difference due to amendment in GSTR-1 of subsequent period"},
    {code:"R5", label:"Difference on account of typographical / arithmetic error"},
    {code:"R6", label:"Other reasons — to be specified"},
  ];

  /* DRC-01C reason codes (excess ITC explanation) */
  const DRC01C_REASONS = [
    {code:"C1", label:"ITC reversed already in subsequent GSTR-3B"},
    {code:"C2", label:"Excess ITC paid via DRC-03 along with interest"},
    {code:"C3", label:"Supplier has filed GSTR-1 subsequently — ITC now reflects in 2B"},
    {code:"C4", label:"ITC pertains to RCM — not appearing in 2B by design"},
    {code:"C5", label:"ITC pertains to ISD distribution / import bill of entry"},
    {code:"C6", label:"Other reasons — to be specified"},
  ];

  const REASONS = formType === "DRC-01B" ? DRC01B_REASONS : DRC01C_REASONS;

  function loadSampleData(){
    if(formType === "DRC-01B"){
      setDrcRef("ZA2702240098765");
      setPeriod("Feb 2024");
      setVarianceAmt(215000);
      setReasonCode("R4");
      setExplanation("Two amendments were filed in GSTR-1 for March 2024 that correctly relate to Feb invoices — total ₹2,15,000 was originally declared in 3B Feb but the corresponding GSTR-1 line items were corrected in the next period's GSTR-1 amendment table.");
      setPaidPortion(0);
    } else {
      setDrcRef("ZB2702240054321");
      setPeriod("Feb 2024");
      setVarianceAmt(215000);
      setReasonCode("C3");
      setExplanation("The excess ITC of ₹2,15,000 relates to invoices from Client 1 (4 invoices, ~₹1,45,600) and Client 3 (5 invoices, ~₹62,300). Both suppliers filed their GSTR-1 returns late — these invoices have subsequently reflected in March 2B.");
      setPaidPortion(0);
    }
  }

  async function generateDraft(){
    if(!drcRef.trim() || !reasonCode || !explanation.trim()){
      alert("Please fill in DRC reference, select a reason code, and provide explanation.");
      return;
    }
    setLoading(true); setDraft(""); setAnalysis(null);

    const reasonObj = REASONS.find(r=>r.code===reasonCode);
    const formContext = formType === "DRC-01B"
      ? `DRC-01B is the intimation issued under Rule 88C when liability declared in GSTR-1 exceeds GSTR-3B by more than ₹25 lakh OR by more than 20%. The taxpayer must either (a) pay the differential along with interest using DRC-03 OR (b) explain the variance through Part B of DRC-01B.`
      : `DRC-01C is the intimation issued under Rule 88D when ITC claimed in GSTR-3B exceeds ITC available in GSTR-2B by more than ₹25 lakh OR by more than 20%. The taxpayer must either (a) pay/reverse the excess along with interest using DRC-03 OR (b) explain through Part B of DRC-01C.`;

    const prompt = `You are drafting a formal Part B reply to a ${formType} intimation under Rule ${formType==="DRC-01B"?"88C":"88D"} of the CGST Rules, 2017, on behalf of Company Name 1 (GSTIN 27AABCU9603R1ZX).

FORM CONTEXT: ${formContext}

INTIMATION DETAILS:
- Reference: ${drcRef}
- Tax period: ${period}
- Variance amount: ₹${varianceAmt.toLocaleString('en-IN')}
- Selected reason code: ${reasonCode} — ${reasonObj?.label}
- Amount paid via DRC-03 (if any): ₹${paidPortion.toLocaleString('en-IN')}
- Taxpayer's explanation: ${explanation}

OUR COMPANY DATA:
- GSTR-1 ${period}: Filed, taxable ₹16.25L, tax ₹2.92L
- GSTR-3B ${period}: Filed (Error status), ₹2.15L variance flagged
- GSTR-2B ${period}: Filed, ITC ₹1.46L
- Pending IMS: Client 1 (4 invoices), Client 3 (5 invoices)

Generate TWO outputs separated by "===":

PART 1 — Brief risk analysis (3 bullets):
- What the ${formType} demands
- Whether our chosen reason code (${reasonCode}) is appropriate
- Risk level (Low/Medium/High) and any payment exposure

===

PART 2 — Formal Part B reply (250-350 words) in the prescribed format:
Start with: "Reply to ${formType} — Reference ${drcRef}"
Include numbered paragraphs covering:
1. Acknowledgement of the intimation with reference + period
2. Statement of reason code selected (${reasonCode}) with the prescribed text
3. Detailed factual explanation using the taxpayer input above — cite specific invoices/dates
4. Reference the relevant CGST sections (Section 16, Section 39, Rule 36(4), Rule ${formType==="DRC-01B"?"88C":"88D"}, Section 50 for interest if applicable)
5. ${paidPortion>0 ? `Confirmation of ₹${paidPortion.toLocaleString('en-IN')} paid via DRC-03 with challan reference placeholder` : "Submission that no additional payment is required, with reasoning"}
6. Request for closure of intimation under Rule ${formType==="DRC-01B"?"88C":"88D"}
7. Sign-off: "Authorised Signatory, Company Name 1" with date and place

Tone: formal, factual, no rhetoric. Use precise GST terminology.`;

    const result = await callFeatureAI(prompt);

    if(result.text){
      const parts = result.text.split(/===\s*/);
      setAnalysis(parts[0] || "");
      setDraft(parts[1] || result.text);
      setSource(result.source);
    } else {
      setSource("local");
      generateLocalDraft(reasonObj);
    }
    setLoading(false);
  }

  function generateLocalDraft(reasonObj){
    const ruleNum = formType === "DRC-01B" ? "88C" : "88D";
    const formTitle = formType === "DRC-01B"
      ? "outward liability variance (GSTR-1 vs GSTR-3B)"
      : "excess input tax credit (GSTR-3B ITC vs GSTR-2B ITC)";

    setAnalysis(`**${formType} risk analysis**

• **What's demanded:** ${formType==="DRC-01B"?"Pay differential liability of ":"Reverse/pay excess ITC of "}₹${varianceAmt.toLocaleString('en-IN')} via DRC-03 OR submit Part B explanation within 7 days from intimation date under Rule ${ruleNum}.

• **Reason code ${reasonCode} (${reasonObj?.label}):** Appropriate for the described situation. ${formType==="DRC-01B" && reasonCode==="R4" ? "Subsequent-period amendments are a recognised, defensible reason." : reasonCode==="C3" ? "Supplier filing delay is the most common DRC-01C cause and is well-accepted by officers." : "Backed by underlying data."}

• **Risk level: ${paidPortion>0 ? "LOW" : varianceAmt>500000 ? "MEDIUM-HIGH" : "MEDIUM"}** — ${paidPortion>0 ? "Partial payment shows good faith. Intimation should close on Part B acceptance." : "No payment exposure if reasoning is accepted. If rejected, interest under Section 50 may apply on ₹"+varianceAmt.toLocaleString('en-IN')+" from due date of GSTR-3B."}`);

    setDraft(`Reply to ${formType} — Reference ${drcRef}
Tax Period: ${period}
GSTIN: 27AABCU9603R1ZX
Taxpayer: Company Name 1

To,
The Jurisdictional Officer
Office of the Asst. Commissioner of State Tax / CGST

PART B — TAXPAYER REPLY

1. We acknowledge receipt of the intimation in Form ${formType} bearing reference ${drcRef} dated as per portal, issued under Rule ${ruleNum} of the CGST Rules, 2017, in respect of ${formTitle} for the tax period ${period}, indicating a variance of ₹${varianceAmt.toLocaleString('en-IN')}.

2. We have examined the said variance with reference to our books of account, GSTR-1, GSTR-3B${formType==="DRC-01C"?" and GSTR-2B":""} for the period under reference. After due reconciliation, we hereby submit our reply selecting Reason Code ${reasonCode} — "${reasonObj?.label}".

3. Detailed explanation:

${explanation}

4. Statutory references in support of our position:
   • Section 16 of the CGST Act, 2017 — Conditions and eligibility for taking ITC
   • Section 39 — Furnishing of returns
   • Rule 36(4) — Restriction on availment of ITC
   • Rule ${ruleNum} — Manner of dealing with difference in ${formType==="DRC-01B"?"liability":"input tax credit"} between GSTR-1 / GSTR-3B${formType==="DRC-01C"?" / GSTR-2B":""}

${paidPortion > 0
  ? `5. In good faith and without prejudice, we have voluntarily paid an amount of ₹${paidPortion.toLocaleString('en-IN')} via Form DRC-03 against the variance. Challan reference: [DRC-03 CIN to be inserted]. The balance of ₹${(varianceAmt-paidPortion).toLocaleString('en-IN')} is supported by the explanation in para 3 above and does not warrant any further payment.`
  : `5. Based on the explanation in paragraph 3 above, we respectfully submit that no additional tax, interest or penalty is payable in respect of the variance highlighted in the intimation. The variance is fully reconciled by the cited reason code.`}

6. We respectfully request the Hon'ble Officer to take this Part B reply on record and treat the intimation in Form ${formType} (Reference ${drcRef}) as duly closed under sub-rule (3) of Rule ${ruleNum}.

7. Supporting documents — GSTR-1, GSTR-3B${formType==="DRC-01C"?", GSTR-2B":""} reconciliation statement, copies of relevant invoices, and supplier correspondence (where applicable) — are available for verification at our registered office and shall be furnished upon request.

We trust the above clarifies the matter. Should any further information be required, the undersigned may please be contacted.

Thanking you,

Yours faithfully,
For Company Name 1

[Authorised Signatory]
Name: User 1 — Tax Manager
Date: ${new Date().toLocaleDateString("en-IN")}
Place: Mumbai`);
  }

  function exportPDF(){
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(draft, 180);
    doc.text(lines, 15, 20);
    doc.save(`${formType}_Reply_${drcRef||"draft"}.pdf`);
  }

  function copyDraft(){
    navigator.clipboard.writeText(draft);
    alert("Draft copied to clipboard");
  }

  function resetForm(){
    setDrcRef(""); setVarianceAmt(0); setReasonCode(""); setExplanation("");
    setPaidPortion(0); setDraft(""); setAnalysis(null);
  }

  return (
    <div>
      <PageHeader
        title="DRC-01B / DRC-01C Reply Drafter"
        subtitle="Draft Part B replies to liability and ITC variance intimations — with reason codes and section references."
        badge="Rule 88C / 88D"
      />

      {/* Form type tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={()=>{setFormType("DRC-01B"); resetForm();}}
          className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${formType==="DRC-01B"?"border-ey-yellow bg-ey-yellow-pale":"border-ey-gray-mid bg-white hover:border-ey-yellow-dark"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-ey-charcoal">DRC-01B</span>
            <span className="text-[10px] bg-ey-navy text-ey-yellow px-1.5 py-0.5 rounded font-mono">Rule 88C</span>
          </div>
          <div className="text-xs text-ey-gray-dark leading-snug">
            Liability variance — <strong>GSTR-1 &gt; GSTR-3B</strong>. Triggered when difference exceeds ₹25L or 20%.
          </div>
        </button>
        <button onClick={()=>{setFormType("DRC-01C"); resetForm();}}
          className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${formType==="DRC-01C"?"border-ey-yellow bg-ey-yellow-pale":"border-ey-gray-mid bg-white hover:border-ey-yellow-dark"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-ey-charcoal">DRC-01C</span>
            <span className="text-[10px] bg-ey-navy text-ey-yellow px-1.5 py-0.5 rounded font-mono">Rule 88D</span>
          </div>
          <div className="text-xs text-ey-gray-dark leading-snug">
            ITC variance — <strong>3B ITC &gt; 2B ITC</strong>. Triggered when excess exceeds ₹25L or 20%.
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: structured intimation input */}
        <div className="bg-white rounded-2xl border border-ey-gray-mid p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ey-charcoal">📥 Intimation details</h3>
            <button onClick={loadSampleData}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-100">
              ✦ Load sample
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide block mb-1">
                {formType} reference number
              </label>
              <input value={drcRef} onChange={(e)=>setDrcRef(e.target.value)}
                placeholder="e.g. ZA2702240098765"
                className="w-full border border-ey-gray-mid rounded-lg px-3 py-2 text-sm font-mono text-ey-charcoal"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide block mb-1">Tax period</label>
                <select value={period} onChange={(e)=>setPeriod(e.target.value)}
                  className="w-full border border-ey-gray-mid rounded-lg px-3 py-2 text-sm text-ey-charcoal bg-white">
                  {["Apr 2024","Mar 2024","Feb 2024","Jan 2024","Dec 2023","Nov 2023"].map(p=>(
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide block mb-1">
                  Variance amount (₹)
                </label>
                <input type="number" value={varianceAmt} onChange={(e)=>setVarianceAmt(Number(e.target.value))}
                  className="w-full border border-ey-gray-mid rounded-lg px-3 py-2 text-sm font-mono text-ey-charcoal"/>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide block mb-1">
                Reason code (Part B)
              </label>
              <select value={reasonCode} onChange={(e)=>setReasonCode(e.target.value)}
                className="w-full border border-ey-gray-mid rounded-lg px-3 py-2 text-sm text-ey-charcoal bg-white">
                <option value="">— Select prescribed reason —</option>
                {REASONS.map(r => (
                  <option key={r.code} value={r.code}>{r.code} — {r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide block mb-1">
                Detailed explanation
              </label>
              <textarea value={explanation} onChange={(e)=>setExplanation(e.target.value)}
                placeholder="Provide the factual basis for the selected reason code — specific invoices, dates, supplier names, amendments etc."
                className="w-full h-24 border border-ey-gray-mid rounded-lg px-3 py-2 text-sm text-ey-charcoal resize-none"/>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-ey-gray-dark uppercase tracking-wide block mb-1">
                Amount paid via DRC-03 (if any)
              </label>
              <input type="number" value={paidPortion} onChange={(e)=>setPaidPortion(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-ey-gray-mid rounded-lg px-3 py-2 text-sm font-mono text-ey-charcoal"/>
              <p className="text-[10px] text-ey-gray-dark mt-1">Leave 0 if relying entirely on reason explanation.</p>
            </div>
          </div>

          <button onClick={generateDraft} disabled={loading || !drcRef.trim() || !reasonCode || !explanation.trim()}
            className="mt-5 w-full bg-ey-yellow hover:bg-ey-yellow-dark disabled:opacity-40 text-ey-navy font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            {loading ? <>
              <span className="inline-block w-1.5 h-1.5 bg-ey-navy rounded-full animate-pulse"/>
              <span className="inline-block w-1.5 h-1.5 bg-ey-navy rounded-full animate-pulse" style={{animationDelay:"0.2s"}}/>
              <span className="inline-block w-1.5 h-1.5 bg-ey-navy rounded-full animate-pulse" style={{animationDelay:"0.4s"}}/>
              <span className="ml-1">Drafting Part B reply…</span>
            </> : <>✦ Generate {formType} Part B reply</>}
          </button>
        </div>

        {/* Right: draft output */}
        <div className="bg-white rounded-2xl border border-ey-gray-mid p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ey-charcoal">📤 Drafted Part B reply</h3>
            {draft && <span className={`text-[10px] px-2 py-0.5 rounded-full ${source==="claude"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-800"}`}>
              {source === "claude" ? "Claude AI" : "Smart fallback"}
            </span>}
          </div>

          {!draft && !loading && (
            <div className="h-72 border border-dashed border-ey-gray-mid rounded-xl flex items-center justify-center p-6 text-center">
              <div>
                <div className="text-3xl mb-2 opacity-40">✦</div>
                <p className="text-sm text-ey-gray-dark">Fill in the intimation details on the left,<br/>then click Generate. AI drafts a Part B reply<br/>with reason codes and section references.</p>
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
                <p className="text-xs text-ey-gray-dark">Drafting Part B • Citing Rule {formType==="DRC-01B"?"88C":"88D"} • Adding sections…</p>
              </div>
            </div>
          )}

          {draft && (
            <>
              {analysis && (
                <div className="bg-ey-yellow-pale border border-yellow-200 rounded-xl p-3 mb-3 text-xs text-ey-charcoal leading-relaxed"
                  style={{whiteSpace:"pre-wrap"}}
                  dangerouslySetInnerHTML={{__html: analysis.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")}}/>
              )}
              <textarea value={draft} onChange={(e)=>setDraft(e.target.value)}
                className="w-full h-64 border border-ey-gray-mid rounded-xl p-3 text-[11px] font-mono text-ey-charcoal resize-none leading-relaxed"
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
              <p className="text-[10px] text-ey-gray-dark mt-2 text-center">
                Submit on GST portal: Services → User Services → My Applications → {formType}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer reference card */}
      <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
        <div className="font-semibold mb-1">ℹ When does {formType} get issued?</div>
        {formType === "DRC-01B" ? (
          <p className="leading-relaxed">
            DRC-01B is issued under <strong>Rule 88C</strong> when the tax liability declared in <strong>GSTR-1</strong> exceeds
            the liability paid in <strong>GSTR-3B</strong> by more than <strong>₹25 lakh</strong> OR by more than <strong>20%</strong>.
            You have <strong>7 days</strong> from intimation to either pay the differential via DRC-03 or submit Part B explanation.
          </p>
        ) : (
          <p className="leading-relaxed">
            DRC-01C is issued under <strong>Rule 88D</strong> when ITC claimed in <strong>GSTR-3B</strong> exceeds ITC available
            in <strong>GSTR-2B</strong> by more than <strong>₹25 lakh</strong> OR by more than <strong>20%</strong>.
            You have <strong>7 days</strong> to either reverse/pay the excess via DRC-03 or submit Part B explanation.
            Failure blocks GSTR-1 of the next period.
          </p>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   SHARED — small UI primitives used across the new features
────────────────────────────────────────────────────────── */
function PageHeader({title, subtitle, badge}){
  // App-level title/subtitle already render above this; keep the badge only.
  if(!badge) return null;
  return (
    <div className="mb-4">
      <span className="text-[10px] bg-ey-yellow text-ey-navy font-bold px-2 py-0.5 rounded uppercase tracking-wider">{badge}</span>
    </div>
  );
}

/* Note: StatCard, fmt, badge styles are reused from your existing helpers.jsx */
