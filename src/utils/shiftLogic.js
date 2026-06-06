/**
 * Definizioni delle tre fasce standard in minuti dalla mezzanotte.
 * Fascia 3 (22:00-06:00) si estende fino a 1800 minuti (06:00 del giorno dopo).
 */
export const STANDARD_SHIFTS = [
  { id: 1, label: '06:00–14:00', startMin: 360, endMin: 840, type: 'morning' },
  { id: 2, label: '14:00–22:00', startMin: 840, endMin: 1320, type: 'afternoon' },
  { id: 3, label: '22:00–06:00', startMin: 1320, endMin: 1800, type: 'night' }
]

/**
 * Converte una stringa di orario "HH:MM" in minuti trascorsi da mezzanotte.
 */
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Converte i minuti da mezzanotte in formato stringa "HH:MM" normalizzato (modulo 24 ore).
 */
export const minutesToTimeStr = (totalMin) => {
  const normalized = totalMin % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Calcola l'intersezione tra un orario custom e le tre fasce standard.
 * @param {string} startStr Orario di inizio custom (es. "17:00")
 * @param {string} endStr Orario di fine custom (es. "01:00")
 * @returns {Array} Array di oggetti che rappresentano le fasce coperte (anche parzialmente)
 */
export const calculateShiftIntersections = (startStr, endStr) => {
  let startMin = timeToMinutes(startStr)
  let endMin = timeToMinutes(endStr)

  // Se l'orario di fine è minore o uguale a quello di inizio, significa che supera la mezzanotte.
  // Aggiungiamo 24 ore (1440 minuti) all'orario di fine.
  if (endMin <= startMin) {
    endMin += 1440
  }

  const intersections = []

  for (const shift of STANDARD_SHIFTS) {
    const sStart = shift.startMin
    const sEnd = shift.endMin

    // Calcola l'intervallo di intersezione tra il range inserito e la fascia
    const intersectStart = Math.max(startMin, sStart)
    const intersectEnd = Math.min(endMin, sEnd)

    // C'è intersezione se l'inizio dell'intersezione è inferiore alla fine
    if (intersectStart < intersectEnd) {
      const isPartial = intersectStart > sStart || intersectEnd < sEnd
      let notaParziale = null

      if (isPartial) {
        if (intersectStart > sStart && intersectEnd < sEnd) {
          notaParziale = `Dalle ${minutesToTimeStr(intersectStart)} alle ${minutesToTimeStr(intersectEnd)}`
        } else if (intersectStart > sStart) {
          notaParziale = `Dalle ${minutesToTimeStr(intersectStart)}`
        } else if (intersectEnd < sEnd) {
          notaParziale = `Fino alle ${minutesToTimeStr(intersectEnd)}`
        }
      }

      intersections.push({
        shift_id_placeholder: shift.id, // ID della fascia (1, 2 o 3)
        label: shift.label,
        type: shift.type,
        ora_inizio: minutesToTimeStr(sStart),
        ora_fine: minutesToTimeStr(sEnd),
        ora_inizio_effettiva: minutesToTimeStr(intersectStart),
        ora_fine_effettiva: minutesToTimeStr(intersectEnd),
        is_partial: isPartial,
        nota_parziale: notaParziale
      })
    }
  }

  return intersections
}
