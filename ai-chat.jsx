/* ══════════════════════════════════════════════════════════
   AI CHAT — Components + 4 Layouts
   - useAIChat: chat state hook (messages, send, streaming)
   - AIMessage: renders text + inline ref chips + sources footer
   - AIRefChip: clickable [ref:...] pill
   - AIComposer: input + suggested chips
   - AIThinking: typing indicator
   - 4 layouts: AIBubble | AISidePanel | AIInline | AIFullPage
══════════════════════════════════════════════════════════ */

const {useState:useStateAI, useRef:useRefAI, useEffect:useEffectAI, useCallback:useCallbackAI} = React;

/* ════════ chat state hook ════════ */
window.useAIChat = function useAIChat({onNavigate, onHighlightRef}){
  const [msgs, setMsgs] = useStateAI([]);
  const [thinking, setThinking] = useStateAI(false);
  const [history, setHistory] = useStateAI([]);
  const cancelRef = useRefAI(null);
  const briefingLoadedRef = useRefAI(false);

  const send = useCallbackAI(async (rawText) => {
    const text = (rawText || "").trim();
    if(!text || thinking) return;
    setMsgs(m => [...m, {id: Date.now(), from:"user", text}]);
    setThinking(true);
    const aiId = Date.now() + 1;
    setMsgs(m => [...m, {id:aiId, from:"ai", text:"", streaming:true}]);

    const newHistory = [...history, {role:"user", content:text}];

    try{
      if(window.__APIKEY){
        // Real streaming
        const full = await callAIStream(newHistory, (delta, all) => {
          setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:all} : msg));
        });
        setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:full, streaming:false, source:"claude"} : msg));
        setHistory([...newHistory, {role:"assistant", content:full}].slice(-12));
      }else{
        throw new Error("NO_KEY");
      }
    }catch(e){
      if(e.message === "NO_KEY"){
        // Local streaming fallback
        const localText = localAnswer(text);
        await new Promise(resolve => {
          cancelRef.current = streamLocal(
            localText,
            (acc) => setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:acc} : msg)),
            (final) => {
              setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:final, streaming:false, source:"local"} : msg));
              resolve();
            }
          );
        });
      }else{
        setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:"API error: "+e.message+"\n\nClick 🔑 to update your key.", streaming:false, source:"error"} : msg));
      }
    }
    setThinking(false);
  }, [thinking, history]);

  const loadBriefing = useCallbackAI(async () => {
    if(briefingLoadedRef.current) return;
    briefingLoadedRef.current = true;
    setThinking(true);
    const aiId = Date.now();
    setMsgs([{id:aiId, from:"briefing", text:"", streaming:true}]);
    const prompt = "Give me a morning briefing for today. Top 3 most urgent items with refs, one quick win.";

    try{
      if(window.__APIKEY){
        const full = await callAIStream([{role:"user", content:prompt}], (delta, all) => {
          setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:all} : msg));
        });
        setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:full, streaming:false, source:"claude"} : msg));
        setHistory([{role:"user", content:prompt},{role:"assistant", content:full}]);
      }else{
        const local = localAnswer("morning briefing");
        await new Promise(resolve => {
          streamLocal(local,
            (acc) => setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:acc} : msg)),
            (final) => { setMsgs(m => m.map(msg => msg.id===aiId ? {...msg, text:final, streaming:false, source:"local"} : msg)); resolve(); });
        });
      }
    }catch(e){
      const local = localAnswer("morning briefing");
      setMsgs([{id:aiId, from:"briefing", text:local, streaming:false, source:"local"}]);
    }
    setThinking(false);
  }, []);

  const reset = useCallbackAI(() => {
    setMsgs([]); setHistory([]); briefingLoadedRef.current = false;
  }, []);

  return {msgs, thinking, send, loadBriefing, reset, onNavigate, onHighlightRef};
};

/* ════════ Markdown-light parser (bold, headings, bullets) ════════ */
function fmtInline(s){
  // **bold**
  const out = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0, m;
  while((m = re.exec(s))!==null){
    if(m.index > last) out.push(s.slice(last, m.index));
    out.push(<strong key={out.length} className="font-semibold text-ey-charcoal">{m[1]}</strong>);
    last = re.lastIndex;
  }
  if(last < s.length) out.push(s.slice(last));
  return out;
}

