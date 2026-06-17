import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in as admin@app.internal...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  if (signInError) {
    console.error(`Admin login failed: ${signInError.message}`);
    return;
  }

  console.log("Fetching profile for user 082c65a7-bb39-4221-90bc-c4616c8415f4...");
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '082c65a7-bb39-4221-90bc-c4616c8415f4');

  if (error) {
    console.error(`Failed to fetch: ${error.message}`);
  } else {
    console.log("Result:", data);
  }
}

run();
