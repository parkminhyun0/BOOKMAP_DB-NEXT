import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import BookDetailSkeleton from "@/components/BookDetailSkeleton";

export default function BookDetail() {
  const router = useRouter();

  // book: undefined=아직 안 불러옴, null=불러왔지만 없음, object=정상
  const [book, setBook] = useState(undefined);
  const [status, setStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [showSkeleton, setShowSkeleton] = useState(false); // 스켈레톤 지연

  // 스켈레톤 250ms 지연(깜빡임 방지)
  useEffect(() => {
    let t;
    if (status === "loading") t = setTimeout(() => setShowSkeleton(true), 250);
    else setShowSkeleton(false);
    return () => clearTimeout(t);
  }, [status]);

  const normalizeId = (v) => {
    const s = Array.isArray(v) ? v[0] : v;
    return String(s ?? "").trim();
  };

  useEffect(() => {
    if (!router.isReady) return;

    const paramId = normalizeId(router.query.id);
    if (!paramId) return;

    const controller = new AbortController();
    setStatus("loading");
    setBook(undefined);
    setError(null);

    fetch("/api/books", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("서버 응답이 올바르지 않습니다.");
        return res.json();
      })
      .then((data) => {
        const found =
          data.find((b) => normalizeId(b.id) === paramId) ??
          data.find((b) => Number(b.id) === Number(paramId));
        setBook(found ?? null);
        setStatus("success");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message || "알 수 없는 오류가 발생했습니다.");
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [router.isReady, router.query.id]);

  // ✅ 로딩 중에는 오직 로딩 UI만
  if (status === "loading") {
    return (
      <div className="p-10 bg-gray-50 min-h-screen" aria-busy="true">
        {showSkeleton ? (
          <>
            <BookDetailSkeleton />
            <Loader text="상세 정보를 불러오는 중..." />
          </>
        ) : (
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow h-60" />
        )}
      </div>
    );
  }

  // 에러
  if (status === "error") {
    return (
      <div className="p-10 bg-gray-50 min-h-screen">
        <p className="mb-4 text-red-600">
          불러오는 중 문제가 발생했어요: {error}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            ← 뒤로가기
          </button>
          <Link
            href="/book"
            className="px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Not Found (데이터 로드 성공했지만 해당 id 없음)
  if (status === "success" && book === null) {
    return (
      <div className="p-10 bg-gray-50 min-h-screen">
        <p className="mb-4 text-red-600">해당 책을 찾을 수 없어요.</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            ← 뒤로가기
          </button>
          <Link
            href="/book"
            className="px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 정상 뷰
  return (
    <>
      <Head>
        <title>{book.title} · BookMap</title>
        <meta name="description" content={book.description?.slice(0, 140)} />
      </Head>

      <div className="p-10 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="px-3 py-1.5 rounded border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
              aria-label="뒤로가기"
            >
              ← 뒤로가기
            </button>
            <Link
              href="/book"
              className="px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              목록으로 돌아가기
            </Link>
          </div>

          <div className="flex gap-6">
            <img
              src={book.image}
              alt={book.title}
              className="w-40 h-60 object-cover rounded"
            />
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900">{book.title}</h1>
              <p className="text-gray-600">저자: {book.author}</p>
              <p className="text-gray-500">출판사: {book.publisher}</p>
              <p className="text-gray-400 text-sm mb-4">{book.category}</p>
              <p className="text-gray-700 mb-4">{book.description}</p>
              <a
                href={book.buy_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-blue-600 hover:underline"
              >
                구매하기 →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
