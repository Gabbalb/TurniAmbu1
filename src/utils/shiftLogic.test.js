import { calculateShiftIntersections, timeToMinutes, minutesToTimeStr } from './shiftLogic.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

console.log('--- Esecuzione Test Unitari: shiftLogic.js ---')

// Test 1: timeToMinutes
assert(timeToMinutes('00:00') === 0, '00:00 dovrebbe essere 0 minuti')
assert(timeToMinutes('06:00') === 360, '06:00 dovrebbe essere 360 minuti')
assert(timeToMinutes('22:00') === 1320, '22:00 dovrebbe essere 1320 minuti')
console.log('✓ Test timeToMinutes superato!')

// Test 2: minutesToTimeStr
assert(minutesToTimeStr(0) === '00:00', '0 minuti dovrebbe essere 00:00')
assert(minutesToTimeStr(360) === '06:00', '360 minuti dovrebbe essere 06:00')
assert(minutesToTimeStr(1320) === '22:00', '1320 minuti dovrebbe essere 22:00')
assert(minutesToTimeStr(1500) === '01:00', '1500 minuti (1:00 del giorno dopo) dovrebbe essere 01:00')
console.log('✓ Test minutesToTimeStr superato!')

// Test 3: calculateShiftIntersections - Caso Standard (14:00 - 22:00 interamente coperto)
const case1 = calculateShiftIntersections('14:00', '22:00')
assert(case1.length === 1, 'Dovrebbe coprire esattamente 1 fascia')
assert(case1[0].shift_id_placeholder === 2, 'Dovrebbe essere la fascia Pomeriggio')
assert(case1[0].is_partial === false, 'Non dovrebbe essere parziale')
assert(case1[0].nota_parziale === null, 'La nota dovrebbe essere nulla')
console.log('✓ Test orario standard intero superato!')

// Test 4: calculateShiftIntersections - Caso a cavallo della mezzanotte (17:00 - 01:00)
// Dovrebbe toccare:
// - Pomeriggio (14:00-22:00) dalle 17:00 (Parziale)
// - Notte (22:00-06:00) fino alle 01:00 (Parziale)
const case2 = calculateShiftIntersections('17:00', '01:00')
assert(case2.length === 2, 'Dovrebbe coprire 2 fasce')

const pmShift = case2.find(s => s.shift_id_placeholder === 2)
assert(pmShift !== undefined, 'Dovrebbe trovare la fascia Pomeriggio')
assert(pmShift.is_partial === true, 'Pomeriggio dovrebbe essere parziale')
assert(pmShift.nota_parziale === 'Dalle 17:00', `La nota di Pomeriggio dovrebbe essere 'Dalle 17:00', invece è: '${pmShift.nota_parziale}'`)

const nightShift = case2.find(s => s.shift_id_placeholder === 3)
assert(nightShift !== undefined, 'Dovrebbe trovare la fascia Notte')
assert(nightShift.is_partial === true, 'Notte dovrebbe essere parziale')
assert(nightShift.nota_parziale === 'Fino alle 01:00', `La nota di Notte dovrebbe essere 'Fino alle 01:00', invece è: '${nightShift.nota_parziale}'`)
console.log('✓ Test orario a cavallo della mezzanotte (17:00 - 01:00) superato!')

// Test 5: calculateShiftIntersections - Caso orario pomeridiano ridotto (12:00 - 15:00)
// Dovrebbe toccare:
// - Mattina (06:00-14:00) dalle 12:00 (Parziale)
// - Pomeriggio (14:00-22:00) fino alle 15:00 (Parziale)
const case3 = calculateShiftIntersections('12:00', '15:00')
assert(case3.length === 2, 'Dovrebbe coprire 2 fasce')

const amShift = case3.find(s => s.shift_id_placeholder === 1)
assert(amShift !== undefined, 'Dovrebbe trovare la fascia Mattina')
assert(amShift.is_partial === true, 'Mattina dovrebbe essere parziale')
assert(amShift.nota_parziale === 'Dalle 12:00', `La nota di Mattina dovrebbe essere 'Dalle 12:00', invece è: '${amShift.nota_parziale}'`)

const pmShift2 = case3.find(s => s.shift_id_placeholder === 2)
assert(pmShift2 !== undefined, 'Dovrebbe trovare la fascia Pomeriggio')
assert(pmShift2.is_partial === true, 'Pomeriggio dovrebbe essere parziale')
assert(pmShift2.nota_parziale === 'Fino alle 15:00', `La nota di Pomeriggio dovrebbe essere 'Fino alle 15:00', invece è: '${pmShift2.nota_parziale}'`)
console.log('✓ Test orario spezzato (12:00 - 15:00) superato!')

console.log('--- Tutti i test hanno avuto esito POSITIVO! ---')
