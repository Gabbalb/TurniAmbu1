import { supabase, createTempClient } from './supabaseClient'

// Controlla se Supabase è configurato con chiavi reali
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && key && !url.includes('your-project-id') && !key.includes('your-supabase-anon-key')
}

const USE_MOCK = !isSupabaseConfigured()

if (USE_MOCK) {
  console.log("ℹ️ GM Turni è in esecuzione in MODALITÀ DEMO (Mock Data in localStorage)")
  
  // Inizializza i dati mock se non esistono
  if (!localStorage.getItem('ta_profiles')) {
    localStorage.setItem('ta_profiles', JSON.stringify([
      { 
        id: '00000000-0000-0000-0000-000000000001', 
        username: 'admin.system', 
        ruolo: 'admin', 
        attivo: true,
        nome: 'Admin',
        cognome: 'System',
        codice_fiscale: 'ADMSRV90A01H501Z',
        email: 'admin@system.it',
        telefono: '3331234567',
        data_nascita: '1990-01-01',
        stato: 'admin',
        qualifica: 'CE',
        paga_oraria: null,
        credito_surplus: 0.00
      },
      { 
        id: '00000000-0000-0000-0000-000000000002', 
        username: 'mario.rossi', 
        ruolo: 'dipendente', 
        attivo: true,
        nome: 'Mario',
        cognome: 'Rossi',
        codice_fiscale: 'RSSMRA85M01H501F',
        email: 'mario.rossi@gmail.com',
        telefono: '3339876543',
        data_nascita: '1985-05-01',
        stato: 'dipendente',
        qualifica: 'CE',
        paga_oraria: 12.50,
        credito_surplus: 0.00
      },
      { 
        id: '00000000-0000-0000-0000-000000000003', 
        username: 'luca.bianchi', 
        ruolo: 'dipendente', 
        attivo: true,
        nome: 'Luca',
        cognome: 'Bianchi',
        codice_fiscale: 'BNCLCU80A01H501D',
        email: 'luca.bianchi@gmail.com',
        telefono: '3335556667',
        data_nascita: '1980-01-01',
        stato: 'dipendente',
        qualifica: 'autista',
        paga_oraria: 14.00,
        credito_surplus: 0.00
      },
      { 
        id: '00000000-0000-0000-0000-000000000004', 
        username: 'giulia.verdi', 
        ruolo: 'dipendente', 
        attivo: true,
        nome: 'Giulia',
        cognome: 'Verdi',
        codice_fiscale: 'VRDGLI92E01H501Q',
        email: 'giulia.verdi@gmail.com',
        telefono: '3338889990',
        data_nascita: '1992-05-01',
        stato: 'volontario',
        qualifica: 'CE',
        paga_oraria: null,
        credito_surplus: 0.00
      },
      { 
        id: '00000000-0000-0000-0000-000000000005', 
        username: 'matteo.neri', 
        ruolo: 'dipendente', 
        attivo: false,
        nome: 'Matteo',
        cognome: 'Neri',
        codice_fiscale: 'NREMTT88H01H501O',
        email: 'matteo.neri@gmail.com',
        telefono: '3332223334',
        data_nascita: '1988-08-08',
        stato: 'dipendente',
        qualifica: 'autista',
        paga_oraria: 13.50,
        credito_surplus: 0.00
      }
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
  if (!localStorage.getItem('ta_clocked_shifts')) {
    localStorage.setItem('ta_clocked_shifts', JSON.stringify([]))
  }
  if (!localStorage.getItem('ta_notifications')) {
    localStorage.setItem('ta_notifications', JSON.stringify([
      {
        id: 1,
        tipo: 'accesso_admin',
        messaggio: "L'amministratore admin.system si è collegato all'interfaccia admin tramite il dispositivo Windows con browser Chrome [ID: mock-device-id].",
        creato_da: 'admin.system',
        created_at: new Date(Date.now() - 600000).toISOString()
      },
      {
        id: 2,
        tipo: 'timbratura_inizio',
        messaggio: "L'utente mario.rossi ha iniziato il turno.",
        creato_da: 'mario.rossi',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 3,
        tipo: 'prenotazione_effettuata',
        messaggio: "L'utente giulia.verdi si è prenotata per il ruolo 'CE' del turno.",
        creato_da: 'giulia.verdi',
        created_at: new Date(Date.now() - 14400000).toISOString()
      },
      {
        id: 4,
        tipo: 'registrazione',
        messaggio: 'Nuovo utente registrato in piattaforma: "giulia.verdi" con stato "volontario".',
        creato_da: 'giulia.verdi',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ]))
  }
  if (!localStorage.getItem('ta_vehicles')) {
    localStorage.setItem('ta_vehicles', JSON.stringify([
      { id: 1, nome: 'Ambulanza 1', targa: 'AM123BU', attivo: true, km_attuali: 120500 },
      { id: 2, nome: 'Ambulanza 2', targa: 'AM456BU', attivo: true, km_attuali: 89400 },
      { id: 3, nome: 'Auto Medica', targa: 'MD789MD', attivo: true, km_attuali: 45200 },
      { id: 4, nome: 'Mezzo Disabili', targa: 'DS321DB', attivo: true, km_attuali: 15300 }
    ]))
  }
  if (!localStorage.getItem('ta_transports')) {
    localStorage.setItem('ta_transports', JSON.stringify([]))
  }
  if (!localStorage.getItem('ta_transport_crew')) {
    localStorage.setItem('ta_transport_crew', JSON.stringify([]))
  }
  if (!localStorage.getItem('ta_transport_handoffs')) {
    localStorage.setItem('ta_transport_handoffs', JSON.stringify([]))
  }
}

// Helper per generare ID numerico incrementale
const getNextId = (items) => {
  if (items.length === 0) return 1
  return Math.max(...items.map(item => Number(item.id))) + 1
}

// Helper per convertire un orario HH:MM:SS o HH:MM in minuti da mezzanotte
const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const hours = Number(parts[0]) || 0
  const minutes = Number(parts[1]) || 0
  return hours * 60 + minutes
}

// Helper per ottenere l'intervallo [inizio, fine] in minuti da mezzanotte della data del turno
const getBookingMinutesInterval = (booking, standardStart, standardEnd) => {
  const isPartial = booking.is_partial || booking.isPartial
  const startStr = isPartial ? (booking.ora_inizio_effettiva || booking.startTime) : standardStart
  const endStr = isPartial ? (booking.ora_fine_effettiva || booking.endTime) : standardEnd

  let startMin = timeStringToMinutes(startStr)
  let endMin = timeStringToMinutes(endStr)

  // Se è una fascia notturna (inizia alle 22:00)
  if (standardStart.startsWith('22')) {
    if (startMin < 720) startMin += 1440 // prima mattina del giorno dopo (es. 02:00)
    if (endMin < 720) endMin += 1440     // prima mattina del giorno dopo (es. 06:00)
    if (endMin <= startMin) endMin += 1440 // a cavallo della mezzanotte
  } else {
    // Altre fasce
    if (endMin <= startMin) endMin += 1440
  }

  return [startMin, endMin]
}

const getStandardHours = (placeholder) => {
  const p = Number(placeholder)
  if (p === 1) return { start: '06:00:00', end: '14:00:00' }
  if (p === 2) return { start: '14:00:00', end: '22:00:00' }
  return { start: '22:00:00', end: '06:00:00' }
}

const checkIntervalsOverlap = (intA, intB) => {
  return Math.max(intA[0], intB[0]) < Math.min(intA[1], intB[1])
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
        crews.slice(0, 1).forEach(crew => {
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
        crews.slice(0, 1).forEach(crew => {
          standardTimeSlots.forEach(slot => {
            const exists = existingShifts.some(
              s => s.data === date && s.ora_inizio === slot.ora_inizio && String(s.crew_id) === String(crew.id)
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
          profiles: profileObj ? { username: profileObj.username, ruolo: profileObj.ruolo, nome: profileObj.nome, cognome: profileObj.cognome } : null,
          shifts: shiftObj
        }
      })

      return { data: enriched, error: null }
    }

    return supabase
      .from('bookings')
      .select('*, profiles(username, ruolo, nome, cognome), shifts(*)')
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
    // 1. Se l'utente ha già una sua prenotazione in quel giorno e in quella fascia sovrapposta all'orario richiesto (conflitto utente).
    // 2. Se lo slot in quel giorno, fascia, crew_id è già occupato da qualcun altro in orario sovrapposto.
    const dates = [...new Set(targetShifts.map(ts => ts.date))].sort()
    if (dates.length === 0) return { conflicts: [], error: null }

    // Forza la creazione degli shift del periodo se non esistono ancora
    try {
      const { data: crewsData } = await api.fetchCrews()
      if (crewsData && crewsData.length > 0) {
        await api.ensureShiftsExistForDates(dates, crewsData)
      }
    } catch (e) {
      console.warn("Errore in ensureShiftsExistForDates durante checkBulkConflicts:", e)
    }

    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      const profiles = JSON.parse(localStorage.getItem('ta_profiles'))

      const conflicts = []

      for (const target of targetShifts) {
        const standardHourStart = target.shift_id_placeholder === 1 ? '06:00:00' : target.shift_id_placeholder === 2 ? '14:00:00' : '22:00:00'
        const stdHours = getStandardHours(target.shift_id_placeholder)
        const dayShifts = shifts.filter(s => s.data === target.date && s.ora_inizio === standardHourStart)

        for (const shiftObj of dayShifts) {
          const targetInterval = getBookingMinutesInterval(target, stdHours.start, stdHours.end)

          // 1. Controlla se l'utente stesso è già prenotato in un qualunque ruolo in questo shift in orario sovrapposto
          const userBookings = bookings.filter(b => b.shift_id === shiftObj.id && b.user_id === userId)
          let userConflict = false
          for (const uBk of userBookings) {
            const uInterval = getBookingMinutesInterval(uBk, stdHours.start, stdHours.end)
            if (checkIntervalsOverlap(targetInterval, uInterval)) {
              conflicts.push({
                date: target.date,
                shiftLabel: target.label,
                type: 'user_conflict',
                message: `Sei già prenotato come ${uBk.ruolo_turno} in questa fascia in questo orario.`,
                bookingId: uBk.id
              })
              userConflict = true
              break
            }
          }
          if (userConflict) continue

          // 2. Controlla se il ruolo scelto è già occupato da un altro utente in orario sovrapposto
          const roleBookings = bookings.filter(b => b.shift_id === shiftObj.id && b.ruolo_turno === targetRole)
          for (const rBk of roleBookings) {
            const rInterval = getBookingMinutesInterval(rBk, stdHours.start, stdHours.end)
            if (checkIntervalsOverlap(targetInterval, rInterval)) {
              const occupant = profiles.find(p => p.id === rBk.user_id)
              conflicts.push({
                date: target.date,
                shiftLabel: target.label,
                type: 'slot_occupied',
                message: `Lo slot ${targetRole} è già occupato da ${occupant ? occupant.username : 'un collega'} in questo orario.`,
                occupant: occupant ? occupant.username : 'collega'
              })
            }
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
        .select('*, bookings(*, profiles(username, nome, cognome))')
        .gte('data', minDate)
        .lte('data', maxDate)

      if (shErr) throw shErr

      const conflicts = []

      for (const target of targetShifts) {
        const standardHourStart = target.shift_id_placeholder === 1 ? '06:00:00' : target.shift_id_placeholder === 2 ? '14:00:00' : '22:00:00'
        const stdHours = getStandardHours(target.shift_id_placeholder)
        const matchingShifts = dbShifts.filter(s => s.data === target.date && s.ora_inizio === standardHourStart)

        for (const shiftObj of matchingShifts) {
          const targetInterval = getBookingMinutesInterval(target, stdHours.start, stdHours.end)

          // Controlla se l'utente loggato ha già una prenotazione sovrapposta
          const myBks = shiftObj.bookings.filter(b => b.user_id === userId)
          let userConflict = false
          for (const myBk of myBks) {
            const myInterval = getBookingMinutesInterval(myBk, stdHours.start, stdHours.end)
            if (checkIntervalsOverlap(targetInterval, myInterval)) {
              conflicts.push({
                date: target.date,
                shiftLabel: target.label,
                type: 'user_conflict',
                message: `Sei già prenotato come ${myBk.ruolo_turno} in questa fascia in questo orario.`,
                bookingId: myBk.id
              })
              userConflict = true
              break
            }
          }
          if (userConflict) continue

          // Controlla se il ruolo nello shift è già occupato in orario sovrapposto
          const roleBks = shiftObj.bookings.filter(b => b.ruolo_turno === targetRole)
          for (const roleBk of roleBks) {
            const roleInterval = getBookingMinutesInterval(roleBk, stdHours.start, stdHours.end)
            if (checkIntervalsOverlap(targetInterval, roleInterval)) {
              conflicts.push({
                date: target.date,
                shiftLabel: target.label,
                type: 'slot_occupied',
                message: `Lo slot ${targetRole} è già occupato da ${roleBk.profiles?.username || 'un collega'} in questo orario.`,
                occupant: roleBk.profiles?.username || 'collega'
              })
            }
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

    const dates = [...new Set(targetShifts.map(ts => ts.date))].sort()
    
    // Forza la creazione degli shift del periodo se non esistono ancora
    try {
      const { data: crewsData } = await api.fetchCrews()
      if (crewsData && crewsData.length > 0) {
        await api.ensureShiftsExistForDates(dates, crewsData)
      }
    } catch (e) {
      console.warn("Errore in ensureShiftsExistForDates durante executeBulkBooking:", e)
    }

    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
      const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
      
      const newBookings = []

      for (const target of targetShifts) {
        const standardHourStart = target.shift_id_placeholder === 1 ? '06:00:00' : target.shift_id_placeholder === 2 ? '14:00:00' : '22:00:00'
        
        // Trova il turno corrispondente (per default equipaggio 1)
        const shiftObj = shifts.find(s => s.data === target.date && s.ora_inizio === standardHourStart && String(s.crew_id) === "1")
        
        if (shiftObj) {
          // Inserisce solo se non c'è già una prenotazione sovrapposta per quel ruolo in quel turno
          const roleBookings = [...bookings, ...newBookings].filter(b => b.shift_id === shiftObj.id && b.ruolo_turno === targetRole)
          const stdHours = getStandardHours(target.shift_id_placeholder)
          const targetInterval = getBookingMinutesInterval(target, stdHours.start, stdHours.end)

          let isOccupied = false
          for (const rBk of roleBookings) {
            const rInterval = getBookingMinutesInterval(rBk, stdHours.start, stdHours.end)
            if (checkIntervalsOverlap(targetInterval, rInterval)) {
              isOccupied = true
              break
            }
          }

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
        const shiftObj = dbShifts.find(s => s.data === target.date && s.ora_inizio === standardHourStart && String(s.crew_id) === "1")

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
        s => s.data === date && s.ora_inizio === ora_inizio && String(s.crew_id) === String(crewId)
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

  createCrew: async (nome) => {
    if (USE_MOCK) {
      const crews = JSON.parse(localStorage.getItem('ta_crews')) || []
      const exists = crews.some(c => c.nome.toLowerCase() === nome.toLowerCase())
      if (exists) {
        return { error: { message: 'Un equipaggio con questo nome esiste già.' } }
      }
      const newCrew = {
        id: getNextId(crews),
        nome,
        attivo: true
      }
      crews.push(newCrew)
      localStorage.setItem('ta_crews', JSON.stringify(crews))
      return { data: newCrew, error: null }
    }

    return supabase
      .from('crews')
      .insert({ nome, attivo: true })
      .select()
      .single()
  },

  deleteCrew: async (crewId) => {
    if (USE_MOCK) {
      const crews = JSON.parse(localStorage.getItem('ta_crews')) || []
      const updated = crews.filter(c => Number(c.id) !== Number(crewId))
      localStorage.setItem('ta_crews', JSON.stringify(updated))
      return { error: null }
    }

    return supabase
      .from('crews')
      .delete()
      .eq('id', crewId)
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

  // Genera uno username univoco in formato nome.cognome
  generateUniqueUsername: async (nome, cognome) => {
    const cleanNome = nome.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCognome = cognome.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseUsername = `${cleanNome}.${cleanCognome}`;

    let existingUsernames = [];
    if (USE_MOCK) {
      const profiles = JSON.parse(localStorage.getItem('ta_profiles')) || [];
      existingUsernames = profiles.map(p => p.username.toLowerCase());
    } else {
      const { data, error } = await supabase.from('profiles').select('username');
      if (!error && data) {
        existingUsernames = data.map(p => p.username.toLowerCase());
      }
    }

    if (!existingUsernames.includes(baseUsername)) {
      return baseUsername;
    }

    let counter = 1;
    while (true) {
      const suffix = counter < 10 ? `0${counter}` : `${counter}`;
      const candidate = `${baseUsername}${suffix}`;
      if (!existingUsernames.includes(candidate)) {
        return candidate;
      }
      counter++;
    }
  },

  // Crea un nuovo utente (admin-only)
  adminCreateUser: async (userData) => {
    const { 
      nome, 
      cognome, 
      password, 
      stato, 
      qualifica, 
      codice_fiscale, 
      email, 
      telefono, 
      data_nascita, 
      paga_oraria 
    } = userData;

    // Genera username univoco
    const generatedUsername = await api.generateUniqueUsername(nome, cognome);
    const authEmail = `${generatedUsername}@app.internal`;

    if (USE_MOCK) {
      const profiles = JSON.parse(localStorage.getItem('ta_profiles')) || [];
      const newId = `00000000-0000-0000-0000-00000000000${getNextId(profiles)}`;
      const newProfile = {
        id: newId,
        username: generatedUsername,
        ruolo: stato === 'admin' ? 'admin' : 'dipendente', // compatibilità legacy
        attivo: true,
        nome,
        cognome,
        codice_fiscale: codice_fiscale || null,
        email: email || null,
        telefono: telefono || null,
        data_nascita: data_nascita || null,
        stato,
        qualifica,
        paga_oraria: paga_oraria ? Number(paga_oraria) : null,
        credito_surplus: 0.00
      };

      profiles.push(newProfile);
      localStorage.setItem('ta_profiles', JSON.stringify(profiles));
      return { data: newProfile, error: null };
    }

    // Per Supabase Auth reale:
    const tempClient = createTempClient()
    try {
      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            username: generatedUsername,
            ruolo: stato === 'admin' ? 'admin' : 'dipendente', // compatibilità legacy
            nome,
            cognome,
            codice_fiscale,
            email, // email di contatto
            telefono,
            data_nascita,
            stato,
            qualifica,
            paga_oraria: paga_oraria ? Number(paga_oraria) : null
          }
        }
      })

      if (signUpError) throw signUpError
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

  adminDeleteUser: async (userId) => {
    if (USE_MOCK) {
      const profiles = JSON.parse(localStorage.getItem('ta_profiles')) || []
      const updatedProfiles = profiles.filter(p => p.id !== userId)
      localStorage.setItem('ta_profiles', JSON.stringify(updatedProfiles))

      const bookings = JSON.parse(localStorage.getItem('ta_bookings')) || []
      const updatedBookings = bookings.filter(b => b.user_id !== userId)
      localStorage.setItem('ta_bookings', JSON.stringify(updatedBookings))

      return { error: null }
    }

    return supabase.rpc('admin_delete_user', {
      target_user_id: userId
    })
  },

  adminDeleteShift: async (shiftId) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_shifts')) || []
      const updatedShifts = shifts.filter(s => Number(s.id) !== Number(shiftId))
      localStorage.setItem('ta_shifts', JSON.stringify(updatedShifts))
      
      const bookings = JSON.parse(localStorage.getItem('ta_bookings')) || []
      const updatedBookings = bookings.filter(b => Number(b.shift_id) !== Number(shiftId))
      localStorage.setItem('ta_bookings', JSON.stringify(updatedBookings))
      
      return { error: null }
    }

    return supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId)
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
          profiles: profileObj ? { username: profileObj.username, ruolo: profileObj.ruolo, nome: profileObj.nome, cognome: profileObj.cognome } : null,
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
      .select('*, profiles(username, ruolo, nome, cognome), shifts!inner(*)')
      .lt('shifts.data', todayStr)
      .order('data', { foreignTable: 'shifts', ascending: false })
      .order('ora_inizio', { foreignTable: 'shifts', ascending: false })
  },

  // Consente all'utente loggato di aggiornare la propria password
  updateOwnPassword: async (newPassword) => {
    if (USE_MOCK) {
      console.log(`[MOCK] Password personale aggiornata a: ${newPassword}`)
      return { error: null }
    }
    return supabase.auth.updateUser({ password: newPassword })
  },

  // =========================================================================
  // TIMBRA TURNO & PAGAMENTI DIPENDENTI
  // =========================================================================

  fetchActiveShift: async (userId) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
      const active = shifts.find(s => s.user_id === userId && !s.end_time)
      return { data: active || null, error: null }
    }
    const { data, error } = await supabase
      .from('clocked_shifts')
      .select('*')
      .eq('user_id', userId)
      .is('end_time', null)
      .maybeSingle()
    return { data, error }
  },

  startShift: async (userId, hourlyRate) => {
    const startTimeIso = new Date().toISOString()
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
      const newShift = {
        id: getNextId(shifts),
        user_id: userId,
        start_time: startTimeIso,
        end_time: null,
        pagato: false,
        paga_oraria_storica: Number(hourlyRate || 0)
      }
      shifts.push(newShift)
      localStorage.setItem('ta_clocked_shifts', JSON.stringify(shifts))
      return { data: newShift, error: null }
    }
    const { data, error } = await supabase
      .from('clocked_shifts')
      .insert({
        user_id: userId,
        start_time: startTimeIso,
        pagato: false,
        paga_oraria_storica: Number(hourlyRate || 0)
      })
      .select()
      .single()
    return { data, error }
  },

  endShift: async (shiftId) => {
    const endTimeIso = new Date().toISOString()
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
      const index = shifts.findIndex(s => s.id === Number(shiftId))
      if (index === -1) return { error: { message: 'Timbratura non trovata.' } }
      shifts[index].end_time = endTimeIso
      localStorage.setItem('ta_clocked_shifts', JSON.stringify(shifts))
      return { data: shifts[index], error: null }
    }
    const { data, error } = await supabase
      .from('clocked_shifts')
      .update({ end_time: endTimeIso })
      .eq('id', shiftId)
      .select()
      .single()
    return { data, error }
  },

  fetchClockedShifts: async (userId) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
      const userShifts = shifts.filter(s => s.user_id === userId)
      userShifts.sort((a, b) => {
        if (a.pagato !== b.pagato) {
          return a.pagato ? 1 : -1
        }
        return new Date(b.start_time) - new Date(a.start_time)
      })
      return { data: userShifts, error: null }
    }
    const { data, error } = await supabase
      .from('clocked_shifts')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      
    if (data) {
      data.sort((a, b) => {
        if (a.pagato !== b.pagato) {
          return a.pagato ? 1 : -1
        }
        return new Date(b.start_time) - new Date(a.start_time)
      })
    }
    return { data, error }
  },

  updateClockedShift: async (shiftId, startTime, endTime, hourlyRate) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
      const index = shifts.findIndex(s => s.id === Number(shiftId))
      if (index === -1) return { error: { message: 'Timbratura non trovata.' } }
      shifts[index].start_time = startTime
      shifts[index].end_time = endTime
      if (hourlyRate !== undefined) {
        shifts[index].paga_oraria_storica = Number(hourlyRate || 0)
      }
      localStorage.setItem('ta_clocked_shifts', JSON.stringify(shifts))
      return { data: shifts[index], error: null }
    }
    const updateData = { start_time: startTime, end_time: endTime }
    if (hourlyRate !== undefined) {
      updateData.paga_oraria_storica = Number(hourlyRate || 0)
    }
    const { data, error } = await supabase
      .from('clocked_shifts')
      .update(updateData)
      .eq('id', shiftId)
      .select()
      .single()
    return { data, error }
  },

  addManualClockedShift: async (userId, startTime, endTime, hourlyRate) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
      const newShift = {
        id: getNextId(shifts),
        user_id: userId,
        start_time: startTime,
        end_time: endTime,
        pagato: false,
        paga_oraria_storica: Number(hourlyRate || 0)
      }
      shifts.push(newShift)
      localStorage.setItem('ta_clocked_shifts', JSON.stringify(shifts))
      return { data: newShift, error: null }
    }
    const { data, error } = await supabase
      .from('clocked_shifts')
      .insert({
        user_id: userId,
        start_time: startTime,
        end_time: endTime,
        pagato: false,
        paga_oraria_storica: Number(hourlyRate || 0)
      })
      .select()
      .single()
    return { data, error }
  },

  deleteClockedShift: async (shiftId) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
      const updatedShifts = shifts.filter(s => s.id !== Number(shiftId))
      localStorage.setItem('ta_clocked_shifts', JSON.stringify(updatedShifts))
      return { error: null }
    }
    const { error } = await supabase
      .from('clocked_shifts')
      .delete()
      .eq('id', shiftId)
    return { error }
  },

  fetchFirstShiftDate: async () => {
    if (USE_MOCK) {
      const bookings = JSON.parse(localStorage.getItem('ta_bookings')) || []
      const shifts = JSON.parse(localStorage.getItem('ta_shifts')) || []
      
      const dates = shifts.map(s => s.data)
      if (dates.length === 0) {
        const d = new Date()
        d.setDate(d.getDate() - 30) // 30 days ago fallback for mock
        return { data: d.toISOString().split('T')[0], error: null }
      }
      dates.sort()
      return { data: dates[0], error: null }
    }
    const { data, error } = await supabase
      .from('shifts')
      .select('data')
      .order('data', { ascending: true })
      .limit(1)
    
    const minDate = data && data.length > 0 ? data[0].data : new Date().toISOString().split('T')[0]
    return { data: minDate, error }
  },

  payShifts: async (userId, shiftIds, totalToPay, actualAmountPaid) => {
    const difference = Number(actualAmountPaid) - Number(totalToPay)
    
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
      const numericShiftIds = shiftIds.map(Number)
      shifts.forEach(s => {
        if (numericShiftIds.includes(Number(s.id))) {
          s.pagato = true
        }
      })
      localStorage.setItem('ta_clocked_shifts', JSON.stringify(shifts))

      const profiles = JSON.parse(localStorage.getItem('ta_profiles')) || []
      const pIndex = profiles.findIndex(p => p.id === userId)
      if (pIndex !== -1) {
        const currentSurplus = Number(profiles[pIndex].credito_surplus || 0)
        profiles[pIndex].credito_surplus = Number((currentSurplus + difference).toFixed(2))
        localStorage.setItem('ta_profiles', JSON.stringify(profiles))
      }
      return { error: null }
    }

    try {
      const { error: shiftsError } = await supabase
        .from('clocked_shifts')
        .update({ pagato: true })
        .in('id', shiftIds)
      
      if (shiftsError) throw shiftsError

      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('credito_surplus')
        .eq('id', userId)
        .single()

      if (profileFetchError) throw profileFetchError

      const newSurplus = Number((Number(profileData.credito_surplus || 0) + difference).toFixed(2))

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ credito_surplus: newSurplus })
        .eq('id', userId)

      if (profileUpdateError) throw profileUpdateError

      return { error: null }
    } catch (err) {
      console.error('Errore durante la registrazione del pagamento:', err)
      return { error: err }
    }
  },

  fetchEmployeesWithPayments: async () => {
    if (USE_MOCK) {
      const profiles = JSON.parse(localStorage.getItem('ta_profiles')) || []
      const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []

      const employees = profiles

      const result = employees.map(emp => {
        const empShifts = shifts.filter(s => s.user_id === emp.id)
        
        empShifts.sort((a, b) => {
          if (a.pagato !== b.pagato) {
            return a.pagato ? 1 : -1
          }
          return new Date(b.start_time) - new Date(a.start_time)
        })

        let unpaidHours = 0
        let totalHours = 0

        empShifts.forEach(s => {
          if (s.end_time) {
            const durationHrs = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
            totalHours += durationHrs
            if (!s.pagato) {
              unpaidHours += durationHrs
            }
          }
        })

        return {
          ...emp,
          shifts: empShifts,
          totalHours: Number(totalHours.toFixed(2)),
          unpaidHours: Number(unpaidHours.toFixed(2)),
          pendingPay: 0,
          credito_surplus: 0
        }
      })

      return { data: result, error: null }
    }

    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true })

      if (pError) throw pError

      const { data: shifts, error: sError } = await supabase
        .from('clocked_shifts')
        .select('*')

      if (sError) throw sError

      const result = profiles.map(emp => {
        const empShifts = shifts.filter(s => s.user_id === emp.id)
        
        empShifts.sort((a, b) => {
          if (a.pagato !== b.pagato) {
            return a.pagato ? 1 : -1
          }
          return new Date(b.start_time) - new Date(a.start_time)
        })

        let unpaidHours = 0
        let totalHours = 0

        empShifts.forEach(s => {
          if (s.end_time) {
            const durationHrs = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
            totalHours += durationHrs
            if (!s.pagato) {
              unpaidHours += durationHrs
            }
          }
        })

        return {
          ...emp,
          shifts: empShifts,
          totalHours: Number(totalHours.toFixed(2)),
          unpaidHours: Number(unpaidHours.toFixed(2)),
          pendingPay: 0,
          credito_surplus: 0
        }
      })

      return { data: result, error: null }
    } catch (err) {
      console.error('Errore nel caricamento dei dipendenti:', err)
      return { error: err }
    }
  },

  // =========================================================================
  // NOTIFICHE (AUDIT & TELEGRAM)
  // =========================================================================

  fetchNotifications: async () => {
    if (USE_MOCK) {
      const notifications = JSON.parse(localStorage.getItem('ta_notifications')) || []
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return { data: notifications, error: null }
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      return { data, error }
    } catch (err) {
      console.error('Errore nel caricamento delle notifiche:', err)
      return { error: err }
    }
  },

  createAnnouncement: async (message, username) => {
    if (USE_MOCK) {
      const notifications = JSON.parse(localStorage.getItem('ta_notifications')) || []
      const newNotification = {
        id: getNextId(notifications),
        tipo: 'annuncio',
        messaggio: message,
        creato_da: username,
        created_at: new Date().toISOString()
      }
      notifications.push(newNotification)
      localStorage.setItem('ta_notifications', JSON.stringify(notifications))
      return { data: newNotification, error: null }
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            tipo: 'annuncio',
            messaggio: message,
            creato_da: username
          }
        ])
      return { data, error }
    } catch (err) {
      console.error('Errore nell\'invio dell\'annuncio:', err)
      return { error: err }
    }
  },

  fetchVehicles: async () => {
    if (USE_MOCK) {
      const vehicles = JSON.parse(localStorage.getItem('ta_vehicles')) || []
      return { data: vehicles.filter(v => v.attivo), error: null }
    }
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('attivo', true)
        .order('nome', { ascending: true })
      return { data, error }
    } catch (err) {
      console.error('Errore nel caricamento veicoli:', err)
      return { error: err }
    }
  },

  fetchAllVehiclesForAdmin: async () => {
    if (USE_MOCK) {
      const vehicles = JSON.parse(localStorage.getItem('ta_vehicles')) || []
      return { data: vehicles, error: null }
    }
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('nome', { ascending: true })
      return { data, error }
    } catch (err) {
      console.error('Errore nel caricamento veicoli per admin:', err)
      return { error: err }
    }
  },

  createVehicle: async (vehicle) => {
    if (USE_MOCK) {
      const vehicles = JSON.parse(localStorage.getItem('ta_vehicles')) || []
      const newV = {
        id: getNextId(vehicles),
        nome: vehicle.nome,
        targa: vehicle.targa || '',
        attivo: vehicle.attivo !== undefined ? vehicle.attivo : true,
        km_attuali: Number(vehicle.km_attuali || 0)
      }
      vehicles.push(newV)
      localStorage.setItem('ta_vehicles', JSON.stringify(vehicles))
      return { data: newV, error: null }
    }
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicle])
        .select()
        .single()
      return { data, error }
    } catch (err) {
      console.error('Errore creazione veicolo:', err)
      return { error: err }
    }
  },

  updateVehicle: async (vehicleId, updates) => {
    if (USE_MOCK) {
      const vehicles = JSON.parse(localStorage.getItem('ta_vehicles')) || []
      const index = vehicles.findIndex(v => String(v.id) === String(vehicleId))
      if (index !== -1) {
        vehicles[index] = { ...vehicles[index], ...updates }
        localStorage.setItem('ta_vehicles', JSON.stringify(vehicles))
        return { data: vehicles[index], error: null }
      }
      return { error: new Error('Veicolo non trovato') }
    }
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', vehicleId)
        .select()
        .single()
      return { data, error }
    } catch (err) {
      console.error('Errore aggiornamento veicolo:', err)
      return { error: err }
    }
  },

  deleteVehicle: async (vehicleId) => {
    if (USE_MOCK) {
      const vehicles = JSON.parse(localStorage.getItem('ta_vehicles')) || []
      const index = vehicles.findIndex(v => String(v.id) === String(vehicleId))
      if (index !== -1) {
        vehicles[index].attivo = false
        localStorage.setItem('ta_vehicles', JSON.stringify(vehicles))
        return { data: vehicles[index], error: null }
      }
      return { error: new Error('Veicolo non trovato') }
    }
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update({ attivo: false })
        .eq('id', vehicleId)
        .select()
        .single()
      return { data, error }
    } catch (err) {
      console.error('Errore cancellazione veicolo:', err)
      return { error: err }
    }
  },

  fetchLastKmForVehicle: async (vehicleId) => {
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const sorted = transports
        .filter(t => String(t.vehicle_id) === String(vehicleId) && t.stato === 'terminato' && t.km_finali)
        .sort((a, b) => new Date(b.ora_fine || b.created_at) - new Date(a.ora_fine || a.created_at))
      if (sorted.length > 0) {
        return { km: Number(sorted[0].km_finali), error: null }
      }
      const vehicles = JSON.parse(localStorage.getItem('ta_vehicles')) || []
      const vehicle = vehicles.find(v => String(v.id) === String(vehicleId))
      return { km: vehicle ? Number(vehicle.km_attuali) : 0, error: null }
    }
    try {
      const { data, error } = await supabase
        .from('transports')
        .select('km_finali, ora_fine')
        .eq('vehicle_id', vehicleId)
        .eq('stato', 'terminato')
        .not('km_finali', 'is', null)
        .order('ora_fine', { ascending: false })
        .limit(1)
      
      if (error) throw error
      if (data && data.length > 0) {
        return { km: Number(data[0].km_finali), error: null }
      }
      
      const { data: veh, error: vError } = await supabase
        .from('vehicles')
        .select('km_attuali')
        .eq('id', vehicleId)
        .single()
      if (vError) throw vError
      return { km: veh ? Number(veh.km_attuali) : 0, error: null }
    } catch (err) {
      console.error('Errore recupero ultimi km veicolo:', err)
      return { km: 0, error: err }
    }
  },

  fetchAllActiveTransports: async () => {
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const activeTransports = transports.filter(t => t.stato === 'attivo')
      const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
      
      const mapped = activeTransports.map(t => {
        const activeCrew = crew.filter(c => c.transport_id === t.id && c.attivo)
        const mappedCrew = activeCrew.map(c => ({
          ...c,
          ruolo: c.ruolo === 'autista' ? 'AS' : c.ruolo
        }))
        return { ...t, crew: mappedCrew }
      })
      
      return { data: mapped, error: null }
    }
    try {
      const { data: transports, error: tError } = await supabase
        .from('transports')
        .select('*')
        .eq('stato', 'attivo')
        .order('ora_inizio', { ascending: false })
        
      if (tError) throw tError
      if (!transports || transports.length === 0) return { data: [], error: null }
      
      const transportIds = transports.map(t => t.id)
      const { data: crew, error: cError } = await supabase
        .from('transport_crew')
        .select('*')
        .in('transport_id', transportIds)
        .eq('attivo', true)
        
      if (cError) throw cError
      
      const mapped = transports.map(t => {
        const activeCrew = (crew || [])
          .filter(c => c.transport_id === t.id)
          .map(c => ({
            ...c,
            ruolo: c.ruolo === 'autista' ? 'AS' : c.ruolo
          }))
        return { ...t, crew: activeCrew }
      })
      
      return { data: mapped, error: null }
    } catch (err) {
      console.error('Errore recupero tutti i trasporti attivi:', err)
      return { error: err }
    }
  },

  fetchActiveTransport: async (userId) => {
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const active = transports.find(t => t.creato_da === userId && t.stato === 'attivo')
      if (!active) return { data: null, error: null }

      const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
      const activeCrew = crew.filter(c => c.transport_id === active.id && c.attivo)
      const mappedCrew = activeCrew.map(c => ({
        ...c,
        ruolo: c.ruolo === 'autista' ? 'AS' : c.ruolo
      }))

      return { data: { ...active, crew: mappedCrew }, error: null }
    }
    try {
      const { data: transport, error: tError } = await supabase
        .from('transports')
        .select('*')
        .eq('creato_da', userId)
        .eq('stato', 'attivo')
        .maybeSingle()

      if (tError) throw tError
      if (!transport) return { data: null, error: null }

      const { data: crew, error: cError } = await supabase
        .from('transport_crew')
        .select('*')
        .eq('transport_id', transport.id)
        .eq('attivo', true)

      if (cError) throw cError

      const mappedCrew = (crew || []).map(c => ({
        ...c,
        ruolo: c.ruolo === 'autista' ? 'AS' : c.ruolo
      }))

      return { data: { ...transport, crew: mappedCrew }, error: null }
    } catch (err) {
      console.error('Errore recupero trasporto attivo:', err)
      return { error: err }
    }
  },

  createTransport: async (userId) => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`
    const nowIso = new Date().toISOString()
    
    // Format local time as HH:MM
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const localTimeStr = `${hh}:${mm}`

    const defaultTransport = {
      data: todayStr,
      stato: 'attivo',
      ora_inizio: nowIso,
      ora_servizio: localTimeStr,
      tipo_trasporto: 'dimissione',
      da_tipo_luogo: 'ospedale',
      a_tipo_luogo: 'abitazione',
      creato_da: userId,
      precompilato_da_admin: false
    }

    if (USE_MOCK) {
      const profiles = JSON.parse(localStorage.getItem('ta_profiles')) || []
      const userProfile = profiles.find(p => p.id === userId)
      const isAdmin = userProfile?.ruolo === 'admin'

      if (!isAdmin) {
        const shifts = JSON.parse(localStorage.getItem('ta_clocked_shifts')) || []
        const activeShift = shifts.find(s => s.user_id === userId && !s.end_time)
        if (!activeShift) {
          return { error: new Error("Non hai un turno attivo. Per poter avviare un trasporto devi prima timbrare l'inizio del turno.") }
        }
      }

      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const newTransport = {
        id: getNextId(transports),
        ...defaultTransport,
        created_at: nowIso,
        updated_at: nowIso
      }
      transports.push(newTransport)
      localStorage.setItem('ta_transports', JSON.stringify(transports))
      return { data: { ...newTransport, crew: [] }, error: null }
    }
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('ruolo')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      const isAdmin = userProfile?.ruolo === 'admin'

      if (!isAdmin) {
        const { data: activeShift, error: shiftError } = await supabase
          .from('clocked_shifts')
          .select('id')
          .eq('user_id', userId)
          .is('end_time', null)
          .maybeSingle()

        if (shiftError) throw shiftError
        if (!activeShift) {
          return { error: new Error("Non hai un turno attivo. Per poter avviare un trasporto devi prima timbrare l'inizio del turno.") }
        }
      }

      const { data, error } = await supabase
        .from('transports')
        .insert([defaultTransport])
        .select()
        .single()
      if (error) throw error
      return { data: { ...data, crew: [] }, error: null }
    } catch (err) {
      console.error('Errore creazione trasporto:', err)
      return { error: err }
    }
  },

  updateTransportField: async (transportId, field, value) => {
    const nowIso = new Date().toISOString()
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const index = transports.findIndex(t => String(t.id) === String(transportId))
      if (index !== -1) {
        transports[index][field] = value
        transports[index].updated_at = nowIso
        localStorage.setItem('ta_transports', JSON.stringify(transports))
        return { data: transports[index], error: null }
      }
      return { error: new Error('Trasporto non trovato') }
    }
    try {
      const { data, error } = await supabase
        .from('transports')
        .update({ [field]: value, updated_at: nowIso })
        .eq('id', transportId)
        .select()
        .single()
      return { data, error }
    } catch (err) {
      console.error(`Errore aggiornamento campo ${field}:`, err)
      return { error: err }
    }
  },

  updateTransportFields: async (transportId, fields) => {
    const nowIso = new Date().toISOString()
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const index = transports.findIndex(t => String(t.id) === String(transportId))
      if (index !== -1) {
        Object.assign(transports[index], fields)
        transports[index].updated_at = nowIso
        localStorage.setItem('ta_transports', JSON.stringify(transports))
        return { data: transports[index], error: null }
      }
      return { error: new Error('Trasporto non trovato') }
    }
    try {
      const { data, error } = await supabase
        .from('transports')
        .update({ ...fields, updated_at: nowIso })
        .eq('id', transportId)
        .select()
        .single()
      return { data, error }
    } catch (err) {
      console.error(`Errore aggiornamento campi:`, err)
      return { error: err }
    }
  },

  updateTransportShiftAndCrew: async (transportId, shiftId, ceUserId, asUserId) => {
    const nowIso = new Date().toISOString()
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const index = transports.findIndex(t => String(t.id) === String(transportId))
      if (index !== -1) {
        transports[index].shift_id = shiftId
        transports[index].updated_at = nowIso
        localStorage.setItem('ta_transports', JSON.stringify(transports))
      }

      const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
      crew.forEach(c => {
        if (String(c.transport_id) === String(transportId) && c.attivo) {
          c.attivo = false
          c.ora_fine_ruolo = nowIso
        }
      })

      if (ceUserId) {
        crew.push({
          id: crew.length + 1,
          transport_id: Number(transportId),
          user_id: ceUserId,
          ruolo: 'CE',
          vehicle_id: null,
          attivo: true,
          ora_inizio_ruolo: nowIso,
          ora_fine_ruolo: null,
          is_partial: false,
          created_at: nowIso
        })
      }
      if (asUserId) {
        crew.push({
          id: crew.length + 2,
          transport_id: Number(transportId),
          user_id: asUserId,
          ruolo: 'autista',
          vehicle_id: null,
          attivo: true,
          ora_inizio_ruolo: nowIso,
          ora_fine_ruolo: null,
          is_partial: false,
          created_at: nowIso
        })
      }
      localStorage.setItem('ta_transport_crew', JSON.stringify(crew))
      return { error: null }
    }
    try {
      const { error: tError } = await supabase
        .from('transports')
        .update({ shift_id: shiftId, updated_at: nowIso })
        .eq('id', transportId)

      if (tError) throw tError

      const { error: updErr } = await supabase
        .from('transport_crew')
        .update({ attivo: false, ora_fine_ruolo: nowIso })
        .eq('transport_id', transportId)
        .eq('attivo', true)

      if (updErr) throw updErr

      const inserts = []
      if (ceUserId) {
        inserts.push({
          transport_id: transportId,
          user_id: ceUserId,
          ruolo: 'CE',
          attivo: true,
          ora_inizio_ruolo: nowIso
        })
      }
      if (asUserId) {
        inserts.push({
          transport_id: transportId,
          user_id: asUserId,
          ruolo: 'autista',
          attivo: true,
          ora_inizio_ruolo: nowIso
        })
      }

      if (inserts.length > 0) {
        const { error: insErr } = await supabase
          .from('transport_crew')
          .insert(inserts)
        if (insErr) throw insErr
      }

      return { error: null }
    } catch (err) {
      console.error('Errore updateTransportShiftAndCrew:', err)
      return { error: err }
    }
  },

  updateTransportCrewMember: async (transportId, role, userId) => {
    const dbRole = role === 'AS' ? 'autista' : role
    const nowIso = new Date().toISOString()
    if (USE_MOCK) {
      const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
      const activeIdx = crew.findIndex(c => String(c.transport_id) === String(transportId) && c.ruolo === dbRole && c.attivo)
      if (activeIdx !== -1) {
        crew[activeIdx].attivo = false
        crew[activeIdx].ora_fine_ruolo = nowIso
      }
      
      if (userId) {
        const newCrewMember = {
          id: getNextId(crew),
          transport_id: Number(transportId),
          user_id: userId,
          ruolo: dbRole,
          vehicle_id: null,
          attivo: true,
          ora_inizio_ruolo: nowIso,
          ora_fine_ruolo: null,
          is_partial: false,
          created_at: nowIso
        }
        crew.push(newCrewMember)
      }
      localStorage.setItem('ta_transport_crew', JSON.stringify(crew))
      return { error: null }
    }
    try {
      const { error: updErr } = await supabase
        .from('transport_crew')
        .update({ attivo: false, ora_fine_ruolo: nowIso })
        .eq('transport_id', transportId)
        .eq('ruolo', dbRole)
        .eq('attivo', true)
      
      if (updErr) throw updErr

      if (userId) {
        const { error: insErr } = await supabase
          .from('transport_crew')
          .insert([
            {
              transport_id: transportId,
              user_id: userId,
              ruolo: dbRole,
              attivo: true,
              ora_inizio_ruolo: nowIso
            }
          ])
        if (insErr) throw insErr
      }
      return { error: null }
    } catch (err) {
      console.error('Errore aggiornamento equipaggio:', err)
      return { error: err }
    }
  },

  terminateTransport: async (transportId, kmFinali, vehicleId) => {
    const nowIso = new Date().toISOString()
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const index = transports.findIndex(t => String(t.id) === String(transportId))
      if (index !== -1) {
        transports[index].stato = 'terminato'
        transports[index].km_finali = Number(kmFinali)
        transports[index].ora_fine = nowIso
        transports[index].updated_at = nowIso
        localStorage.setItem('ta_transports', JSON.stringify(transports))

        const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
        crew.forEach(c => {
          if (String(c.transport_id) === String(transportId) && c.attivo) {
            c.ora_fine_ruolo = nowIso
            c.attivo = false
          }
        })
        localStorage.setItem('ta_transport_crew', JSON.stringify(crew))

        if (vehicleId) {
          const vehicles = JSON.parse(localStorage.getItem('ta_vehicles')) || []
          const vIdx = vehicles.findIndex(v => String(v.id) === String(vehicleId))
          if (vIdx !== -1) {
            vehicles[vIdx].km_attuali = Number(kmFinali)
            localStorage.setItem('ta_vehicles', JSON.stringify(vehicles))
          }
        }
        return { data: transports[index], error: null }
      }
      return { error: new Error('Trasporto non trovato') }
    }
    try {
      const { data: trans, error: tError } = await supabase
        .from('transports')
        .update({
          stato: 'terminato',
          km_finali: Number(kmFinali),
          ora_fine: nowIso,
          updated_at: nowIso
        })
        .eq('id', transportId)
        .select()
        .single()

      if (tError) throw tError

      const { error: cError } = await supabase
        .from('transport_crew')
        .update({ 
          ora_fine_ruolo: nowIso,
          attivo: false
        })
        .eq('transport_id', transportId)
        .eq('attivo', true)

      if (cError) throw cError

      if (vehicleId) {
        const { error: vError } = await supabase
          .from('vehicles')
          .update({ km_attuali: Number(kmFinali) })
          .eq('id', vehicleId)

        if (vError) throw vError
      }

      return { data: trans, error: null }
    } catch (err) {
      console.error('Errore chiusura trasporto:', err)
      return { error: err }
    }
  },

  fetchTransportsList: async () => {
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const sorted = [...transports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return { data: sorted, error: null }
    }
    try {
      const { data, error } = await supabase
        .from('transports')
        .select('*, vehicles(nome, targa), profiles:creato_da(nome, cognome, username)')
        .order('created_at', { ascending: false })
      return { data, error }
    } catch (err) {
      console.error('Errore nel caricamento della lista trasporti:', err)
      return { error: err }
    }
  },

  fetchActiveShiftsAndBookingsForDate: async (dateStr) => {
    if (USE_MOCK) {
      const shifts = JSON.parse(localStorage.getItem('ta_shifts')) || []
      const bookings = JSON.parse(localStorage.getItem('ta_bookings')) || []
      const profiles = JSON.parse(localStorage.getItem('ta_profiles')) || []

      const dayShifts = shifts.filter(s => s.data === dateStr)
      const enrichedShifts = dayShifts.map(s => {
        const shiftBookings = bookings
          .filter(b => b.shift_id === s.id)
          .map(b => ({
            ...b,
            user: profiles.find(p => p.id === b.user_id) || {}
          }))
        return {
          ...s,
          bookings: shiftBookings
        }
      })
      return { data: enrichedShifts, error: null }
    }
    try {
      const { data: shifts, error: sError } = await supabase
        .from('shifts')
        .select('*, bookings(*, user:profiles(*))')
        .eq('data', dateStr)

      if (sError) throw sError
      return { data: shifts, error: null }
    } catch (err) {
      console.error('Errore nel caricamento turni per autocompilazione:', err)
      return { error: err }
    }
  },

  fetchTransportDetail: async (transportId) => {
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const transport = transports.find(t => String(t.id) === String(transportId))
      if (!transport) return { data: null, error: new Error('Trasporto non trovato') }

      const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
      const transportCrew = crew.filter(c => String(c.transport_id) === String(transportId) && c.attivo)
      const mappedCrew = transportCrew.map(c => ({
        ...c,
        ruolo: c.ruolo === 'autista' ? 'AS' : c.ruolo
      }))

      return { data: { ...transport, crew: mappedCrew }, error: null }
    }
    try {
      const { data: transport, error: tError } = await supabase
        .from('transports')
        .select('*, vehicles(*), profiles:creato_da(*)')
        .eq('id', transportId)
        .single()

      if (tError) throw tError

      const { data: crew, error: cError } = await supabase
        .from('transport_crew')
        .select('*, user:profiles(*)')
        .eq('transport_id', transportId)
        .eq('attivo', true)

      if (cError) throw cError

      const mappedCrew = (crew || []).map(c => ({
        ...c,
        ruolo: c.ruolo === 'autista' ? 'AS' : c.ruolo
      }))

      return { data: { ...transport, crew: mappedCrew }, error: null }
    } catch (err) {
      console.error('Errore nel recupero dettagli trasporto:', err)
      return { error: err }
    }
  },

  deleteTransport: async (transportId) => {
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const filtered = transports.filter(t => String(t.id) !== String(transportId))
      localStorage.setItem('ta_transports', JSON.stringify(filtered))

      const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
      const filteredCrew = crew.filter(c => String(c.transport_id) !== String(transportId))
      localStorage.setItem('ta_transport_crew', JSON.stringify(filteredCrew))

      const handoffs = JSON.parse(localStorage.getItem('ta_transport_handoffs')) || []
      const filteredHandoffs = handoffs.filter(h => String(h.transport_id) !== String(transportId))
      localStorage.setItem('ta_transport_handoffs', JSON.stringify(filteredHandoffs))

      return { error: null }
    }
    try {
      const { error } = await supabase
        .from('transports')
        .delete()
        .eq('id', transportId)
      return { error }
    } catch (err) {
      console.error('Errore nella cancellazione del trasporto:', err)
      return { error: err }
    }
  },

  createScheduledTransport: async (adminUserId, ceUserId, fields) => {
    const nowIso = new Date().toISOString()
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const newId = transports.length > 0 ? Math.max(...transports.map(t => t.id)) + 1 : 1
      
      const newTransport = {
        id: newId,
        data: fields.data || new Date().toISOString().split('T')[0],
        stato: 'programmato',
        ora_servizio: fields.ora_servizio ? `${fields.ora_servizio}:00` : null,
        tipo_trasporto: fields.tipo_trasporto || 'ricovero',
        da_tipo_luogo: fields.da_tipo_luogo || 'abitazione',
        da_nome: fields.da_nome || null,
        da_via: fields.da_via || null,
        a_tipo_luogo: fields.a_tipo_luogo || 'ospedale',
        a_nome: fields.a_nome || null,
        a_via: fields.a_via || null,
        paziente_cognome_nome: fields.paziente_cognome_nome || null,
        paziente_telefono: fields.paziente_telefono || null,
        note: fields.note || null,
        creato_da: adminUserId,
        created_at: nowIso,
        updated_at: nowIso
      }

      transports.push(newTransport)
      localStorage.setItem('ta_transports', JSON.stringify(transports))

      if (ceUserId) {
        const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
        crew.push({
          id: Date.now(),
          transport_id: newId,
          user_id: ceUserId,
          ruolo: 'CE',
          attivo: true,
          ora_inizio_ruolo: nowIso
        })
        localStorage.setItem('ta_transport_crew', JSON.stringify(crew))
      }

      return { data: newTransport, error: null }
    }
    try {
      const { data: trans, error: tError } = await supabase
        .from('transports')
        .insert({
          data: fields.data || new Date().toISOString().split('T')[0],
          stato: 'programmato',
          ora_servizio: fields.ora_servizio ? `${fields.ora_servizio}:00` : null,
          tipo_trasporto: fields.tipo_trasporto || 'ricovero',
          da_tipo_luogo: fields.da_tipo_luogo || 'abitazione',
          da_nome: fields.da_nome || null,
          da_via: fields.da_via || null,
          a_tipo_luogo: fields.a_tipo_luogo || 'ospedale',
          a_nome: fields.a_nome || null,
          a_via: fields.a_via || null,
          paziente_cognome_nome: fields.paziente_cognome_nome || null,
          paziente_telefono: fields.paziente_telefono || null,
          note: fields.note || null,
          creato_da: adminUserId,
          created_at: nowIso,
          updated_at: nowIso
        })
        .select()
        .single()

      if (tError) throw tError

      if (ceUserId) {
        const { error: cError } = await supabase
          .from('transport_crew')
          .insert({
            transport_id: trans.id,
            user_id: ceUserId,
            ruolo: 'CE',
            attivo: true,
            ora_inizio_ruolo: nowIso
          })

        if (cError) throw cError
      }

      return { data: trans, error: null }
    } catch (err) {
      console.error('Error creating scheduled transport:', err)
      return { error: err }
    }
  },

  fetchAssignedScheduledTransports: async (userId) => {
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const crew = JSON.parse(localStorage.getItem('ta_transport_crew')) || []
      
      const assignedTransports = transports.filter(t => {
        if (t.stato !== 'programmato') return false
        const ce = crew.find(c => c.transport_id === t.id && c.ruolo === 'CE' && c.attivo && String(c.user_id) === String(userId))
        return !!ce
      })
      return { data: assignedTransports, error: null }
    }
    try {
      const { data: crewEntries, error: cError } = await supabase
        .from('transport_crew')
        .select('transport_id')
        .eq('user_id', userId)
        .eq('ruolo', 'CE')
        .eq('attivo', true)

      if (cError) throw cError
      if (!crewEntries || crewEntries.length === 0) return { data: [], error: null }

      const transportIds = crewEntries.map(ce => ce.transport_id)

      const { data, error } = await supabase
        .from('transports')
        .select('*')
        .in('id', transportIds)
        .eq('stato', 'programmato')

      return { data: data || [], error }
    } catch (err) {
      console.error('Error fetching assigned scheduled transports:', err)
      return { error: err }
    }
  },

  startScheduledTransport: async (transportId, userId) => {
    const nowIso = new Date().toISOString()
    if (USE_MOCK) {
      const transports = JSON.parse(localStorage.getItem('ta_transports')) || []
      const idx = transports.findIndex(t => String(t.id) === String(transportId))
      if (idx !== -1) {
        transports[idx].stato = 'attivo'
        transports[idx].creato_da = userId
        transports[idx].ora_inizio = nowIso
        transports[idx].updated_at = nowIso
        localStorage.setItem('ta_transports', JSON.stringify(transports))
        return { data: transports[idx], error: null }
      }
      return { error: new Error('Trasporto non trovato') }
    }
    try {
      const { data, error } = await supabase
        .from('transports')
        .update({
          stato: 'attivo',
          creato_da: userId,
          ora_inizio: nowIso,
          updated_at: nowIso
        })
        .eq('id', transportId)
        .select()
        .single()

      return { data, error }
    } catch (err) {
      console.error('Error starting scheduled transport:', err)
      return { error: err }
    }
  }
}

