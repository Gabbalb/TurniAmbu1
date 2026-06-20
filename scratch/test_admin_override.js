import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in as admin@app.internal...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  const adminUserId = authData.user.id;
  console.log(`Log in successful, user ID: ${adminUserId}`);

  // Fetch transports not created by this admin
  const { data: activeTransports, error: fetchError } = await supabase
    .from('transports')
    .select('*, crew:transport_crew(*)')
    .eq('stato', 'attivo')
    .neq('creato_da', adminUserId);

  if (fetchError) {
    console.error("Fetch transports error:", fetchError.message);
    return;
  }

  console.log(`Found ${activeTransports.length} active transports from other users.`);

  if (activeTransports.length === 0) {
    console.log("No transports from other users found. Testing with a temporary one...");
    // Let's find some other user to create a transport as
    const { data: profiles } = await supabase.from('profiles').select('id').neq('id', adminUserId).limit(1);
    if (!profiles || profiles.length === 0) {
      console.log("No other profiles found.");
      return;
    }
    const otherUserId = profiles[0].id;
    console.log(`Using other user ID: ${otherUserId}`);

    // Create a temporary transport directly
    const { data: newTrans, error: insertError } = await supabase
      .from('transports')
      .insert({
        creato_da: otherUserId,
        stato: 'attivo',
        tipo_trasporto: 'dimissione',
        da_tipo_luogo: 'abitazione',
        a_tipo_luogo: 'ospedale',
        data: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert temp transport:", insertError.message);
      return;
    }

    console.log(`Created temp transport #${newTrans.id} belonging to ${otherUserId}`);
    activeTransports.push(newTrans);
  }

  const target = activeTransports[0];
  console.log(`Testing with transport #${target.id} (created by: ${target.creato_da})`);

  // Test 1: Update field (note)
  console.log("Test 1: Updating note...");
  const { data: updatedTrans, error: updateError } = await supabase
    .from('transports')
    .update({ note: 'Test note by admin' })
    .eq('id', target.id)
    .select()
    .single();

  if (updateError) {
    console.error("❌ Update note failed:", updateError.message);
  } else {
    console.log("✅ Update note success:", updatedTrans.note);
  }

  // Test 2: Terminate transport
  console.log("Test 2: Terminating transport...");
  const nowIso = new Date().toISOString();
  const { data: termTrans, error: termError } = await supabase
    .from('transports')
    .update({
      stato: 'terminato',
      km_finali: 1000,
      ora_fine: nowIso,
      updated_at: nowIso
    })
    .eq('id', target.id)
    .select()
    .single();

  if (termError) {
    console.error("❌ Terminate transport update failed:", termError.message);
  } else {
    console.log("✅ Terminate transport update success");
  }

  // Terminate crew
  const { error: termCrewError } = await supabase
    .from('transport_crew')
    .update({ 
      ora_fine_ruolo: nowIso,
      attivo: false
    })
    .eq('transport_id', target.id)
    .eq('attivo', true);

  if (termCrewError) {
    console.error("❌ Terminate crew update failed:", termCrewError.message);
  } else {
    console.log("✅ Terminate crew update success");
  }

  // Test 3: Delete transport
  console.log("Test 3: Deleting transport...");
  const { error: deleteError } = await supabase
    .from('transports')
    .delete()
    .eq('id', target.id);

  if (deleteError) {
    console.error("❌ Delete failed:", deleteError.message);
  } else {
    console.log("✅ Delete success!");
  }
}

run();
