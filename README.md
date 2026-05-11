# SignalPro Workbook

## Local run

1. Copy `.env.example` to `.env`
2. Put your Gemini API key in `.env`
3. Run `npm start`
4. Open `http://localhost:3000`

## Notes

- The browser never stores the Gemini API key.
- The server translates workbook prompts into Gemini `generateContent` requests.
- Macro Radar and market-question Copilot prompts use Gemini grounding with Google Search, so Gemini free-tier quotas still apply.
