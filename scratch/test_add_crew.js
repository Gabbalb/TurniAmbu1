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

  // 1. Create a crew named 'Equipaggio Test 2'
  console.log("Creating new crew...");
  const { data: newCrew, error: createError } = await supabase
    .from('crews')
    .insert({ nome: 'Equipaggio Test 2', attivo: true })
    .select()
    .single();

  if (createError) {
    console.error("Error creating crew:", createError);
    return;
  }
  console.log("Crew created successfully:", newCrew);

  try {
    // 2. Fetch all active crews
    const { data: crews, error: crewsErr } = await supabase.from('crews').select('*').eq('attivo', true).order('nome', { ascending: true });
    console.log("All active crews:", crews);

    // 3. Simulate ensureShiftsExistForDates for a couple of dates
    const dates = ['2026-06-23', '2026-06-24'];
    const standardTimeSlots = [
      { ora_inizio: '06:00:00', ora_fine: '14:00:00' },
      { ora_inizio: '14:00:00', ora_fine: '22:00:00' },
      { ora_inizio: '22:00:00', ora_fine: '06:00:00' }
    ];

    // Let's see what the current ensureShiftsExistForDates does
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    const { data: existingShifts, error: fetchErr } = await supabase
      .from('shifts')
      .select('data, ora_inizio, crew_id')
      .gte('data', minDate)
      .lte('data', maxDate);

    if (fetchErr) throw fetchErr;

    const insertRows = [];
    dates.forEach(date => {
      // NOTE: We check what happens if we use crews.slice(0, 1) vs crews
      // The current api.js uses crews.slice(0, 1)
      crews.slice(0, 1).forEach(crew => {
        standardTimeSlots.forEach(slot => {
          const exists = existingShifts.some(
            s => s.data === date && s.ora_inizio === slot.ora_inizio && String(s.crew_id) === String(crew.id)
          );
          if (!exists) {
            insertRows.push({
              data: date,
              ora_inizio: slot.ora_inizio,
              ora_fine: slot.ora_fine,
              crew_id: crew.id
            });
          }
        });
      });
    });

    console.log("Shifts that would be created by crews.slice(0, 1):", insertRows);

    const insertRowsAll = [];
    dates.forEach(date => {
      crews.forEach(crew => {
        standardTimeSlots.forEach(slot => {
          const exists = existingShifts.some(
            s => s.data === date && s.ora_inizio === slot.ora_inizio && String(s.crew_id) === String(crew.id)
          );
          if (!exists) {
            insertRowsAll.push({
              data: date,
              ora_inizio: slot.ora_inizio,
              ora_fine: slot.ora_fine,
              crew_id: crew.id
            });
          }
        });
      });
    });

    console.log("Shifts that would be created by crews (without slice):", insertRowsAll);

  } finally {
    // Cleanup the created crew
    console.log("Cleaning up created crew...");
    const { error: cleanErr } = await supabase
      .from('crews')
      .delete()
      .eq('id', newCrew.id);
    if (cleanErr) {
      console.error("Error during cleanup:", cleanErr);
    } else {
      console.log("Cleanup successful!");
    }
  }
}

run();