/* ════════ Reference chip ════════ */
function AIRefChip({refType, id, label, onClick}){
  const icon = {return:"📋", ims:"🏭", anomaly:"⚠", page:"↗"}[refType] || "•";
  const cls = {
    return:  "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200",
    ims:     "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200",
    anomaly: "bg-red-50 hover:bg-red-100 text-red-700 border-red-200",
    page:    "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200",
  }[refType] || "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <button onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1 align-baseline mx-0.5 px-1.5 py-0.5 rounded-md border text-[11px] font-medium leading-none transition-colors ${cls}`}>
      <span style={{fontSize:9}}>{icon}</span>
      <span className="truncate max-w-[180px]">{label}</span>
    </button>
  );
}

/* ════════ Render parsed tokens (text + refs) preserving newlines ════════ */
function AIBodyRender({text, onRefClick}){
  if(!text) return null;
  const tokens = parseAIText(text);
  // Walk tokens, splitting any text by \n into blocks
  const blocks = [];
  let cur = [];
  const flush = () => { if(cur.length){ blocks.push(cur); cur = []; } };

  tokens.forEach((tok, ti) => {
    if(tok.kind === "ref"){
      cur.push(<AIRefChip key={"r"+ti} {...tok} onClick={()=>onRefClick(tok)}/>);
    } else {
      const lines = tok.value.split("\n");
      lines.forEach((ln, li) => {
        if(li>0){ flush(); }
        if(ln) cur.push(<React.Fragment key={"t"+ti+"-"+li}>{fmtInline(ln)}</React.Fragment>);
      });
    }
  });
  flush();

  // Decide block element: bullet, heading, table-row, paragraph
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed text-ey-charcoal">
      {blocks.map((block, bi) => {
        // Reconstruct first-text-prefix for heuristics
        const firstText = (typeof block[0] === "string" || block[0]?.props?.children)
          ? (typeof block[0] === "string" ? block[0] : "")
          : "";
        const raw = block.map(p => typeof p === "string" ? p : "").join("");
        if(raw.match(/^\s*[•\-\*]\s/) || raw.match(/^\s*\d+\.\s/)){
          return <div key={bi} className="flex gap-2 pl-1">
            <span className="text-ey-yellow-dark mt-1" style={{fontSize:10}}>●</span>
            <div className="flex-1 flex flex-wrap items-baseline">{block.map((p,i)=> typeof p==="string" ? <span key={i}>{p.replace(/^\s*[•\-\*]\s/,"").replace(/^\s*\d+\.\s/,"")}</span> : p)}</div>
          </div>;
        }
        if(raw.startsWith("|") && raw.includes("|")){
          // Skip table rendering, just plain
          return <div key={bi} className="font-mono text-[11px] text-ey-gray-dark flex flex-wrap">{block}</div>;
        }
        return <div key={bi} className="flex flex-wrap items-baseline">{block}</div>;
      })}
    </div>
  );
}

