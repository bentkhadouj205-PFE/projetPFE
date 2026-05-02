import { supabase } from './src/supabaseClient.js';

async function checkDB() {
  const { data, error } = await supabase
    .from('demandes_inscription')
    .select('id, prenom, nom, email, status, activation_token')
    .order('date_demande', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching DB:', error);
  } else {
    console.log('\n====== 📊 SUPABASE SCREENSHOT (demandes_inscription) ======\n');
    console.table(data);
    console.log('\n===========================================================\n');
  }
}

checkDB();
