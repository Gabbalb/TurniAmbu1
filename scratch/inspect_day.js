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

  const targetDate = '2026-07-28';
  console.log(`Inspecting all shifts on ${targetDate}...`);
  
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, bookings(*)')
    .eq('data', targetDate)
    .order('ora_inizio', { ascending: true });

  console.log(JSON.stringify(shifts, null, 2));
}

run();
