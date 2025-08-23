// pages/notice.js
export default function NoticePage() {
  const items = [
    { id: "n1", title: "BookMap 그래픽 뷰 정식 오픈", date: "2025-08-23", content: "관계도/필터/미리보기 지원" },
    { id: "n2", title: "도서 등록 UX 개선", date: "2025-08-21", content: "ISBN 자동 채움 보강" },
  ];
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-extrabold text-blue-600">공지사항</h1>
        <ul className="divide-y rounded-xl border bg-white">
          {items.map((it) => (
            <li key={it.id} className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">{it.title}</h2>
                <span className="text-xs text-gray-400">{it.date}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{it.content}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
