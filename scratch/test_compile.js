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

  // Find a shift
  console.log("Fetching a shift...");
  const { data: shifts, error: sError } = await supabase.from('shifts').select('id').limit(1);
  if (sError || !shifts || shifts.length === 0) {
    console.error("No shift found:", sError);
    return;
  }
  const shiftId = shifts[0].id;
  console.log(`Using shift ID: ${shiftId}`);

  // Create a transport
  console.log("Creating transport...");
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: transportData, error: tError } = await supabase
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

  // Execute updateTransportShiftAndCrew logic
  console.log("Running updateTransportShiftAndCrew logic...");
  const nowIso = new Date().toISOString();
  try {
    const { error: tUpdErr } = await supabase
      .from('transports')
      .update({ shift_id: shiftId, updated_at: nowIso })
      .eq('id', transportId);

    if (tUpdErr) {
      console.error("❌ Transports update failed:", tUpdErr);
      return;
    }
    console.log("✅ Transports update success");

    const { error: updErr } = await supabase
      .from('transport_crew')
      .update({ attivo: false, ora_fine_ruolo: nowIso })
      .eq('transport_id', transportId)
      .eq('attivo', true);

    if (updErr) {
      console.error("❌ Crew deactivation failed:", updErr);
      return;
    }
    console.log("✅ Crew deactivation success");

    const inserts = [
      {
        transport_id: transportId,
        user_id: userId,
        ruolo: 'CE',
        attivo: true,
        ora_inizio_ruolo: nowIso
      },
      {
        transport_id: transportId,
        user_id: userId,
        ruolo: 'autista',
        attivo: true,
        ora_inizio_ruolo: nowIso
      }
    ];

    const { error: insErr } = await supabase
      .from('transport_crew')
      .insert(inserts);

    if (insErr) {
      console.error("❌ Crew insert failed:", insErr);
      return;
    }
    console.log("✅ Crew insert success");

  } catch (err) {
    console.error("💥 Exception occurred:", err);
  } finally {
    // Clean up
    console.log("Cleaning up transport...");
    await supabase.from('transports').delete().eq('id', transportId);
  }
}

run();