/* ════════ One chat message bubble ════════ */
window.AIMessage = function AIMessage({msg, onRefClick, dense}){
  const isUser = msg.from === "user";
  const isBriefing = msg.from === "briefing";
  const tone = isBriefing ? "briefing" : "ai";

  if(isUser){
    return (
      <div className="flex justify-end">
        <div className="px-3.5 py-2 rounded-2xl rounded-br-md bg-ey-yellow text-ey-navy text-[13px] max-w-[80%] font-medium">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-start">
      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${tone==="briefing"?"bg-ey-yellow text-ey-navy":"bg-ey-navy text-ey-yellow"}`}>
        {tone==="briefing" ? "☀" : "AI"}
      </div>
      <div className="flex-1 min-w-0">
        {tone==="briefing" && (
          <div className="text-[10px] uppercase tracking-wider text-ey-gray-dark font-semibold mb-1.5">Morning briefing · {new Date().toLocaleDateString("en-IN",{weekday:"long", day:"numeric", month:"short"})}</div>
        )}
        <div className={`${tone==="briefing"?"bg-gradient-to-br from-ey-yellow-pale to-white border border-yellow-200":"bg-white border border-ey-gray-mid"} rounded-xl rounded-tl-sm px-4 py-3 ${dense?"":""}`}>
          <AIBodyRender text={msg.text} onRefClick={onRefClick}/>
          {msg.streaming && <span className="inline-block w-2 h-3.5 bg-ey-charcoal/60 align-baseline ml-0.5 animate-pulse"></span>}
        </div>
        {!msg.streaming && msg.source && (
          <div className="flex items-center gap-2 mt-1 ml-1 text-[10px] text-ey-gray-dark">
            {msg.source==="claude" ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span><span>Claude · Live data</span></>
             : msg.source==="local" ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Smart-mode answer</span></>
             : <><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span><span>Error</span></>}
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════ Composer (input + send) ════════ */
window.AIComposer = function AIComposer({onSend, thinking, placeholder, suggestions, compact}){
  const [val, setVal] = useStateAI("");
  return (
    <div className={`${compact?"px-3 py-2":"px-4 py-3"} bg-white border-t border-ey-gray-mid`}>
      {suggestions && suggestions.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar" style={{scrollbarWidth:"none"}}>
          {suggestions.map((s,i)=>(
            <button key={i} onClick={()=>onSend(s.text)}
              className="flex-shrink-0 text-[11px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-ey-gray hover:bg-ey-yellow-pale border border-ey-gray-mid hover:border-yellow-300 text-ey-charcoal transition-colors">
              <span className="text-[10px] text-ey-gray-dark">{s.icon}</span>
              <span className="whitespace-nowrap">{s.text}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={val} onChange={e=>setVal(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey && !thinking){ e.preventDefault(); if(val.trim()){ onSend(val); setVal(""); } } }}
            placeholder={placeholder || "Ask anything about your GST data…"}
            rows={1}
            className="w-full resize-none text-[13px] border border-ey-gray-mid rounded-xl pl-3.5 pr-3 py-2.5 text-ey-charcoal focus:border-ey-yellow focus:shadow-[0_0_0_3px_rgba(255,212,0,0.15)] outline-none bg-white max-h-28 leading-snug"
            style={{minHeight:40}}
          />
        </div>
        <button onClick={()=>{ if(val.trim() && !thinking){ onSend(val); setVal(""); } }}
          disabled={!val.trim() || thinking}
          className="h-10 w-10 bg-ey-yellow hover:bg-ey-yellow-dark disabled:opacity-30 text-ey-navy rounded-xl flex items-center justify-center transition-all flex-shrink-0 shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
};

/* ════════ Thinking indicator ════════ */
window.AIThinking = function AIThinking({label}){
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-lg bg-ey-navy text-ey-yellow flex items-center justify-center text-[10px] font-bold flex-shrink-0">AI</div>
      <div className="bg-white border border-ey-gray-mid rounded-xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ey-yellow animate-bounce" style={{animationDelay:"0ms"}}></span>
          <span className="w-1.5 h-1.5 rounded-full bg-ey-yellow animate-bounce" style={{animationDelay:"120ms"}}></span>
          <span className="w-1.5 h-1.5 rounded-full bg-ey-yellow animate-bounce" style={{animationDelay:"240ms"}}></span>
        </div>
        <span className="text-[11px] text-ey-gray-dark">{label || "Analysing your data…"}</span>
      </div>
    </div>
  );
};

/* ════════ Header pill (mode indicator) ════════ */
function ModeIndicator(){
  const live = !!window.__APIKEY;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${live?"bg-green-400":"bg-amber-400"}`}></span>
      <span className={`text-[10px] uppercase tracking-wider font-semibold ${live?"text-green-400":"text-amber-400"}`}>{live?"Claude · Live":"Smart mode"}</span>
    </div>
  );
}

