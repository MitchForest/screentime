Place your Supabase generated types here.

Recommended command (using Supabase CLI):

- If the project is linked: `supabase gen types typescript --local > packages/db/src/__generated__/supabase.ts`
- Or directly via DB URL: `supabase gen types typescript --db-url "$DATABASE_URL" > packages/db/src/__generated__/supabase.ts`

The file should export `export type Database = { ... }` matching Supabase's generated types.

