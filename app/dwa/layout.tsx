import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الدوا — Qra Lia",
  description: "صوّر الوصفة ولا العلبة ديال الدوا ونقولو ليك شنو تاخد وفوقاش · Comprendre vos médicaments",
};

export default function MedsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
