// pages/event.js
export default function EventPage() {
  const items = [
    { id: "e1", title: "9월 독서 이벤트", date: "2025-09-01 ~ 09-30", content: "올해의 책을 추천해주세요!" },
    { id: "e2", title: "신규 회원 추천 이벤트", date: "상시", content: "추천하면 굿즈 증정" },
  ];
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-extrabold text-blue-600">이벤트</h1>
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
