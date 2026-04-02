# SignalPro Workbook

## Local run

1. Copy `.env.example` to `.env`
2. Put your OpenAI API key in `.env`
3. Run `npm start`
4. Open `http://localhost:3000`

## Notes

- The browser never stores the OpenAI key.
- The server proxies requests to the OpenAI Responses API.
- If you see quota or billing errors in the app, top up API credits or increase the account usage limit on the server account.
