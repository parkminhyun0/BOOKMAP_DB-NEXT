// pages/form.js
// ─────────────────────────────────────────────────────────────────────────────
// ✅ 목표
// 1) 알라딘 OpenAPI 승인 전까지 "ISBN 자동채움" 네트워크 호출을 전면 비활성화합니다.
// 2) 버튼/메시지는 남겨서 사용자가 승인 대기 중임을 알 수 있도록 안내합니다.
// 3) 승인 후에는 아래 플래그(ENABLE_ALADIN_AUTOFILL)를 true 로만 바꾸면 즉시 활성화됩니다.
// 4) 기존 수동 입력/등록 흐름은 그대로 유지됩니다.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

// 🔒 승인 전까지 자동채움 완전 차단(네트워크 호출 없음)
const ENABLE_ALADIN_AUTOFILL = false; // ← 승인 후 true 로 변경하면 즉시 활성화

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

  // ───────────────────────────────────────────────────────────────────────────
  // 📌 ISBN 자동채움(알라딘) 임시 비활성 버전
  // - 승인 전에는 네트워크 호출을 하지 않고, 사용자 안내만 합니다.
  // - 승인 후 ENABLE_ALADIN_AUTOFILL=true 로 바꾸면 아래 주석 블록의 실제 구현을 사용하세요.
  // ───────────────────────────────────────────────────────────────────────────
  const autofillFromIsbn = async () => {
    // 1) 기본 형식 점검(사용자 오타 안내)
    const clean = isbn.replace(/[^0-9Xx]/g, "");
    if (!/^(\d{10}|\d{13}|(\d{9}[0-9Xx]))$/.test(clean)) {
      setIsbnMsg("ISBN 형식이 올바르지 않습니다.");
      return;
    }

    // 2) 승인 전에는 클릭 시 안내만 표시(네트워크 호출 없음)
    if (!ENABLE_ALADIN_AUTOFILL) {
      setIsbnLoading(false);
      setIsbnMsg("알라딘 OpenAPI 승인 대기 중입니다. 승인 완료 후 자동채움이 활성화됩니다.");
      return;
    }

    // ───────────────────────────────────────────────────────────────────────
    // 🔽 승인 후 실제 구현을 사용하려면, 아래 블록의 주석을 해제하세요.
    // (동시에 상단 플래그 ENABLE_ALADIN_AUTOFILL 을 true 로 변경)
    //
    // setIsbnLoading(true);
    // setIsbnMsg("");
    //
    // const pick = (it) => {
    //   if (!it) return false;
    //   if (it.title) setTitle((v)=> v || it.title);
    //   if (it.author) setAuthor((v)=> v || it.author);
    //   if (it.publisher) setPublisher((v)=> v || it.publisher);
    //   if (it.ISBN) setIsbn(it.ISBN);
    //   if (it.image) setImage((v)=> v || it.image);
    //   if (it.description) setDescription((v)=> v || it.description);
    //   if (it.link) setBuyLink((v)=> v || it.link); // 알라딘 구매 링크 자동 채움(정책 준수)
    //   return true;
    // };
    //
    // try {
    //   const r = await fetch(`/api/aladin?isbn=${encodeURIComponent(clean)}`);
    //   const j = await r.json();
    //   if (j?.error) {
    //     if (j.error.errCode === 4) {
    //       setIsbnMsg("알라딘 OpenAPI 승인 대기 상태입니다. 승인 후 자동채움이 활성화됩니다.");
    //     } else {
    //       setIsbnMsg(`알라딘 응답 오류(${j.error.errCode}): ${j.error.errMsg || "잠시 후 다시 시도해 주세요."}`);
    //     }
    //     return;
    //   }
    //   if (Array.isArray(j.items) && j.items.length > 0 && pick(j.items[0])) {
    //     setIsbnMsg("알라딘 OpenAPI에서 자동 채움 완료");
    //   } else {
    //     setIsbnMsg("해당 ISBN으로 도서를 찾지 못했습니다.");
    //   }
    // } catch (e) {
    //   setIsbnMsg("ISBN 자동 채움 중 오류가 발생했습니다.");
    // } finally {
    //   setIsbnLoading(false);
    // }
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
                  disabled={isbnLoading || !isbn.trim() || !ENABLE_ALADIN_AUTOFILL}
                  title={ENABLE_ALADIN_AUTOFILL ? "ISBN으로 자동 채움" : "알라딘 OpenAPI 승인 대기 중입니다."}
                  className={`rounded-lg px-3 py-2 text-white ${
                    (isbnLoading || !isbn.trim() || !ENABLE_ALADIN_AUTOFILL)
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {ENABLE_ALADIN_AUTOFILL ? (isbnLoading ? "조회중..." : "자동 채움") : "자동 채움(승인 대기)"}
                </button>
              </div>
              {/* 안내 문구: 승인 전에는 고정 메시지, 그 외에는 동적 메시지 */}
              {!ENABLE_ALADIN_AUTOFILL && (
                <p className="text-xs text-gray-500 mt-1">알라딘 OpenAPI 승인 전이므로 자동채움은 비활성화되어 있습니다.</p>
              )}
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
        <p className="mt-2 text-xs text-gray-500">도서 DB 제공 : 알라딘 인터넷서점(www.aladin.co.kr)</p>
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
