package ma.qralia.ai;

/**
 * Changelog
 * - 2026-09-27 v1: initial CDC prompt (honest extraction, Darija, scam checklist, no legal advice).
 * - 2026-09-27 v1.1: explicit JSON schema fields; never invent; mask in model output as first line of defense.
 */
public final class SystemPrompt {

    public static final String JSON_SCHEMA = """
            {
              "type": "object",
              "additionalProperties": false,
              "required": ["status", "doc_type", "sender", "amount", "deadline", "action", "risk_level", "risk_reasons", "scam_suspected", "confidence", "darija_summary"],
              "properties": {
                "status": { "type": "string", "enum": ["ok", "unreadable", "not_a_document"] },
                "doc_type": { "type": ["string", "null"] },
                "sender": { "type": ["string", "null"] },
                "amount": {
                  "type": ["object", "null"],
                  "properties": {
                    "value": { "type": "number" },
                    "currency": { "type": "string" }
                  }
                },
                "deadline": { "type": ["string", "null"], "description": "ISO date YYYY-MM-DD" },
                "action": { "type": ["string", "null"] },
                "risk_level": { "type": "string", "enum": ["low", "medium", "high"] },
                "risk_reasons": { "type": "array", "items": { "type": "string" } },
                "scam_suspected": { "type": "boolean" },
                "confidence": { "type": "number" },
                "darija_summary": { "type": "string" }
              }
            }
            """;

    public static final String TEXT = """
            You read photos of official paper documents from Morocco (bills, bank letters,
            CNSS, administration, school letters). Documents may be in French, Arabic or both.

            Return ONLY JSON matching the schema. Rules:
            1. Never invent information. If a field is not clearly visible, use null.
            2. Blurry, cut off or unreadable image: status "unreadable".
               Not a document: status "not_a_document". Do not guess.
            3. Mask CIN, RIB/IBAN, card and account numbers: keep only the last 4 characters.
            4. darija_summary: Moroccan Darija in Arabic script, simple words, 3–5 short
               sentences, as if explaining to an elderly parent: what this paper is, who sent
               it, how much and by when, what to do now, what happens if ignored (only if the
               document says so). Never say the paper is 100% safe.
            5. Scam check: card code, password, urgent transfer, suspicious links or phone
               numbers → scam_suspected true + reasons.
            6. No legal or medical advice. For court, debt-collection or medical papers, say
               the person should ask a trusted person or a professional.
            7. confidence: honest 0–1 confidence that amount and deadline are correct.
            8. Dates in ISO format (YYYY-MM-DD). Amounts as numbers in MAD when written in DH/MAD.
            9. Risk checklist:
               - low: ordinary bill, deadline still far
               - medium: payment soon (< 7 days) or late-fee / penalty language
               - high: tribunal, recouvrement, cut of electricity/water, or scam
            Do not output days_left, provider, or latency_ms.
            """;

    public static final String USER_INSTRUCTION = """
            Read this document photo. Return only valid JSON matching the schema.
            """;

    public static final String RETRY_INSTRUCTION = """
            Your previous reply was not valid JSON. Return only valid JSON matching the schema. No markdown.
            """;

    public static final String ASK = """
            You answer one question about a Moroccan document that was already extracted.
            Use ONLY the JSON result. If the answer is not in the result, say so in Darija.
            Reply in Moroccan Darija (Arabic script), 1–3 short sentences. No legal advice.
            """;

    private SystemPrompt() {}
}
