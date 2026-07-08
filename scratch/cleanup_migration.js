import { createClient } from '@supabase/supabase-js';

const DRY_RUN = false; // Set to false to apply changes
const START_DATE = '1970-01-01';

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';
const supabase = createClient(supabaseUrl, supabaseKey);

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeStr(totalMin) {
  const normalized = totalMin % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

const NEW_SLOTS = {
  '06:00:00': { name: 'Mattina', start: '06:00:00', end: '13:00:00', startMin: 360, endMin: 780 },
  '14:00:00': { name: 'Pomeriggio', start: '13:00:00', end: '18:00:00', startMin: 780, endMin: 1080 },
  '22:00:00': { name: 'Notte', start: '00:00:00', end: '06:00:00', startMin: 1440, endMin: 1800 }
};

const SERA_SLOT = { name: 'Sera', start: '18:00:00', end: '00:00:00', startMin: 1080, endMin: 1440 };

async function run() {
  console.log(`=== TurniAmbu Migration Cleanup Script ===`);
  console.log(`DRY_RUN: ${DRY_RUN}\n`);

  console.log("Logging in as admin...");
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });
  if (signInError) {
    console.error(`Login failed: ${signInError.message}`);
    return;
  }
  console.log("Logged in.\n");

  console.log("Fetching all old-format shifts...");
  const { data: shifts, error: shiftsErr } = await supabase
    .from('shifts')
    .select('*, bookings(*)')
    .gte('data', START_DATE)
    .in('ora_inizio', ['06:00:00', '14:00:00', '22:00:00']);

  if (shiftsErr) {
    console.error("Error fetching shifts:", shiftsErr);
    return;
  }

  // Filter to keep only those that are truly in old format (e.g. 06:00-14:00, 14:00-22:00, 22:00-06:00)
  const oldShifts = shifts.filter(s => {
    if (s.ora_inizio === '06:00:00' && s.ora_fine === '14:00:00') return true;
    if (s.ora_inizio === '14:00:00' && s.ora_fine === '22:00:00') return true;
    if (s.ora_inizio === '22:00:00' && s.ora_fine === '06:00:00') return true;
    return false;
  });

  console.log(`Found ${oldShifts.length} shifts still in old format to resolve.\n`);

  for (const shift of oldShifts) {
    const slotDef = NEW_SLOTS[shift.ora_inizio];
    const targetStart = slotDef.start;
    const targetEnd = slotDef.end;

    console.log(`Resolving Old Shift ${shift.id} on ${shift.data} (${shift.ora_inizio}-${shift.ora_fine}), Crew ${shift.crew_id}`);

    // Check if target shift already exists
    const { data: existingTargetShifts, error: checkErr } = await supabase
      .from('shifts')
      .select('id')
      .eq('data', shift.data)
      .eq('ora_inizio', targetStart)
      .eq('crew_id', shift.crew_id);

    if (checkErr) {
      console.error(`  Error checking for target shift:`, checkErr);
      continue;
    }

    const targetShiftExists = existingTargetShifts && existingTargetShifts.length > 0;
    let targetShiftId = targetShiftExists ? existingTargetShifts[0].id : null;

    if (targetShiftExists) {
      console.log(`  Target shift already exists with ID: ${targetShiftId}. Moving bookings and deleting old shift...`);
    } else {
      console.log(`  No target shift exists. We can update this shift in-place.`);
    }

    // Prepare bookings migration
    for (const booking of shift.bookings) {
      // Find booking interval in minutes relative to start of day
      const isPartial = booking.is_partial;
      const startStr = isPartial ? booking.ora_inizio_effettiva.slice(0, 5) : shift.ora_inizio.slice(0, 5);
      const endStr = isPartial ? booking.ora_fine_effettiva.slice(0, 5) : shift.ora_fine.slice(0, 5);

      let bkStart = timeToMinutes(startStr);
      let bkEnd = timeToMinutes(endStr);

      if (shift.ora_inizio.startsWith('22')) {
        if (bkStart < 720) bkStart += 1440;
        if (bkEnd < 720) bkEnd += 1440;
        if (bkEnd <= bkStart) bkEnd += 1440;
      } else {
        if (bkEnd <= bkStart) bkEnd += 1440;
      }

      // Intersect with primary new slot
      const intStart = Math.max(bkStart, slotDef.startMin);
      const intEnd = Math.min(bkEnd, slotDef.endMin);

      if (intStart < intEnd) {
        // Bookings that overlap the primary new shift
        const isPartialNew = intStart > slotDef.startMin || intEnd < slotDef.endMin;
        let note = null;
        if (isPartialNew) {
          const startFmt = minutesToTimeStr(intStart).slice(0, 5);
          const endFmt = minutesToTimeStr(intEnd).slice(0, 5);
          if (intStart > slotDef.startMin && intEnd < slotDef.endMin) {
            note = `Dalle ${startFmt} alle ${endFmt}`;
          } else if (intStart > slotDef.startMin) {
            note = `Dalle ${startFmt}`;
          } else {
            note = `Fino alle ${endFmt}`;
          }
        }

        const updateData = {
          ora_inizio_effettiva: isPartialNew ? minutesToTimeStr(intStart) : null,
          ora_fine_effettiva: isPartialNew ? minutesToTimeStr(intEnd) : null,
          is_partial: isPartialNew,
          nota_parziale: note
        };

        if (targetShiftExists) {
          updateData.shift_id = targetShiftId;
        }

        if (!DRY_RUN) {
          const { error: updBkErr } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', booking.id);

          if (updBkErr) {
            console.error(`    Error updating booking ${booking.id}:`, updBkErr);
          } else {
            console.log(`    Successfully updated/moved booking ${booking.id}.`);
          }
        } else {
          console.log(`    [DRY RUN] Would update/move booking ${booking.id} to shift ${targetShiftId || shift.id}.`);
        }
      } else {
        // Does not overlap primary, delete this booking record
        if (!DRY_RUN) {
          const { error: delBkErr } = await supabase
            .from('bookings')
            .delete()
            .eq('id', booking.id);
          if (delBkErr) {
            console.error(`    Error deleting booking ${booking.id}:`, delBkErr);
          } else {
            console.log(`    Deleted booking ${booking.id} since it no longer intersects.`);
          }
        } else {
          console.log(`    [DRY RUN] Would delete booking ${booking.id}.`);
        }
      }

      // Check if it intersects secondary Sera slot
      if (shift.ora_inizio === '14:00:00' || shift.ora_inizio === '22:00:00') {
        const intStartSera = Math.max(bkStart, SERA_SLOT.startMin);
        const intEndSera = Math.min(bkEnd, SERA_SLOT.endMin);

        if (intStartSera < intEndSera) {
          // It overlaps the Sera slot. Let's find or create the Sera shift first.
          let seraShiftId = null;
          const { data: existingSeraShifts } = await supabase
            .from('shifts')
            .select('id')
            .eq('data', shift.data)
            .eq('ora_inizio', SERA_SLOT.start)
            .eq('crew_id', shift.crew_id);

          if (existingSeraShifts && existingSeraShifts.length > 0) {
            seraShiftId = existingSeraShifts[0].id;
          } else {
            if (!DRY_RUN) {
              const { data: newSeraShift, error: createSeraErr } = await supabase
                .from('shifts')
                .insert({
                  data: shift.data,
                  ora_inizio: SERA_SLOT.start,
                  ora_fine: SERA_SLOT.end,
                  crew_id: shift.crew_id
                })
                .select('id')
                .single();

              if (createSeraErr) {
                console.error(`    Error creating Sera shift:`, createSeraErr);
              } else {
                seraShiftId = newSeraShift.id;
                console.log(`    Created Sera shift with ID: ${seraShiftId}`);
              }
            } else {
              console.log(`    [DRY RUN] Would create Sera shift.`);
            }
          }

          if (seraShiftId || DRY_RUN) {
            const isPartialSera = intStartSera > SERA_SLOT.startMin || intEndSera < SERA_SLOT.endMin;
            let noteSera = null;
            if (isPartialSera) {
              const startFmt = minutesToTimeStr(intStartSera).slice(0, 5);
              const endFmt = minutesToTimeStr(intEndSera).slice(0, 5);
              if (intStartSera > SERA_SLOT.startMin && intEndSera < SERA_SLOT.endMin) {
                noteSera = `Dalle ${startFmt} alle ${endFmt}`;
              } else if (intStartSera > SERA_SLOT.startMin) {
                noteSera = `Dalle ${startFmt}`;
              } else {
                noteSera = `Fino alle ${endFmt}`;
              }
            }

            if (!DRY_RUN) {
              const { error: insBkErr } = await supabase
                .from('bookings')
                .insert({
                  shift_id: seraShiftId,
                  user_id: booking.user_id,
                  ruolo_turno: booking.ruolo_turno,
                  ora_inizio_effettiva: isPartialSera ? minutesToTimeStr(intStartSera) : null,
                  ora_fine_effettiva: isPartialSera ? minutesToTimeStr(intEndSera) : null,
                  is_partial: isPartialSera,
                  nota_parziale: noteSera
                });
              if (insBkErr) {
                console.error(`    Error inserting booking on Sera shift:`, insBkErr);
              } else {
                console.log(`    Created duplicate/split booking on Sera shift ${seraShiftId}.`);
              }
            } else {
              console.log(`    [DRY RUN] Would create split booking on Sera shift ${seraShiftId}.`);
            }
          }
        }
      }
    }

    // Now resolve the shift record itself
    if (targetShiftExists) {
      if (!DRY_RUN) {
        const { error: delShErr } = await supabase
          .from('shifts')
          .delete()
          .eq('id', shift.id);
        if (delShErr) {
          console.error(`  Error deleting duplicate shift ${shift.id}:`, delShErr);
        } else {
          console.log(`  Deleted duplicate shift ${shift.id} successfully.`);
        }
      } else {
        console.log(`  [DRY RUN] Would delete shift ${shift.id}.`);
      }
    } else {
      if (!DRY_RUN) {
        const { error: updShErr } = await supabase
          .from('shifts')
          .update({
            ora_inizio: targetStart,
            ora_fine: targetEnd
          })
          .eq('id', shift.id);
        if (updShErr) {
          console.error(`  Error updating shift ${shift.id} in-place:`, updShErr);
        } else {
          console.log(`  Updated shift ${shift.id} in-place successfully.`);
        }
      } else {
        console.log(`  [DRY RUN] Would update shift ${shift.id} to ${targetStart}-${targetEnd}.`);
      }
    }
    console.log();
  }

  console.log("\nCleanup execution finished!");
}

run();
