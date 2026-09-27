/** Prebuilt Gemini TTS voices we audition on /dev-features (the first one is the default). */
export const VOICES = ["Sulafat", "Achird", "Vindemiatrix", "Charon", "Kore", "Gacrux"] as const;
export type VoiceName = (typeof VOICES)[number];
