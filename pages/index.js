import Head from "next/head";
import Link from "next/link";

function ShinyButton({ href = "/home", children = "BOOK MAP LOGIN" }) {
  return (
    <Link href={href} className="group relative inline-flex items-center justify-center focus:outline-none">
      {/* 외곽 글로우 */}
      <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 opacity-70 blur-md transition duration-500 group-hover:opacity-100" />
      {/* 버튼 본체 */}
      <span className="relative z-10 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 sm:px-7 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.02]">
        {/* 아이콘 */}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
          <path d="M6 4h11a2 2 0 0 1 2 2v12a1 1 0 0 1-1.447.894L15 18.118l-2.553.776A1 1 0 0 1 11 18V6a2 2 0 0 0-2-2H6z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 4a2 2 0 0 0-2 2v12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>{children}</span>
        {/* 하이라이트 샤인 */}
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <span className="absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:translate-x-[180%]" />
        </span>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <>
      <Head>
        <title>BookMap · 독서의 지도</title>
        <meta
          name="description"
          content="환영합니다. 이곳은 독서의 지도를 만드는 곳, BOOK MAP입니다."
        />
      </Head>

      {/* 배경 */}
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-200/60 via-sky-200/50 to-emerald-200/60 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0000000c_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* 콘텐츠 */}
        <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl md:max-w-5xl lg:max-w-6xl flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 text-[clamp(0.75rem,1.5vw,0.95rem)] font-medium tracking-wide text-blue-600">
            WELCOME
          </p>

          {/* 헤드라인: 화면에 맞게 유동적으로 */}
          <h1
            className="
              mb-4
              font-extrabold
              leading-[1.15]
              text-gray-900
              [text-wrap:balance]
              text-[clamp(1.75rem,4.5vw,2.75rem)]
            "
          >
            환영합니다. 이곳은 <span className="whitespace-nowrap">독서의 지도를</span> 만드는 곳.
          </h1>

          {/* BOOK MAP 라인 강조 (조금 더 큼) */}
          <h2
            className="
              mb-6
              font-extrabold
              leading-tight
              text-blue-600
              [text-wrap:balance]
              text-[clamp(2rem,5.5vw,3rem)]
            "
          >
            BOOK MAP 입니다.
          </h2>

          {/* 서브 카피 */}
          <p className="mb-10 text-[clamp(0.9rem,1.3vw,1.05rem)] text-gray-600 max-w-3xl [text-wrap:balance]">
            여러분들의 독서 경험을 통해, 많은 사람들에게 유익한{" "}
            <span className="font-semibold text-gray-800">BOOK MAP</span>을 만듭니다.
          </p>

          <ShinyButton>BOOK MAP LOGIN</ShinyButton>

          <p className="mt-10 text-xs text-gray-400">© {new Date().getFullYear()} BookMap</p>
        </main>
      </div>
    </>
  );
}
