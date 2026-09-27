# Qra Lia — اقرا ليا

Photograph a paper document (bill, bank letter, CNSS, administration letter) and Qra Lia explains it in **Moroccan Darija**, in text and out loud.

Built at the GOMYCODE × NVIDIA hackathon "Come Build with AI" (27 Sept 2026). Full README coming before submission.

## Local setup

```bash
npm install
cp .env.example .env.local   # add your own free keys, never commit them
npm run dev
```

- `http://localhost:3000` — the app
- `POST /api/read` — document reading endpoint
- `http://localhost:3000/dev-features` — dev test bench for the feature buttons
