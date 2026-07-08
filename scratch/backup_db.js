import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'profiles',
  'crews',
  'shifts',
  'bookings',
  'clocked_shifts',
  'vehicles',
  'transports',
  'transport_crew',
  'transport_handoffs',
  'notifications',
  'telegram_settings'
];

async function run() {
  console.log("Logging in as admin to bypass RLS policies...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });
  if (signInError) {
    console.error(`Login failed: ${signInError.message}`);
    return;
  }
  console.log("Login successful!\n");

  const backupData = {};
  for (const table of TABLES) {
    console.log(`Fetching table "${table}"...`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching table "${table}":`, error);
      backupData[table] = { error: error.message };
    } else {
      console.log(`Successfully fetched ${data.length} rows.`);
      backupData[table] = data;
    }
  }

  const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
  const backupFileName = `db_backup_${timestamp}.json`;
  const backupPath = path.join('scratch', backupFileName);
  
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`\nBackup successfully written to: ${backupPath}`);
}

run();
