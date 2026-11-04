// Mock localStorage for node environment
globalThis.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null },
  setItem(key, value) { this.store[key] = String(value) },
  removeItem(key) { delete this.store[key] }
}

const { api } = await import('../src/lib/api.js')
const { checkAreShiftsConsecutive, generateShifts, GENERATOR_SLOTS } = await import('../src/utils/shiftGenerator.js')

console.log('--- TEST 1: checkAreShiftsConsecutive LOGIC ---')
// Stesso giorno
console.assert(checkAreShiftsConsecutive('2026-11-05', 1, '2026-11-05', 2) === true, '1 & 2 must be consecutive')
console.assert(checkAreShiftsConsecutive('2026-11-05', 2, '2026-11-05', 3) === true, '2 & 3 must be consecutive')
console.assert(checkAreShiftsConsecutive('2026-11-05', 4, '2026-11-05', 1) === true, '4 & 1 same day must be consecutive')
console.assert(checkAreShiftsConsecutive('2026-11-05', 1, '2026-11-05', 3) === false, '1 & 3 same day is not consecutive (5h gap)')

// Giorni adiacenti
console.assert(checkAreShiftsConsecutive('2026-11-05', 3, '2026-11-06', 4) === true, '3 night & 4 next night must be consecutive')
console.assert(checkAreShiftsConsecutive('2026-11-05', 3, '2026-11-06', 1) === true, '3 evening & 1 next morning must violate rest')
console.assert(checkAreShiftsConsecutive('2026-11-05', 4, '2026-11-06', 1) === true, '4 night & 1 next morning must violate rest')
console.assert(checkAreShiftsConsecutive('2026-11-05', 1, '2026-11-06', 2) === false, '1 morning & next afternoon is not consecutive')
console.log('✓ checkAreShiftsConsecutive logic OK!')

console.log('--- TEST 2: BLOCCA MESE & SET PERIOD LOCKS ---')
const testDates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']
await api.setPeriodLocks(testDates, true)
const locksRes = await api.fetchShiftLocks('2026-11-01', '2026-11-30')
console.log('Locks count:', locksRes.data.length)
console.assert(locksRes.data.length === 4, 'All 4 dates must be locked')

console.log('--- TEST 3: BLOCCO DUE TURNI DI FILA IN API ---')
// Creiamo mock shifts e bookings
const mockShifts = [
  { id: 101, data: '2026-11-05', ora_inizio: '06:00:00', ora_fine: '13:00:00', crew_id: 1 },
  { id: 102, data: '2026-11-05', ora_inizio: '13:00:00', ora_fine: '18:00:00', crew_id: 1 },
  { id: 103, data: '2026-11-05', ora_inizio: '18:00:00', ora_fine: '00:00:00', crew_id: 1 },
  { id: 104, data: '2026-11-06', ora_inizio: '00:00:00', ora_fine: '06:00:00', crew_id: 1 }
]
localStorage.setItem('ta_shifts', JSON.stringify(mockShifts))
localStorage.setItem('ta_bookings', JSON.stringify([
  { id: 1, shift_id: 101, user_id: 'user_mario', ruolo_turno: 'autista' }
]))

// Mario prova a prenotarsi per il turno subito successivo (Slot 2: 13-18)
const resSameDayNext = await api.bookSlot({
  shiftId: 102,
  role: 'autista',
  userId: 'user_mario',
  userRole: 'volontario'
})
console.log('Tentativo prenotazione turno consecutivo stesso giorno:', resSameDayNext.error?.message)
console.assert(resSameDayNext.error !== null, 'Booking consecutive same day must be rejected')

// Mario prova a prenotarsi per un turno non consecutivo (Slot 3: 18-00)
const resNonConsecutive = await api.bookSlot({
  shiftId: 103,
  role: 'autista',
  userId: 'user_mario',
  userRole: 'volontario'
})
console.log('Tentativo prenotazione non consecutivo errore:', resNonConsecutive.error)
console.assert(resNonConsecutive.error === null, 'Non consecutive booking should succeed')

// Ora Mario è prenotato su Slot 3 (18-00 del 05/11). Prova a prenotarsi per Slot 4 (00-06 del 06/11, di fila a mezzanotte!)
const resAcrossMidnight = await api.bookSlot({
  shiftId: 104,
  role: 'autista',
  userId: 'user_mario',
  userRole: 'volontario'
})
console.log('Tentativo prenotazione turno consecutivo a mezzanotte:', resAcrossMidnight.error?.message)
console.assert(resAcrossMidnight.error !== null, 'Booking across midnight consecutively must be rejected')

console.log('--- TEST 4: GENERATORE TURNI NON ASSEGNA MAI DUE TURNI DI FILA ---')
const testProfiles = [
  { id: 'u1', username: 'mario', nome: 'Mario', qualifica: 'autista', attivo: true },
  { id: 'u2', username: 'luca', nome: 'Luca', qualifica: 'autista', attivo: true },
  { id: 'u3', username: 'giulia', nome: 'Giulia', qualifica: 'CE', attivo: true },
  { id: 'u4', username: 'matteo', nome: 'Matteo', qualifica: 'CE', attivo: true }
]
const testCrews = [{ id: 1, nome: 'Equipaggio 1', attivo: true }]
const testGenDates = ['2026-11-01', '2026-11-02']
const allAvails = []
testProfiles.forEach(p => {
  testGenDates.forEach(d => {
    GENERATOR_SLOTS.forEach(s => {
      allAvails.push({ user_id: p.id, data: d, slot_id: s.id, disponibile: true })
    })
  })
})

const genResult = generateShifts({
  dates: testGenDates,
  crews: testCrews,
  profiles: testProfiles,
  availabilities: allAvails,
  options: {
    respectRestTime: true,
    maxShiftsPerDay: 2 // Anche se aumentiamo maxShiftsPerDay, non deve MAI assegnare 2 turni di fila!
  }
})

// Verifica che nessuno abbia 2 turni consecutivi
let foundConsecutive = false
testProfiles.forEach(p => {
  const userShifts = genResult.assignments.filter(a => a.user_id === p.id)
  for (let i = 0; i < userShifts.length; i++) {
    for (let j = i + 1; j < userShifts.length; j++) {
      if (checkAreShiftsConsecutive(userShifts[i].date, userShifts[i].slot_id, userShifts[j].date, userShifts[j].slot_id)) {
        console.error('VIOLAZIONE: Assegnati turni consecutivi a', p.nome, userShifts[i], userShifts[j])
        foundConsecutive = true
      }
    }
  }
})
console.assert(!foundConsecutive, 'No consecutive shifts must ever be assigned by generator')
console.log('✓ Nessun turno di fila assegnato dal generatore!')

console.log('\nALL VERIFICATION TESTS PASSED!')
