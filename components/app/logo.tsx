// The ComeCollectZA mark: a "C" that cups a coin, with a leaf growing from it. Simple on purpose, so it stays
// clear at 16 px on a home screen and at 512 px on a poster. The same drawing makes the app icons.
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="ComeCollectZA" className={className}>
      <rect width="512" height="512" rx="116" fill="#0F4A2A" />
      <path d="M331 179 A118 118 0 1 0 331 345" fill="none" stroke="#FFFFFF" strokeWidth="58" strokeLinecap="round" />
      <circle cx="272" cy="262" r="46" fill="#A6E85A" />
      <path d="M338 166 C352 118 402 108 426 122 C424 176 382 200 338 166 Z" fill="#A6E85A" />
    </svg>
  );
}

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span className={"flex min-w-0 items-center gap-2 " + (className ?? "")}>
      <LogoMark size={size} className="shrink-0" />
      <span className="truncate text-xl font-extrabold tracking-tight">
        ComeCollect<span className="text-primary">ZA</span>
      </span>
    </span>
  );
}
