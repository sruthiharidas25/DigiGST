/* ══════════════════════════════════════════════════════════
   DATA LAYER — Company Name 1
   Expanded with quarterly + FY periods
══════════════════════════════════════════════════════════ */

window.COMPANY = "Company Name 1";
window.GSTIN   = "27AABCU9603R1ZX";
window.STATE   = "Maharashtra";
window.SECTOR  = "Manufacturing";

/* ── Period taxonomy ───────────────────────────────────── */
window.PERIODS = {
  months:   ["Apr 2024","Mar 2024","Feb 2024","Jan 2024","Dec 2023","Nov 2023","Oct 2023"],
  quarters: ["Q1 FY25","Q4 FY24","Q3 FY24"],
  years:    ["FY 2023-24","FY 2024-25"]
};
window.QUARTER_MONTHS = {
  "Q1 FY25": ["Apr 2024"],
  "Q4 FY24": ["Mar 2024","Feb 2024","Jan 2024"],
  "Q3 FY24": ["Dec 2023","Nov 2023","Oct 2023"]
};
window.FY_MONTHS = {
  "FY 2023-24": ["Mar 2024","Feb 2024","Jan 2024","Dec 2023","Nov 2023","Oct 2023"],
  "FY 2024-25": ["Apr 2024"]
};

/* Resolve any period name → array of month strings */
window.resolvePeriod = function(p){
  if (!p || p==="All") return PERIODS.months;
  if (QUARTER_MONTHS[p]) return QUARTER_MONTHS[p];
  if (FY_MONTHS[p])      return FY_MONTHS[p];
  return [p];
};

