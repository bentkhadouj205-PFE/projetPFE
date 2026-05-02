import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from src/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('📡 [SUPABASE] Initialization Audit:');
console.log(`🔗 URL: ${SUPABASE_URL ? '✅ Loaded' : '❌ MISSING'}`);
console.log(`🔑 Key Type: ${process.env.SUPABASE_SERVICE_KEY ? '🛡️ SERVICE_ROLE' : '👤 ANON_KEY'}`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ [SUPABASE] ERROR: Missing environment variables.");
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');