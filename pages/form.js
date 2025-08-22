// pages/form.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

/* 사용자 옵션 */
const DIVISION_OPTIONS = ["국내서", "국외서", "원서", "번역서"];
const CATEGORY_SUGGESTIONS = [
  "철학", "역사", "문학(국내)", "문학(해외)", "사회", "정치",
  "경제", "심리", "종교", "예술", "교육", "언어", "문화", "과학사",
];
const LEVEL_OPTIONS = ["입문", "초급", "중급", "고급", "전문"];

/* 공통 입력 UI */
function InputField({ label, name, value, onChange, required = false, placeholder = "", type = "text" }) {
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

function TextArea({ label, name, value, onChange, required = false, placeholder = "", rows = 4 }) {
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

/* 본문 페이지 */
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

  const requiredOk =
    registrant && email && title && author && publisher && categories.length > 0;

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

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const created_at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
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
      console.error(err);
      alert("등록 중 오류가 발생했습니다.\n" + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* 좌측: 국립중앙도서관 API 검색 */
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("kolis"); // kolis | seoji
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (page = 1) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await fetch(
        `/api/korlib?q=${encodeURIComponent(q)}&provider=${provider}&page=${page}&size=20`
      );
      const data = await r.json();
      setResults(Array.isArray(data.items) ? data.items : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pick = (item) => {
    if (item?.title) setTitle(item.title);
    if (item?.author) setAuthor(item.author);
    if (item?.publisher) setPublisher(item.publisher);
    if (item?.ISBN) setIsbn(item.ISBN);
    if (item?.image) setImage(item.image);
    if (item?.description) setDescription(item.description);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <h1 className="text-2xl font-extrabold text-blue-600">도서 등록</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
          {/* 좌측 검색 패널 */}
          <aside className="md:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">도서 검색</h2>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="rounded-md border-gray-300 text-sm"
                >
                  <option value="kolis">KOLIS-NET</option>
                  <option value="seoji">서지(ISBN)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="제목/저자/ISBN 검색"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => search()}
                  disabled={searching}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {searching ? "검색중…" : "검색"}
                </button>
              </div>

              <div className="mt-4 h-[520px] overflow-auto">
                {results.length === 0 && !searching && (
                  <p className="text-sm text-gray-400">검색 결과가 여기 표시됩니다.</p>
                )}
                <ul className="space-y-3">
                  {results.map((b, i) => (
                    <li
                      key={`${b.ISBN || b.title}-${i}`}
                      className="rounded-lg border border-gray-200 p-3 hover:border-blue-400"
                    >
                      <div className="flex gap-3">
                        <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                          {b.image ? (
                            <img alt={b.title} src={b.image} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{b.title}</p>
                          <p className="truncate text-xs text-gray-500">{b.author}</p>
                          <p className="truncate text-xs text-gray-400">
                            {b.publisher} {b.pub_year ? `· ${b.pub_year}` : ""} {b.ISBN ? `· ${b.ISBN}` : ""}
                          </p>
                          <div className="mt-2">
                            <button
                              onClick={() => pick(b)}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                            >
                              이 항목 적용
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-3 text-[11px] text-gray-400">국립중앙도서관 Open API 결과를 사용합니다.</p>
            </div>
          </aside>

          {/* 우측 폼 */}
          <section className="md:col-span-5">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow">
              <div className="grid gap-5">
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

                <InputField label="제목" name="title" value={title} onChange={setTitle} required placeholder="도서 제목" />
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
                <InputField label="ISBN" name="isbn" value={isbn} onChange={setIsbn} placeholder="예: 9781234567890" />
                <InputField label="테마" name="theme" value={theme} onChange={setTheme} placeholder="예: 철학, 역사, 과학" />

                <ChipSelect label="구분" value={division} onChange={setDivision} options={DIVISION_OPTIONS} />
                <ChipSelect label="단계" value={level} onChange={setLevel} options={LEVEL_OPTIONS} />

                <TagsInput
                  label="카테고리"
                  tags={categories}
                  setTags={setCategories}
                  suggestions={CATEGORY_SUGGESTIONS}
                  required
                />

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
                    submitting || !requiredOk ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                  }`}
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
