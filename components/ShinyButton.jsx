import Link from "next/link";

const glow = {
  blue: "from-blue-500 via-sky-400 to-emerald-400",
  violet: "from-violet-500 via-fuchsia-400 to-pink-500",
  amber: "from-amber-400 via-orange-400 to-rose-400",
};

export default function ShinyButton({
  href = "#",
  children,
  variant = "blue",
}) {
  return (
    <Link href={href} className="group relative inline-flex items-center justify-center focus:outline-none">
      <span className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${glow[variant]} opacity-70 blur-md transition duration-500 group-hover:opacity-100`} />
      <span className="relative z-10 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 sm:px-7 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.02]">
        {/* 책 아이콘 */}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
             viewBox="0 0 24 24" fill="none" className="opacity-90">
          <path d="M6 4h11a2 2 0 0 1 2 2v12a1 1 0 0 1-1.447.894L15 18.118l-2.553.776A1 1 0 0 1 11 18V6a2 2 0 0 0-2-2H6z"
                stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 4a2 2 0 0 0-2 2v12"
                stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>{children}</span>
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <span className="absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:translate-x-[180%]" />
        </span>
      </span>
    </Link>
  );
}
