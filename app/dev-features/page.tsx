import type { Metadata } from "next";
import InstallPrompt from "@/components/InstallPrompt";
import ListenButton from "@/components/ListenButton";
import ReminderButton from "@/components/ReminderButton";
import ShareButton from "@/components/ShareButton";
import { MOCK_OK, MOCK_SCAM } from "@/lib/mock";
import { buildShareText } from "@/lib/share";
import type { ReadResult } from "@/lib/types";
import VoiceDebug from "./VoiceDebug";
import VoicePicker from "./VoicePicker";

// Dev-only test bench for the feature buttons (Part B). Not linked from the app.
export const metadata: Metadata = {
  title: "Dev features — Qra Lia",
  robots: { index: false, follow: false },
};

const CASES: { name: string; result: ReadResult }[] = [
  { name: "MOCK_OK", result: MOCK_OK },
  { name: "MOCK_SCAM", result: MOCK_SCAM },
  {
    // Long text + a decimal amount: checks sentence splitting and number formatting.
    name: "LONG_TEXT",
    result: {
      ...MOCK_OK,
      amount: { value: 1234.5, currency: "MAD" },
      darija_summary: Array(4).fill(MOCK_OK.darija_summary).join(" "),
    },
  },
];

export default function DevFeaturesPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-8 px-4 py-6">
      <h1 className="text-2xl font-bold">🧪 Dev features</h1>

      <InstallPrompt />
      <VoicePicker />
      <VoiceDebug />

      {CASES.map(({ name, result }) => (
        <section key={name} className="flex flex-col gap-3">
          <h2 dir="ltr" className="font-mono text-sm opacity-80">
            {name}
          </h2>
          <p className="text-xl leading-loose">{result.darija_summary}</p>
          <ListenButton text={result.darija_summary} />
          <ShareButton result={result} />
          <ReminderButton result={result} />
          <details>
            <summary className="cursor-pointer text-sm opacity-80">Share text</summary>
            <pre className="whitespace-pre-wrap text-base leading-relaxed">{buildShareText(result)}</pre>
          </details>
        </section>
      ))}
    </main>
  );
}
