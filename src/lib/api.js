import { supabase, createTempClient } from './supabaseClient'

// Controlla se Supabase è configurato con chiavi reali
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && key && !url.includes('your-project-id') && !key.includes('your-supabase-anon-key')
}

const USE_MOCK = !isSupabaseConfigured()

if (USE_MOCK) {
  console.log("ℹ️ TurniAmbu è in esecuzione in MODALITÀ DEMO (Mock Data in localStorage)")
  
  // Inizializza i dati mock se non esistono
  if (!localStorage.getItem('ta_profiles')) {
    localStorage.setItem('ta_profiles', JSON.stringify([
      { id: '00000000-0000-0000-0000-000000000001', username: 'admin', ruolo: 'admin', attivo: true },
      { id: '00000000-0000-0000-0000-000000000002', username: 'mario_ce', ruolo: 'dipendente', attivo: true },
      { id: '00000000-0000-0000-0000-000000000003', username: 'luca_autista', ruolo: 'dipendente', attivo: true },
      { id: '00000000-0000-0000-0000-000000000004', username: 'giulia_ce', ruolo: 'dipendente', attivo: true },
      { id: '00000000-0000-0000-0000-000000000005', username: 'matteo_autista', ruolo: 'dipendente', attivo: false } // Utente inattivo
    ]))
  }
  if (!localStorage.getItem('ta_crews')) {
    localStorage.setItem('ta_crews', JSON.stringify([
      { id: 1, nome: 'Equipaggio 1', attivo: true },
      { id: 2, nome: 'Equipaggio 2', attivo: true }
    ]))
  }
  if (!localStorage.getItem('ta_shifts')) {
    // Aggiungiamo qualche turno di default nei giorni vicini
    localStorage.setItem('ta_shifts', JSON.stringify([]))
  }
  if (!localStorage.getItem('ta_bookings')) {
    localStorage.setItem('ta_bookings', JSON.stringify([]))
  }
}

// Helper per generare ID numerico incrementale
const getNextId = (items) => {
  if (items.length === 0) return 1
  return Math.max(...items.map(item => Number(item.id))) + 1
}

