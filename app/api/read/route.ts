// PLACEHOLDER — returns MOCK_OK after 1.5 s so the UI can integrate early.
// Owned by role 2 (Backend / AI) from now on: they replace this file.
import { MOCK_OK } from "@/lib/mock";

export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return Response.json(MOCK_OK);
}
