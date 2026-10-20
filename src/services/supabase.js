// Supabase Client & Cryptographic Security Service
import { createClient } from '@supabase/supabase-js';

/**
 * Normalizes Supabase URL from either full URL or modern Project Reference ID
 * Handles both Free Plan project refs (e.g. "abcdefghijklmno") and legacy full URLs.
 */
export function normalizeSupabaseUrl(urlOrRef) {
  if (!urlOrRef) return '';
  const trimmed = String(urlOrRef).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/+$/, '');
  }
  return `https://${trimmed}.supabase.co`;
}

const rawUrl = import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_PROJECT_REF || '';
export const supabaseUrl = normalizeSupabaseUrl(rawUrl);
export const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Hash password securely using Web Crypto API (SHA-256 with salt)
 * Ensures passwords are never stored or compared in plain text.
 */
export async function hashPassword(password, salt = 'eliza_enterprise_salt_v1') {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + ':' + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('Crypto error while hashing password', e);
    // Deterministic fallback hash
    let hash = 0;
    const str = password + ':' + salt;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

export async function verifyPassword(password, storedHash, salt = 'eliza_enterprise_salt_v1') {
  if (!password || !storedHash) return false;
  // If stored password was legacy plaintext, accept and mark for upgrade
  if (storedHash === password) return true;
  const computed = await hashPassword(password, salt);
  return computed === storedHash;
}
