export default function Loader({ text = "로딩 중..." }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="mr-3 h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
      <span className="text-gray-600">{text}</span>
    </div>
  );
}
