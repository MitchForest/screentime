// Database types placeholder.
// To enable full typing:
// 1) Generate Supabase types into src/__generated__/supabase.ts
// 2) Install `kysely-supabase`
// 3) Replace the below with:
//    import type { KyselifyDatabase } from 'kysely-supabase'
//    import type { Database as SupabaseDatabase } from './__generated__/supabase'
//    export type Database = KyselifyDatabase<SupabaseDatabase>

export type Database = Record<string, never>;
