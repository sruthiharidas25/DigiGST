/* ══════════════════════════════════════════════════════════
   AI ENGINE
   - callAI: real Anthropic call (streaming optional)
   - localAnswer: smart fallback with ref tags inline
   - parseRefs: turn `[ref:type:id]` into chips
   - streamText: word-by-word reveal for local answers
══════════════════════════════════════════════════════════ */

window.__APIKEY = window.__APIKEY || "";

/* ── Real API call (non-streaming) ────────────────────── */
async function callAI(messages){
  if(!window.__APIKEY) throw new Error("NO_KEY");
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
      max_tokens: 1100,
      system: aiSystemPrompt(),
      messages
    })
  });
  if(!res.ok){
    const err = await res.json().catch(()=>({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "Unable to get response.";
}

/* ── Real streaming API call (SSE) ────────────────────── */
async function callAIStream(messages, onDelta){
  if(!window.__APIKEY) throw new Error("NO_KEY");
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
      max_tokens: 1100,
      stream: true,
      system: aiSystemPrompt(),
      messages
    })
  });
  if(!res.ok){
    const err = await res.json().catch(()=>({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  while(true){
    const {done,value} = await reader.read();
    if(done) break;
    buf += dec.decode(value, {stream:true});
    const lines = buf.split("\n");
    buf = lines.pop();
    for(const line of lines){
      if(!line.startsWith("data: ")) continue;
      try{
        const ev = JSON.parse(line.slice(6));
        if(ev.type === "content_block_delta" && ev.delta?.text){
          full += ev.delta.text;
          onDelta(ev.delta.text, full);
        }
      }catch(e){}
    }
  }
  return full;
}

function aiSystemPrompt(){
  return `You are the DigiGST AI Assistant — a senior GST compliance expert embedded inside the DigiGST platform for ${COMPANY}.

You have FULL ACCESS to the company's live GST data (returns, ITC ledger, IMS records, anomalies, due dates). Use it to give specific, accurate, actionable answers. Never say you don't have access.

RESPONSE RULES:
- Reference specific numbers, supplier names, return types, dates from the data
- Be conversational but precise — like a CA who knows the file inside out
- Short paragraphs / bullets, under 200 words
- Lead with the most critical item for urgent questions
- Indian number formatting (₹1,97,500 not ₹197500)
- Never make up data that isn't in the context provided

INLINE CITATIONS (CRITICAL):
When you mention a specific return, supplier IMS row, or anomaly, include its reference tag inline so the user can click through:
- Return: [ref:return:<id>]  → e.g. "GSTR-3B Feb [ref:return:10]"
- IMS row: [ref:ims:<id>]    → e.g. "Client 1 [ref:ims:4]"
- Anomaly: [ref:anomaly:<id>]→ e.g. "the mismatch [ref:anomaly:1]"
- Page link: [ref:page:imsreport] | [ref:page:ledgers] etc.

Use 2–5 refs per answer, dropped naturally into the prose (not in a separate sources section).

LIVE DATA:
${buildContext()}`;
}

/* ══════════════════════════════════════════════════════════
   REFERENCE PARSER
   Splits text into a tokens array: [{kind:'text',value},
   {kind:'ref',refType,id,label}]
══════════════════════════════════════════════════════════ */
window.parseAIText = function parseAIText(text){
  const tokens = [];
  const re = /\[ref:(return|ims|anomaly|page):([^\]]+)\]/g;
  let last = 0, m;
  while((m = re.exec(text)) !== null){
    if(m.index > last){
      tokens.push({kind:"text", value: text.slice(last, m.index)});
    }
    const [_, refType, idRaw] = m;
    const id = isNaN(+idRaw) ? idRaw : +idRaw;
    tokens.push({kind:"ref", refType, id, label: refLabel(refType, id)});
    last = re.lastIndex;
  }
  if(last < text.length) tokens.push({kind:"text", value: text.slice(last)});
  return tokens;
};

function refLabel(refType, id){
  if(refType === "return"){
    const r = RETURNS.find(x=>x.id===+id);
    return r ? `${r.type} ${r.period}` : `Return #${id}`;
  }
  if(refType === "ims"){
    const r = IMS.find(x=>x.id===+id);
    return r ? `${r.supplier} ${r.period}` : `IMS #${id}`;
  }
  if(refType === "anomaly"){
    const a = ANOMALIES.find(x=>x.id===+id);
    return a ? `${a.type} (${a.period})` : `Anomaly #${id}`;
  }
  if(refType === "page"){
    const map = {dashboard:"Dashboard", einvoice:"E-Invoice", returnreports:"Return Reports", returndash:"Return Dashboard", imsreport:"IMS Report", ledgers:"Ledgers", utilities:"Utilities", aiinsights:"AI Insights"};
    return map[id] || id;
  }
  return id;
}

/* Collect unique refs for a "Sources" footer if we want one */
window.extractRefs = function(text){
  const seen = new Set(), out = [];
  const re = /\[ref:(return|ims|anomaly|page):([^\]]+)\]/g;
  let m;
  while((m = re.exec(text)) !== null){
    const key = m[1]+":"+m[2];
    if(seen.has(key)) continue;
    seen.add(key);
    const id = isNaN(+m[2]) ? m[2] : +m[2];
    out.push({refType:m[1], id, label: refLabel(m[1], id)});
  }
  return out;
};

/* ══════════════════════════════════════════════════════════
   STREAM A LOCAL STRING
   Reveals text in word chunks via onDelta. Returns a cancel fn.
══════════════════════════════════════════════════════════ */
window.streamLocal = function(text, onDelta, onDone){
  const parts = text.split(/(\s+)/); // keep whitespace
  let i = 0, acc = "";
  let cancelled = false;
  function tick(){
    if(cancelled) return;
    if(i >= parts.length){ onDone && onDone(acc); return; }
    // burst 1–3 tokens at a time for a livelier feel
    const burst = Math.min(parts.length - i, 1 + Math.floor(Math.random()*3));
    for(let k=0; k<burst; k++){
      acc += parts[i++];
    }
    onDelta(acc);
    setTimeout(tick, 14 + Math.random()*22);
  }
  tick();
  return () => { cancelled = true; };
};

/* ══════════════════════════════════════════════════════════
   LOCAL ANSWERS — smart fallback when no API key
   All include inline [ref:...] tags so chips render.
══════════════════════════════════════════════════════════ */
window.localAnswer = function(question){
  const q = question.toLowerCase();

  if(q.includes("morning")||q.includes("briefing")||q.includes("attention")||q.includes("urgent")||q.includes("today")){
    return `**☀ Morning briefing — 3 items need you today**

**1. GSTR-4 is 5 days overdue** [ref:return:7]. Still in Draft. ₹0 tax due but late fee accrues daily. Open [ref:page:returnreports] and file in under 5 minutes.

**2. GSTR-3B Feb has an Error** [ref:return:10] from a ₹2,15,000 mismatch vs GSTR-1. Has to be resolved [ref:anomaly:1] before the Apr 3B due on 20 May.

**3. 10 IMS invoices pending acceptance** — Client 1 [ref:ims:4] + Client 3 [ref:ims:6]. ₹2,07,900 of ITC sitting locked. Go to [ref:page:imsreport].

**⚡ Quick win (<5 min):** Confirm the 12 already-eligible Client 2 invoices [ref:ims:5] in IMS to lock in ₹89,400 of ITC.`;
  }

  if(q.includes("3b")||q.includes("ready to file")){
    return `**Not yet ready to file GSTR-3B for Apr 2024** [ref:return:102].

Three blockers:
• GSTR-2B Apr is still Pending [ref:return:104] — wait for it to publish before claiming ITC
• 10 IMS invoices await your action [ref:ims:1] [ref:ims:3] — ₹2,30,200 ITC at stake
• Rule 42 reversal [ref:anomaly:4] needs to flow into the 3B

GSTR-1 Apr is in Draft [ref:return:101] but the turnover (₹19.65L) matches what you'd post to 3B, so no mismatch risk there. Once 2B lands and IMS is cleared, estimated cash payment after ITC offset is **~₹1,33,700**.

Open [ref:page:imsreport] to clear the pending list first.`;
  }

  if(q.includes("itc")||q.includes("credit")||q.includes("drop")){
    return `**ITC fell ₹87,900 across March.**

• Feb closing: ₹2,85,400 → Mar closing: ₹1,97,500 [ref:page:ledgers]
• Biggest outflow: ₹1,80,000 GSTR-3B offset on 15 Mar
• ₹8,400 Rule 42 reversal on mixed-supply inputs [ref:anomaly:4]
• ₹1,000 late fee for CMP-08

Credits in: ₹48,200 IGST (Client 1 [ref:ims:4]), ₹22,100 CGST (Client 2 [ref:ims:5]), ₹31,200 SGST (Client 3 [ref:ims:6]) = **₹1,01,500 total**.

Another **₹2,30,200** is sitting unclaimed in pending IMS invoices [ref:ims:1] — accept those to recover most of the drop.`;
  }

  if(q.includes("supplier")||q.includes("risk")||q.includes("risky")){
    return `**Supplier risk — ranked.**

**🔴 Client 4** [ref:ims:7] — 2 of 8 invoices rejected in Mar (25% rejection). ₹38,700 ITC affected. Same pattern across Feb [ref:ims:12]. Recommend audit before next acceptance [ref:anomaly:6].

**🟡 Client 1** [ref:ims:1] — largest ITC supplier at ₹1,58,400 (Apr). 4 pending, 2 rejected in Mar [ref:ims:4]. Worth a follow-up call.

**🟡 Client 3** [ref:ims:3] — consistent slow acceptance: 6 pending in Apr, 5 in Mar. Not high-risk individually but locks ₹71,800 ITC.

**🟢 Safe:** Client 2 [ref:ims:2], Client 5 [ref:ims:8] — zero pending, zero rejections.`;
  }

  if(q.includes("cash")||q.includes("money")||q.includes("pay")||q.includes("week")){
    return `**Cash required next 2 weeks: ~₹1,41,800**

| Return | Due | Est. cash |
|---|---|---|
| GSTR-7 | 10 May | ₹8,100 |
| GSTR-1 [ref:return:101] | 11 May | ₹0 |
| GSTR-3B [ref:return:102] | 20 May | ~₹1,33,700 |

Current ITC: **₹1,12,400** [ref:page:ledgers] — short by ~₹29,000 against the 3B liability.

**Recommendation:** clear the 10 pending IMS invoices [ref:page:imsreport] now — that releases ~₹2,30,200 of additional ITC and you can file GSTR-3B with **₹0 cash outflow**.`;
  }

  if(q.includes("feb")||q.includes("february")||q.includes("error")){
    return `**GSTR-3B Feb 2024 — Error** [ref:return:10]

Filed by User 2 on 10 Mar 2024 but flagged Error by the portal. Root cause: **₹2,15,000 turnover gap** between GSTR-1 Feb [ref:return:9] (₹16,25,000) and the 3B summary [ref:anomaly:1].

**To resolve:**
1. Pull the error JSON from the GST portal
2. Trace which invoice caused the discrepancy — likely a late-added GSTR-1 amendment
3. File a GSTR-1 amendment OR a GSTR-3B amendment for Feb
4. Re-submit

Must be cleared before the Apr 3B [ref:return:102] is filed on 20 May, otherwise compounding scrutiny risk.`;
  }

  if(q.includes("summari")||q.includes("summary")||q.includes("q4")||q.includes("quarter")||q.includes("march")){
    return `**Q4 FY24 compliance summary (Jan–Mar 2024)**

📊 **Returns:** 16 tracked across the quarter. 13 Filed, 1 Error, 1 Draft [ref:return:7], 1 Pending CMP-08 [ref:return:8].

💰 **Tax paid:** ₹8,90,100 (3 months combined)
• Jan: ₹2,66,400 · Feb: ₹2,92,500 · Mar: ₹3,31,200
• Steady 9–13% MoM growth

📥 **ITC closing balance:** ₹1,97,500 [ref:page:ledgers]

⚠ **Open items:**
• GSTR-3B Feb Error [ref:anomaly:1]
• GSTR-4 Draft, now 5d overdue [ref:return:7]
• 9 IMS invoices pending action [ref:page:imsreport]

**Score: 87/100** — above manufacturing-sector avg.`;
  }

  if(q.includes("score")||q.includes("improve")||q.includes("better")||q.includes("95")||q.includes("100")){
    return `**Path from 87 → 95+ in this week.**

Current deductions:
• **-5** GSTR-3B Feb Error unresolved [ref:anomaly:1]
• **-3** GSTR-4 Mar in Draft, now overdue [ref:return:7]
• **-3** CMP-08 filed late [ref:anomaly:3]
• **-2** IMS invoices pending > 30 days [ref:ims:4]

**Action plan:**
1. File GSTR-4 [ref:return:7] → **+3** instantly
2. Resolve GSTR-3B Feb error [ref:return:10] → **+5** (biggest gain)
3. Clear all IMS pending in [ref:page:imsreport] → **+2**
4. File future returns 2d early — eliminates late penalties

Items 1 + 2 alone put you at **95/100** within the week.`;
  }

  return `I can answer questions about your live GST data. Try one of the suggestions below — or ask anything in your own words. For free-form questions, add an Anthropic API key with the 🔑 button to unlock full Claude AI.

Available datasets: [ref:page:returnreports] · [ref:page:imsreport] · [ref:page:ledgers] · [ref:page:aiinsights]`;
};

Object.assign(window, {callAI, callAIStream});
