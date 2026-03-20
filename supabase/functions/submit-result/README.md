Supabase Edge Function: submit-result

Usage

- Requires environment variables: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Deploy with the Supabase CLI or run locally with `supabase functions serve`.

Example client request

```js
await fetch('https://<your-edge-url>/submit-result', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ result: resultObj, guesses: guessesArray, anon_id })
})
```

Notes

- The function calls the `insert_result_with_guesses` RPC you created. Keep the Service Role key secret.
- It performs minimal validation and strips very large `replay` payloads; extend validation as needed.
- For production, add rate limiting and request authentication checks.
