// pages/form.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

// 단일/멀티 선택 옵션
const DIVISION_OPTIONS = ["국내서", "국외서", "원서", "번역서"];
const CATEGORY_SUGGESTIONS = [
  "철학","역사","문학(국내)","문학(해외)","사회","정치","경제","심리","종교","예술","교육","언어","문화","과학사",
];
const LEVEL_OPTIONS = ["입문","초급","중급","고급","전문"];

// 공통 인풋
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
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2
                   text-gray-900 placeholder:text-gray-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2
                   text-gray-900 placeholder:text-gray-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function ChipSelect({ label, value, onChange, options, required=false }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt)=>(
          <button
            key={opt}
            type="button"
            onClick={()=>onChange(opt)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              value===opt ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
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

  const onKeyDown = (e)=>{
    if(["Enter",",","Tab"].includes(e.key)){
      e.preventDefault();
      addTag(input);
      setInput("");
      setShowPh(true);
    }
  };

  const filtered = suggestions.filter((s)=>s.toLowerCase().includes(input.trim().toLowerCase())).slice(0,8);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </div>

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
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2
                   text-gray-900 placeholder:text-gray-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

export default function BookForm() {
  const router = useRouter();

  // 폼 상태
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

  // ISBN 자동 채움 상태
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnMsg, setIsbnMsg] = useState("");

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

 // ⬇️ 기존 autofillFromIsbn 함수만 이걸로 교체하세요.
const autofillFromIsbn = async () => {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (!/^(\d{10}|\d{13}|(\d{9}[0-9Xx]))$/.test(clean)) {
    setIsbnMsg("ISBN 형식이 올바르지 않습니다.");
    return;
  }

  setIsbnLoading(true);
  setIsbnMsg("");

  // 통일 스키마의 데이터를 받아 각 필드에 비어 있는 경우만 채워넣는 도우미
  const pick = (it) => {
    if (!it) return false;
    if (it.title) setTitle((v)=> v || it.title);
    if (it.author) setAuthor((v)=> v || it.author);
    if (it.publisher) setPublisher((v)=> v || it.publisher);
    if (it.ISBN) setIsbn(it.ISBN);
    if (it.image) setImage((v)=> v || it.image);
    if (it.description) setDescription((v)=> v || it.description);
    return true;
  };

  try {
    // ✅ 서버리스 프록시 1회 호출 (서지 → KOLIS 자동 폴백)
    const r = await fetch(`/api/korlib?provider=auto&q=${encodeURIComponent(clean)}&page=1&size=1`);
    const j = await r.json();

    if (Array.isArray(j.items) && j.items.length > 0 && pick(j.items[0])) {
      setIsbnMsg("ISBN 자동 채움 완료");
    } else {
      setIsbnMsg("해당 ISBN으로 서지정보를 찾지 못했습니다.");
    }
  } catch (e) {
    console.error(e);
    setIsbnMsg("ISBN 자동 채움 중 오류가 발생했습니다.");
  } finally {
    setIsbnLoading(false);
  }
};

  // 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requiredOk) {
      alert("필수 항목을 입력해주세요. (작성자/이메일/제목/저자/출판사/카테고리)");
      return;
    }
    setSubmitting(true);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const created_at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-extrabold text-blue-600">📝 도서 등록</h1>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow">
          <div className="grid gap-5">
            {/* 작성자 정보 */}
            <InputField label="작성자 이름 (registrant)" name="registrant" value={registrant} onChange={setRegistrant} required placeholder="예: 홍길동" />
            <InputField label="이메일 (email/e-mail)" name="email" value={email} onChange={setEmail} required placeholder="예: you@example.com" type="email" />

            {/* 도서 기본 */}
            <InputField label="제목" name="title" value={title} onChange={setTitle} required placeholder="도서 제목" />
            <InputField label="저자" name="author" value={author} onChange={setAuthor} required placeholder="저자 전체 이름 (공백 포함 그대로)" />
            <InputField label="역자" name="translator" value={translator} onChange={setTranslator} placeholder="역자(있다면 전체 이름)" />
            <InputField label="출판사" name="publisher" value={publisher} onChange={setPublisher} required placeholder="출판사명" />

            {/* ISBN + 자동 채움 */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">ISBN</label>
              <div className="flex items-stretch gap-2">
                <input
                  value={isbn}
                  onChange={(e)=>setIsbn(e.target.value)}
                  placeholder="예: 9781234567890"
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2
                             text-gray-900 placeholder:text-gray-500 focus:outline-none
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={autofillFromIsbn}
                  disabled={isbnLoading || !isbn.trim()}
                  className={`rounded-lg px-3 py-2 text-white ${isbnLoading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {isbnLoading ? "조회중..." : "자동 채움"}
                </button>
              </div>
              {isbnMsg && <p className="text-xs text-gray-500">{isbnMsg}</p>}
            </div>

            <InputField label="테마" name="theme" value={theme} onChange={setTheme} placeholder="예: 철학, 역사, 과학" />

            {/* 구분/단계 */}
            <ChipSelect label="구분" value={division} onChange={setDivision} options={DIVISION_OPTIONS} />
            <ChipSelect label="단계" value={level} onChange={setLevel} options={LEVEL_OPTIONS} />

            {/* 카테고리 */}
            <TagsInput label="카테고리" tags={categories} setTags={setCategories} suggestions={CATEGORY_SUGGESTIONS} required />

            {/* 링크/이미지/설명/메모 */}
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
