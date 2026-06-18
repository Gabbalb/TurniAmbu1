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

  const tables = ['profiles', 'shifts', 'bookings', 'vehicles', 'transports', 'transport_crew'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error counting ${table}:`, error);
    } else {
      console.log(`Table ${table} has ${count} rows.`);
    }
  }
}

run();
