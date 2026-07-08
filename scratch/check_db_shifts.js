import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in as admin...");
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  if (signInError) {
    console.error(`Login failed: ${signInError.message}`);
    return;
  }
  console.log("Login successful!");

  const todayStr = '1970-01-01';
  console.log(`Checking bookings linked to shifts from ${todayStr} onwards...\n`);

  // Fetch all future shifts with their bookings
  const { data: shifts, error: shiftsErr } = await supabase
    .from('shifts')
    .select('*, bookings(*)')
    .gte('data', todayStr);

  if (shiftsErr) {
    console.error("Error fetching shifts:", shiftsErr);
    return;
  }

  let totalBookings = 0;
  const anomalousBookings = [];

  shifts.forEach(shift => {
    shift.bookings.forEach(b => {
      totalBookings++;
      
      // Check if partial is true but times are null
      if (b.is_partial && (!b.ora_inizio_effettiva || !b.ora_fine_effettiva)) {
        anomalousBookings.push({ type: 'partial_but_null_times', booking: b, shift });
      }

      // Check if times are defined but partial is false
      if (!b.is_partial && (b.ora_inizio_effettiva || b.ora_fine_effettiva)) {
        anomalousBookings.push({ type: 'not_partial_but_has_times', booking: b, shift });
      }

      // Check if booking times are equal to standard shift times (which means it shouldn't be partial)
      if (b.is_partial && b.ora_inizio_effettiva && b.ora_fine_effettiva) {
        const start = b.ora_inizio_effettiva.slice(0, 5);
        const end = b.ora_fine_effettiva.slice(0, 5);
        const shiftStart = shift.ora_inizio.slice(0, 5);
        const shiftFine = shift.ora_fine.slice(0, 5);
        if (start === shiftStart && end === shiftFine) {
          anomalousBookings.push({ type: 'partial_matching_standard_times', booking: b, shift });
        }
      }
    });
  });

  console.log(`Total future bookings checked: ${totalBookings}`);
  console.log(`Anomalous bookings found: ${anomalousBookings.length}`);
  if (anomalousBookings.length > 0) {
    console.log("\nSample of anomalous bookings:");
    anomalousBookings.forEach((a, i) => {
      console.log(`[Anomaly ${i+1}] Type: ${a.type}`);
      console.log(`  Booking ID: ${a.booking.id}, User: ${a.booking.user_id}, Role: ${a.booking.ruolo_turno}`);
      console.log(`  Booking times: ${a.booking.ora_inizio_effettiva} to ${a.booking.ora_fine_effettiva}`);
      console.log(`  Shift standard times: ${a.shift.ora_inizio} to ${a.shift.ora_fine}`);
    });
  }

  console.log("\nFinished check.");
}

run();
