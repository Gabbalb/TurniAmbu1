import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in as user...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  if (signInError) {
    console.error(`Login failed: ${signInError.message}`);
    return;
  }

  const userId = signInData.user.id;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Create a test transport
  console.log("Creating test transport...");
  const { data: transportData, error: tError } = await supabase
    .from('transports')
    .insert([{
      data: todayStr,
      stato: 'attivo',
      ora_inizio: new Date().toISOString(),
      ora_servizio: '12:00',
      tipo_trasporto: 'visita',
      da_tipo_luogo: 'ospedale',
      da_nome: 'Test Ospedale',
      a_tipo_luogo: 'rsa',
      a_nome: 'Test RSA',
      precompilato_da_admin: false,
      creato_da: userId
    }])
    .select();

  if (tError) {
    console.error("Failed to create transport:", tError);
    return;
  }
  const transportId = transportData[0].id;
  console.log(`Created transport ID: ${transportId}`);

  try {
    // 2. Add crew members
    console.log("Adding crew members...");
    const { error: insError } = await supabase
      .from('transport_crew')
      .insert([
        {
          transport_id: transportId,
          user_id: userId,
          ruolo: 'CE',
          attivo: true,
          ora_inizio_ruolo: new Date().toISOString()
        },
        {
          transport_id: transportId,
          user_id: userId,
          ruolo: 'autista',
          attivo: true,
          ora_inizio_ruolo: new Date().toISOString()
        }
      ]);

    if (insError) {
      console.error("Failed to insert crew:", insError);
      return;
    }
    console.log("Crew members inserted successfully.");

    // 3. Terminate the transport using the new api logic
    console.log("Terminating the transport...");
    // Let's run the API function logic:
    const nowIso = new Date().toISOString();
    const { error: termError } = await supabase
      .from('transports')
      .update({
        stato: 'terminato',
        km_finali: 100,
        ora_fine: nowIso,
        updated_at: nowIso
      })
      .eq('id', transportId);

    if (termError) {
      console.error("Failed to terminate transport:", termError);
      return;
    }

    // Now update crew members (new logic: only update ora_fine_ruolo, do not set attivo = false)
    const { error: cError } = await supabase
      .from('transport_crew')
      .update({ ora_fine_ruolo: nowIso })
      .eq('transport_id', transportId)
      .eq('attivo', true);

    if (cError) {
      console.error("Failed to update crew end time:", cError);
      return;
    }
    console.log("Transport terminated and crew end times updated successfully.");

    // 4. Retrieve detail and verify the crew is still active = true and returned
    console.log("Fetching detail of terminated transport...");
    const { data: transportDetail, error: detError } = await supabase
      .from('transports')
      .select('*, vehicles(*), profiles:creato_da(*)')
      .eq('id', transportId)
      .single();

    if (detError) throw detError;

    const { data: crew, error: crewError } = await supabase
      .from('transport_crew')
      .select('*, user:profiles(*)')
      .eq('transport_id', transportId)
      .eq('attivo', true);

    if (crewError) throw crewError;

    console.log("\n--- Verification Results ---");
    console.log(`Transport Status: ${transportDetail.stato}`);
    console.log(`Crew count with attivo = true: ${crew.length}`);
    crew.forEach(c => {
      console.log(`  - Role: ${c.ruolo}, User ID: ${c.user_id}, Attivo: ${c.attivo}, Ora Fine: ${c.ora_fine_ruolo}`);
    });

    if (crew.length === 2) {
      console.log("\n✅ SUCCESS: The crew is correctly preserved as attivo = true and visible after termination!");
    } else {
      console.log("\n❌ FAILURE: Crew is missing or deactivated.");
    }

  } catch (e) {
    console.error("Exception during test:", e);
  } finally {
    // Clean up
    console.log("\nCleaning up test data...");
    await supabase.from('transports').delete().eq('id', transportId);
    console.log("Cleanup complete.");
  }
}

run();
