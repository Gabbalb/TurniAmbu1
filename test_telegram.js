import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Legge le variabili d'ambiente dal file .env
const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

console.log('Connessione a:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function runTest() {
  try {
    // 1. Effettua l'accesso come amministratore
    console.log('Accesso in corso come admin@app.internal...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@app.internal',
      password: 'admin12345'
    });

    if (authError) {
      console.error('Errore di autenticazione:', authError.message);
      return;
    }

    console.log('Autenticato con successo come:', authData.user.email);

    // 2. Tenta l'inserimento della notifica (che farà scattare il trigger di Telegram)
    console.log('Inserimento notifica di test...');
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        { tipo: 'test_telegram', messaggio: 'Notifica di prova Telegram finalmente funzionante!', creato_da: 'Sistema' }
      ])
      .select();

    if (error) {
      console.error('Errore durante l\'inserimento:', error);
    } else {
      console.log('Inserimento riuscito con successo!', data);
      console.log('Controlla ora il tuo gruppo Telegram!');
    }
  } catch (err) {
    console.error('Errore inatteso:', err);
  }
}

runTest();
