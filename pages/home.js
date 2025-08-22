import Head from "next/head";
import ShinyButton from "@/components/ShinyButton";

export default function InnerHome() {
  return (
    <>
      <Head>
        <title>BookMap · 홈</title>
      </Head>

      {/* 전체 화면 흰색 배경 */}
      <div className="relative min-h-screen bg-white">
        {/* (옵션) 나중에 배경 이미지 넣을 때: src만 바꿔서 주석 해제
        <img
          src="/your-bg.jpg"
          alt=""
          className="pointer-events-none select-none absolute inset-0 -z-10 h-full w-full object-cover opacity-10"
          aria-hidden="true"
        />
        */}

        <main className="mx-auto max-w-5xl px-6 py-14 text-center">
          <h1 className="mb-3 text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold text-gray-900">
            무엇을 하시겠어요?
          </h1>
          <p className="mb-10 text-[clamp(0.95rem,1.3vw,1.05rem)] text-gray-600">
            아래에서 빠르게 이동할 수 있어요.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ShinyButton href="/form" variant="violet">도서등록</ShinyButton>
            <ShinyButton href="/book" variant="blue">도서목록</ShinyButton>
            <ShinyButton href="/map" variant="amber">BOOK MAP</ShinyButton>
          </div>
        </main>
      </div>
    </>
  );
}
