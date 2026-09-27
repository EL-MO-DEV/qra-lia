type SafetyNoteProps = {
  /** Show it as a yellow banner pinned to the top instead of the quiet default row. */
  urgent?: boolean;
};

/**
 * "If this paper matters, double check with someone you trust."
 * Rendered as a quiet row at the bottom of the result card by default,
 * or as a yellow banner at the top when confidence < 0.6.
 */
export default function SafetyNote({ urgent = false }: SafetyNoteProps) {
  return (
    <div
      className={urgent ? "safety-note safety-note-urgent" : "safety-note"}
      role={urgent ? "alert" : undefined}
    >
      <span className="safety-note-icon" aria-hidden="true">
        {urgent ? "⚠️" : "🛈"}
      </span>
      <p dir="rtl">إلا كانت الورقة مهمة، تأكد مع شي حد تيق فيه</p>
    </div>
  );
}
