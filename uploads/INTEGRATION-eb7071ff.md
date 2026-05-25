# DigiGST — 4 Feature Integration Guide (v2)

## What changed in v2

1. **Doc Extract** — now pushes to Purchase Register (inward) instead of GSTR-1 (outward). Detects duplicates and auto-applies suffix `'A'` to the invoice number with a manual-verify warning.

2. **Reconciliation** — new `Invoice No.` column shows `'A'` suffix for duplicates. New `Comment` column flags `"A duplicate line is detected"` with manual-match action. Added Duplicates filter chip and Duplicates stat card.

3. **Notice Drafter** — completely rebuilt for **DRC-01B (Rule 88C)** and **DRC-01C (Rule 88D)** intimations. Structured form: reference number, period, variance amount, reason code (from prescribed Part B list), explanation, DRC-03 amount paid. Generates formal Part B reply with the right rule citations.

---

## ✅ FILES TO ADD

**One file: `features.jsx`** — drop into your project root next to `pages.jsx`.

## ✅ EDITS TO YOUR EXISTING FILES

### 1. `DigiGST.html` — script tag

Find the script block near the bottom (~line 75) and add ONE line before `pages.jsx`:

```html
<script type="text/babel" src="features.jsx"></script>
<script type="text/babel" src="pages.jsx"></script>
```

### 2. `DigiGST.html` — NAV array

Add three new entries:

```js
const NAV = [
  {id:"dashboard",     label:"Dashboard",        icon:"⊞"},
  {id:"docextract",    label:"Doc Extract",      icon:"📄", isNew:true},
  {id:"reconcile",     label:"Reconcile",        icon:"⚖", isNew:true},
  {id:"notices",       label:"DRC Replies",      icon:"✉", isNew:true},
  {id:"returnreports", label:"Return Reports",   icon:"📋"},
  {id:"returndash",    label:"Return Summary",   icon:"📊"},
  {id:"imsreport",     label:"IMS",              icon:"🏭"},
  {id:"ledgers",       label:"Ledgers",          icon:"📒"},
  {id:"einvoice",      label:"E-Invoice",        icon:"🖨"},
  {id:"utilities",     label:"Utilities",        icon:"🔧"},
  {id:"aiinsights",    label:"AI Insights",      icon:"✦"},
];
```

### 3. `DigiGST.html` — route handler

Find your `renderPage()` or the JSX block with `nav === "dashboard" && ...` and add:

```jsx
{nav === "docextract" && <DocumentDropPage goNav={goNav}/>}
{nav === "reconcile"  && <ReconcilePage goNav={goNav} period={period}/>}
{nav === "notices"    && <NoticeDrafterPage goNav={goNav}/>}
```

### 4. (Optional) Sidebar — "NEW" badges

```jsx
{item.isNew && (
  <span className="ml-auto text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">
    NEW
  </span>
)}
```

---

## 🧪 DEMO FLOW

### 1) Doc Extract — Purchase Register (inward)
1. Sidebar → **Doc Extract**
2. Drop any file. Every 3rd upload simulates a **duplicate**:
   - Orange banner: "A duplicate line is detected"
   - Invoice number gets suffix `'A'` (e.g. `TP/2024/0428` → `TP/2024/0428A`)
3. **Push to Purchase Register** → toast confirms inward upload + duplicate note → navigates to IMS

### 2) Reconcile — duplicate detection in 3-way recon
1. Sidebar → **Reconcile**
2. New columns visible: `Invoice No.` (orange `+A` chip on duplicates), `Comment`
3. Filter chip: **⚠ Duplicates** — click to isolate
4. Action button on duplicate rows: "Match manually →" opens detailed instructions
5. Footer banner: "N duplicate line(s) detected. Suffix 'A' applied. Match manually before filing."

### 3) DRC Replies — DRC-01B / DRC-01C
1. Sidebar → **DRC Replies**
2. Tab toggle: **DRC-01B (Rule 88C — liability variance)** or **DRC-01C (Rule 88D — ITC variance)**
3. Click "Load sample" or fill manually:
   - DRC reference number (e.g. `ZA2702240098765`)
   - Tax period
   - Variance amount
   - Reason code from prescribed Part B list:
     - DRC-01B: R1–R6 (paid via DRC-03, wrong period, subsequent 3B, GSTR-1 amendment, typo, other)
     - DRC-01C: C1–C6 (reversed in next 3B, paid via DRC-03, supplier filed late, RCM, ISD/imports, other)
   - Detailed explanation
   - DRC-03 amount paid (if any)
4. **Generate Part B reply** — AI drafts a 7-paragraph formal letter with proper Rule 88C/88D, Section 16/39/50 citations
5. Edit inline, copy, export PDF
6. Info card at the bottom explains threshold rules (₹25L / 20%) and the 7-day response window

---

## 📊 With vs without API key

| Feature | With API key | Without (fallback) |
|---|---|---|
| Doc Extract | Generates realistic invoice JSON | Picks from 3 realistic samples |
| Why Explainer | Live data-grounded answers | Hand-crafted per-label fallbacks |
| Reconcile | Custom mismatch analysis | "Top 3 issues" with named suppliers |
| DRC Reply | Tailored Part B letter | Full 7-paragraph template with your inputs filled in |

All fallbacks are realistic enough to demo without ever touching the API.
