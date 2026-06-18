import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: transportData } = await supabase
    .from('transports')
    .insert([{
      data: todayStr,
      stato: 'attivo',
      ora_inizio: new Date().toISOString(),
      tipo_trasporto: 'visita',
      da_tipo_luogo: 'ospedale',
      da_nome: 'Test Ospedale',
      a_tipo_luogo: 'rsa',
      a_nome: 'Test RSA',
      precompilato_da_admin: false
    }])
    .select();

  const transportId = transportData[0].id;

  const testPays = ['voucher', 'conto', 'credito', 'posticipato', 'sospeso', 'comune', 'regione', 'abbonamento', 'tessera', 'convenzione asl', 'convenzione rsa', 'esenzione ticket'];
  for (const pay of testPays) {
    const { error } = await supabase
      .from('transports')
      .update({ tipo_pagamento: pay })
      .eq('id', transportId);
    
    if (!error) {
      console.log(`✅ Success for: "${pay}"`);
    } else {
      console.log(`❌ Failed for: "${pay}"`);
    }
  }

  // Clean up
  await supabase.from('transports').delete().eq('id', transportId);
}

run();
