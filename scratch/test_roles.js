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

  // Create dummy transport
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

  const testRoles = ['CE', 'AS', 'autista', 'soccorritore', 'capo_equipaggio', 'AUTISTA', 'ce', 'as'];
  for (const role of testRoles) {
    console.log(`Testing role: "${role}"`);
    const { data, error } = await supabase
      .from('transport_crew')
      .insert([{
        transport_id: transportId,
        user_id: signInData.user.id,
        ruolo: role,
        attivo: true,
        ora_inizio_ruolo: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.log(`❌ Failed: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Success! id: ${data[0].id}, value: ${data[0].ruolo}`);
      // Clean up
      await supabase.from('transport_crew').delete().eq('id', data[0].id);
    }
  }

  // Clean up transport
  await supabase.from('transports').delete().eq('id', transportId);
}

run();
