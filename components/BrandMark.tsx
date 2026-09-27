/** Qra Lia logo: a paper document with a speech bubble ("the paper talks to you"). */
export default function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="qra-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-strong)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#qra-g)" />
      <path d="M14 11h13l7 7v19a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2z" fill="#fff" opacity="0.95" />
      <path d="M27 11v6a1 1 0 0 0 1 1h6" fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="16" y="22" width="12" height="2.4" rx="1.2" fill="var(--primary)" opacity="0.45" />
      <rect x="16" y="27" width="9" height="2.4" rx="1.2" fill="var(--primary)" opacity="0.45" />
      <path d="M29 26h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-3l-3.5 3v-3H29a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z" fill="var(--accent)" />
      <circle cx="31" cy="31.5" r="1.3" fill="#fff" />
      <circle cx="33.5" cy="31.5" r="1.3" fill="#fff" />
      <circle cx="36" cy="31.5" r="1.3" fill="#fff" />
    </svg>
  );
}
