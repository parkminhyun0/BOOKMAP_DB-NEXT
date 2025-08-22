// pages/form.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

/* -----------------------------------------------------------
   사용자 옵션 (필요 시 여기만 수정)
----------------------------------------------------------- */
// 구분(단일 선택)
const DIVISION_OPTIONS = ["국내서", "국외서", "원서", "번역서"];

// 카테고리(멀티 선택 + 자유추가) — 인문학 중심 기본 예시
const CATEGORY_SUGGESTIONS = [
  "철학", "역사", "문학(국내)", "문학(해외)", "사회", "정치",
  "경제", "심리", "종교", "예술", "교육", "언어", "문화", "과학사",
];

// 단계(단일 선택)
const LEVEL_OPTIONS = ["입문", "초급", "중급", "고급", "전문"];

/* -----------------------------------------------------------
   공통 입력 UI — placeholder 가독성↑ + 포커스 시 숨김
----------------------------------------------------------- */
function InputField({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = "",
  type = "text",
}) {
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
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowPh(false)}
        onBlur={(e) => setShowPh(e.target.value.trim() === "")}
        placeholder={showPh ? placeholder : ""}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2
                   text-gray-900 placeholder:text-gray-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = "",
  rows = 4,
}) {
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
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowPh(false)}
        onBlur={(e) => setShowPh(e.target.value.trim() === "")}
        placeholder={showPh ? placeholder : ""}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2
                   text-gray-900 placeholder:text-gray-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

