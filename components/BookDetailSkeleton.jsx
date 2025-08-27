export default function BookDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow animate-pulse">
      <div className="flex gap-6">
        <div className="w-40 h-60 bg-gray-200 rounded" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/4 bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