/* ── Returns register ──────────────────────────────────── */
window.RETURNS = [
  // Apr 2024 — current month, mostly draft
  {id:101,type:"GSTR-1",  period:"Apr 2024",status:"Draft",     updated:"02 May 2024",by:"User 1", taxable:1965000,tax:353700,igst:176850,cgst:88425,sgst:88425,late:false},
  {id:102,type:"GSTR-3B", period:"Apr 2024",status:"Draft",     updated:"03 May 2024",by:"User 2",  taxable:1965000,tax:353700,igst:176850,cgst:88425,sgst:88425,late:false},
  {id:103,type:"GSTR-2A", period:"Apr 2024",status:"Processing",updated:"04 May 2024",by:"Auto",      taxable:1015000,tax:182700,igst:91350,cgst:45675,sgst:45675,late:false},
  {id:104,type:"GSTR-2B", period:"Apr 2024",status:"Pending",   updated:"—",          by:"—",         taxable:0,tax:0,igst:0,cgst:0,sgst:0,late:false},

  // Mar 2024 — main month
  {id:1, type:"GSTR-1",  period:"Mar 2024",status:"Filed",     updated:"11 Apr 2024",by:"User 1", taxable:1840000,tax:331200,igst:165600,cgst:82800,sgst:82800,late:false},
  {id:2, type:"GSTR-3B", period:"Mar 2024",status:"Filed",     updated:"20 Apr 2024",by:"User 2",  taxable:1840000,tax:331200,igst:165600,cgst:82800,sgst:82800,late:false},
  {id:3, type:"GSTR-2A", period:"Mar 2024",status:"Processing",updated:"03 Apr 2024",by:"Auto",      taxable:920000, tax:165600,igst:83000, cgst:41300,sgst:41300,late:false},
  {id:4, type:"GSTR-2B", period:"Mar 2024",status:"Processing",updated:"14 Apr 2024",by:"Auto",      taxable:920000, tax:165600,igst:83000, cgst:41300,sgst:41300,late:false},
  {id:5, type:"GSTR-7",  period:"Mar 2024",status:"Filed",     updated:"10 Apr 2024",by:"User 3",   taxable:45000,  tax:8100,  igst:0,     cgst:4050, sgst:4050, late:false},
  {id:6, type:"GSTR-6",  period:"Mar 2024",status:"Filed",     updated:"13 Apr 2024",by:"User 4",   taxable:380000, tax:68400, igst:34200, cgst:17100,sgst:17100,late:false},
  {id:7, type:"GSTR-4",  period:"Mar 2024",status:"Draft",     updated:"30 Mar 2024",by:"User 5",  taxable:0,tax:0,igst:0,cgst:0,sgst:0,late:false},
  {id:8, type:"CMP-08",  period:"Q4 FY24", status:"Pending",   updated:"—",          by:"—",         taxable:0,tax:0,igst:0,cgst:0,sgst:0,late:true},

  // Feb 2024
  {id:9, type:"GSTR-1",  period:"Feb 2024",status:"Filed",     updated:"11 Mar 2024",by:"User 1", taxable:1625000,tax:292500,igst:146250,cgst:73125,sgst:73125,late:false},
  {id:10,type:"GSTR-3B", period:"Feb 2024",status:"Error",     updated:"10 Mar 2024",by:"User 2",  taxable:1625000,tax:292500,igst:146250,cgst:73125,sgst:73125,late:false},
  {id:11,type:"GSTR-2A", period:"Feb 2024",status:"Filed",     updated:"28 Feb 2024",by:"Auto",      taxable:810000, tax:145800,igst:72900, cgst:36450,sgst:36450,late:false},
  {id:12,type:"GSTR-2B", period:"Feb 2024",status:"Filed",     updated:"14 Mar 2024",by:"Auto",      taxable:810000, tax:145800,igst:72900, cgst:36450,sgst:36450,late:false},
  {id:13,type:"GSTR-7",  period:"Feb 2024",status:"Filed",     updated:"10 Mar 2024",by:"User 3",   taxable:41000,  tax:7380,  igst:0,     cgst:3690, sgst:3690, late:false},
  {id:14,type:"GSTR-6",  period:"Feb 2024",status:"Filed",     updated:"13 Mar 2024",by:"User 4",   taxable:335000, tax:60300, igst:30150, cgst:15075,sgst:15075,late:false},
  {id:15,type:"GSTR-4",  period:"Feb 2024",status:"Filed",     updated:"18 Mar 2024",by:"User 5",  taxable:120000, tax:21600, igst:10800, cgst:5400, sgst:5400, late:false},
  {id:16,type:"CMP-08",  period:"Q3 FY24", status:"Filed",     updated:"18 Jan 2024",by:"User 5",  taxable:96000,  tax:17280, igst:8640,  cgst:4320, sgst:4320, late:false},

  // Jan 2024
  {id:21,type:"GSTR-1",  period:"Jan 2024",status:"Filed",     updated:"11 Feb 2024",by:"User 1", taxable:1480000,tax:266400,igst:133200,cgst:66600,sgst:66600,late:false},
  {id:22,type:"GSTR-3B", period:"Jan 2024",status:"Filed",     updated:"20 Feb 2024",by:"User 2",  taxable:1480000,tax:266400,igst:133200,cgst:66600,sgst:66600,late:false},
  {id:23,type:"GSTR-2B", period:"Jan 2024",status:"Filed",     updated:"14 Feb 2024",by:"Auto",      taxable:735000, tax:132300,igst:66150, cgst:33075,sgst:33075,late:false},

  // Dec 2023
  {id:31,type:"GSTR-1",  period:"Dec 2023",status:"Filed",     updated:"11 Jan 2024",by:"User 1", taxable:1395000,tax:251100,igst:125550,cgst:62775,sgst:62775,late:false},
  {id:32,type:"GSTR-3B", period:"Dec 2023",status:"Filed",     updated:"20 Jan 2024",by:"User 2",  taxable:1395000,tax:251100,igst:125550,cgst:62775,sgst:62775,late:false},
  {id:33,type:"GSTR-2B", period:"Dec 2023",status:"Filed",     updated:"14 Jan 2024",by:"Auto",      taxable:690000, tax:124200,igst:62100, cgst:31050,sgst:31050,late:false},

  // Nov 2023
  {id:41,type:"GSTR-1",  period:"Nov 2023",status:"Filed",     updated:"11 Dec 2023",by:"User 1", taxable:1262000,tax:227160,igst:113580,cgst:56790,sgst:56790,late:false},
  {id:42,type:"GSTR-3B", period:"Nov 2023",status:"Filed",     updated:"22 Dec 2023",by:"User 2",  taxable:1262000,tax:227160,igst:113580,cgst:56790,sgst:56790,late:true},
  {id:43,type:"GSTR-2B", period:"Nov 2023",status:"Filed",     updated:"14 Dec 2023",by:"Auto",      taxable:625000, tax:112500,igst:56250, cgst:28125,sgst:28125,late:false},

  // Oct 2023
  {id:51,type:"GSTR-1",  period:"Oct 2023",status:"Filed",     updated:"11 Nov 2023",by:"User 1", taxable:1188000,tax:213840,igst:106920,cgst:53460,sgst:53460,late:false},
  {id:52,type:"GSTR-3B", period:"Oct 2023",status:"Filed",     updated:"20 Nov 2023",by:"User 2",  taxable:1188000,tax:213840,igst:106920,cgst:53460,sgst:53460,late:false},
];

