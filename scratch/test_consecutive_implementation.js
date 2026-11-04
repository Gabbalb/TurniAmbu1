import { parseISO } from 'date-fns'

const SLOT_ORDER = {
  4: 0, // 00:00 - 06:00
  1: 1, // 06:00 - 13:00
  2: 2, // 13:00 - 18:00
  3: 3  // 18:00 - 00:00
}

function getSlotTimelineIndex(dateStr, slotId) {
  const parts = typeof dateStr === 'string' ? dateStr.split('-').map(Number) : [dateStr.getFullYear(), dateStr.getMonth() + 1, dateStr.getDate()]
  const utcDate = Date.UTC(parts[0], parts[1] - 1, parts[2])
  const dayIndex = Math.floor(utcDate / (1000 * 60 * 60 * 24))
  const sOrder = SLOT_ORDER[Number(slotId)] ?? 0
  return dayIndex * 4 + sOrder
}

function getConsecutiveChainLength(dateStr, slotId, userAssignedShifts) {
  const candidateIdx = getSlotTimelineIndex(dateStr, slotId)
  const existingIndices = new Set(userAssignedShifts.map(s => getSlotTimelineIndex(s.date, s.slot_id)))

  if (existingIndices.has(candidateIdx)) {
    return Infinity // Already assigned to this exact slot
  }

  let backward = 0
  while (existingIndices.has(candidateIdx - 1 - backward)) {
    backward++
  }

  let forward = 0
  while (existingIndices.has(candidateIdx + 1 + forward)) {
    forward++
  }

  return backward + 1 + forward
}

// Test cases
console.log('--- Test 1: Empty shifts, add Slot 1 ---')
let shifts = []
console.log('Chain len for (2026-11-01, slot 1):', getConsecutiveChainLength('2026-11-01', 1, shifts)) // Expected: 1

console.log('\n--- Test 2: Has Slot 1, check Slot 2 (consecutive same day) ---')
shifts.push({ date: '2026-11-01', slot_id: 1 })
console.log('Chain len for (2026-11-01, slot 2):', getConsecutiveChainLength('2026-11-01', 2, shifts)) // Expected: 2 (ALLOWED!)

console.log('\n--- Test 3: Has Slot 1 & 2, check Slot 3 (3rd consecutive) ---')
shifts.push({ date: '2026-11-01', slot_id: 2 })
console.log('Chain len for (2026-11-01, slot 3):', getConsecutiveChainLength('2026-11-01', 3, shifts)) // Expected: 3 (BLOCKED!)

console.log('\n--- Test 4: Overnight consecutive (Evening Slot 3 -> Next day Night Slot 4) ---')
let nightShifts = [{ date: '2026-11-01', slot_id: 3 }] // 18:00 - 00:00
console.log('Chain len for (2026-11-02, slot 4):', getConsecutiveChainLength('2026-11-02', 4, nightShifts)) // Expected: 2 (ALLOWED!)

console.log('\n--- Test 5: Night Slot 4 -> Same day Morning Slot 1 ---')
let morningShifts = [{ date: '2026-11-02', slot_id: 4 }] // 00:00 - 06:00
console.log('Chain len for (2026-11-02, slot 1):', getConsecutiveChainLength('2026-11-02', 1, morningShifts)) // Expected: 2 (ALLOWED!)

console.log('\n--- Test 6: Spaced out shifts (Slot 1 and Slot 3 on same day) ---')
let spacedShifts = [{ date: '2026-11-01', slot_id: 1 }]
console.log('Chain len for (2026-11-01, slot 3):', getConsecutiveChainLength('2026-11-01', 3, spacedShifts)) // Expected: 1 (not consecutive)
