import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in...");
  await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  console.log("Checking all shifts in history...");
  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, data, ora_inizio, ora_fine, crew_id')
    .order('data', { ascending: true });

  const oldShifts = shifts.filter(s => {
    if (s.ora_inizio === '06:00:00' && s.ora_fine === '14:00:00') return true;
    if (s.ora_inizio === '14:00:00' && s.ora_fine === '22:00:00') return true;
    if (s.ora_inizio === '22:00:00' && s.ora_fine === '06:00:00') return true;
    return false;
  });

  console.log(`Total shifts in DB: ${shifts.length}`);
  console.log(`Shifts still in old format: ${oldShifts.length}`);
  if (oldShifts.length > 0) {
    console.log("Old shifts sample:", oldShifts.slice(0, 10));
  }
}

run();
