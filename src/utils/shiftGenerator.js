import { format, parseISO, addDays, subDays, getDay } from 'date-fns'

/**
 * Fasce orarie standard TurniAmbu
 */
export const GENERATOR_SLOTS = [
  { id: 1, label: '06:00–13:00', ora_inizio: '06:00:00', ora_fine: '13:00:00', isNight: false },
  { id: 2, label: '13:00–18:00', ora_inizio: '13:00:00', ora_fine: '18:00:00', isNight: false },
  { id: 3, label: '18:00–00:00', ora_inizio: '18:00:00', ora_fine: '00:00:00', isNight: true },
  { id: 4, label: '00:00–06:00', ora_inizio: '00:00:00', ora_fine: '06:00:00', isNight: true }
]

/**
 * Verifica se un giorno è nel weekend (Sabato o Domenica)
 */
export const isWeekend = (dateStr) => {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  const day = getDay(d)
  return day === 0 || day === 6 // 0: Domenica, 6: Sabato
}

/**
 * Verifica se due turni sono consecutivi ("di fila") o violano il riposo minimo obbligatorio.
 * Fasce:
 * 1: 06:00-13:00
 * 2: 13:00-18:00
 * 3: 18:00-00:00
 * 4: 00:00-06:00
 */
export const checkAreShiftsConsecutive = (dateA, slotIdA, dateB, slotIdB) => {
  const sA = Number(slotIdA)
  const sB = Number(slotIdB)

  // Stesso giorno
  if (dateA === dateB) {
    if (sA === sB) return true
    // Fasce adiacenti: 1 e 2 (13:00), 2 e 3 (18:00)
    if (Math.abs(sA - sB) === 1) return true
    // Fascia 4 (00-06) e Fascia 1 (06-13): consecutive la mattina stessa
    if ((sA === 4 && sB === 1) || (sA === 1 && sB === 4)) return true
    return false
  }

  // Giorni differenti: calcola la differenza in giorni (B - A)
  const dtA = typeof dateA === 'string' ? parseISO(dateA) : dateA
  const dtB = typeof dateB === 'string' ? parseISO(dateB) : dateB
  const diffTime = dtB.getTime() - dtA.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // Se B è il giorno successivo ad A (A è ieri, B è oggi)
  if (diffDays === 1) {
    // Ieri sera (3: 18-00) seguito da stanotte (4: 00-06) o stamattina (1: 06-13, solo 6h di stacco)
    if (sA === 3 && (sB === 4 || sB === 1)) return true
    // Ieri notte (4: 00-06) seguito da stamattina (1: 06-13)
    if (sA === 4 && sB === 1) return true
    return false
  }

  // Se A è il giorno successivo a B (B è ieri, A è oggi)
  if (diffDays === -1) {
    if (sB === 3 && (sA === 4 || sA === 1)) return true
    if (sB === 4 && sA === 1) return true
    return false
  }

  return false
}

/**
 * Verifica il rispetto del riposo minimo tra turni
 */
export const checkRestViolation = (targetDateStr, targetSlotId, userAssignedShifts) => {
  for (const shift of userAssignedShifts) {
    if (checkAreShiftsConsecutive(shift.date, shift.slot_id, targetDateStr, targetSlotId)) {
      return true
    }
  }
  return false
}

/**
 * Algoritmo di Generazione dei Turni
 * 
 * @param {Object} params
 * @param {Array<string>} params.dates - Array di date 'YYYY-MM-DD'
 * @param {Array<Object>} params.crews - Equipaggi attivi disponibili (es. [{id: 1, nome: 'Equipaggio 1'}, ...])
 * @param {Array<Object>} params.profiles - Utenti attivi con qualifica ('autista' o 'CE')
 * @param {Array<Object>} params.availabilities - Disponibilità inserite dall'admin [{user_id, data, slot_id, disponibile}]
 * @param {Object} params.slotCrewsConfig - Mappa `${date}_${slotId}` -> numero di equipaggi richiesti (1 o 2)
 * @param {Object} [params.options] - Opzioni dell'algoritmo
 * @param {boolean} [params.options.respectRestTime=true] - Applica riposo minimo tra turni
 * @param {number} [params.options.maxShiftsPerDay=1] - Massimo 1 turno al giorno per persona
 * @param {boolean} [params.options.allowDriverAsCE=true] - Gli autisti possono fare anche il CE
 * @param {Array<Object>} [params.existingBookings=[]] - Eventuali prenotazioni già approvate da preservare
 */