/* ════════ Chat list (shared by all layouts) ════════ */
function ChatList({chat, onRefClick}){
  const endRef = useRefAI(null);
  useEffectAI(()=>{ endRef.current?.scrollIntoView({behavior:"smooth", block:"end"}); }, [chat.msgs, chat.thinking]);
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-ey-gray to-white">
      {chat.msgs.length===0 && !chat.thinking && (
        <div className="text-center pt-10 px-4">
          <div className="w-12 h-12 mx-auto bg-ey-yellow rounded-2xl flex items-center justify-center text-2xl mb-3">☀</div>
          <p className="text-sm font-medium text-ey-charcoal">DigiGST AI is ready</p>
          <p className="text-xs text-ey-gray-dark mt-1">Ask anything about your returns, ITC, suppliers, or compliance.</p>
        </div>
      )}
      {chat.msgs.map(m => <AIMessage key={m.id} msg={m} onRefClick={onRefClick}/>)}
      {chat.thinking && chat.msgs[chat.msgs.length-1]?.from !== "ai" && chat.msgs[chat.msgs.length-1]?.from !== "briefing" && (
        <AIThinking/>
      )}
      <div ref={endRef}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LAYOUT 1 — FLOATING BUBBLE (original, polished)
══════════════════════════════════════════════════════════ */
window.AIBubbleLayout = function AIBubbleLayout({chat, open, setOpen, onRefClick, onOpenKey}){
  useEffectAI(() => { if(open) chat.loadBriefing(); }, [open]);

  return (
    <>
      {/* FAB */}
      <button onClick={()=>setOpen(!open)}
        className="fixed bottom-6 right-6 z-[60] h-14 px-5 bg-ey-navy hover:bg-ey-navy-light text-white rounded-2xl flex items-center gap-3 shadow-[0_10px_40px_rgba(26,26,46,0.35)] transition-all hover:scale-[1.02]"
        title="DigiGST AI Assistant">
        <div className="w-8 h-8 bg-ey-yellow rounded-xl flex items-center justify-center text-ey-navy font-bold text-xs">{open?"✕":"AI"}</div>
        {!open && <div className="flex flex-col items-start leading-tight"><span className="text-[13px] font-semibold">Ask DigiGST AI</span><span className="text-[10px] text-ey-yellow opacity-80">Ctrl+/ to open</span></div>}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[59] w-[420px] max-h-[640px] h-[640px] bg-white rounded-2xl shadow-[0_24px_80px_rgba(26,26,46,0.3),0_0_0_1px_rgba(255,212,0,0.2)] flex flex-col overflow-hidden">
          <ChatHeader chat={chat} onOpenKey={onOpenKey} onClose={()=>setOpen(false)}/>
          <ChatList chat={chat} onRefClick={onRefClick}/>
          <AIComposer onSend={chat.send} thinking={chat.thinking} suggestions={SMART_QUESTIONS}/>
        </div>
      )}
    </>
  );
};

/* ══════════════════════════════════════════════════════════
   LAYOUT 2 — PERSISTENT SIDE PANEL (Cursor / Copilot style)
══════════════════════════════════════════════════════════ */
window.AISidePanelLayout = function AISidePanelLayout({chat, open, setOpen, onRefClick, onOpenKey, sidebarOffset}){
  useEffectAI(() => { if(open) chat.loadBriefing(); }, [open]);

  return (
    <>
      {/* toggle handle */}
      <button onClick={()=>setOpen(!open)}
        className={`fixed top-1/2 z-[60] -translate-y-1/2 h-20 w-7 bg-ey-navy hover:bg-ey-navy-light text-ey-yellow rounded-l-xl flex items-center justify-center shadow-lg transition-[right] ${open?"right-[400px]":"right-0"}`}
        title="Toggle AI panel">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={open?"M9 6l6 6-6 6":"M15 6l-6 6 6 6"}/></svg>
      </button>

      {open && (
        <aside className="fixed top-0 right-0 bottom-0 w-[400px] z-[55] bg-white border-l border-ey-gray-mid flex flex-col shadow-[-20px_0_40px_rgba(26,26,46,0.08)]">
          <ChatHeader chat={chat} onOpenKey={onOpenKey} onClose={()=>setOpen(false)} hideClose/>
          <ChatList chat={chat} onRefClick={onRefClick}/>
          <AIComposer onSend={chat.send} thinking={chat.thinking} suggestions={SMART_QUESTIONS}/>
        </aside>
      )}
    </>
  );
};