export const api = {
  isDemoMode: () => USE_MOCK,

  // =========================================================================
  // PROFILI E UTENTI
  // =========================================================================

  fetchProfiles: async () => {
    if (USE_MOCK) {
      return { data: JSON.parse(localStorage.getItem('ta_profiles')), error: null }
    }
    return supabase.from('profiles').select('*').order('username', { ascending: true })
  },

  // =========================================================================
  // EQUIPAGGI
  // =========================================================================

  fetchCrews: async () => {
    if (USE_MOCK) {
      const crews = JSON.parse(localStorage.getItem('ta_crews'))
      return { data: crews.filter(c => c.attivo), error: null }
    }
    return supabase.from('crews').select('*').eq('attivo', true).order('nome', { ascending: true })
  },

  // =========================================================================
  // TURNI (SHIFTS)
  // =========================================================================

  fetchShifts: async (startDate, endDate) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      // Filtra per date inclusive
      const filtered = shifts.filter(s => s.data >= startDate && s.data <= endDate)
      return { data: filtered, error: null }
    }
    return supabase
      .from('shifts')
      .select('*')
      .gte('data', startDate)
      .lte('data', endDate)
  },

  // Crea i turni di default per una determinata data se non esistono
  ensureShiftsExistForDates: async (dates, crews) => {
    if (dates.length === 0 || crews.length === 0) return { error: null }

    const standardTimeSlots = [
      { ora_inizio: '06:00:00', ora_fine: '14:00:00' },
      { ora_inizio: '14:00:00', ora_fine: '22:00:00' },
      { ora_inizio: '22:00:00', ora_fine: '06:00:00' }
    ]

    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      const updatedShifts = [...shifts]
      let added = false

      dates.forEach(date => {
        crews.forEach(crew => {
          standardTimeSlots.forEach(slot => {
            const exists = shifts.some(
              s => s.data === date && s.ora_inizio === slot.ora_inizio && s.crew_id === crew.id
            )
            if (!exists) {
              updatedShifts.push({
                id: getNextId(updatedShifts),
                data: date,
                ora_inizio: slot.ora_inizio,
                ora_fine: slot.ora_fine,
                crew_id: crew.id
              })
              added = true
            }
          })
        })
      })

      if (added) {
        localStorage.setItem('ta_shifts', JSON.stringify(updatedShifts))
      }
      return { error: null }
    }

    // Per Supabase, facciamo un controllo ed eventuale inserimento bulk
    try {
      // 1. Legge i turni esistenti in quel range
      const minDate = dates[0]
      const maxDate = dates[dates.length - 1]
      const { data: existingShifts, error: fetchErr } = await supabase
        .from('shifts')
        .select('data, ora_inizio, crew_id')
        .gte('data', minDate)
        .lte('data', maxDate)

      if (fetchErr) throw fetchErr

      const insertRows = []
      dates.forEach(date => {
        crews.forEach(crew => {
          standardTimeSlots.forEach(slot => {
            const exists = existingShifts.some(
              s => s.data === date && s.ora_inizio === slot.ora_inizio && s.crew_id === String(crew.id)
            )
            if (!exists) {
              insertRows.push({
                data: date,
                ora_inizio: slot.ora_inizio,
                ora_fine: slot.ora_fine,
                crew_id: crew.id
              })
            }
          })
        })
      })

      if (insertRows.length > 0) {
        const { error: insertErr } = await supabase.from('shifts').insert(insertRows)
        if (insertErr) throw insertErr
      }

      return { error: null }
    } catch (err) {
      console.error('Errore in ensureShiftsExistForDates:', err)
      return { error: err }
    }
  },

  // =========================================================================
  // PRENOTAZIONI (BOOKINGS)
  // =========================================================================

  fetchBookings: async (startDate, endDate) => {
    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      const profiles = JSON.parse(localStorage.getItem('ta_profiles'))

      // Filtra i turni in quel range di date
      const shiftIds = shifts
        .filter(s => s.data >= startDate && s.data <= endDate)
        .map(s => s.id)

      // Filtra le prenotazioni associate a quei turni
      const filteredBookings = bookings.filter(b => shiftIds.includes(b.shift_id))

      // Esegui i join in memoria
      const enriched = filteredBookings.map(b => {
        const shiftObj = shifts.find(s => s.id === b.shift_id)
        const profileObj = profiles.find(p => p.id === b.user_id)
        return {
          ...b,
          profiles: profileObj ? { username: profileObj.username, ruolo: profileObj.ruolo } : null,
          shifts: shiftObj
        }
      })

      return { data: enriched, error: null }
    }

    return supabase
      .from('bookings')
      .select('*, profiles(username, ruolo), shifts(*)')
      .gte('shifts.data', startDate)
      .lte('shifts.data', endDate)
  },

  // Effettua una prenotazione singola
  bookSlot: async ({ shiftId, role, userId, startTime = null, endTime = null, isPartial = false, note = null }) => {
    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      
      // Controlla se il ruolo nello shift è già occupato
      const isOccupied = bookings.some(b => b.shift_id === shiftId && b.ruolo_turno === role)
      if (isOccupied) {
        return { error: { message: 'Questo ruolo è già occupato per questo turno.' } }
      }

      const newBooking = {
        id: getNextId(bookings),
        shift_id: shiftId,
        user_id: userId,
        ruolo_turno: role,
        ora_inizio_effettiva: startTime,
        ora_fine_effettiva: endTime,
        is_partial: isPartial,
        nota_parziale: note,
        created_at: new Date().toISOString()
      }

      bookings.push(newBooking)
      localStorage.setItem('ta_bookings', JSON.stringify(bookings))
      return { data: newBooking, error: null }
    }

    return supabase
      .from('bookings')
      .insert({
        shift_id: shiftId,
        user_id: userId,
        ruolo_turno: role,
        ora_inizio_effettiva: startTime,
        ora_fine_effettiva: endTime,
        is_partial: isPartial,
        nota_parziale: note
      })
      .select()
      .single()
  },

  // Cancella una prenotazione
  cancelBooking: async (bookingId) => {
    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const index = bookings.findIndex(b => b.id === bookingId)
      if (index === -1) return { error: { message: 'Prenotazione non trovata.' } }
      
      bookings.splice(index, 1)
      localStorage.setItem('ta_bookings', JSON.stringify(bookings))
      return { error: null }
    }

    return supabase.from('bookings').delete().eq('id', bookingId)
  },

  // Carica i turni futuri dell'utente loggato
  fetchMyFutureBookings: async (userId) => {
    const todayStr = new Date().toISOString().split('T')[0]

    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      
      const filtered = bookings
        .filter(b => b.user_id === userId)
        .map(b => {
          const shiftObj = shifts.find(s => s.id === b.shift_id)
          return { ...b, shifts: shiftObj }
        })
        // Filtra per turni futuri o odierni
        .filter(b => b.shifts && b.shifts.data >= todayStr)
        // Ordina per data e poi per ora_inizio
        .sort((a, b) => {
          if (a.shifts.data !== b.shifts.data) return a.shifts.data.localeCompare(b.shifts.data)
          return a.shifts.ora_inizio.localeCompare(b.shifts.ora_inizio)
        })

      return { data: filtered, error: null }
    }

    return supabase
      .from('bookings')
      .select('*, shifts(*)')
      .eq('user_id', userId)
      .gte('shifts.data', todayStr)
      .order('data', { foreignTable: 'shifts', ascending: true })
      .order('ora_inizio', { foreignTable: 'shifts', ascending: true })
  },

  // =========================================================================
  // LOGICA DISPONIBILITÀ BULK E CONFLITTI
  // =========================================================================

  checkBulkConflicts: async (userId, targetShifts, targetRole) => {
    // targetShifts è un array di oggetti: { date, shift_id_placeholder (1, 2, 3) }
    // Vogliamo verificare:
    // 1. Se l'utente ha già una sua prenotazione in quel giorno e in quella fascia (conflitto utente).
    // 2. Se lo slot in quel giorno, fascia, crew_id è già occupato da qualcun altro.
    const dates = [...new Set(targetShifts.map(ts => ts.date))].sort()
    if (dates.length === 0) return { conflicts: [], error: null }

    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      const profiles = JSON.parse(localStorage.getItem('ta_profiles'))

      const conflicts = []

      for (const target of targetShifts) {
        // Trova lo shift corrispondente in locale
        const standardHourStart = target.shift_id_placeholder === 1 ? '06:00:00' : target.shift_id_placeholder === 2 ? '14:00:00' : '22:00:00'
        
        // Cerca i turni attivi per quel giorno e orario
        const dayShifts = shifts.filter(s => s.data === target.date && s.ora_inizio === standardHourStart)

        for (const shiftObj of dayShifts) {
          // 1. Controlla se l'utente stesso è già prenotato in un qualunque ruolo in questo shift
          const userHasBooking = bookings.find(b => b.shift_id === shiftObj.id && b.user_id === userId)
          if (userHasBooking) {
            conflicts.push({
              date: target.date,
              shiftLabel: target.label,
              type: 'user_conflict',
              message: `Sei già prenotato come ${userHasBooking.ruolo_turno} in questa fascia.`,
              bookingId: userHasBooking.id
            })
            continue // Se c'è già la prenotazione dell'utente stesso, non serve segnalare l'occupazione dell'altro
          }

          // 2. Controlla se il ruolo scelto è già occupato da un altro utente
          const roleOccupied = bookings.find(b => b.shift_id === shiftObj.id && b.ruolo_turno === targetRole)
          if (roleOccupied) {
            const occupant = profiles.find(p => p.id === roleOccupied.user_id)
            conflicts.push({
              date: target.date,
              shiftLabel: target.label,
              type: 'slot_occupied',
              message: `Lo slot ${targetRole} è già occupato da ${occupant ? occupant.username : 'un collega'}.`,
              occupant: occupant ? occupant.username : 'collega'
            })
          }
        }
      }

      return { conflicts, error: null }
    }

    try {
      const minDate = dates[0]
      const maxDate = dates[dates.length - 1]

      // Carica tutti i turni e prenotazioni in quel range
      const { data: dbShifts, error: shErr } = await supabase
        .from('shifts')
        .select('*, bookings(*, profiles(username))')
        .gte('data', minDate)
        .lte('data', maxDate)

      if (shErr) throw shErr

      const conflicts = []

      for (const target of targetShifts) {
        const standardHourStart = target.shift_id_placeholder === 1 ? '06:00:00' : target.shift_id_placeholder === 2 ? '14:00:00' : '22:00:00'
        const matchingShifts = dbShifts.filter(s => s.data === target.date && s.ora_inizio === standardHourStart)

        for (const shiftObj of matchingShifts) {
          // Controlla se l'utente loggato ha già una prenotazione
          const myBk = shiftObj.bookings.find(b => b.user_id === userId)
          if (myBk) {
            conflicts.push({
              date: target.date,
              shiftLabel: target.label,
              type: 'user_conflict',
              message: `Sei già prenotato come ${myBk.ruolo_turno} in questa fascia.`,
              bookingId: myBk.id
            })
            continue
          }

          // Controlla se il ruolo nello shift è già occupato
          const roleBk = shiftObj.bookings.find(b => b.ruolo_turno === targetRole)
          if (roleBk) {
            conflicts.push({
              date: target.date,
              shiftLabel: target.label,
              type: 'slot_occupied',
              message: `Lo slot ${targetRole} è già occupato da ${roleBk.profiles?.username || 'un collega'}.`,
              occupant: roleBk.profiles?.username || 'collega'
            })
          }
        }
      }

      return { conflicts, error: null }
    } catch (err) {
      console.error('Errore durante la verifica dei conflitti:', err)
      return { conflicts: [], error: err }
    }
  },

  executeBulkBooking: async (userId, targetShifts, targetRole) => {
    // targetShifts: array di { date, shift_id_placeholder, ora_inizio_effettiva, ora_fine_effettiva, is_partial, nota_parziale }
    if (targetShifts.length === 0) return { error: null }

    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      
      const newBookings = []

      for (const target of targetShifts) {
        const standardHourStart = target.shift_id_placeholder === 1 ? '06:00:00' : target.shift_id_placeholder === 2 ? '14:00:00' : '22:00:00'
        
        // Trova il turno corrispondente (per default equipaggio 1)
        const shiftObj = shifts.find(s => s.data === target.date && s.ora_inizio === standardHourStart && s.crew_id === 1)
        
        if (shiftObj) {
          // Inserisce solo se non c'è già una prenotazione per quel ruolo in quel turno
          const isOccupied = bookings.some(b => b.shift_id === shiftObj.id && b.ruolo_turno === targetRole)
          if (!isOccupied) {
            const newBk = {
              id: getNextId([...bookings, ...newBookings]),
              shift_id: shiftObj.id,
              user_id: userId,
              ruolo_turno: targetRole,
              ora_inizio_effettiva: target.ora_inizio_effettiva || null,
              ora_fine_effettiva: target.ora_fine_effettiva || null,
              is_partial: target.is_partial || false,
              nota_parziale: target.nota_parziale || null,
              created_at: new Date().toISOString()
            }
            newBookings.push(newBk)
          }
        }
      }

      bookings.push(...newBookings)
      localStorage.setItem('ta_bookings', JSON.stringify(bookings))
      return { data: newBookings, error: null }
    }

    try {
      // Dobbiamo prima assicurarci di trovare gli id degli shift corrispondenti nel DB
      const minDate = targetShifts[0].date
      const maxDate = targetShifts[targetShifts.length - 1].date

      const { data: dbShifts, error: shErr } = await supabase
        .from('shifts')
        .select('*')
        .gte('data', minDate)
        .lte('data', maxDate)

      if (shErr) throw shErr

      const insertRows = []

      for (const target of targetShifts) {
        const standardHourStart = target.shift_id_placeholder === 1 ? '06:00:00' : target.shift_id_placeholder === 2 ? '14:00:00' : '22:00:00'
        
        // Tenta di prenotare per l'equipaggio 1 (il default)
        const shiftObj = dbShifts.find(s => s.data === target.date && s.ora_inizio === standardHourStart && s.crew_id === 1)

        if (shiftObj) {
          insertRows.push({
            shift_id: shiftObj.id,
            user_id: userId,
            ruolo_turno: targetRole,
            ora_inizio_effettiva: target.ora_inizio_effettiva || null,
            ora_fine_effettiva: target.ora_fine_effettiva || null,
            is_partial: target.is_partial || false,
            nota_parziale: target.nota_parziale || null
          })
        }
      }

      if (insertRows.length > 0) {
        const { error: insertErr } = await supabase.from('bookings').insert(insertRows)
        if (insertErr) throw insertErr
      }

      return { error: null }
    } catch (err) {
      console.error('Errore durante la prenotazione bulk:', err)
      return { error: err }
    }
  },

  // =========================================================================
  // ADMIN PANEL FEATURES
  // =========================================================================

  // Aggiunge un secondo equipaggio per una certa data e fascia
  adminAddCrewToShift: async (date, ora_inizio, ora_fine, crewId) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      
      // Controlla se quel turno esiste già per quell'equipaggio
      const exists = shifts.some(
        s => s.data === date && s.ora_inizio === ora_inizio && s.crew_id === crewId
      )

      if (exists) {
        return { error: { message: 'Questo equipaggio è già assegnato a questa fascia in questo giorno.' } }
      }

      const newShift = {
        id: getNextId(shifts),
        data: date,
        ora_inizio: ora_inizio,
        ora_fine: ora_fine,
        crew_id: crewId
      }

      shifts.push(newShift)
      localStorage.setItem('ta_shifts', JSON.stringify(shifts))
      return { data: newShift, error: null }
    }

    return supabase
      .from('shifts')
      .insert({
        data: date,
        ora_inizio: ora_inizio,
        ora_fine: ora_fine,
        crew_id: crewId
      })
      .select()
      .single()
  },

  // Modifica una prenotazione (ora inizio/fine effettiva, ruolo, nota)
  adminUpdateBooking: async (bookingId, updates) => {
    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const index = bookings.findIndex(b => b.id === bookingId)
      if (index === -1) return { error: { message: 'Prenotazione non trovata.' } }

      // Se cambia ruolo o shift, controlla i vincoli di unicità
      if (updates.shift_id || updates.ruolo_turno) {
        const targetShiftId = updates.shift_id || bookings[index].shift_id
        const targetRole = updates.ruolo_turno || bookings[index].ruolo_turno
        
        const isOccupied = bookings.some(
          b => b.id !== bookingId && b.shift_id === targetShiftId && b.ruolo_turno === targetRole
        )
        if (isOccupied) {
          return { error: { message: 'Operazione fallita: quel ruolo nel turno selezionato è già occupato.' } }
        }
      }

      bookings[index] = {
        ...bookings[index],
        ...updates
      }

      localStorage.setItem('ta_bookings', JSON.stringify(bookings))
      return { data: bookings[index], error: null }
    }

    return supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single()
  },

  // Sposta un utente da una prenotazione all'altra (spostamento turno)
  adminMoveBooking: async (bookingId, targetShiftId, targetRole) => {
    return api.adminUpdateBooking(bookingId, {
      shift_id: targetShiftId,
      ruolo_turno: targetRole
    })
  },

  // Crea un nuovo utente (admin-only)
  adminCreateUser: async (username, password, role) => {
    const email = `${username.trim().toLowerCase()}@app.internal`

    if (USE_MOCK) {
      const profiles = JSON.parse(localStorage.getItem('ta_profiles'))
      const usernameExists = profiles.some(p => p.username.toLowerCase() === username.trim().toLowerCase())
      
      if (usernameExists) {
        return { error: { message: `Lo username '${username}' è già in uso.` } }
      }

      const newId = `00000000-0000-0000-0000-00000000000${getNextId(profiles)}`
      const newProfile = {
        id: newId,
        username: username.trim(),
        ruolo: role,
        attivo: true
      }

      profiles.push(newProfile)
      localStorage.setItem('ta_profiles', JSON.stringify(profiles))
      return { data: newProfile, error: null }
    }

    // Per Supabase Auth reale:
    // Utilizza un client temporaneo senza persistenza di sessione per non disconnettere l'admin corrente!
    const tempClient = createTempClient()
    try {
      const { data, error: signUpError } = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
            ruolo: role
          }
        }
      })

      if (signUpError) throw signUpError

      // Il trigger DB autoconferma il profilo e lo inserisce in public.profiles.
      // Dobbiamo solo restituire i dati.
      return { data: data.user, error: null }
    } catch (err) {
      console.error('Errore nella registrazione dell\'utente:', err)
      return { error: err }
    }
  },

  // Aggiorna un profilo utente (es. cambia ruolo o stato attivo/disattivato)
  adminUpdateProfile: async (userId, updates) => {
    if (USE_MOCK) {
      const profiles = JSON.parse(localStorage.getItem('ta_profiles'))
      const index = profiles.findIndex(p => p.id === userId)
      if (index === -1) return { error: { message: 'Utente non trovato.' } }

      profiles[index] = {
        ...profiles[index],
        ...updates
      }
      localStorage.setItem('ta_profiles', JSON.stringify(profiles))
      return { data: profiles[index], error: null }
    }

    return supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
  },

  // Resetta password utente (chiamando la RPC SQL)
  adminSetPassword: async (userId, newPassword) => {
    if (USE_MOCK) {
      console.log(`[MOCK ADMIN] Password aggiornata per utente ${userId} a: ${newPassword}`)
      return { error: null }
    }

    return supabase.rpc('admin_set_password', {
      target_user_id: userId,
      new_password: newPassword
    })
  },

  // Storico turni passati (solo admin)
  fetchPastBookings: async () => {
    const todayStr = new Date().toISOString().split('T')[0]

    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      const profiles = JSON.parse(localStorage.getItem('ta_profiles'))

      const pastBookings = bookings.map(b => {
        const shiftObj = shifts.find(s => s.id === b.shift_id)
        const profileObj = profiles.find(p => p.id === b.user_id)
        return {
          ...b,
          profiles: profileObj ? { username: profileObj.username, ruolo: profileObj.ruolo } : null,
          shifts: shiftObj
        }
      })
      // Filtra solo turni passati
      .filter(b => b.shifts && b.shifts.data < todayStr)
      // Ordina decrescente (dal più recente)
      .sort((a, b) => {
        if (a.shifts.data !== b.shifts.data) return b.shifts.data.localeCompare(a.shifts.data)
        return b.shifts.ora_inizio.localeCompare(a.shifts.ora_inizio)
      })

      return { data: pastBookings, error: null }
    }

    return supabase
      .from('bookings')
      .select('*, profiles(username, ruolo), shifts(*)')
      .lt('shifts.data', todayStr)
      .order('data', { foreignTable: 'shifts', ascending: false })
      .order('ora_inizio', { foreignTable: 'shifts', ascending: false })
  }
}
