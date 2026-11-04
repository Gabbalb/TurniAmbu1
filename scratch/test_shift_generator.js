import { generateShifts, GENERATOR_SLOTS, checkAreShiftsConsecutive, getConsecutiveChainLength } from '../src/utils/shiftGenerator.js'

const testProfiles = [
  { id: 'u1', username: 'mario.rossi', nome: 'Mario', cognome: 'Rossi', qualifica: 'autista', attivo: true },
  { id: 'u2', username: 'luca.bianchi', nome: 'Luca', cognome: 'Bianchi', qualifica: 'autista', attivo: true },
  { id: 'u3', username: 'giulia.verdi', nome: 'Giulia', cognome: 'Verdi', qualifica: 'CE', attivo: true },
  { id: 'u4', username: 'matteo.neri', nome: 'Matteo', cognome: 'Neri', qualifica: 'CE', attivo: true },
  { id: 'u5', username: 'sara.gialli', nome: 'Sara', cognome: 'Gialli', qualifica: 'CE', attivo: true }
]

const testCrews = [
  { id: 1, nome: 'Equipaggio 1', attivo: true },
  { id: 2, nome: 'Equipaggio 2', attivo: true }
]

const dates = ['2026-11-01', '2026-11-02', '2026-11-03']

// All users available for all slots on those 3 days
const availabilities = []
testProfiles.forEach(p => {
  dates.forEach(d => {
    GENERATOR_SLOTS.forEach(s => {
      availabilities.push({ user_id: p.id, data: d, slot_id: s.id, disponibile: true })
    })
  })
})

// Configure 1 crew for morning & night, 2 crews for afternoon & evening
const slotCrewsConfig = {
  '2026-11-01_1': 1,
  '2026-11-01_2': 2,
  '2026-11-01_3': 2,
  '2026-11-01_4': 1,
  '2026-11-02_1': 1,
  '2026-11-02_2': 2,
  '2026-11-02_3': 1,
  '2026-11-02_4': 1,
  '2026-11-03_1': 1,
  '2026-11-03_2': 1,
  '2026-11-03_3': 1,
  '2026-11-03_4': 1
}

const result = generateShifts({
  dates,
  crews: testCrews,
  profiles: testProfiles,
  availabilities,
  slotCrewsConfig,
  options: {
    respectRestTime: true,
    maxShiftsPerDay: 2,
    allowConsecutiveShifts: true,
    maxConsecutiveShifts: 2,
    allowDriverAsCE: true
  }
})

console.log('Result summary:', result.summary)
console.log('Uncovered count:', result.uncoveredSlots.length)
console.log('User stats:', result.userStats)

// Check if anyone has consecutive shifts assigned
console.log('\n--- VERIFICA ASSEGNAZIONE TURNI CONSECUTIVI ---')
let foundConsecutive = false
testProfiles.forEach(p => {
  const userShifts = result.assignments.filter(a => a.user_id === p.id)
  console.log(`\nUtente ${p.nome} (${userShifts.length} turni assegnati):`)
  userShifts.forEach(s => {
    console.log(`  - ${s.date} [Fascia ${s.slot_id}: ${s.slot_label}] Ruolo: ${s.ruolo_turno}`)
  })

  // Controlla se ha turni consecutivi
  for (let i = 0; i < userShifts.length; i++) {
    for (let j = i + 1; j < userShifts.length; j++) {
      if (checkAreShiftsConsecutive(userShifts[i].date, userShifts[i].slot_id, userShifts[j].date, userShifts[j].slot_id)) {
        console.log(`  => HA 2 TURNI CONSECUTIVI: ${userShifts[i].date} slot ${userShifts[i].slot_id} e ${userShifts[j].date} slot ${userShifts[j].slot_id}!`)
        foundConsecutive = true
      }
    }
  }
})

console.log('\nAlmeno un turno consecutivo assegnato con successo?', foundConsecutive)
