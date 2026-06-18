import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  if (signInError) {
    console.error(`Login failed: ${signInError.message}`);
    return;
  }

  // First create a dummy transport
  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  console.log("Creating dummy transport...");
  const { data: transportData, error: tError } = await supabase
    .from('transports')
    .insert([{
      data: todayStr,
      stato: 'attivo',
      ora_inizio: nowIso,
      tipo_trasporto: 'visita',
      da_tipo_luogo: 'ospedale',
      da_nome: 'Test Ospedale',
      a_tipo_luogo: 'rsa',
      a_nome: 'Test RSA',
      precompilato_da_admin: false
    }])
    .select();

  if (tError) {
    console.error("Failed to create transport:", tError);
    return;
  }

  const transportId = transportData[0].id;
  console.log(`Created transport with ID: ${transportId}`);

  const testPays = ['contante', 'pos', 'buono', 'convenzione', 'Altro', 'contanti', 'POS', 'CONVENZIONE'];
  for (const pay of testPays) {
    console.log(`Testing tipo_pagamento: "${pay}"`);
    try {
      const { data, error } = await supabase
        .from('transports')
        .update({ tipo_pagamento: pay })
        .eq('id', transportId)
        .select();

      if (error) {
        console.log(`❌ Failed: ${error.message} (Code: ${error.code})`);
      } else {
        console.log(`✅ Success! id: ${data[0].id}, value: ${data[0].tipo_pagamento}`);
      }
    } catch (e) {
      console.log(`💥 Crash:`, e);
    }
    console.log('---');
  }

  // Clean up transport
  await supabase.from('transports').delete().eq('id', transportId);
}

run();