/* ── IMS — Invoice Management System (supplier-level) ──── */
window.IMS = [
  {id:1, supplier:"Client 1",  gstin:"29AABCT1234A1Z5",invoices:28,eligible:22,pending:4,rejected:2,itc:158400,period:"Apr 2024",risk:"Medium"},
  {id:2, supplier:"Client 2",    gstin:"24AABCB5678B1Z3",invoices:14,eligible:14,pending:0,rejected:0,itc:96200, period:"Apr 2024",risk:"Low"},
  {id:3, supplier:"Client 3",  gstin:"27AABCM9012C1Z1",invoices:32,eligible:26,pending:6,rejected:0,itc:71800, period:"Apr 2024",risk:"Medium"},

  {id:4, supplier:"Client 1",  gstin:"29AABCT1234A1Z5",invoices:24,eligible:18,pending:4,rejected:2,itc:145600,period:"Mar 2024",risk:"Medium"},
  {id:5, supplier:"Client 2",    gstin:"24AABCB5678B1Z3",invoices:12,eligible:12,pending:0,rejected:0,itc:89400, period:"Mar 2024",risk:"Low"},
  {id:6, supplier:"Client 3",  gstin:"27AABCM9012C1Z1",invoices:36,eligible:30,pending:5,rejected:1,itc:62300, period:"Mar 2024",risk:"Medium"},
  {id:7, supplier:"Client 4", gstin:"07AABCD3456D1Z9",invoices:8, eligible:6, pending:0,rejected:2,itc:38700, period:"Mar 2024",risk:"High"},
  {id:8, supplier:"Client 5",   gstin:"08AABCR7890E1Z7",invoices:19,eligible:19,pending:0,rejected:0,itc:28100, period:"Mar 2024",risk:"Low"},

  {id:9, supplier:"Client 1",  gstin:"29AABCT1234A1Z5",invoices:22,eligible:20,pending:2,rejected:0,itc:131200,period:"Feb 2024",risk:"Low"},
  {id:10,supplier:"Client 2",    gstin:"24AABCB5678B1Z3",invoices:10,eligible:10,pending:0,rejected:0,itc:76500, period:"Feb 2024",risk:"Low"},
  {id:11,supplier:"Client 3",  gstin:"27AABCM9012C1Z1",invoices:28,eligible:22,pending:6,rejected:0,itc:54800, period:"Feb 2024",risk:"Medium"},
  {id:12,supplier:"Client 4", gstin:"07AABCD3456D1Z9",invoices:7, eligible:6, pending:0,rejected:1,itc:32400, period:"Feb 2024",risk:"High"},

  {id:13,supplier:"Client 1",  gstin:"29AABCT1234A1Z5",invoices:20,eligible:20,pending:0,rejected:0,itc:118600,period:"Jan 2024",risk:"Low"},
  {id:14,supplier:"Client 2",    gstin:"24AABCB5678B1Z3",invoices:9, eligible:9, pending:0,rejected:0,itc:68400, period:"Jan 2024",risk:"Low"},
];

