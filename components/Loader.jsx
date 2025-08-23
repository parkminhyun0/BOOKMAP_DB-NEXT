// components/Loader.jsx
export default function Loader({ text = "불러오는 중..." }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative inline-flex h-5 w-5">
        <span className="absolute inset-0 rounded-full border-2 border-gray-300" />
        <span className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </span>
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </div>
  );
}
