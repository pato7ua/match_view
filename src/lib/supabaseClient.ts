
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null;

export const getSupabase = () => {
    if (supabase) {
        return supabase;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and anon key are required.');
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
}