// 단일 선택 칩(구분/단계 등)
function ChipSelect({ label, value, onChange, options, required = false }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-full border px-3 py-1.5 text-sm transition
                ${active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 멀티 태그 입력(카테고리) — 제안 + 자유 추가
function TagsInput({
  label,
  tags,
  setTags,
  suggestions = [],
  required = false,
  placeholder = "엔터/쉼표/탭으로 추가 · 클릭으로 선택",
}) {
  const [input, setInput] = useState("");
  const [showPh, setShowPh] = useState(true);

  const addTag = (t) => {
    const tag = t.trim();
    if (!tag) return;
    if (!tags.includes(tag)) setTags([...tags, tag]);
  };
  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag));

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      addTag(input);
      setInput("");
      setShowPh(true);
    }
  };

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(input.trim().toLowerCase()))
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </div>

      {/* 선택된 태그 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-sm text-blue-700"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="rounded-full bg-blue-100 px-1.5 text-xs text-blue-700 hover:bg-blue-200"
              aria-label={`${t} 제거`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* 입력창 */}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setShowPh(false)}
        onBlur={(e) => setShowPh(e.target.value.trim() === "")}
        placeholder={showPh ? placeholder : ""}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2
                   text-gray-900 placeholder:text-gray-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {/* 제안 목록 — 마크다운 느낌의 리스트 */}
      {filtered.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 text-xs text-gray-500">제안 목록</div>
          <ul className="list-disc marker:text-gray-400 pl-5 space-y-1">
            {filtered.map((sug) => (
              <li key={sug}>
                <button
                  type="button"
                  onClick={() => {
                    addTag(sug);
                    setInput("");
                    setShowPh(true);
                  }}
                  className="text-sm text-gray-700 hover:underline"
                >
                  {sug}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------
   본문 페이지
----------------------------------------------------------- */
export default function BookForm() {
  const router = useRouter();

  // ❌ ID 입력은 받지 않습니다(자동 생성).
  // 폼 상태
  const [registrant, setRegistrant] = useState(""); // 작성자 이름 (header: registrant)
  const [email, setEmail] = useState("");           // 작성자 이메일 (header: email 또는 e-mail)
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [translator, setTranslator] = useState("");
  const [publisher, setPublisher] = useState("");
  const [isbn, setIsbn] = useState("");
  const [theme, setTheme] = useState("");
  const [level, setLevel] = useState("");
  const [division, setDivision] = useState("");
  const [categories, setCategories] = useState([]); // 멀티
  const [buyLink, setBuyLink] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // 제출 성공 안내 & 카운트다운
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // 필수값 검증
  const requiredOk =
    registrant && email && title && author && publisher && categories.length > 0;

  // 성공 시 3초 카운트다운 후 /home 이동
  useEffect(() => {
    if (!success) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push("/home");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [success, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requiredOk) {
      alert("필수 항목을 입력해주세요. (작성자/이메일/제목/저자/출판사/카테고리)");
      return;
    }
    setSubmitting(true);

    // 자동 생성 필드
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const created_at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const id = String(Date.now());

    // ⚠️ 시트 헤더에 맞춰 key 구성
    //  - 'email' vs 'e-mail' 헤더 혼용 가능성을 대비해 둘 다 전달
    const payload = {
      id,
      created_at,
      registrant,          // 작성자 이름
      email,               // 헤더가 email 인 경우
      "e-mail": email,     // 헤더가 e-mail 인 경우
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

      // 성공 안내 → 3초 후 /home 이동
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("등록 중 오류가 발생했습니다.\n" + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-extrabold text-blue-600">📝 도서 등록</h1>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow"
        >
          {/* ID 입력 필드 제거(자동 생성) */}

          <div className="grid gap-5">
            {/* 작성자 정보 */}
            <InputField
              label="작성자 이름 (registrant)"
              name="registrant"
              value={registrant}
              onChange={setRegistrant}
              required
              placeholder="예: 홍길동"
            />
            <InputField
              label="이메일 (email/e-mail)"
              name="email"
              value={email}
              onChange={setEmail}
              required
              placeholder="예: you@example.com"
              type="email"
            />

            {/* 도서 기본 */}
            <InputField
              label="제목"
              name="title"
              value={title}
              onChange={setTitle}
              required
              placeholder="도서 제목"
            />
            <InputField
              label="저자"
              name="author"
              value={author}
              onChange={setAuthor}
              required
              placeholder="저자 전체 이름 (공백 포함 그대로)"
            />
            <InputField
              label="역자"
              name="translator"
              value={translator}
              onChange={setTranslator}
              placeholder="역자(있다면 전체 이름)"
            />
            <InputField
              label="출판사"
              name="publisher"
              value={publisher}
              onChange={setPublisher}
              required
              placeholder="출판사명"
            />
            <InputField
              label="ISBN"
              name="isbn"
              value={isbn}
              onChange={setIsbn}
              placeholder="예: 9781234567890"
            />
            <InputField
              label="테마"
              name="theme"
              value={theme}
              onChange={setTheme}
              placeholder="예: 철학, 역사, 과학"
            />

            {/* 구분/단계 */}
            <ChipSelect
              label="구분"
              value={division}
              onChange={setDivision}
              options={DIVISION_OPTIONS}
            />
            <ChipSelect
              label="단계"
              value={level}
              onChange={setLevel}
              options={LEVEL_OPTIONS}
            />

            {/* 카테고리(멀티 태그 + 제안/자유추가) */}
            <TagsInput
              label="카테고리"
              tags={categories}
              setTags={setCategories}
              suggestions={CATEGORY_SUGGESTIONS}
              required
            />

            {/* 링크/이미지/설명/메모 */}
            <InputField
              label="구매 링크"
              name="buy_link"
              value={buyLink}
              onChange={setBuyLink}
              placeholder="https:// 예: 알라딘/예스24 등"
              type="url"
            />
            <InputField
              label="표지 이미지 URL"
              name="image"
              value={image}
              onChange={setImage}
              placeholder="https:// 이미지 주소(있다면)"
              type="url"
            />
            <TextArea
              label="소개/설명"
              name="description"
              value={description}
              onChange={setDescription}
              placeholder="책 내용을 간단히 요약해 주세요."
              rows={5}
            />
            <TextArea
              label="등록 이유/비고"
              name="reason"
              value={reason}
              onChange={setReason}
              placeholder="왜 이 책을 등록하나요? 추천 이유, 메모 등"
              rows={4}
            />
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => history.back()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || !requiredOk}
              className={`rounded-lg px-4 py-2 text-white ${
                submitting || !requiredOk
                  ? "bg-blue-300"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {submitting ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          ※ ID와 등록일(created_at)은 자동 생성되어 저장됩니다.
        </p>
      </div>

      {/* 성공 안내 오버레이 */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[90%] max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-blue-700">
              등록해주셔서 감사합니다!
            </h2>
            <p className="text-gray-700">
              오늘도 지도 하나가 완성됐습니다.
            </p>
            <p className="mt-3 text-sm text-gray-500">
              {countdown}초 후 홈 화면으로 이동합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
