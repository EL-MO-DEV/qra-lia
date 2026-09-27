import type { Metadata } from "next";
import InstallPrompt from "@/components/InstallPrompt";
import ListenButton from "@/components/ListenButton";
import ReminderButton from "@/components/ReminderButton";
import ShareButton from "@/components/ShareButton";
import { MOCK_OK, MOCK_SCAM } from "@/lib/mock";
import type { ReadResult } from "@/lib/types";

// Dev-only test bench for the feature buttons (Part B). Not linked from the app.
export const metadata: Metadata = {
  title: "Dev features — Qra Lia",
  robots: { index: false, follow: false },
};

const CASES: { name: string; result: ReadResult }[] = [
  { name: "MOCK_OK", result: MOCK_OK },
  { name: "MOCK_SCAM", result: MOCK_SCAM },
];

export default function DevFeaturesPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-8 px-4 py-6">
      <h1 className="text-2xl font-bold">🧪 Dev features</h1>

      <InstallPrompt />

      {CASES.map(({ name, result }) => (
        <section key={name} className="flex flex-col gap-3">
          <h2 dir="ltr" className="font-mono text-sm opacity-80">
            {name}
          </h2>
          <p className="text-xl leading-loose">{result.darija_summary}</p>
          <ListenButton text={result.darija_summary} />
          <ShareButton result={result} />
          <ReminderButton result={result} />
        </section>
      ))}
    </main>
  );
}
