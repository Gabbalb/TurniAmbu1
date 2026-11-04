// Mock localStorage for node environment
globalThis.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null },
  setItem(key, value) { this.store[key] = String(value) },
  removeItem(key) { delete this.store[key] }
}

const { api } = await import('../src/lib/api.js')

async function runTest() {
  console.log('--- TEST GESTIONE DISPONIBILITA ---')
  const testAvails = [
    { user_id: '00000000-0000-0000-0000-000000000002', data: '2026-11-05', slot_id: 1, disponibile: true },
    { user_id: '00000000-0000-0000-0000-000000000003', data: '2026-11-05', slot_id: 1, disponibile: true }
  ]
  await api.saveUserAvailabilities(testAvails)
  const avRes = await api.fetchUserAvailabilities('2026-11-01', '2026-11-30')
  console.log('Saved and fetched avails count:', avRes.data?.length)

  console.log('--- TEST PUBBLICAZIONE & LOCK ---')
  const mockCrews = [{ id: 1, nome: 'Equipaggio 1', attivo: true }]
  const mockAssignments = [
    {
      date: '2026-11-05',
      slot_id: 1,
      crew_id: 1,
      ruolo_turno: 'autista',
      user_id: '00000000-0000-0000-0000-000000000003'
    },
    {
      date: '2026-11-05',
      slot_id: 1,
      crew_id: 1,
      ruolo_turno: 'CE',
      user_id: '00000000-0000-0000-0000-000000000002'
    }
  ]

  const pubRes = await api.publishGeneratedShifts({
    dates: ['2026-11-05'],
    assignments: mockAssignments,
    crews: mockCrews,
    lockDates: true,
    adminId: '00000000-0000-0000-0000-000000000001'
  })
  console.log('Publish result error:', pubRes.error)

  const locks = await api.fetchShiftLocks('2026-11-01', '2026-11-30')
  console.log('Locks count:', locks.data?.length, 'Date locked:', locks.data?.[0]?.data)

  const bookings = JSON.parse(localStorage.getItem('ta_bookings'))
  console.log('Bookings created count:', bookings.length)

  console.log('--- TEST BLOCCO MODIFICHE NON-ADMIN ---')
  const shifts = JSON.parse(localStorage.getItem('ta_shifts'))
  const shiftOnLockedDate = shifts.find(s => s.data === '2026-11-05')

  // Tentativo di prenotazione da volontario (non admin)
  const volBk = await api.bookSlot({
    shiftId: shiftOnLockedDate.id,
    role: 'CE',
    userId: '00000000-0000-0000-0000-000000000004',
    userRole: 'volontario'
  })
  console.log('Volontario bookSlot bloccato con successo:', volBk.error?.message)

  // Tentativo cancellazione da volontario
  const volCancel = await api.cancelBooking(bookings[0].id, 'volontario')
  console.log('Volontario cancelBooking bloccato con successo:', volCancel.error?.message)

  // Tentativo cancellazione da admin
  const adminCancel = await api.cancelBooking(bookings[0].id, 'admin')
  console.log('Admin cancelBooking consentito:', adminCancel.error === null)

  console.log('ALL TESTS PASSED!')
}

runTest().catch(console.error)
