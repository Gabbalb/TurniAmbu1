import { createClient } from '@supabase/supabase-js';

const DRY_RUN = false; // Set to false to perform the actual deduplication

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in...");
  await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  console.log("Fetching all bookings...");
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, user_id, shift_id, ruolo_turno, ora_inizio_effettiva, ora_fine_effettiva');

  if (error) {
    console.error("Error fetching bookings:", error);
    return;
  }

  console.log(`Fetched ${bookings.length} bookings.`);

  const seen = {};
  const duplicateIds = [];

  bookings.forEach(b => {
    // Standardize time strings to prevent minor differences (like including or not including seconds)
    const startStr = b.ora_inizio_effettiva ? b.ora_inizio_effettiva.slice(0, 5) : 'null';
    const endStr = b.ora_fine_effettiva ? b.ora_fine_effettiva.slice(0, 5) : 'null';
    const key = `${b.user_id}|${b.shift_id}|${b.ruolo_turno}|${startStr}|${endStr}`;

    if (seen[key]) {
      duplicateIds.push(b.id);
      console.log(`Duplicate found: Booking ID ${b.id} is duplicate of Booking ID ${seen[key]}. Key: ${key}`);
    } else {
      seen[key] = b.id;
    }
  });

  console.log(`\nTotal duplicates found: ${duplicateIds.length}`);

  if (duplicateIds.length > 0) {
    if (!DRY_RUN) {
      console.log(`Deleting ${duplicateIds.length} duplicate bookings...`);
      const { error: delErr } = await supabase
        .from('bookings')
        .delete()
        .in('id', duplicateIds);

      if (delErr) {
        console.error("Error deleting duplicates:", delErr);
      } else {
        console.log("Successfully deleted duplicate bookings!");
      }
    } else {
      console.log("[DRY RUN] Would delete these duplicate bookings.");
    }
  }
}

run();
