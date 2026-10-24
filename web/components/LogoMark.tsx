// The RipWatch mark: a line of breaking waves with a gap in the middle, and the wave beyond it
// pulled outward into a point, which is how a rip current looks from shore. Same paths as
// web/app/icon.svg and docs/assets/logo.svg; change all three together.
export default function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="RipWatch"
    >
      <rect width="32" height="32" rx="8" fill="#10161f" />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        fill="none"
        stroke="#4fb8ac"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <g fill="none" stroke="#4fb8ac" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 25c2.4 0 3.2-1.6 5.5-1.6 1.4 0 2.2.6 3.1 1.1" />
        <path d="M27 25c-2.4 0-3.2-1.6-5.5-1.6-1.4 0-2.2.6-3.1 1.1" />
        <path d="M5 18.5c2.6 0 4.2-1.2 6-2.4 1.6-1.1 3-3 5-5.6 2 2.6 3.4 4.5 5 5.6 1.8 1.2 3.4 2.4 6 2.4" />
      </g>
    </svg>
  );
}