/* ── Electronic Credit Ledger ──────────────────────────── */
window.LEDGER = [
  {date:"01 Apr 2024",period:"Apr 2024",desc:"Opening Balance",            type:"balance",debit:0,     credit:0,     balance:197500},
  {date:"08 Apr 2024",period:"Apr 2024",desc:"IGST Credit – Client 1",     type:"credit", debit:0,     credit:52400, balance:249900},
  {date:"15 Apr 2024",period:"Apr 2024",desc:"GSTR-3B Liability Offset",    type:"debit",  debit:165600,credit:0,     balance:84300},
  {date:"22 Apr 2024",period:"Apr 2024",desc:"CGST Credit – Client 2",  type:"credit", debit:0,     credit:28100, balance:112400},
  {date:"30 Apr 2024",period:"Apr 2024",desc:"Closing Balance",             type:"balance",debit:0,     credit:0,     balance:112400},

  {date:"01 Mar 2024",period:"Mar 2024",desc:"Opening Balance",             type:"balance",debit:0,     credit:0,     balance:285400},
  {date:"05 Mar 2024",period:"Mar 2024",desc:"IGST Credit – Client 1",     type:"credit", debit:0,     credit:48200, balance:333600},
  {date:"08 Mar 2024",period:"Mar 2024",desc:"CGST Credit – Client 2",  type:"credit", debit:0,     credit:22100, balance:355700},
  {date:"15 Mar 2024",period:"Mar 2024",desc:"GSTR-3B Liability Offset",    type:"debit",  debit:180000,credit:0,     balance:175700},
  {date:"18 Mar 2024",period:"Mar 2024",desc:"SGST Credit – Client 3",type:"credit",debit:0,    credit:31200, balance:206900},
  {date:"22 Mar 2024",period:"Mar 2024",desc:"ITC Reversal – Rule 42",      type:"debit",  debit:8400,  credit:0,     balance:198500},
  {date:"28 Mar 2024",period:"Mar 2024",desc:"Late fee payment (CMP-08)",   type:"debit",  debit:1000,  credit:0,     balance:197500},
  {date:"31 Mar 2024",period:"Mar 2024",desc:"Closing Balance",             type:"balance",debit:0,     credit:0,     balance:197500},

  {date:"01 Feb 2024",period:"Feb 2024",desc:"Opening Balance",             type:"balance",debit:0,     credit:0,     balance:312100},
  {date:"06 Feb 2024",period:"Feb 2024",desc:"IGST Credit – Client 1",     type:"credit", debit:0,     credit:43800, balance:355900},
  {date:"12 Feb 2024",period:"Feb 2024",desc:"GSTR-3B Liability Offset",    type:"debit",  debit:165000,credit:0,     balance:190900},
  {date:"20 Feb 2024",period:"Feb 2024",desc:"CGST Credit – Client 2",  type:"credit", debit:0,     credit:19200, balance:210100},
  {date:"28 Feb 2024",period:"Feb 2024",desc:"Closing Balance",             type:"balance",debit:0,     credit:0,     balance:285400},

  {date:"01 Jan 2024",period:"Jan 2024",desc:"Opening Balance",             type:"balance",debit:0,     credit:0,     balance:298400},
  {date:"15 Jan 2024",period:"Jan 2024",desc:"GSTR-3B Liability Offset",    type:"debit",  debit:148000,credit:0,     balance:150400},
  {date:"24 Jan 2024",period:"Jan 2024",desc:"Combined ITC Credits",        type:"credit", debit:0,     credit:161700,balance:312100},
  {date:"31 Jan 2024",period:"Jan 2024",desc:"Closing Balance",             type:"balance",debit:0,     credit:0,     balance:312100},
];

/* ── Upcoming due dates ────────────────────────────────── */
window.DUE_DATES = [
  {id:"d1",return:"GSTR-7",  period:"Apr 2024", due:"10 May 2024",days:4,  filed:false,urgency:"high",refId:null},
  {id:"d2",return:"GSTR-1",  period:"Apr 2024", due:"11 May 2024",days:5,  filed:false,urgency:"high",refId:101},
  {id:"d3",return:"GSTR-2B", period:"Apr 2024", due:"14 May 2024",days:8,  filed:false,urgency:"med", refId:104},
  {id:"d4",return:"GSTR-3B", period:"Apr 2024", due:"20 May 2024",days:14, filed:false,urgency:"med", refId:102},
  {id:"d5",return:"GSTR-4",  period:"Mar 2024", due:"30 Apr 2024",days:-5, filed:false,urgency:"high",refId:7},
  {id:"d6",return:"GSTR-9",  period:"FY 2023-24",due:"31 Dec 2024",days:239,filed:false,urgency:"low", refId:null},
];

