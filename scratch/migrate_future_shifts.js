import { createClient } from '@supabase/supabase-js';

// Configuration
const DRY_RUN = false; // Set to false to perform the actual DB updates
const START_DATE = '1970-01-01'; // Migrate shifts from this date onwards

const supabaseUrl = 'https://fborarxgtmqikgxcnnvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZib3JhcnhndG1xaWtneGNubnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzY1NzMsImV4cCI6MjA5NjMxMjU3M30.qmYI8rBlCVdOpK2WRXynokDi6PVMkeWKsi3fbmm69H0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Time conversions
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

const NEW_SLOTS = [
  { id: 1, name: 'Mattina', start: '06:00:00', end: '13:00:00', startMin: 360, endMin: 780 },
  { id: 2, name: 'Pomeriggio', start: '13:00:00', end: '18:00:00', startMin: 780, endMin: 1080 },
  { id: 3, name: 'Sera', start: '18:00:00', end: '00:00:00', startMin: 1080, endMin: 1440 },
  { id: 4, name: 'Notte', start: '00:00:00', end: '06:00:00', startMin: 1440, endMin: 1800 }
];

async function run() {
  console.log(`=== TurniAmbu Shift Migration Script ===`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`START_DATE: ${START_DATE}\n`);

  console.log("Logging in as admin...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@app.internal',
    password: 'admin12345',
  });

  if (signInError) {
    console.error(`Login failed: ${signInError.message}`);
    return;
  }
  console.log("Logged in successfully!\n");

  console.log("Fetching future shifts and their bookings...");
  const { data: shifts, error: shiftsErr } = await supabase
    .from('shifts')
    .select('*, bookings(*)')
    .gte('data', START_DATE)
    .order('data', { ascending: true })
    .order('ora_inizio', { ascending: true });

  if (shiftsErr) {
    console.error("Error fetching shifts:", shiftsErr);
    return;
  }

  console.log(`Found ${shifts.length} shifts to inspect.\n`);

  const shiftsToUpdate = []; // { id, data, ora_inizio, ora_fine, crew_id }
  const shiftsToCreate = []; // { data, ora_inizio, ora_fine, crew_id } -> to be inserted first so we get IDs
  const bookingsToUpdate = []; // { id, shift_id, ora_inizio_effettiva, ora_fine_effettiva, is_partial, nota_parziale }
  const bookingsToDelete = []; // IDs of bookings to delete
  const bookingsToCreate = []; // { user_id, ruolo_turno, ora_inizio_effettiva, ora_fine_effettiva, is_partial, nota_parziale } -> needs shift_id later

  // Keep track of shifts we are creating or existing in this run to avoid duplicates
  const shiftTracker = {}; // key: `data|crew_id|ora_inizio` -> { id, isNew }

  // Populate tracker with existing database shifts
  // Note: we fetch all shifts in the database for the range to prevent trying to insert duplicates
  const { data: allShiftsInRange } = await supabase
    .from('shifts')
    .select('id, data, ora_inizio, crew_id')
    .gte('data', START_DATE);

  if (allShiftsInRange) {
    allShiftsInRange.forEach(s => {
      shiftTracker[`${s.data}|${s.crew_id}|${s.ora_inizio}`] = { id: s.id, isNew: false };
    });
  }

  for (const shift of shifts) {
    const isOldMattina = shift.ora_inizio === '06:00:00' && shift.ora_fine === '14:00:00';
    const isOldPomeriggio = shift.ora_inizio === '14:00:00' && shift.ora_fine === '22:00:00';
    const isOldNotte = shift.ora_inizio === '22:00:00' && shift.ora_fine === '06:00:00';

    if (!isOldMattina && !isOldPomeriggio && !isOldNotte) {
      // Shift is already in new format or custom, skip it
      console.log(`Skipping shift ${shift.id} on ${shift.data} (${shift.ora_inizio}-${shift.ora_fine}) - not in old format.`);
      continue;
    }

    console.log(`Processing Shift ${shift.id} on ${shift.data} (${shift.ora_inizio}-${shift.ora_fine}), Crew ${shift.crew_id}`);

    // Determine target primary slot in-place update
    let primarySlot;
    if (isOldMattina) primarySlot = NEW_SLOTS[0]; // 06:00 - 13:00
    if (isOldPomeriggio) primarySlot = NEW_SLOTS[1]; // 13:00 - 18:00
    if (isOldNotte) primarySlot = NEW_SLOTS[3]; // 00:00 - 06:00

    // Record the in-place shift update
    shiftsToUpdate.push({
      id: shift.id,
      data: shift.data,
      ora_inizio: primarySlot.start,
      ora_fine: primarySlot.end,
      crew_id: shift.crew_id
    });

    // Update tracker to reflect that this shift will have a new ora_inizio
    // Remove old key
    delete shiftTracker[`${shift.data}|${shift.crew_id}|${shift.ora_inizio}`];
    // Add new key
    shiftTracker[`${shift.data}|${shift.crew_id}|${primarySlot.start}`] = { id: shift.id, isNew: false };

    // For shifts that split (Pomeriggio and Notte), we might need to create the secondary shift:
    // Pomeriggio (14-22) splits to Pomeriggio (13-18) [updated shift] and Sera (18-00) [secondary]
    // Notte (22-06) splits to Notte (00-06) [updated shift] and Sera (18-00) [secondary]
    let secondarySlot = null;
    if (isOldPomeriggio || isOldNotte) {
      secondarySlot = NEW_SLOTS[2]; // Sera (18:00 - 00:00)
    }

    let secondaryShiftRef = null;
    if (secondarySlot) {
      const key = `${shift.data}|${shift.crew_id}|${secondarySlot.start}`;
      if (!shiftTracker[key]) {
        // We need to create it!
        const newShiftObj = {
          data: shift.data,
          ora_inizio: secondarySlot.start,
          ora_fine: secondarySlot.end,
          crew_id: shift.crew_id,
          temp_key: key // to reference it later
        };
        shiftsToCreate.push(newShiftObj);
        shiftTracker[key] = { id: null, isNew: true, ref: newShiftObj };
      }
      secondaryShiftRef = shiftTracker[key];
    }

    // Now inspect bookings of this shift
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

      // Re-evaluate intersections with new slots
      const intersections = [];
      const slotsToCheck = secondarySlot ? [primarySlot, secondarySlot] : [primarySlot];

      for (const slot of slotsToCheck) {
        const intStart = Math.max(bkStart, slot.startMin);
        const intEnd = Math.min(bkEnd, slot.endMin);

        if (intStart < intEnd) {
          const isPartialNew = intStart > slot.startMin || intEnd < slot.endMin;
          let note = null;
          if (isPartialNew) {
            const startFmt = minutesToTimeStr(intStart).slice(0, 5);
            const endFmt = minutesToTimeStr(intEnd).slice(0, 5);
            if (intStart > slot.startMin && intEnd < slot.endMin) {
              note = `Dalle ${startFmt} alle ${endFmt}`;
            } else if (intStart > slot.startMin) {
              note = `Dalle ${startFmt}`;
            } else {
              note = `Fino alle ${endFmt}`;
            }
          }
          intersections.push({
            slot,
            intStart,
            intEnd,
            isPartialNew,
            note
          });
        }
      }

      if (intersections.length === 0) {
        console.log(`  Booking ${booking.id} (${booking.ruolo_turno} for user ${booking.user_id}) does not intersect new shifts! Marking for deletion.`);
        bookingsToDelete.push(booking.id);
      } else {
        // Handle intersections
        // The first intersection remains linked to the updated primary shift (shift.id)
        const primaryIntersection = intersections.find(i => i.slot.id === primarySlot.id);
        if (primaryIntersection) {
          bookingsToUpdate.push({
            id: booking.id,
            shift_id: shift.id,
            ora_inizio_effettiva: primaryIntersection.isPartialNew ? minutesToTimeStr(primaryIntersection.intStart) : null,
            ora_fine_effettiva: primaryIntersection.isPartialNew ? minutesToTimeStr(primaryIntersection.intEnd) : null,
            is_partial: primaryIntersection.isPartialNew,
            nota_parziale: primaryIntersection.note
          });
          console.log(`  Updating booking ${booking.id} on updated Shift ${shift.id}: ` + 
                      (primaryIntersection.isPartialNew ? `partial ${minutesToTimeStr(primaryIntersection.intStart).slice(0, 5)}–${minutesToTimeStr(primaryIntersection.intEnd).slice(0, 5)}` : 'full shift'));
        } else {
          // If it doesn't intersect primary, delete this booking record because it's no longer on the primary shift
          bookingsToDelete.push(booking.id);
        }

        // Secondary intersections (e.g. Sera shift) need to be inserted as new bookings
        const secondaryIntersection = intersections.find(i => i.slot.id === (secondarySlot ? secondarySlot.id : null));
        if (secondaryIntersection) {
          const newBooking = {
            user_id: booking.user_id,
            ruolo_turno: booking.ruolo_turno,
            ora_inizio_effettiva: secondaryIntersection.isPartialNew ? minutesToTimeStr(secondaryIntersection.intStart) : null,
            ora_fine_effettiva: secondaryIntersection.isPartialNew ? minutesToTimeStr(secondaryIntersection.intEnd) : null,
            is_partial: secondaryIntersection.isPartialNew,
            nota_parziale: secondaryIntersection.note,
            // We link it to secondaryShiftRef to map its shift_id after shift creation
            shiftRef: secondaryShiftRef
          };
          bookingsToCreate.push(newBooking);
          console.log(`  Will create new booking on secondary shift (${secondarySlot.name}): ` +
                      (secondaryIntersection.isPartialNew ? `partial ${minutesToTimeStr(secondaryIntersection.intStart).slice(0, 5)}–${minutesToTimeStr(secondaryIntersection.intEnd).slice(0, 5)}` : 'full shift'));
        }
      }
    }
    console.log();
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`Shifts to update (in-place): ${shiftsToUpdate.length}`);
  console.log(`Shifts to create: ${shiftsToCreate.length}`);
  console.log(`Bookings to update: ${bookingsToUpdate.length}`);
  console.log(`Bookings to delete: ${bookingsToDelete.length}`);
  console.log(`Bookings to create: ${bookingsToCreate.length}\n`);

  if (DRY_RUN) {
    console.log("DRY RUN completed. No database modifications were performed.");
    console.log("Set 'const DRY_RUN = false' in scratch/migrate_future_shifts.js and execute it again to apply changes.");
    return;
  }

  console.log("Applying database changes...");

  // 1. Create secondary shifts
  if (shiftsToCreate.length > 0) {
    console.log(`Inserting ${shiftsToCreate.length} new shifts...`);
    const insertRows = shiftsToCreate.map(s => ({
      data: s.data,
      ora_inizio: s.ora_inizio,
      ora_fine: s.ora_fine,
      crew_id: s.crew_id
    }));

    const { data: newShifts, error: insErr } = await supabase
      .from('shifts')
      .insert(insertRows)
      .select('id, data, ora_inizio, crew_id');

    if (insErr) {
      console.error("Error creating shifts:", insErr);
      return;
    }

    console.log(`Successfully created ${newShifts.length} new shifts.`);
    // Map shift_id to our local tracker
    newShifts.forEach(ns => {
      const key = `${ns.data}|${ns.crew_id}|${ns.ora_inizio}`;
      if (shiftTracker[key]) {
        shiftTracker[key].id = ns.id;
      }
    });
  }

  // 2. Update existing shifts
  if (shiftsToUpdate.length > 0) {
    console.log(`Updating ${shiftsToUpdate.length} existing shifts...`);
    for (const sh of shiftsToUpdate) {
      const { error: updErr } = await supabase
        .from('shifts')
        .update({ ora_inizio: sh.ora_inizio, ora_fine: sh.ora_fine })
        .eq('id', sh.id);
      if (updErr) {
        console.error(`Error updating shift ${sh.id}:`, updErr);
      }
    }
    console.log("Shifts updated.");
  }

  // 3. Delete bookings that no longer overlap primary shifts
  if (bookingsToDelete.length > 0) {
    console.log(`Deleting ${bookingsToDelete.length} bookings...`);
    const { error: delErr } = await supabase
      .from('bookings')
      .delete()
      .in('id', bookingsToDelete);
    if (delErr) {
      console.error("Error deleting bookings:", delErr);
    } else {
      console.log("Bookings deleted.");
    }
  }

  // 4. Update existing bookings
  if (bookingsToUpdate.length > 0) {
    console.log(`Updating ${bookingsToUpdate.length} bookings...`);
    for (const bk of bookingsToUpdate) {
      const { error: updBkErr } = await supabase
        .from('bookings')
        .update({
          ora_inizio_effettiva: bk.ora_inizio_effettiva,
          ora_fine_effettiva: bk.ora_fine_effettiva,
          is_partial: bk.is_partial,
          nota_parziale: bk.nota_parziale
        })
        .eq('id', bk.id);
      if (updBkErr) {
        console.error(`Error updating booking ${bk.id}:`, updBkErr);
      }
    }
    console.log("Bookings updated.");
  }

  // 5. Create new bookings on secondary shifts
  if (bookingsToCreate.length > 0) {
    console.log(`Creating ${bookingsToCreate.length} new bookings...`);
    const insertBkRows = bookingsToCreate.map(bk => {
      const shiftId = bk.shiftRef.id;
      if (!shiftId) {
        console.error("Critical: Could not resolve secondary shift ID for booking!", bk);
        return null;
      }
      return {
        shift_id: shiftId,
        user_id: bk.user_id,
        ruolo_turno: bk.ruolo_turno,
        ora_inizio_effettiva: bk.ora_inizio_effettiva,
        ora_fine_effettiva: bk.ora_fine_effettiva,
        is_partial: bk.is_partial,
        nota_parziale: bk.nota_parziale
      };
    }).filter(Boolean);

    if (insertBkRows.length > 0) {
      const { error: insBkErr } = await supabase
        .from('bookings')
        .insert(insertBkRows);
      if (insBkErr) {
        console.error("Error creating new bookings:", insBkErr);
      } else {
        console.log(`Successfully created ${insertBkRows.length} new bookings.`);
      }
    }
  }

  console.log("\nMigration execution finished!");
}

run();
