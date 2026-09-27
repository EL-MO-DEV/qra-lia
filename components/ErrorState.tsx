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

/** True when the case benefits from the "how to take a good photo" tip block. */
function showTips(error: ErrorStateKind): boolean {
  if (error.kind === "unreadable" || error.kind === "not_a_document") return true;
  if (error.kind === "api" && error.error.error === "invalid_input") return true;
  return false;
}

function iconFor(error: ErrorStateKind): string {
  if (error.kind === "unreadable") return "🌫️";
  if (error.kind === "not_a_document") return "📄";
  if (error.kind === "api" && error.error.error === "network") return "📶";
  if (error.kind === "api" && error.error.error === "rate_limited") return "⏳";
  return "🧐";
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="card error-card" role="alert">
      <p className="error-icon" aria-hidden="true">
        {iconFor(error)}
      </p>
      <p className="error-message">{messageFor(error)}</p>

      {showTips(error) && (
        <ul className="error-tips">
          <li>💡 فضو مزيان، بلا ظل على الورقة</li>
          <li>💡 الورقة كاملة فالتصويرة، من الفوق</li>
          <li>💡 ما تحركش التيليفون حتى تصوّر</li>
        </ul>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={onRetry}>
        <span aria-hidden="true">📸</span> عاود صوّر
        <span className="fr" lang="fr" style={{ display: "inline", color: "inherit", opacity: 0.85 }}>
          Réessayer
        </span>
      </button>
    </div>
  );
}