/* ── Detected anomalies ────────────────────────────────── */
window.ANOMALIES = [
  {id:1,type:"Mismatch",   desc:"GSTR-3B vs GSTR-1 turnover gap of ₹2,15,000",                 period:"Feb 2024",severity:"High",  action:"Reconcile and file amendment before next filing",      refId:10},
  {id:2,type:"IMS Pending",desc:"4 invoices from Client 1 + 5 from Client 3 pending", period:"Mar 2024",severity:"Medium",action:"Accept or reject in IMS to claim ITC",                  refId:4},
  {id:3,type:"Late Filing",desc:"CMP-08 filed 3 days after due date",                          period:"Q4 FY24", severity:"Low",   action:"Late fee ₹1,000 already paid",                          refId:8},
  {id:4,type:"ITC Reversal",desc:"Rule 42 proportionate reversal due on mixed supply inputs",  period:"Mar 2024",severity:"Medium",action:"Calculate & reverse before GSTR-3B filing",             refId:2},
  {id:5,type:"Draft State",desc:"GSTR-4 still in Draft — past due date",                       period:"Mar 2024",severity:"High",  action:"File immediately — already 5 days late",                refId:7},
  {id:6,type:"Risk",       desc:"Client 4 — 25% invoice rejection rate",            period:"Mar 2024",severity:"High",  action:"Audit supplier; verify GSTIN status",                    refId:7},
];

/* ── E-invoices ────────────────────────────────────────── */
window.EINVOICES = [
  {irn:"INV2024041800001",date:"18 Apr 2024",buyer:"Client 2",   gstin:"24AABCB5678B1Z3",value:262000,status:"Active"},
  {irn:"INV2024041800002",date:"22 Apr 2024",buyer:"Client 1", gstin:"29AABCT1234A1Z5",value:196500,status:"Active"},
  {irn:"INV2024031200001",date:"12 Mar 2024",buyer:"Client 2",   gstin:"24AABCB5678B1Z3",value:248000,status:"Active"},
  {irn:"INV2024031200002",date:"15 Mar 2024",buyer:"Client 1", gstin:"29AABCT1234A1Z5",value:182000,status:"Active"},
  {irn:"INV2024031200003",date:"18 Mar 2024",buyer:"Client 3", gstin:"27AABCM9012C1Z1",value:94500, status:"Cancelled"},
  {irn:"INV2024021200001",date:"05 Feb 2024",buyer:"Client 4",gstin:"07AABCD3456D1Z9",value:316000,status:"Active"},
  {irn:"INV2024021200002",date:"14 Feb 2024",buyer:"Client 5",  gstin:"08AABCR7890E1Z7",value:128500,status:"Active"},
];

/* ── Suggested smart questions ─────────────────────────── */
window.SMART_QUESTIONS = [
  {text:"What needs my attention today?",  icon:"☀"},
  {text:"Am I ready to file GSTR-3B?",     icon:"✓"},
  {text:"Why did ITC drop in March?",      icon:"↓"},
  {text:"Which supplier is riskiest?",     icon:"!"},
  {text:"How much cash do I need this week?",icon:"₹"},
  {text:"Explain the Feb GSTR-3B error",   icon:"?"},
  {text:"Summarise Q4 FY24 compliance",    icon:"📊"},
  {text:"What would improve my score?",    icon:"↑"},
];

