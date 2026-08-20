# Edge Functions deployment source

The public transport functions deployed to project `ulawoqswzqfpqyssxggn` are:

- `public-intake`
- `public-tracking`
- `public-attachment-upload`
- `public-attachment-download`

They are public endpoints with custom Case ID/tracking-token authorization where required. The service-role key is read only from Supabase Edge Function environment variables. The deployed entrypoints are intentionally kept behind the public-safe RPC/storage boundaries described in `docs/SUPABASE_EDGE_FUNCTIONS.md`.

Before the production migration is considered reproducible, copy the exact deployed `index.ts` source for each function into the matching subdirectory and deploy from this tree using the Supabase CLI or MCP. Do not commit service keys or TEST data.
