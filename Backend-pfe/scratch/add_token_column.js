import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addColumn() {
  console.log('🚀 Attempting to add activation_token column...');
  
  // We use the 'rpc' method if a 'exec_sql' function exists in Supabase.
  // If not, we might have to do it through the Dashboard.
  // But let's try a simpler approach: check if we can just insert into a new column.
  
  const { error } = await supabase.rpc('run_sql', { 
    sql: 'ALTER TABLE demandes_inscription ADD COLUMN IF NOT EXISTS activation_token TEXT;' 
  });

  if (error) {
    console.error('❌ Failed to add column via RPC:', error.message);
    console.log('💡 Tip: If this failed, you might need to add the "activation_token" column (TEXT) manually in the Supabase Dashboard for the "demandes_inscription" table.');
  } else {
    console.log('✅ Column added successfully!');
  }
}

addColumn();
