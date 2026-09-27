"use client";

// STUB — final props (Part B §B3). Real Web Speech implementation lands next sprint.
type Props = { text: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ListenButton({ text }: Props) {
  return (
    <button
      type="button"
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-current px-5 py-3 text-start focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      <span aria-hidden="true" className="text-2xl">🔊</span>
      <span className="flex flex-col items-start">
        <span className="text-xl font-bold">سمع الشرح</span>
        <span dir="ltr" lang="fr" className="text-sm opacity-80">Écouter</span>
      </span>
    </button>
  );
}

export default ListenButton;
