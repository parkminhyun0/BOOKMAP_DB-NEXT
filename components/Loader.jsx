// components/Loader.jsx
export default function Loader({ text = "불러오는 중...", size = 20 }) {
  const box = { width: size, height: size };

  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <span className="relative inline-flex" style={box}>
        <span className="absolute inset-0 rounded-full border-2 border-gray-300" />
        <span className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </span>
      <span className="text-sm font-medium text-gray-700">{text}</span>
      <span className="sr-only">{text}</span>
    </div>
  );
}
