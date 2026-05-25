# DigiGST — 4 New Features Integration Guide

This guide shows you exactly what to edit in your existing Claude design project to add all 4 AI features.

---

## ✅ FILES TO ADD

**One new file: `features.jsx`** — drop into your project root next to `pages.jsx`.

---

## ✅ EDITS TO YOUR EXISTING FILES

### 1. `DigiGST.html` — add script tag

Find this block near the bottom (around line 75):

```html
<script type="text/babel" src="tweaks-panel.jsx"></script>
<script src="data.js"></script>
<script type="text/babel" src="helpers.jsx"></script>
<script type="text/babel" src="ai-engine.jsx"></script>
<script type="text/babel" src="ai-chat.jsx"></script>
<script type="text/babel" src="pages.jsx"></script>
```

**Add** one line BEFORE `pages.jsx`:

```html
<script type="text/babel" src="features.jsx"></script>
```

---

### 2. `DigiGST.html` — extend the NAV array

Find the `NAV` constant around line 90:

```js
const NAV = [
  {id:"dashboard",     label:"Dashboard",        icon:"⊞"},
  {id:"returnreports", label:"Return Reports",   icon:"📋"},
  {id:"returndash",    label:"Return Summary",   icon:"📊"},
  {id:"imsreport",     label:"IMS",              icon:"🏭"},
  {id:"ledgers",       label:"Ledgers",          icon:"📒"},
  {id:"einvoice",      label:"E-Invoice",        icon:"🖨"},
  {id:"utilities",     label:"Utilities",        icon:"🔧"},
  {id:"aiinsights",    label:"AI Insights",      icon:"✦"},
];
```

**Replace with** (3 new items added):

```js
const NAV = [
  {id:"dashboard",     label:"Dashboard",        icon:"⊞"},
  {id:"docextract",    label:"Doc Extract",      icon:"📄", isNew:true},
  {id:"reconcile",     label:"Reconcile",        icon:"⚖", isNew:true},
  {id:"notices",       label:"Notice Reply",     icon:"✉", isNew:true},
  {id:"returnreports", label:"Return Reports",   icon:"📋"},
  {id:"returndash",    label:"Return Summary",   icon:"📊"},
  {id:"imsreport",     label:"IMS",              icon:"🏭"},
  {id:"ledgers",       label:"Ledgers",          icon:"📒"},
  {id:"einvoice",      label:"E-Invoice",        icon:"🖨"},
  {id:"utilities",     label:"Utilities",        icon:"🔧"},
  {id:"aiinsights",    label:"AI Insights",      icon:"✦"},
];
```

---

### 3. `DigiGST.html` — wire up the routes

Find where pages are rendered (look for `nav === "dashboard"` in the JSX). It looks like this:

```js
{nav === "dashboard"     && <DashboardPage ... />}
{nav === "returnreports" && <ReturnReportsPage ... />}
...
```

**Add** these three lines anywhere in that block:

```jsx
{nav === "docextract" && <DocumentDropPage goNav={goNav}/>}
{nav === "reconcile"  && <ReconcilePage goNav={goNav} period={period}/>}
{nav === "notices"    && <NoticeDrafterPage goNav={goNav}/>}
```

---

### 4. (Optional) `pages.jsx` — add `<WhyExplainer>` to dashboard tiles

Find the `<StatCard>` calls inside `DashboardPage` (around line 38):

```jsx
<StatCard label="ITC balance" value="₹1.12L" sub="Apr 2024 live" trend="-43%" accent="bg-blue-500"/>
```

**Wrap it** like this to add the `?` button:

```jsx
<WhyExplainer label="ITC Balance" value="₹1.12L">
  <StatCard label="ITC balance" value="₹1.12L" sub="Apr 2024 live" trend="-43%" accent="bg-blue-500"/>
</WhyExplainer>
```

Repeat for any stat you want explained — `Filed`, `Tax Paid`, `Pending / Error`, `AI Score`, etc.

---

## 🎨 OPTIONAL — show "NEW" badge in sidebar

In `DigiGST.html` find where you render nav items (around line 214):

```jsx
{NAV.map(item => (
  <div key={item.id} onClick={()=>goNav(item.id)}
    className={`snav ... ${nav===item.id?"active":""} ...`}>
    <span className="text-[15px] flex-shrink-0 w-5 text-center">{item.icon}</span>
    {sidebarOpen && (
      <>
        <span className="text-[13px] ...">{item.label}</span>
        {item.id === "aiinsights" && <span className="ml-auto text-[9px] bg-ey-yellow text-ey-navy px-1.5 py-0.5 rounded font-bold tracking-wider">AI</span>}
      </>
    )}
  </div>
))}
```

**Add** another conditional for `isNew`:

```jsx
{item.isNew && <span className="ml-auto text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">NEW</span>}
```

---

## 🧪 TESTING

After integration:

1. **Doc Extract** — Sidebar → Doc Extract → drag any file → watch AI extract fields → "Push to GSTR-1"

2. **Why Explainer** — Dashboard → click any `?` button next to a stat → AI explains the number

3. **Reconcile** — Sidebar → Reconcile → click "Run AI analysis" → see mismatch recommendations

4. **Notice Reply** — Sidebar → Notice Reply → click "Use sample notice" → click "Generate AI reply"

All four work with OR without an API key:
- **With key:** Real Claude AI live responses
- **Without key:** Hand-crafted realistic fallback content (still demo-able)

---

## 📁 FILE STRUCTURE AFTER INTEGRATION

```
your-project/
├── DigiGST.html          ← edited (script tag + NAV + routes)
├── tweaks-panel.jsx      ← unchanged
├── data.js               ← unchanged
├── helpers.jsx           ← unchanged
├── ai-engine.jsx         ← unchanged
├── ai-chat.jsx           ← unchanged
├── features.jsx          ← NEW
├── pages.jsx             ← optional WhyExplainer wraps
└── screenshots/
```