/* ══════════════════════════════════════════════════════════
   LAYOUT 3 — INLINE CONTEXTUAL
   A small "Ask DigiGST AI" bar on top of every page;
   clicking opens a centered modal chat scoped to that page.
══════════════════════════════════════════════════════════ */
window.AIInlineBar = function AIInlineBar({contextLabel, onOpen, suggestions}){
  return (
    <div className="bg-gradient-to-r from-ey-navy via-ey-navy-mid to-ey-navy rounded-xl p-3 mb-5 flex items-center gap-3 shadow-sm">
      <div className="w-9 h-9 bg-ey-yellow rounded-lg flex items-center justify-center text-ey-navy font-bold text-xs flex-shrink-0">AI</div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-[12px] font-medium leading-tight">Ask AI about {contextLabel}</div>
        <div className="text-ey-yellow/70 text-[10px] mt-0.5 truncate">Try: {suggestions[0]?.text}</div>
      </div>
      <button onClick={onOpen}
        className="flex-shrink-0 bg-ey-yellow hover:bg-ey-yellow-dark text-ey-navy text-[11px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5">
        Open chat
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
};

window.AIInlineModal = function AIInlineModal({chat, open, onClose, onRefClick, onOpenKey, contextLabel}){
  useEffectAI(() => { if(open) chat.loadBriefing(); }, [open]);
  if(!open) return null;
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[560px] max-w-[92vw] h-[640px] max-h-[88vh] flex flex-col overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
        <ChatHeader chat={chat} onOpenKey={onOpenKey} onClose={onClose} contextLabel={contextLabel}/>
        <ChatList chat={chat} onRefClick={onRefClick}/>
        <AIComposer onSend={chat.send} thinking={chat.thinking} suggestions={SMART_QUESTIONS}/>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   LAYOUT 4 — FULL PAGE
   Used as the AI Insights tab body. Two-column: chat + canned analyses.
══════════════════════════════════════════════════════════ */
window.AIFullPageLayout = function AIFullPageLayout({chat, onRefClick, onOpenKey}){
  useEffectAI(() => { chat.loadBriefing(); }, []);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 h-full">
      {/* main chat column */}
      <div className="bg-white rounded-xl border border-ey-gray-mid flex flex-col overflow-hidden min-h-[640px]">
        <ChatHeader chat={chat} onOpenKey={onOpenKey} hideClose large/>
        <ChatList chat={chat} onRefClick={onRefClick}/>
        <AIComposer onSend={chat.send} thinking={chat.thinking} suggestions={SMART_QUESTIONS.slice(0,4)}/>
      </div>

      {/* analysis sidebar */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-ey-gray-mid p-4">
          <div className="flex items-center gap-2 mb-3"><span className="w-1 h-4 bg-ey-yellow rounded"></span><h3 className="text-[12px] font-semibold text-ey-charcoal uppercase tracking-wider">Canned analyses</h3></div>
          <div className="space-y-1.5">
            {SMART_QUESTIONS.map((q,i)=>(
              <button key={i} onClick={()=>chat.send(q.text)}
                className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-ey-yellow-pale border border-transparent hover:border-yellow-200 transition-colors group">
                <span className="w-5 h-5 rounded bg-ey-gray group-hover:bg-ey-yellow text-ey-charcoal text-[11px] font-semibold flex items-center justify-center flex-shrink-0">{q.icon}</span>
                <span className="text-[12px] text-ey-charcoal">{q.text}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-auto text-ey-gray-dark group-hover:text-ey-navy"><path d="M9 6l6 6-6 6"/></svg>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-ey-navy to-ey-navy-mid rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2"><span className="text-ey-yellow text-sm">✦</span><h3 className="text-[12px] font-semibold uppercase tracking-wider">Data scope</h3></div>
          <p className="text-[11px] text-gray-300 mb-3 leading-relaxed">AI has live access to:</p>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-400">Returns</span><span className="text-ey-yellow font-mono">{RETURNS.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Suppliers (IMS)</span><span className="text-ey-yellow font-mono">{new Set(IMS.map(i=>i.gstin)).size}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Ledger entries</span><span className="text-ey-yellow font-mono">{LEDGER.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Anomalies</span><span className="text-ey-yellow font-mono">{ANOMALIES.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Due dates</span><span className="text-ey-yellow font-mono">{DUE_DATES.length}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════ Shared Chat Header ════════ */
function ChatHeader({chat, onOpenKey, onClose, hideClose, large, contextLabel}){
  return (
    <div className={`${large?"px-5 py-4":"px-4 py-3"} bg-ey-navy flex items-center gap-3 flex-shrink-0`}>
      <div className={`${large?"w-10 h-10":"w-9 h-9"} bg-ey-yellow rounded-xl flex items-center justify-center text-ey-navy font-bold text-sm`}>AI</div>
      <div className="flex-1 min-w-0">
        <div className={`text-white ${large?"text-[15px]":"text-[13px]"} font-semibold leading-tight`}>DigiGST AI Assistant</div>
        <div className="flex items-center gap-2 mt-0.5">
          <ModeIndicator/>
          {contextLabel && <span className="text-[10px] text-gray-400">· {contextLabel}</span>}
        </div>
      </div>
      <button onClick={chat.reset} title="New chat" className="text-gray-400 hover:text-ey-yellow w-8 h-8 rounded-lg hover:bg-ey-navy-light flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button onClick={onOpenKey} title="API key" className={`w-8 h-8 rounded-lg hover:bg-ey-navy-light flex items-center justify-center ${window.__APIKEY?"text-green-400":"text-amber-400"}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 7.65-7.65M16 8l3 3M14 10l3 3"/></svg>
      </button>
      {!hideClose && onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-white w-8 h-8 rounded-lg hover:bg-ey-navy-light flex items-center justify-center text-base">✕</button>
      )}
    </div>
  );
}
