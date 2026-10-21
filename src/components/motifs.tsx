import type { EventType } from "@/lib/labels";

const COMMON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function WeddingArt() {
  return (
    <>
      <circle cx="86" cy="82" r="34" {...COMMON} />
      <circle cx="126" cy="82" r="34" {...COMMON} />
      <path d="M71 48c-6-9-5-17-1-23 7 5 10 11 8 19" {...COMMON} />
      <path d="M79 45c4-8 10-12 17-12-2 8-7 13-15 15" {...COMMON} />
      <path d="M146 112c7 4 13 3 18-1-4-7-11-9-18-6" {...COMMON} />
      <path d="M50 118c12-10 26-14 42-14" {...COMMON} opacity="0.45" />
      <path d="M160 54c-10 3-18 10-22 20" {...COMMON} opacity="0.45" />
      <path d="M98 18v9M93 22h10" {...COMMON} opacity="0.7" />
      <path d="M158 126v7M154 129h8" {...COMMON} opacity="0.7" />
    </>
  );
}

function BirthdayArt() {
  return (
    <>
      <path d="M66 118h98v18H66z" {...COMMON} />
      <path d="M76 118V94c0-3 3-6 6-6h66c3 0 6 3 6 6v24" {...COMMON} />
      <path d="M76 100c6-7 12-7 18 0s12 7 18 0 12-7 18 0 12 7 18 0" {...COMMON} />
      <path d="M94 88V66M115 88V60M136 88V68" {...COMMON} />
      <path d="M94 66c-3-4-3-7 0-10 3 3 3 6 0 10ZM115 60c-3-4-3-7 0-10 3 3 3 6 0 10ZM136 68c-3-4-3-7 0-10 3 3 3 6 0 10Z" {...COMMON} />
      <path d="M52 78v9M48 82h8M170 96v7M166 99h8" {...COMMON} opacity="0.6" />
      <path d="M42 58c8-4 15-4 22 0" {...COMMON} opacity="0.4" />
    </>
  );
}

function CommunityArt() {
  return (
    <>
      <path d="M70 128V86c0-16 13-29 29-29h2c16 0 29 13 29 29v42" {...COMMON} />
      <path d="M82 128V92c0-11 8-19 19-19s19 8 19 19v36" {...COMMON} opacity="0.6" />
      <path d="M58 50c14 9 28 13 42 13s28-4 42-13" {...COMMON} />
      <path d="M64 51l6 13 7-11M86 61l7 12 7-11M108 63l7 11 7-11M130 58l7 12 7-11M152 50l6 13 6-12" {...COMMON} />
      <path d="M111 128v-17c0-4 3-7 7-7s7 3 7 7v17" {...COMMON} />
      <path d="M44 88v10M39 93h10M176 72v8M172 76h8" {...COMMON} opacity="0.6" />
    </>
  );
}

/** Engraved event scene used as a visual signature. Decorative only. */
export function EventMotif({
  type,
  className = "",
}: {
  type: EventType;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 160"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
    >
      {type === "wedding" ? <WeddingArt /> : type === "birthday" ? <BirthdayArt /> : <CommunityArt />}
    </svg>
  );
}

/** Fine orbital lines and petals for plum hero surfaces. */
export function HeroOrnament({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 420"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
    >
      <ellipse cx="300" cy="210" rx="196" ry="150" stroke="currentColor" strokeOpacity="0.28" />
      <ellipse
        cx="300"
        cy="210"
        rx="152"
        ry="196"
        stroke="currentColor"
        strokeOpacity="0.16"
        transform="rotate(24 300 210)"
      />
      <circle cx="404" cy="92" r="5" fill="currentColor" fillOpacity="0.8" />
      <circle cx="122" cy="264" r="3" fill="currentColor" fillOpacity="0.6" />
      <path
        d="M436 300c-22-4-38-18-44-40 22 2 38 15 44 40Z"
        stroke="currentColor"
        strokeOpacity="0.5"
      />
      <path d="M392 260c-2 18-10 32-26 42" stroke="currentColor" strokeOpacity="0.3" />
      <path
        d="M138 122c14-14 31-20 50-17-10 17-27 26-50 17Z"
        stroke="currentColor"
        strokeOpacity="0.42"
      />
      <path d="M188 128c-8 10-19 16-33 18" stroke="currentColor" strokeOpacity="0.3" />
      <path
        d="M64 358c46-16 92-20 138-12"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeDasharray="2 7"
      />
    </svg>
  );
}

/** Compact monogram used by the shell and empty states. */
export function AtelierMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid place-items-center overflow-hidden rounded-xl bg-orchid text-plum ${className}`.trim()}
    >
      <span className="font-display text-xl leading-none">G</span>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-blush" />
    </span>
  );
}
