import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    console.error('Supabase credentials missing or invalid! Check your .env file.');
    console.log('Current URL:', supabaseUrl);
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
)

/**
 * Diagnostic helper to check connection to Supabase
 */
export const checkSupabaseConnection = async () => {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: { 'apikey': supabaseAnonKey }
        });
        return response.ok || response.status === 401; // 401 is okay here, means we reached the server
    } catch (err) {
        console.error('Supabase connectivity check failed:', err);
        return false;
    }
}
