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

  const { data: crews, error: crewsErr } = await supabase.from('crews').select('*');
  if (crewsErr) {
    console.error("Error fetching crews:", crewsErr);
    return;
  }
  console.log("Active crews in DB:", crews);

  const { data: shifts, error: shiftsErr } = await supabase.from('shifts').select('*');
  if (shiftsErr) {
    console.error("Error fetching shifts:", shiftsErr);
    return;
  }
  console.log(`Total shifts in DB: ${shifts.length}`);

  // Count shifts by crew_id
  const counts = {};
  shifts.forEach(s => {
    counts[s.crew_id] = (counts[s.crew_id] || 0) + 1;
  });
  console.log("Shift counts per crew:", counts);

  const nonDefaultShifts = shifts.filter(s => String(s.crew_id) !== '1');
  console.log(`Shifts for non-default crews (crew_id !== 1): ${nonDefaultShifts.length}`);
  if (nonDefaultShifts.length > 0) {
    console.log("First 10 non-default shifts:", nonDefaultShifts.slice(0, 10));
  }
}

run();
