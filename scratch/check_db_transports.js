import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in as admin user...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  if (signInError) {
    console.error(`Login failed: ${signInError.message}`);
    return;
  }
  console.log("Login successful!");

  console.log("Fetching all transports...");
  const { data: transports, error: tErr } = await supabase
    .from('transports')
    .select('*')
    .order('created_at', { ascending: false });

  if (tErr) {
    console.error("Error fetching transports:", tErr);
    return;
  }

  for (const t of transports) {
    console.log(`\nTransport ID: ${t.id}, Date: ${t.data}, Ora Servizio: ${t.ora_servizio}, Stato: ${t.stato}`);
    const { data: crew, error: cErr } = await supabase
      .from('transport_crew')
      .select('*')
      .eq('transport_id', t.id);

    if (cErr) {
      console.error(`Error fetching crew for transport ${t.id}:`, cErr);
    } else {
      console.log(`Crew members (${crew.length}):`);
      crew.forEach(c => {
        console.log(`  - Role: ${c.ruolo}, User ID: ${c.user_id}, Attivo: ${c.attivo}`);
      });
    }
  }
}

run();
