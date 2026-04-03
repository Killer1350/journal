# SignalPro Workbook

## Local run

1. Copy `.env.example` to `.env`
2. Put your OpenAI API key in `.env`
3. Run `npm start`
4. Open `http://localhost:3000`

## Vercel deployment

Add these environment variables in your Vercel project settings:

- `OPENAI_API_KEY`
- `OPENAI_API_BASE`
- `OPENAI_CHART_MODEL`
- `OPENAI_NEWS_MODEL`
- `OPENAI_COPILOT_MODEL`

After adding or changing them, redeploy the project so the functions pick up the new values.

## Notes

- The browser never stores the OpenAI key.
- Local development uses `server.js`.
- Vercel uses the `api/health.mjs` and `api/openai.mjs` serverless functions.
- If you see quota or billing errors in the app, top up API credits or increase the account usage limit on the server account.
