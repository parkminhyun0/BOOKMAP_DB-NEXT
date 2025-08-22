// pages/form.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const DIVISION_OPTIONS = ["국내서", "국외서", "원서", "번역서"];
const CATEGORY_SUGGESTIONS = ["철학","역사","문학(국내)","문학(해외)","사회","정치","경제","심리","종교","예술","교육","언어","문화","과학사"];
const LEVEL_OPTIONS = ["입문","초급","중급","고급","전문"];

function InputField({ label, name, value, onChange, required=false, placeholder="", type="text" }) {
  const [showPh, setShowPh] = useState(true);
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        onFocus={()=>setShowPh(false)}
        onBlur={(e)=>setShowPh(e.target.value.trim()==="")}
        placeholder={showPh ? placeholder : ""}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function TextArea({ label, name, value, onChange, required=false, placeholder="", rows=4 }) {
  const [showPh, setShowPh] = useState(true);
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        onFocus={()=>setShowPh(false)}
        onBlur={(e)=>setShowPh(e.target.value.trim()==="")}
        placeholder={showPh ? placeholder : ""}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function ChipSelect({ label, value, onChange, options, required=false }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt)=>(
          <button
            key={opt}
            type="button"
            onClick={()=>onChange(opt)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${value===opt ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function TagsInput({ label, tags, setTags, suggestions=[], required=false, placeholder="엔터/쉼표/탭으로 추가 · 클릭으로 선택" }) {
  const [input, setInput] = useState("");
  const [showPh, setShowPh] = useState(true);
  const addTag = (t)=>{ const v=t.trim(); if(!v) return; if(!tags.includes(v)) setTags([...tags, v]); };
  const removeTag = (t)=> setTags(tags.filter((x)=>x!==t));
  const onKeyDown = (e)=>{ if(["Enter",",","Tab"].includes(e.key)){ e.preventDefault(); addTag(input); setInput(""); setShowPh(true); } };
  const filtered = suggestions.filter((s)=>s.toLowerCase().includes(input.trim().toLowerCase())).slice(0,8);
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t)=>(
          <span key={t} className="inline-flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-sm text-blue-700">
            {t}
            <button type="button" onClick={()=>removeTag(t)} className="rounded-full bg-blue-100 px-1.5 text-xs text-blue-700 hover:bg-blue-200" aria-label={`${t} 제거`}>×</button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e)=>setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={()=>setShowPh(false)}
        onBlur={(e)=>setShowPh(e.target.value.trim()==="")}
        placeholder={showPh ? placeholder : ""}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {filtered.length>0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 text-xs text-gray-500">제안 목록</div>
          <ul className="list-disc marker:text-gray-400 pl-5 space-y-1">
            {filtered.map((sug)=>(
              <li key={sug}>
                <button type="button" onClick={()=>{ addTag(sug); setInput(""); setShowPh(true); }} className="text-sm text-gray-700 hover:underline">{sug}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KorLibSearch({ onApply }) {
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("kolis");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const search = async () => {
    setErr(""); setLoading(true); setItems([]);
    try {
      const r = await fetch(
        `/api/korlib?q=${encodeURIComponent(q)}&provider=${provider}&page=1&size=20`
      );
      const j = await r.json();
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setErr("검색 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-800 mb-2">
          국립중앙도서관 검색
        </div>

        {/* 가독성 ↑ : 우측 폼과 동일한 타이포/포커스 스타일 적용 */}
        <div className="flex gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2
                       text-gray-900 focus:outline-none focus:ring-2
                       focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="kolis">KOLIS-NET</option>
            <option value="seoji">서지(ISBN)</option>
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="도서명/저자 등 입력 후 Enter"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2
                       text-gray-900 placeholder:text-gray-600 focus:outline-none
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <button
            type="button"
            onClick={search}
            className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black"
          >
            검색
          </button>
        </div>

        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-auto pr-1">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-gray-200 p-3 animate-pulse">
                <div className="h-20 w-16 rounded bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 w-4/5 rounded bg-gray-200 mb-2" />
                  <div className="h-3 w-3/5 rounded bg-gray-200 mb-1" />
                  <div className="h-3 w-2/5 rounded bg-gray-200" />
                </div>
              </div>
            ))
          : items.map((it, idx) => (
              <div key={idx} className="flex gap-3 rounded-lg border border-gray-200 p-3">
                <div className="h-20 w-16 overflow-hidden rounded bg-gray-100">
                  {it.image ? (
                    <img src={it.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gray-200" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900 line-clamp-2">{it.title}</div>
                  <div className="text-xs text-gray-700 mt-0.5 line-clamp-1">{it.author}</div>
                  <div className="text-[11px] text-gray-500 line-clamp-1">
                    {it.publisher} {it.ISBN ? `· ${it.ISBN}` : ""}
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => onApply(it)}
                      className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
                    >
                      이 항목 적용
                    </button>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
