import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Masukkan URL & Key dari Supabase kamu di sini:
const SUPABASE_URL = "https://howhzixttyoencufgxsj.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_tsima9GaOuH5AmGhQlxOuw__hIxycI7";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