export function generateShifts({
  dates,
  crews = [],
  profiles = [],
  availabilities = [],
  slotCrewsConfig = {},
  options = {}
}) {
  const {
    respectRestTime = true,
    maxShiftsPerDay = 1,
    allowDriverAsCE = true,
    existingBookings = []
  } = options

  // 1. Filtra equipaggi fissi (esclude eventuali Extra)
  const availableCrews = crews.filter(c => !c.nome.startsWith('Extra')).slice(0, 2)
  if (availableCrews.length === 0) {
    return {
      error: 'Nessun equipaggio disponibile per la generazione.',
      assignments: [],
      uncoveredSlots: [],
      userStats: [],
      summary: null
    }
  }

  // 2. Mappa di lookup rapido per le disponibilità: `${userId}_${date}_${slotId}` -> boolean
  const availMap = new Set()
  availabilities.forEach(a => {
    if (a.disponibile !== false) {
      availMap.add(`${a.user_id}_${a.data}_${a.slot_id}`)
    }
  })

  // 3. Mappa dei profili per ID
  const profileMap = new Map()
  profiles.forEach(p => {
    if (p.attivo !== false) {
      profileMap.set(p.id, p)
    }
  })

  // 4. Inizializza tracciamento carico di lavoro per equità ("tutti pari equità")
  const workloads = new Map()
  profiles.forEach(p => {
    workloads.set(p.id, {
      userId: p.id,
      profile: p,
      total: 0,
      autistaCount: 0,
      ceCount: 0,
      nightCount: 0,
      weekendCount: 0,
      shifts: [] // array di { date, slot_id, crew_id, role }
    })
  })

  // Se ci sono prenotazioni esistenti da preservare, conteggiale subito nel carico
  const preservedAssignments = []
  existingBookings.forEach(bk => {
    const shift = bk.shifts
    if (shift && dates.includes(shift.data)) {
      const userWl = workloads.get(bk.user_id)
      const slotDef = GENERATOR_SLOTS.find(s => s.ora_inizio === shift.ora_inizio)
      const slotId = slotDef ? slotDef.id : 1
      const isWk = isWeekend(shift.data)
      const isNt = slotDef ? slotDef.isNight : false

      const asgn = {
        date: shift.data,
        slot_id: slotId,
        crew_id: shift.crew_id,
        crew_nome: crews.find(c => c.id === shift.crew_id)?.nome || `Equipaggio ${shift.crew_id}`,
        ruolo_turno: bk.ruolo_turno,
        user_id: bk.user_id,
        user_nome: bk.profiles?.nome ? `${bk.profiles.nome} ${bk.profiles.cognome || ''}`.trim() : bk.profiles?.username || 'Utente',
        user_qualifica: bk.profiles?.qualifica || bk.ruolo_turno,
        is_driver_acting_as_ce: false,
        is_preexisting: true
      }
      preservedAssignments.push(asgn)

      if (userWl) {
        userWl.total += 1
        if (bk.ruolo_turno === 'autista') userWl.autistaCount += 1
        else userWl.ceCount += 1
        if (isNt) userWl.nightCount += 1
        if (isWk) userWl.weekendCount += 1
        userWl.shifts.push({ date: shift.data, slot_id: slotId, crew_id: shift.crew_id, role: bk.ruolo_turno })
      }
    }
  })

  // 5. Costruisci tutti i fabbisogni (Requisiti: per ogni giorno, per ogni fascia, per ogni equipaggio richiesto, 1 autista + 1 CE)
  const requirements = []
  dates.forEach(date => {
    const isWk = isWeekend(date)
    GENERATOR_SLOTS.forEach(slot => {
      // Determina quanti equipaggi sono richiesti per questo giorno e fascia
      const configKey = `${date}_${slot.id}`
      const requiredCrewsCount = slotCrewsConfig[configKey] !== undefined ? Number(slotCrewsConfig[configKey]) : 1
      const activeCrewsToFill = availableCrews.slice(0, Math.min(requiredCrewsCount, availableCrews.length))

      activeCrewsToFill.forEach((crew, crewIdx) => {
        // Controllo se già coperto da prenotazione esistente
        const existingAutista = preservedAssignments.find(
          a => a.date === date && a.slot_id === slot.id && String(a.crew_id) === String(crew.id) && a.ruolo_turno === 'autista'
        )
        const existingCE = preservedAssignments.find(
          a => a.date === date && a.slot_id === slot.id && String(a.crew_id) === String(crew.id) && a.ruolo_turno === 'CE'
        )

        if (!existingAutista) {
          requirements.push({
            date,
            slot_id: slot.id,
            slot_label: slot.label,
            isNight: slot.isNight,
            isWeekend: isWk,
            crew_id: crew.id,
            crew_nome: crew.nome,
            crew_index: crewIdx + 1,
            ruolo_turno: 'autista'
          })
        }

        if (!existingCE) {
          requirements.push({
            date,
            slot_id: slot.id,
            slot_label: slot.label,
            isNight: slot.isNight,
            isWeekend: isWk,
            crew_id: crew.id,
            crew_nome: crew.nome,
            crew_index: crewIdx + 1,
            ruolo_turno: 'CE'
          })
        }
      })
    })
  })

  // 6. Funzione ausiliaria per verificare l'ammissibilità di un utente per un requirement
  const isCandidateEligible = (user, req) => {
    // 6a. Deve essere disponibile per questo slot
    const isAvail = availMap.has(`${user.id}_${req.date}_${req.slot_id}`)
    if (!isAvail) return { ok: false, reason: 'Non disponibile' }

    // 6b. Qualifica
    if (req.ruolo_turno === 'autista') {
      if (user.qualifica !== 'autista') {
        return { ok: false, reason: 'Non ha qualifica di autista' }
      }
    } else {
      // Ruolo CE: consentito a qualifica CE oppure ad autista se abilitato
      if (user.qualifica !== 'CE' && !(allowDriverAsCE && user.qualifica === 'autista')) {
        return { ok: false, reason: 'Qualifica non adatta' }
      }
    }

    const wl = workloads.get(user.id)
    if (!wl) return { ok: false, reason: 'Profilo non trovato' }

    // 6c. Massimo turni al giorno
    if (maxShiftsPerDay > 0) {
      const sameDayCount = wl.shifts.filter(s => s.date === req.date).length
      if (sameDayCount >= maxShiftsPerDay) {
        return { ok: false, reason: `Ha già raggiunto il massimo di ${maxShiftsPerDay} turno/i oggi` }
      }
    }

    // 6d. Riposo minimo
    if (respectRestTime) {
      if (checkRestViolation(req.date, req.slot_id, wl.shifts)) {
        return { ok: false, reason: 'Violazione intervallo di riposo minimo' }
      }
    }

    return { ok: true }
  }

  // 7. Ordinamento euristico dei fabbisogni (MRV - Minimum Remaining Values)
  // Quelli con meno candidati o più difficili (es. autisti, notti, weekend) hanno precedenza
  const getCandidateCount = (req) => {
    let count = 0
    profiles.forEach(p => {
      if (isCandidateEligible(p, req).ok) count++
    })
    return count
  }

  // Calcola e assegna priorità: autisti prima di CE, meno candidati prima
  requirements.sort((a, b) => {
    // Autisti hanno priorità su CE poiché sono la risorsa più specializzata/vincolante
    if (a.ruolo_turno === 'autista' && b.ruolo_turno !== 'autista') return -1
    if (a.ruolo_turno !== 'autista' && b.ruolo_turno === 'autista') return 1

    const countA = getCandidateCount(a)
    const countB = getCandidateCount(b)
    if (countA !== countB) return countA - countB

    // Se pari, notti e weekend prima
    if (a.isNight && !b.isNight) return -1
    if (!a.isNight && b.isNight) return 1
    if (a.isWeekend && !b.isWeekend) return -1
    if (!a.isWeekend && b.isWeekend) return 1

    return a.date.localeCompare(b.date)
  })

  // 8. Esecuzione assegnazione con bilanciamento del carico ("pari equità")
  const generatedAssignments = []
  const uncoveredSlots = []

  requirements.forEach(req => {
    // Trova tutti i candidati ammissibili adesso
    const eligibleUsers = []
    profiles.forEach(p => {
      const check = isCandidateEligible(p, req)
      if (check.ok) {
        const wl = workloads.get(p.id)
        eligibleUsers.push({
          user: p,
          workload: wl
        })
      }
    })

    if (eligibleUsers.length === 0) {
      uncoveredSlots.push({
        ...req,
        reason: req.ruolo_turno === 'autista' ? 'Nessun autista disponibile' : 'Nessun soccorritore disponibile'
      })
      return
    }

    // Ordina i candidati per equità:
    // 1. Minimo totale turni assegnati finora (garantisce equità perfetta)
    // 2. Per il ruolo CE: preferisci chi è CE puro prima di convertire un autista (se presente a parità di carico)
    // 3. Minimo turni notte (se slot notturno) o minimo weekend (se weekend)
    // 4. Tie-break casuale o pseudorandom stabile
    eligibleUsers.sort((a, b) => {
      // 1. Carico totale (priorità assoluta per equità)
      if (a.workload.total !== b.workload.total) {
        return a.workload.total - b.workload.total
      }

      // 2. Se stiamo cercando un CE e uno è CE puro e l'altro è Autista (usato come CE)
      if (req.ruolo_turno === 'CE') {
        const aIsPureCE = a.user.qualifica === 'CE'
        const bIsPureCE = b.user.qualifica === 'CE'
        if (aIsPureCE && !bIsPureCE) return -1
        if (!aIsPureCE && bIsPureCE) return 1
      }

      // 3. Bilanciamento notti
      if (req.isNight && a.workload.nightCount !== b.workload.nightCount) {
        return a.workload.nightCount - b.workload.nightCount
      }

      // 4. Bilanciamento weekend
      if (req.isWeekend && a.workload.weekendCount !== b.workload.weekendCount) {
        return a.workload.weekendCount - b.workload.weekendCount
      }

      // 5. Tie-break stabile basato su hash stringa dell'ID
      return a.user.id.localeCompare(b.user.id)
    })

    // Scegli il primo candidato (quello con meno turni e migliore aderenza)
    const selected = eligibleUsers[0]
    const selectedUser = selected.user
    const selectedWl = selected.workload

    const isDriverActingAsCE = req.ruolo_turno === 'CE' && selectedUser.qualifica === 'autista'

    // Registra assegnazione
    const assignment = {
      date: req.date,
      slot_id: req.slot_id,
      slot_label: req.slot_label,
      crew_id: req.crew_id,
      crew_nome: req.crew_nome,
      crew_index: req.crew_index,
      ruolo_turno: req.ruolo_turno,
      user_id: selectedUser.id,
      user_nome: selectedUser.nome ? `${selectedUser.nome} ${selectedUser.cognome || ''}`.trim() : selectedUser.username,
      user_qualifica: selectedUser.qualifica,
      is_driver_acting_as_ce: isDriverActingAsCE,
      is_preexisting: false
    }

    generatedAssignments.push(assignment)

    // Aggiorna carico utente
    selectedWl.total += 1
    if (req.ruolo_turno === 'autista') selectedWl.autistaCount += 1
    else selectedWl.ceCount += 1
    if (req.isNight) selectedWl.nightCount += 1
    if (req.isWeekend) selectedWl.weekendCount += 1
    selectedWl.shifts.push({
      date: req.date,
      slot_id: req.slot_id,
      crew_id: req.crew_id,
      role: req.ruolo_turno
    })
  })

  // 9. Calcola statistiche complessive e metriche di equità
  const allAssignments = [...preservedAssignments, ...generatedAssignments]
  const userStats = Array.from(workloads.values()).map(w => ({
    userId: w.userId,
    nome: w.profile.nome ? `${w.profile.nome} ${w.profile.cognome || ''}`.trim() : w.profile.username,
    qualifica: w.profile.qualifica,
    ruolo: w.profile.ruolo,
    totalShifts: w.total,
    autistaShifts: w.autistaCount,
    ceShifts: w.ceCount,
    nightShifts: w.nightCount,
    weekendShifts: w.weekendCount
  })).sort((a, b) => b.totalShifts - a.totalShifts)

  const shiftCounts = userStats.map(u => u.totalShifts)
  const totalSlotsRequired = requirements.length + preservedAssignments.length
  const totalCovered = allAssignments.length
  const coveragePercent = totalSlotsRequired > 0 ? Math.round((totalCovered / totalSlotsRequired) * 100) : 100

  const summary = {
    totalSlotsRequired,
    totalCovered,
    uncoveredCount: uncoveredSlots.length,
    coveragePercent,
    minShifts: shiftCounts.length > 0 ? Math.min(...shiftCounts) : 0,
    maxShifts: shiftCounts.length > 0 ? Math.max(...shiftCounts) : 0,
    avgShifts: shiftCounts.length > 0 ? (shiftCounts.reduce((a, b) => a + b, 0) / shiftCounts.length).toFixed(1) : 0
  }

  return {
    error: null,
    assignments: allAssignments,
    uncoveredSlots,
    userStats,
    summary
  }
}
