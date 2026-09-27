type SafetyNoteProps = {
  /** Show it as a yellow banner pinned to the top instead of the quiet default row. */
  urgent?: boolean;
};

/**
 * "If this paper matters, double check with someone you trust."
 * Quiet row at the bottom of the result by default,
 * or a yellow banner at the top when confidence < 0.6.
 */
export default function SafetyNote({ urgent = false }: SafetyNoteProps) {
  return (
    <div className={urgent ? "safety safety-urgent" : "safety"} role={urgent ? "alert" : undefined}>
      <span className="safety-icon" aria-hidden="true">
        {urgent ? "⚠️" : "🤝"}
      </span>
      <p>
        {urgent ? "ما متأكدينش مزيان من هاد القراية. " : ""}
        إلا كانت الورقة مهمة، تأكد مع شي حد تيق فيه.
        <span className="fr" lang="fr">
          {urgent ? "Lecture incertaine — " : ""}Si le document est important, vérifiez avec une personne de confiance.
        </span>
      </p>
    </div>
  );
}