/* ── Build full context string for AI system prompt ────── */
window.buildContext = function(){
  const filed=RETURNS.filter(r=>r.status==="Filed").length;
  const pending=RETURNS.filter(r=>["Pending","Error","Draft"].includes(r.status)).length;
  const totalTax=RETURNS.reduce((s,r)=>s+r.tax,0);
  const marTax=RETURNS.filter(r=>r.period==="Mar 2024").reduce((s,r)=>s+r.tax,0);
  const febTax=RETURNS.filter(r=>r.period==="Feb 2024").reduce((s,r)=>s+r.tax,0);
  const aprTax=RETURNS.filter(r=>r.period==="Apr 2024").reduce((s,r)=>s+r.tax,0);
  const pendingIMS=IMS.filter(r=>r.pending>0);
  const totalPendingITC=pendingIMS.reduce((s,r)=>s+r.itc,0);
  const pendingDues=DUE_DATES.filter(d=>!d.filed&&d.days<=14);
  return `
COMPANY:
- ${COMPANY} | GSTIN: ${GSTIN} | ${STATE} | ${SECTOR}
- Financial Year: 2023-24 (closed), 2024-25 (current — Apr 2024)

RETURNS (${RETURNS.length} tracked, ${filed} filed, ${pending} pending/error/draft):
- Apr 2024 tax: ₹${aprTax.toLocaleString('en-IN')} (current, mostly drafts)
- Mar 2024 tax: ₹${marTax.toLocaleString('en-IN')} (latest closed)
- Feb 2024 tax: ₹${febTax.toLocaleString('en-IN')} (one return in Error)
- MoM growth Feb→Mar: ${(((marTax-febTax)/febTax)*100).toFixed(1)}%
- Total tax FY 2023-24 (Oct→Mar tracked): ₹${totalTax.toLocaleString('en-IN')}

RETURN STATUSES:
${RETURNS.map(r=>`- [id:${r.id}] ${r.type} ${r.period}: ${r.status}, tax ₹${r.tax.toLocaleString('en-IN')}, by ${r.by}`).join('\n')}

ITC / LEDGER:
- Mar 2024 closing: ₹1,97,500
- Apr 2024 current: ₹1,12,400 (after 15 Apr offset)
- Feb closing was: ₹2,85,400
- Mar drop driven by: ₹1,80,000 liability offset (15 Mar) + ₹8,400 Rule 42 reversal + ₹1,000 late fee
- ITC at risk in pending IMS: ₹${totalPendingITC.toLocaleString('en-IN')}
- Suppliers with pending action: ${pendingIMS.map(r=>r.supplier+" ("+r.pending+", ₹"+r.itc.toLocaleString('en-IN')+")").join(', ')}

IMS RISK:
${IMS.map(r=>`- [id:${r.id}] ${r.supplier} ${r.period}: ${r.invoices}/${r.eligible} elig, ${r.pending} pending, ${r.rejected} rejected, ITC ₹${r.itc.toLocaleString('en-IN')}, ${r.risk}`).join('\n')}

ANOMALIES:
${ANOMALIES.map(a=>`- [id:${a.id}] [${a.severity}] ${a.type} (${a.period}): ${a.desc} → ${a.action}`).join('\n')}

UPCOMING DUE DATES:
${DUE_DATES.map(d=>`- ${d.return} ${d.period}: ${d.due}, ${d.days}d away, ${d.filed?'FILED':'NOT FILED'}`).join('\n')}
- URGENT (<14d): ${pendingDues.map(d=>d.return).join(', ')}

COMPLIANCE METRICS:
- Score: 87/100 (+4 vs last quarter)
- GSTR-3B Feb in Error (₹2,15,000 mismatch with GSTR-1)
- GSTR-4 Mar in Draft (already 5 days overdue)
- Apr 2024 cash need (est.): ₹1,41,800 across GSTR-7, GSTR-1, GSTR-3B

REFERENCE SYNTAX (USE THESE EXACTLY when citing data — they render as clickable chips):
- A return: [ref:return:<id>]   e.g. [ref:return:10] for GSTR-3B Feb
- A supplier IMS row: [ref:ims:<id>]   e.g. [ref:ims:4] for Client 1 Mar
- An anomaly: [ref:anomaly:<id>]   e.g. [ref:anomaly:1] for the Feb mismatch
- Pages: [ref:page:imsreport] | [ref:page:ledgers] | [ref:page:returnreports] | [ref:page:dashboard] | [ref:page:aiinsights]
Sprinkle 2–5 of these inline naturally where you mention specific items. Do NOT put them in a separate "sources" section — keep them in the prose.
`;
};
