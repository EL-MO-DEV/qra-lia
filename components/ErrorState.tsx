import type { ClientError } from "@/lib/api";

export type ErrorStateKind =
  | { kind: "unreadable" }
  | { kind: "not_a_document" }
  | { kind: "api"; error: ClientError };

type ErrorStateProps = {
  error: ErrorStateKind;
  onRetry: () => void;
};

function messageFor(error: ErrorStateKind): string {
  switch (error.kind) {
    case "unreadable":
      return "الصورة ما واضحاش. عاود صوّر فضو مزيان وبلا ما تحرك التيليفون.";
    case "not_a_document":
      return "هادي ما باناتش ورقة. صوّر الورقة كاملة من الفوق.";
    case "api":
      switch (error.error.error) {
        case "invalid_input":
        case "image_too_large":
          return "ما قدرناش نقراو هاد الصورة. جرب صورة أخرى.";
        case "rate_limited":
          return "بزاف ديال الطلبات. تسنى دقيقة وعاود.";
        case "ai_unavailable":
          return error.error.darija_message ?? "ما قدرناش نقراو هاد الورقة دابا. عاود بعد شوية.";
        case "network":
          return "كاين مشكل فالأنترنت. عاود من بعد شوية.";
        case "internal":
        default:
          return "كاين مشكل. عاود من بعد شوية.";
      }
  }
}

/** True when the case benefits from the "unreadable photo" tip block. */
function showTips(error: ErrorStateKind): boolean {
  if (error.kind === "unreadable") return true;
  if (error.kind === "api" && error.error.error === "invalid_input") return true;
  return false;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="screen error-screen">
      <div className="error-card">
        <p className="error-icon" aria-hidden="true">
          🧐
        </p>
        <p className="error-message" dir="rtl">
          {messageFor(error)}
        </p>

        {showTips(error) && (
          <ul className="error-tips" dir="rtl">
            <li>💡 فضو مزيان</li>
            <li>💡 الورقة كاملة فالتصويرة</li>
            <li>💡 ما تحركش التيليفون</li>
          </ul>
        )}

        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <span aria-hidden="true">📸</span> <span dir="rtl">صوّر ورقة أخرى</span>
        </button>
      </div>
    </div>
  );
}
