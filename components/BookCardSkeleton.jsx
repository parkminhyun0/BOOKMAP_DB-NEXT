export default function BookCardSkeleton() {
  return (
    <li className="p-6 bg-white rounded-xl shadow">
      <div className="flex gap-6 animate-pulse">
        <div className="w-28 h-40 bg-gray-200 rounded" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-2/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/4 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
        </div>
      </div>
    </li>
  );
}
