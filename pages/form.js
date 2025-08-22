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
      const r = await fetch(`/api/korlib?q=${encodeURIComponent(q)}&provider=${provider}&page=1&size=20`);
      let j = null;
      try { j = await r.json(); } catch { /* ignore */ }
      if (!r.ok) {
        setErr(j?.error ? `오류: ${j.error}` : `오류: HTTP ${r.status}`);
        return;
      }
      setItems(Array.isArray(j?.items) ? j.items : []);
      if ((j?.items?.length ?? 0) === 0) setErr("검색 결과가 없습니다.");
    } catch {
      setErr("검색 실패(네트워크 오류)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-800 mb-2">국립중앙도서관 검색</div>

        <div className="flex gap-2 items-center">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="kolis">KOLIS-NET</option>
            <option value="seoji">서지(ISBN)</option>
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="도서명/저자 등 입력 후 Enter"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <button
            type="button"
            onClick={search}
            className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black"
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

export default function BookForm() {
  const router = useRouter();

  const [registrant, setRegistrant] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [translator, setTranslator] = useState("");
  const [publisher, setPublisher] = useState("");
  const [isbn, setIsbn] = useState("");
  const [theme, setTheme] = useState("");
  const [level, setLevel] = useState("");
  const [division, setDivision] = useState("");
  const [categories, setCategories] = useState([]);
  const [buyLink, setBuyLink] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const requiredOk = registrant && email && title && author && publisher && categories.length > 0;

  useEffect(() => {
    if (!success) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          router.push("/home");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [success, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requiredOk) {
      alert("필수 항목을 입력해주세요. (작성자/이메일/제목/저자/출판사/카테고리)");
      return;
    }
    setSubmitting(true);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const created_at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const id = String(Date.now());

    const payload = {
      id,
      created_at,
      registrant,
      email,
      "e-mail": email,
      title,
      author,
      translator,
      publisher,
      isbn,
      theme,
      level,
      division,
      category: categories.join(", "),
      buy_link: buyLink,
      image,
      description,
      reason,
    };

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || `등록 실패 (${res.status})`);
      }
      setSuccess(true);
    } catch (err) {
      alert("등록 중 오류가 발생했습니다.\n" + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const applyFromKor = (it) => {
    setTitle(it.title || "");
    setAuthor(it.author || "");
    setPublisher(it.publisher || "");
    setIsbn(it.ISBN || "");
    setImage(it.image || "");
    if (it.description) setDescription(it.description);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-extrabold text-blue-600">📝 도서 등록</h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <aside className="md:col-span-4">
            <KorLibSearch onApply={applyFromKor} />
          </aside>

          <section className="md:col-span-8">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow">
              <div className="grid gap-5">
                <InputField label="작성자 이름 (registrant)" name="registrant" value={registrant} onChange={setRegistrant} required placeholder="예: 홍길동" />
                <InputField label="이메일 (email/e-mail)" name="email" value={email} onChange={setEmail} required placeholder="예: you@example.com" type="email" />

                <InputField label="제목" name="title" value={title} onChange={setTitle} required placeholder="도서 제목" />
                <InputField label="저자" name="author" value={author} onChange={setAuthor} required placeholder="저자 전체 이름 (공백 포함 그대로)" />
                <InputField label="역자" name="translator" value={translator} onChange={setTranslator} placeholder="역자(있다면 전체 이름)" />
                <InputField label="출판사" name="publisher" value={publisher} onChange={setPublisher} required placeholder="출판사명" />
                <InputField label="ISBN" name="isbn" value={isbn} onChange={setIsbn} placeholder="예: 9781234567890" />
                <InputField label="테마" name="theme" value={theme} onChange={setTheme} placeholder="예: 철학, 역사, 과학" />

                <ChipSelect label="구분" value={division} onChange={setDivision} options={DIVISION_OPTIONS} />
                <ChipSelect label="단계" value={level} onChange={setLevel} options={LEVEL_OPTIONS} />

                <TagsInput label="카테고리" tags={categories} setTags={setCategories} suggestions={CATEGORY_SUGGESTIONS} required />

                <InputField label="구매 링크" name="buy_link" value={buyLink} onChange={setBuyLink} placeholder="https:// 예: 알라딘/예스24 등" type="url" />
                <InputField label="표지 이미지 URL" name="image" value={image} onChange={setImage} placeholder="https:// 이미지 주소(있다면)" type="url" />
                <TextArea label="소개/설명" name="description" value={description} onChange={setDescription} placeholder="책 내용을 간단히 요약해 주세요." rows={5} />
                <TextArea label="등록 이유/비고" name="reason" value={reason} onChange={setReason} placeholder="왜 이 책을 등록하나요? 추천 이유, 메모 등" rows={4} />
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button type="button" onClick={() => history.back()} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-100">
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting || !requiredOk}
                  className={`rounded-lg px-4 py-2 text-white ${submitting || !requiredOk ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {submitting ? "등록 중..." : "등록하기"}
                </button>
              </div>
            </form>

            <p className="mt-4 text-xs text-gray-500">※ ID와 등록일(created_at)은 자동 생성되어 저장됩니다.</p>
          </section>
        </div>
      </div>

      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[90%] max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-blue-700">등록해주셔서 감사합니다!</h2>
            <p className="text-gray-700">오늘도 지도 하나가 완성됐습니다.</p>
            <p className="mt-3 text-sm text-gray-500">{countdown}초 후 홈 화면으로 이동합니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
