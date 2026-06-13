import React, { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { Sun, SunMoon, Moon, Lock, Trash2, CalendarRange, ListFilter, RefreshCw, X } from 'lucide-react'

export default function TurniBoard() {
  const { user, profile } = useAuth()

  const getBookingLimitDate = () => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth() + 2, 0)
  }

  const getCalendarDays = () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const limit = getBookingLimitDate()
    
    const days = []
    let current = start
    while (current <= limit) {
      days.push(current)
      current = addDays(current, 1)
    }
    return days
  }

  const limitDate = getBookingLimitDate()
  const calendarDays = getCalendarDays()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date())
  const [listAnchorDate, setListAnchorDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [daysCount, setDaysCount] = useState(14)
  const [viewType, setViewType] = useState('giorno') // 'giorno' | 'settimana'
  const [shifts, setShifts] = useState([])
  const [bookings, setBookings] = useState([])
  const [crews, setCrews] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null) // ID dello slot in fase di caricamento
  const [bookingConfirm, setBookingConfirm] = useState(null) // { shift, role } per la modale di conferma
  const [profiles, setProfiles] = useState([])
  const [assigneeId, setAssigneeId] = useState('')
  const [isPartial, setIsPartial] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [confirmError, setConfirmError] = useState(null)
  const [selectedCrewShift, setSelectedCrewShift] = useState(null) // { shift, matchedShifts }
  const [isFetching, setIsFetching] = useState(false)
 
  const containerRef = useRef(null)
  const dayRefs = useRef({})
  const isScrollingToDaySelect = useRef(false)
  const pendingScrollDateRef = useRef(null)
  const scrollStopTimerRef = useRef(null)
  const calendarScrollRef = useRef(null)
  const currentDateRef = useRef(currentDate)
  currentDateRef.current = currentDate
 
  // Auto-scorrimento della pillola attiva nella barra in alto (iOS safe con offset e scrollTo)
  useEffect(() => {
    if (viewType === 'giorno' && calendarScrollRef.current) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const activePill = document.getElementById(`pill-${dateStr}`)
      if (activePill) {
        const container = calendarScrollRef.current
        const targetScrollLeft = activePill.offsetLeft - (container.clientWidth / 2) + (activePill.clientWidth / 2)
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })
      }
    }
  }, [currentDate, viewType])

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const minutesToTimeStr = (totalMin) => {
    const normalized = totalMin % 1440
    const hours = Math.floor(normalized / 60)
    const minutes = normalized % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const getStandardHours = (placeholder) => {
    const p = Number(placeholder)
    if (p === 1) return { start: '06:00:00', end: '14:00:00' }
    if (p === 2) return { start: '14:00:00', end: '22:00:00' }
    return { start: '22:00:00', end: '06:00:00' }
  }

  const getUncoveredGaps = (shift, slotBookings) => {
    const p = Number(shift.ora_inizio.startsWith('06:') ? 1 : shift.ora_inizio.startsWith('14:') ? 2 : 3)
    const std = getStandardHours(p)
    const sStart = timeToMinutes(std.start.slice(0, 5))
    let sEnd = timeToMinutes(std.end.slice(0, 5))
    if (p === 3) sEnd += 1440 // night shift goes until 1800 minutes

    // Convert standard bookings to intervals
    const bookedIntervals = slotBookings.map(bk => {
      let startM = timeToMinutes(bk.ora_inizio_effettiva || std.start)
      let endM = timeToMinutes(bk.ora_fine_effettiva || std.end)
      if (p === 3) {
        if (startM < 720) startM += 1440
        if (endM < 720) endM += 1440
        if (endM <= startM) endM += 1440
      } else {
        if (endM <= startM) endM += 1440
      }
      return [startM, endM]
    })

    // Sort intervals by start time
    bookedIntervals.sort((a, b) => a[0] - b[0])

    // Merge overlapping intervals
    const merged = []
    for (const interval of bookedIntervals) {
      if (merged.length === 0) {
        merged.push(interval)
      } else {
        const last = merged[merged.length - 1]
        if (interval[0] < last[1]) {
          last[1] = Math.max(last[1], interval[1])
        } else {
          merged.push(interval)
        }
      }
    }

    // Find gaps in [sStart, sEnd]
    const gaps = []
    let current = sStart
    for (const interval of merged) {
      const [start, end] = interval
      if (start > current) {
        gaps.push([current, start])
      }
      current = Math.max(current, end)
    }
    if (current < sEnd) {
      gaps.push([current, sEnd])
    }

    return gaps
  }

  const getShiftCoverageStatus = (day, slotId) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const startTimes = {
      1: '06:00:00',
      2: '14:00:00',
      3: '22:00:00'
    }
    const startTime = startTimes[slotId]

    const dayShifts = shifts.filter(s => s.data === dateStr && s.ora_inizio === startTime)
    if (dayShifts.length === 0) return 'bg-transparent' // Trasparente se nessun turno creato

    // Raccogliamo gli stati di ciascun turno (equipaggio) attivo in questa fascia
    const statuses = dayShifts.map(shift => {
      const ceBookings = bookings.filter(b => b.shift_id === shift.id && b.ruolo_turno === 'CE')
      const asBookings = bookings.filter(b => b.shift_id === shift.id && b.ruolo_turno === 'autista')

      const ceEmpty = ceBookings.length === 0
      const asEmpty = asBookings.length === 0

      // Se non ci sono prenotazioni per nessuno dei due ruoli, il turno è rosso (completamente scoperto)
      if (ceEmpty && asEmpty) return 'red'

      const ceGaps = getUncoveredGaps(shift, ceBookings)
      const asGaps = getUncoveredGaps(shift, asBookings)

      const ceCovered = !ceEmpty && ceGaps.length === 0
      const asCovered = !asEmpty && asGaps.length === 0

      // Se entrambi i ruoli sono completamente coperti (nessun gap), il turno è verde
      if (ceCovered && asCovered) return 'green'

      // Altrimenti (solo un ruolo presente o copertura parziale con buchi), il turno è giallo
      return 'yellow'
    })

    // Se tutti i turni attivi in questa fascia sono verdi, allora lo stato generale è verde
    if (statuses.every(status => status === 'green')) return 'bg-emerald-500'
    // Se tutti i turni attivi in questa fascia sono rossi, allora lo stato generale è rosso
    if (statuses.every(status => status === 'red')) return 'bg-rose-500'
    // Altrimenti (c'è un misto, o almeno uno è giallo), lo stato generale è giallo
    return 'bg-amber-500'
  }

  const handleOpenBookingConfirm = (shift, role) => {
    setBookingConfirm({ shift, role })
    setAssigneeId(user.id)
    setConfirmError(null)

    const slotBookings = bookings.filter(b => b.shift_id === shift.id && b.ruolo_turno === role)
    const gaps = getUncoveredGaps(shift, slotBookings)

    const p = Number(shift.ora_inizio.startsWith('06:') ? 1 : shift.ora_inizio.startsWith('14:') ? 2 : 3)
    const std = getStandardHours(p)

    if (slotBookings.length > 0 && gaps.length > 0) {
      // Slot parzialmente coperto: imposta il primo gap disponibile e attiva il check "orario parziale"
      const firstGap = gaps[0]
      setStartTime(minutesToTimeStr(firstGap[0]))
      setEndTime(minutesToTimeStr(firstGap[1]))
      setIsPartial(true)
    } else {
      // Slot vuoto o completamente coperto: imposta orario standard
      setStartTime(std.start.slice(0, 5))
      setEndTime(std.end.slice(0, 5))
      setIsPartial(false)
    }
  }

  // Calcola le date della settimana corrente per i bottoni/pills in cima
  const startOfCurrWeek = startOfWeek(currentDate, { weekStartsOn: 1 })
  const endOfCurrWeek = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrWeek, i))

  // Calcola i giorni totali da renderizzare nella vista scorrimento infinito (fino al limite del mese prossimo)
  const renderedDates = []
  let tempDate = listAnchorDate
  for (let i = 0; i < daysCount; i++) {
    if (tempDate > limitDate) break
    renderedDates.push(tempDate)
    tempDate = addDays(tempDate, 1)
  }

  // Carica i dati dal DB
  const loadBoardData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setIsFetching(true)
    try {
      const startStr = format(listAnchorDate, 'yyyy-MM-dd')
      const endStr = format(limitDate, 'yyyy-MM-dd')

      // Carica equipaggi attivi
      const { data: crewsData } = await api.fetchCrews()
      setCrews(crewsData || [])

      // Assicurati che esistano i turni di default (per default equipaggio 1) in queste date
      // Unione di calendarDays (barra in alto) e renderedDates (lista) per garantire che siano tutti inizializzati
      const allUniqueDatesStr = Array.from(new Set([
        ...calendarDays.map(d => format(d, 'yyyy-MM-dd')),
        ...renderedDates.map(d => format(d, 'yyyy-MM-dd'))
      ])).sort()

      if (crewsData && crewsData.length > 0) {
        await api.ensureShiftsExistForDates(allUniqueDatesStr, crewsData)
      }

      // Carica turni e prenotazioni del periodo
      const { data: shiftsData } = await api.fetchShifts(startStr, endStr)
      const { data: bookingsData } = await api.fetchBookings(startStr, endStr)

      setShifts(shiftsData || [])
      setBookings(bookingsData || [])

      // Se admin, carica i profili per assegnare turni a terzi
      if (profile?.ruolo === 'admin') {
        const { data: profilesData } = await api.fetchProfiles()
        setProfiles(profilesData?.filter(p => p.attivo) || [])
      }
    } catch (err) {
      console.error('Errore nel caricamento dei dati del tabellone:', err)
    } finally {
      if (showSpinner) setLoading(false)
      setIsFetching(false)
    }
  }

  const prevAnchorRef = useRef(listAnchorDate)

  // Carica i turni solo quando l'ancora o il numero di giorni caricati cambia
  useEffect(() => {
    const shouldShowSpinner = prevAnchorRef.current.getTime() !== listAnchorDate.getTime() || shifts.length === 0
    prevAnchorRef.current = listAnchorDate
    
    loadBoardData(shouldShowSpinner)
  }, [listAnchorDate, daysCount])

  useEffect(() => {
    const fetchAdminProfiles = async () => {
      if (profile?.ruolo === 'admin' && profiles.length === 0) {
        const { data: profilesData } = await api.fetchProfiles()
        setProfiles(profilesData?.filter(p => p.attivo) || [])
      }
    }
    fetchAdminProfiles()
  }, [profile])

  const handlePrevWeek = () => {
    const newAnchor = addDays(listAnchorDate, -7)
    setListAnchorDate(newAnchor)
    setCurrentDate(newAnchor)
    setDaysCount(14)
  }

  const handleNextWeek = () => {
    const newAnchor = addDays(listAnchorDate, 7)
    if (newAnchor > limitDate) return // Non navigare oltre il limite consentito
    setListAnchorDate(newAnchor)
    setCurrentDate(newAnchor)
    setDaysCount(14)
  }

  const handleToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setListAnchorDate(today)
    setCurrentDate(today)
    setDaysCount(14)
  }

  // Seleziona un giorno specifico dalle pills e lo fa scorrere in vista (caricando date future on-demand se necessario)
  const handleSelectDay = (day) => {
    setCurrentDate(day)
    setCurrentMonthDate(day)
    const dateStr = format(day, 'yyyy-MM-dd')
    const targetEl = dayRefs.current[dateStr]
    
    if (targetEl) {
      isScrollingToDaySelect.current = true
      
      // Timer di fallback nel caso in cui non si attivi l'evento di scroll
      clearTimeout(scrollStopTimerRef.current)
      scrollStopTimerRef.current = setTimeout(() => {
        isScrollingToDaySelect.current = false
      }, 1200)

      const scrollParent = targetEl.closest('main') || document.documentElement || document.body
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect ? scrollParent.getBoundingClientRect() : { top: 0 }
        const elementRect = targetEl.getBoundingClientRect()
        // Offset di 65px per allinearlo sotto la barra sticky dei giorni
        const scrollTarget = (scrollParent.scrollTop || 0) + (elementRect.top - parentRect.top) - 65
        
        scrollParent.scrollTo({ top: scrollTarget, behavior: 'smooth' })
      }
    } else {
      // Il giorno selezionato è nel futuro e non ancora caricato sul tabellone
      const diffTime = day.getTime() - listAnchorDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      if (diffDays > daysCount) {
        pendingScrollDateRef.current = day
        setDaysCount(diffDays + 5) // Carica fino al giorno richiesto + un piccolo margine
      }
    }
  }

  // Esegue lo scorrimento verso il giorno caricato on-demand non appena il caricamento dei dati (isFetching) è completato
  useEffect(() => {
    if (!isFetching && pendingScrollDateRef.current) {
      const targetDay = pendingScrollDateRef.current
      pendingScrollDateRef.current = null
      const timer = setTimeout(() => {
        handleSelectDay(targetDay)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isFetching])

  // Allinea lo scorrimento all'avvio, al cambio visualizzazione o al termine del caricamento dati
  useEffect(() => {
    if (viewType === 'giorno' && !loading) {
      const timer = setTimeout(() => {
        const dateStr = format(currentDate, 'yyyy-MM-dd')
        const targetEl = dayRefs.current[dateStr]
        if (targetEl) {
          const scrollParent = document.querySelector('main')
          if (scrollParent) {
            const parentRect = scrollParent.getBoundingClientRect()
            const elementRect = targetEl.getBoundingClientRect()
            const scrollTarget = scrollParent.scrollTop + (elementRect.top - parentRect.top) - 65
            scrollParent.scrollTo({ top: scrollTarget })
          }
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [viewType, loading])

  // Listener dello scroll per aggiornare la pillola attiva (giorno selezionato) e scorrimento infinito
  useEffect(() => {
    if (viewType !== 'giorno') return

    const scrollParent = document.querySelector('main')
    if (!scrollParent) return

    const handleScroll = () => {
      // Rilevamento di fine scorrimento per sbloccare la sincronizzazione
      if (isScrollingToDaySelect.current) {
        clearTimeout(scrollStopTimerRef.current)
        scrollStopTimerRef.current = setTimeout(() => {
          isScrollingToDaySelect.current = false
        }, 150)
        return
      }
      if (loading) return

      const parentRect = scrollParent.getBoundingClientRect()
      
      let activeDateStr = null
      let minDistance = Infinity

      let bottomDateStr = null
      let maxBottom = -Infinity

      Object.keys(dayRefs.current).forEach(dateStr => {
        const el = dayRefs.current[dateStr]
        if (!el) return
        const rect = el.getBoundingClientRect()
        
        // Misura la distanza del limite superiore del giorno rispetto al fondo della barra sticky (parentRect.top + 70px)
        const baseline = parentRect.top + 70
        const distance = Math.abs(rect.top - baseline)
        
        // L'elemento è attivo se copre l'area della barra sticky
        if (rect.top < baseline + 120 && rect.bottom > baseline + 10) {
          if (distance < minDistance) {
            minDistance = distance
            activeDateStr = dateStr
          }
        }

        // Rileva quale giorno è visibile più in basso (al fondo dello schermo)
        if (rect.top < parentRect.bottom && rect.bottom > parentRect.top) {
          if (rect.bottom > maxBottom) {
            maxBottom = rect.bottom
            bottomDateStr = dateStr
          }
        }
      })

      if (activeDateStr) {
        const curDateStr = format(currentDateRef.current, 'yyyy-MM-dd')
        if (activeDateStr !== curDateStr) {
          // Parsing del date string sicuro rispetto al fuso orario locale
          const [y, m, d] = activeDateStr.split('-').map(Number)
          const parsedDate = new Date(y, m - 1, d)
          setCurrentDate(parsedDate)
        }
      }

      if (bottomDateStr) {
        const [y, m, d] = bottomDateStr.split('-').map(Number)
        const parsedBottomDate = new Date(y, m - 1, d)
        setCurrentMonthDate(parsedBottomDate)
      }

      // Rileva se l'utente è vicino alla fine dello scorrimento per aggiungere altri giorni (infinite scroll)
      const threshold = 300
      const isCloseToBottom = scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight < threshold
      if (isCloseToBottom) {
        const potentialEndDate = addDays(listAnchorDate, daysCount - 1)
        if (potentialEndDate < limitDate) {
          setDaysCount(prev => prev + 7)
        }
      }
    }

    scrollParent.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      scrollParent.removeEventListener('scroll', handleScroll)
    }
  }, [viewType, listAnchorDate, daysCount, loading])

  // Esegue la prenotazione di uno slot
  const handleBookSlot = async () => {
    if (!bookingConfirm) return
    const { shift, role } = bookingConfirm

    // Blocco delle prenotazioni oltre il mese prossimo
    const [sy, sm, sd] = shift.data.split('-').map(Number)
    const shiftDate = new Date(sy, sm - 1, sd)
    if (shiftDate > limitDate) {
      setConfirmError("Non è possibile prenotare turni oltre il mese prossimo.")
      return
    }

    const slotIdStr = `${shift.id}-${role}`
    setActionLoading(slotIdStr)
    setConfirmError(null)

    const userId = profile?.ruolo === 'admin' ? assigneeId : user.id
    
    // Calcola se è parziale
    const p = Number(shift.ora_inizio.startsWith('06:') ? 1 : shift.ora_inizio.startsWith('14:') ? 2 : 3)
    const std = getStandardHours(p)
    
    let isPartialBooking = isPartial
    let note = null
    
    if (isPartialBooking) {
      const startMin = timeToMinutes(startTime)
      const endMin = timeToMinutes(endTime)
      const sStart = timeToMinutes(std.start.slice(0, 5))
      const sEnd = timeToMinutes(std.end.slice(0, 5))
      
      if (startTime === std.start.slice(0, 5) && endTime === std.end.slice(0, 5)) {
        isPartialBooking = false
      } else {
        let finalEndMin = endMin
        if (finalEndMin <= startMin) finalEndMin += 1440
        const finalSEnd = p === 3 ? sEnd + 1440 : sEnd

        if (startMin > sStart && finalEndMin < finalSEnd) {
          note = `Dalle ${startTime} alle ${endTime}`
        } else if (startMin > sStart) {
          note = `Dalle ${startTime}`
        } else if (finalEndMin < finalSEnd) {
          note = `Fino alle ${endTime}`
        }
      }
    }

    const target = {
      date: shift.data,
      shift_id_placeholder: p,
      ora_inizio_effettiva: isPartialBooking ? startTime + ':00' : null,
      ora_fine_effettiva: isPartialBooking ? endTime + ':00' : null,
      is_partial: isPartialBooking,
      nota_parziale: note,
      label: shift.ora_inizio.slice(0, 5) + '–' + shift.ora_fine.slice(0, 5)
    }

    try {
      const { conflicts, error: conflictErr } = await api.checkBulkConflicts(userId, [target], role)
      
      if (conflictErr) {
        setConfirmError(conflictErr.message || 'Errore durante la verifica dei conflitti.')
        setActionLoading(null)
        return
      }

      if (conflicts && conflicts.length > 0) {
        setConfirmError(conflicts[0].message)
        setActionLoading(null)
        return
      }

      const { error } = await api.bookSlot({
        shiftId: shift.id,
        role,
        userId,
        startTime: isPartialBooking ? startTime + ':00' : null,
        endTime: isPartialBooking ? endTime + ':00' : null,
        isPartial: isPartialBooking,
        note
      })

      if (error) {
        setConfirmError(error.message)
      } else {
        setBookingConfirm(null)
        await loadBoardData()
      }
    } catch (err) {
      console.error(err)
      setConfirmError(err.message || 'Si è verificato un errore.')
    } finally {
      setActionLoading(null)
    }
  }

  // Rilascia/cancella una prenotazione
  const handleCancelBooking = async (bookingId, e) => {
    e.stopPropagation() // Evita tap accidentali
    if (!window.confirm('Vuoi davvero cancellare questa prenotazione?')) return

    setActionLoading(bookingId)
    try {
      const { error } = await api.cancelBooking(bookingId)
      if (error) {
        alert(error.message)
      } else {
        await loadBoardData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  // Trova le fasce orarie e le colorazioni corrispondenti
  const getShiftStyle = (ora_inizio) => {
    if (ora_inizio.startsWith('06:')) {
      return {
        bg: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        text: 'text-blue-300',
        icon: <Sun className="w-5 h-5 text-cyan-400" />
      }
    } else if (ora_inizio.startsWith('14:')) {
      return {
        bg: 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        text: 'text-orange-300',
        icon: <SunMoon className="w-5 h-5 text-amber-400" />
      }
    } else {
      return {
        bg: 'bg-gradient-to-r from-violet-500/10 to-pink-500/10 border-violet-500/30',
        badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
        text: 'text-violet-300',
        icon: <Moon className="w-5 h-5 text-pink-400" />
      }
    }
  }

  // Renderizza la singola card dello slot (CE o Autista)
  const renderSlot = (shift, role, crewShifts) => {
    // Trova tutte le prenotazioni per questo ruolo in questo turno (ordinate cronologicamente)
    const slotBookings = bookings
      .filter(b => b.shift_id === shift.id && b.ruolo_turno === role)
      .sort((a, b) => {
        const startA = timeToMinutes(a.ora_inizio_effettiva || shift.ora_inizio)
        const startB = timeToMinutes(b.ora_inizio_effettiva || shift.ora_inizio)
        const shiftStartMin = timeToMinutes(shift.ora_inizio)
        
        let normA = startA
        let normB = startB
        if (shiftStartMin === 1320) {
          if (normA < 720) normA += 1440
          if (normB < 720) normB += 1440
        }
        return normA - normB
      })
    const slotIdStr = `${shift.id}-${role}`
    const isLoading = actionLoading === slotIdStr

    // Configura i dettagli grafici in base al ruolo
    const isCE = role === 'CE'
    const roleLabel = isCE ? 'CE' : 'Autista'
    const containerStyle = isCE 
      ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50' 
      : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
    const roleTextClass = isCE ? 'text-emerald-400' : 'text-amber-400'

    if (slotBookings.length === 0) {
      // Slot completamente Libero
      return (
        <div className={`flex flex-col gap-2.5 p-3 rounded-2xl border transition-all duration-200 ${containerStyle}`}>
          <div className="flex justify-between items-center w-full">
            <span className={`text-[10px] font-extrabold tracking-widest uppercase ${roleTextClass}`}>
              {roleLabel}
            </span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Libero</span>
          </div>
          
          <button
            onClick={() => handleOpenBookingConfirm(shift, role)}
            disabled={isLoading || !profile?.attivo}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-700/60 hover:border-indigo-500/60 bg-slate-900/20 hover:bg-indigo-500/5 transition-all duration-200 text-left"
          >
            <span className="text-xs sm:text-sm font-medium text-slate-400">Posto libero</span>
            <span className="text-xs sm:text-sm font-bold text-indigo-400/90 hover:text-indigo-300">
              {isLoading ? 'Prenotazione...' : '+ Disponibile'}
            </span>
          </button>
        </div>
      )
    }

    // Slot con almeno una prenotazione
    return (
      <div className={`flex flex-col gap-2.5 p-3 rounded-2xl border transition-all duration-200 ${containerStyle}`}>
        {/* Intestazione del Ruolo con Pulsante Aggiungi (tutto allineato in cima) */}
        <div className="flex justify-between items-center w-full">
          <span className={`text-[10px] font-extrabold tracking-widest uppercase ${roleTextClass}`}>
            {roleLabel}
          </span>
          
          <button
            onClick={() => handleOpenBookingConfirm(shift, role)}
            disabled={!profile?.attivo}
            className="px-2 py-0.5 border border-dashed border-slate-800 hover:border-indigo-500/40 rounded-lg text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/5 transition-all"
          >
            + Aggiungi
          </button>
        </div>
        
        {/* Lista prenotati */}
        <div className="flex flex-col gap-2">
          {slotBookings.map(bk => {
            const isCurrentUser = bk.user_id === user.id
            const isAdmin = profile?.ruolo === 'admin'
            const isBkLoading = actionLoading === bk.id

            if (isCurrentUser) {
              return (
                <div key={bk.id} className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-500/60 bg-indigo-500/10 shadow-sm animate-touch-ping duration-1000">
                  <div className="flex flex-col min-w-0 pr-2 text-left">
                    <span className="text-sm sm:text-base font-black text-indigo-300">Io (Prenotato)</span>
                    {bk.is_partial && (
                      <span className="text-[11px] text-indigo-200 mt-0.5 leading-tight">{bk.nota_parziale}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleCancelBooking(bk.id, e)}
                    disabled={isBkLoading}
                    className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                    title="Cancella prenotazione"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            } else {
              return (
                <div key={bk.id} className={`flex items-center justify-between p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/30 text-slate-400 ${isAdmin ? 'hover:border-rose-500/30' : ''}`}>
                  <div className="flex flex-col min-w-0 pr-2 text-left">
                    <span className="text-sm sm:text-base font-bold text-slate-200 break-all">
                      {bk.profiles?.username || 'Collega'}
                    </span>
                    {bk.is_partial && (
                      <span className="text-[11px] text-slate-500 mt-0.5 leading-tight">{bk.nota_parziale}</span>
                    )}
                  </div>
                  {isAdmin ? (
                    <button
                      onClick={(e) => handleCancelBooking(bk.id, e)}
                      disabled={isBkLoading}
                      className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                      title="Cancella prenotazione collega (Admin)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-500 mr-1 flex-shrink-0" />
                  )}
                </div>
              )
            }
          })}
        </div>
      </div>
    )
  }

  // Raggruppa i turni dello shift per equipaggio
  const renderCrewsForShift = (date, ora_inizio) => {
    const matchedShifts = shifts.filter(s => s.data === date && s.ora_inizio === ora_inizio)
    
    if (matchedShifts.length === 0) {
      return <div className="text-xs text-slate-500 italic p-2">Nessun turno disponibile per questa fascia.</div>
    }

    return (
      <div className="flex flex-col gap-3.5">
        {matchedShifts.map((shift, idx) => {
          const crewObj = crews.find(c => String(c.id) === String(shift.crew_id))
          const ceBookings = bookings
            .filter(b => b.shift_id === shift.id && b.ruolo_turno === 'CE')
            .sort((a, b) => {
              const startA = timeToMinutes(a.ora_inizio_effettiva || shift.ora_inizio)
              const startB = timeToMinutes(b.ora_inizio_effettiva || shift.ora_inizio)
              const shiftStartMin = timeToMinutes(shift.ora_inizio)
              
              let normA = startA
              let normB = startB
              if (shiftStartMin === 1320) {
                if (normA < 720) normA += 1440
                if (normB < 720) normB += 1440
              }
              return normA - normB
            })
          const asBookings = bookings
            .filter(b => b.shift_id === shift.id && b.ruolo_turno === 'autista')
            .sort((a, b) => {
              const startA = timeToMinutes(a.ora_inizio_effettiva || shift.ora_inizio)
              const startB = timeToMinutes(b.ora_inizio_effettiva || shift.ora_inizio)
              const shiftStartMin = timeToMinutes(shift.ora_inizio)
              
              let normA = startA
              let normB = startB
              if (shiftStartMin === 1320) {
                if (normA < 720) normA += 1440
                if (normB < 720) normB += 1440
              }
              return normA - normB
            })
          
          return (
            <button
              key={shift.id}
              onClick={() => setSelectedCrewShift({ shift, matchedShifts })}
              className="w-full text-left bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/60 p-3.5 rounded-2xl shadow-inner-soft transition-all duration-200 flex flex-col gap-2 cursor-pointer"
            >
              {/* Nome Equipaggio */}
              <div className="flex items-center justify-between w-full pb-1 border-b border-slate-800/40">
                <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest">
                  {crewObj ? crewObj.nome : `Equipaggio ${shift.crew_id}`}
                </span>
                {idx > 0 && (
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                    Rinforzo
                  </span>
                )}
              </div>

              {/* CE and AS - Large and Clear */}
              <div className="flex flex-col gap-1.5 pt-1">
                {/* CE Role(s) */}
                {ceBookings.length === 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-black text-emerald-400 w-8 flex-shrink-0">CE:</span>
                    <span className="text-sm sm:text-base font-bold text-slate-500 italic">Libero</span>
                  </div>
                ) : (
                  ceBookings.map(b => (
                    <div key={b.id} className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-emerald-400 w-8 flex-shrink-0">CE:</span>
                      <span className="text-sm sm:text-base font-bold text-slate-100">
                        {b.profiles?.username || 'Collega'}
                        {b.is_partial && b.nota_parziale && (
                          <span className="text-xs sm:text-sm font-medium text-amber-400/90 ml-1.5">
                            - {b.nota_parziale.toLowerCase()}
                          </span>
                        )}
                      </span>
                    </div>
                  ))
                )}

                {/* AS Role(s) */}
                {asBookings.length === 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-black text-amber-400 w-8 flex-shrink-0">AS:</span>
                    <span className="text-sm sm:text-base font-bold text-slate-500 italic">Libero</span>
                  </div>
                ) : (
                  asBookings.map(b => (
                    <div key={b.id} className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-amber-400 w-8 flex-shrink-0">AS:</span>
                      <span className="text-sm sm:text-base font-bold text-slate-100">
                        {b.profiles?.username || 'Collega'}
                        {b.is_partial && b.nota_parziale && (
                          <span className="text-xs sm:text-sm font-medium text-amber-400/90 ml-1.5">
                            - {b.nota_parziale.toLowerCase()}
                          </span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  // Renderizza la vista giornaliera per una data specifica
  const renderDailyShifts = (targetDate) => {
    const dateStr = format(targetDate, 'yyyy-MM-dd')
    const timeSlots = [
      { id: 1, label: '06:00–14:00', start: '06:00:00' },
      { id: 2, label: '14:00–22:00', start: '14:00:00' },
      { id: 3, label: '22:00–06:00', start: '22:00:00' }
    ]

    return (
      <div className="flex flex-col gap-5">
        {timeSlots.map(slot => {
          const style = getShiftStyle(slot.start)
          return (
            <div key={slot.id} className={`flex flex-col gap-2.5 p-3 sm:p-4 border rounded-3xl ${style.bg} transition-all duration-300 hover:shadow-premium`}>
              {/* Header Fascia */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-950/40 rounded-lg">
                    {style.icon}
                  </div>
                  <span className="text-base font-bold text-slate-100">{slot.label}</span>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider ${style.badge}`}>
                  Fascia {slot.id}
                </span>
              </div>

              {/* Contenuto Equipaggi */}
              {renderCrewsForShift(dateStr, slot.start)}
            </div>
          )
        })}
      </div>
    )
  }

  // Renderizza la vista settimanale riassuntiva
  const renderWeeklySummary = () => {
    return (
      <div className="flex flex-col gap-4">
        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayShifts = shifts.filter(s => s.data === dateStr)
          
          // Calcola il totale degli slot coperti in questo giorno
          const dayBookings = bookings.filter(b => b.shifts && b.shifts.data === dateStr)
          const totalSlots = dayShifts.length * 2
          const coveredSlots = dayBookings.length

          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={dateStr}
              onClick={() => {
                setCurrentDate(day)
                setViewType('giorno')
              }}
              className={`p-4 border rounded-2xl cursor-pointer transition-all duration-200 flex flex-col gap-2 ${
                isToday
                  ? 'border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-900/30 hover:border-slate-700/60 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold capitalize text-slate-100">
                    {format(day, 'EEEE d MMMM', { locale: it })}
                  </span>
                  {isToday && <span className="text-[10px] font-bold text-indigo-400 uppercase mt-0.5">Oggi</span>}
                </div>
                
                {/* Badge di copertura */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Copertura:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    coveredSlots === totalSlots && totalSlots > 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : coveredSlots > 0
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {coveredSlots}/{totalSlots} slot
                  </span>
                </div>
              </div>

              {/* Riepilogo delle prenotazioni */}
              {dayBookings.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {dayBookings.map(b => {
                    const shiftObj = dayShifts.find(s => s.id === b.shift_id)
                    const style = shiftObj ? getShiftStyle(shiftObj.ora_inizio) : { badge: 'bg-slate-800 text-slate-400' }
                    return (
                      <span
                        key={b.id}
                        className={`text-[9px] px-2 py-0.5 rounded-md border font-semibold ${style.badge}`}
                      >
                        {b.profiles?.username || 'Dipendente'}{' '}
                        <span className={b.ruolo_turno === 'CE' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          ({b.ruolo_turno === 'CE' ? 'CE' : 'Aut.'})
                        </span>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic mt-1">Nessuna prenotazione per questo giorno.</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Barra di Navigazione Superiore Tabellone */}
      <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex gap-1">
          <button
            onClick={() => setViewType('giorno')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              viewType === 'giorno'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> Giorno
          </button>
          <button
            onClick={() => setViewType('settimana')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              viewType === 'settimana'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" /> Settimana
          </button>
        </div>

        <button
          onClick={handleToday}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-2 py-1 bg-slate-800/50 rounded-lg"
        >
          Oggi
        </button>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between bg-slate-900/40 px-3 py-2 rounded-2xl border border-slate-800/50">
        <button
          onClick={handlePrevWeek}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          title="Settimana precedente"
        >
          &larr;
        </button>
        <span className="text-xs font-bold text-slate-300 text-center tracking-wide">
          {format(startOfCurrWeek, 'dd MMM', { locale: it })} - {format(endOfCurrWeek, 'dd MMM yyyy', { locale: it })}
        </span>
        <button
          onClick={handleNextWeek}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          title="Settimana successiva"
        >
          &rarr;
        </button>
      </div>

      {/* Giorno Picker Pills (Solo in vista Giorno) */}
      {viewType === 'giorno' && (
        <div className="sticky -top-4 sm:-top-5 z-30 bg-slate-950/95 backdrop-blur-md py-2.5 -mx-3 sm:-mx-5 px-3 sm:px-5 border-b border-slate-800/80 flex items-center gap-3">
          {/* Horizontally scrollable calendar */}
          <div ref={calendarScrollRef} className="flex-1 overflow-x-auto scroll-smooth flex gap-2 py-0.5 pr-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {calendarDays.map((day, dIdx) => {
              const isSelected = isSameDay(day, currentDate)
              const isToday = isSameDay(day, new Date())
              const showMonthSeparator = dIdx > 0 && day.getMonth() !== calendarDays[dIdx - 1].getMonth()

              return (
                <React.Fragment key={day.toString()}>
                  {showMonthSeparator && (
                    <div className="flex-shrink-0 flex flex-col justify-center items-center px-2 border border-indigo-500/30 bg-indigo-950/60 rounded-xl mx-0.5 self-stretch min-w-[20px]">
                      <span className="text-[9px] font-black text-indigo-400 flex flex-col items-center leading-none uppercase">
                        {format(day, 'MMM', { locale: it }).slice(0, 3).toUpperCase().split('').map((char, charIdx) => (
                          <span key={charIdx} className={charIdx > 0 ? 'mt-1.5' : ''}>{char}</span>
                        ))}
                      </span>
                    </div>
                  )}
                  <button
                    id={`pill-${format(day, 'yyyy-MM-dd')}`}
                    onClick={() => handleSelectDay(day)}
                    className={`flex flex-col items-center justify-center flex-shrink-0 w-11 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 scale-105 font-bold'
                        : 'bg-slate-900/30 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-[9px] uppercase tracking-wider">
                      {format(day, 'eee', { locale: it }).replace('.', '')}
                    </span>
                    <span className={`text-base mt-0.5 ${isToday && !isSelected ? 'text-indigo-400 font-bold border-b border-indigo-400' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {/* I 3 pallini di copertura dei turni */}
                    <div className="flex gap-1 mt-1 justify-center">
                      <span className={`w-1.5 h-1.5 rounded-full ${getShiftCoverageStatus(day, 1)}`} title="Mattina"></span>
                      <span className={`w-1.5 h-1.5 rounded-full ${getShiftCoverageStatus(day, 2)}`} title="Pomeriggio"></span>
                      <span className={`w-1.5 h-1.5 rounded-full ${getShiftCoverageStatus(day, 3)}`} title="Notte"></span>
                    </div>
                  </button>
                </React.Fragment>
              )
            })}
          </div>
          
          {/* Month Indicator Flag on the Right */}
          <div className="flex-shrink-0 bg-indigo-600/90 text-white font-extrabold uppercase text-[10px] tracking-widest px-3.5 py-3 rounded-xl shadow-md border border-indigo-500/30 flex items-center justify-center capitalize min-w-[80px]">
            {format(currentMonthDate, 'MMMM', { locale: it })}
          </div>
        </div>
      )}

      {/* Area dei turni */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm italic">Caricamento turni in corso...</span>
        </div>
      ) : viewType === 'giorno' ? (
        <div ref={containerRef} className="flex flex-col gap-6">
          {renderedDates.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const isToday = isSameDay(day, new Date())
            return (
              <React.Fragment key={dateStr}>
                {/* Month transition separator or standard division line */}
                {idx > 0 && (
                  day.getDate() === 1 ? (
                    <div className="w-full pt-6 pb-4 flex items-center gap-4">
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-indigo-500/80 to-purple-500/80 rounded-full"></div>
                      <div className="bg-slate-900 border border-indigo-500/30 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                        {format(day, 'MMM yyyy', { locale: it }).replace('.', '').toUpperCase()}
                      </div>
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-purple-500/80 via-indigo-500/80 to-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <div className="w-full pt-4 pb-2 flex items-center gap-3">
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-indigo-500/70 to-purple-500/70 rounded-full"></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]"></div>
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-purple-500/70 via-indigo-500/70 to-transparent rounded-full"></div>
                    </div>
                  )
                )}

                <div
                  data-date={dateStr}
                  ref={(el) => {
                    if (el) {
                      dayRefs.current[dateStr] = el
                    } else {
                      delete dayRefs.current[dateStr]
                    }
                  }}
                  className="flex flex-col gap-3.5 pb-2 scroll-mt-2"
                >
                  <div className="flex flex-col items-center justify-center text-center px-1 mb-3 mt-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-white capitalize tracking-tight leading-tight">
                      {format(day, 'EEEE', { locale: it })}
                    </h3>
                    <span className="text-xs sm:text-sm font-bold text-indigo-400 mt-1.5 uppercase tracking-widest">
                      {format(day, 'd MMMM yyyy', { locale: it })}
                    </span>
                    {isToday && (
                      <span className="text-[10px] mt-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-3.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-md shadow-indigo-500/20">
                        Oggi
                      </span>
                    )}
                  </div>
                  {renderDailyShifts(day)}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      ) : (
        renderWeeklySummary()
      )}

      {/* Modale Equipaggio Espanso */}
      {selectedCrewShift && (
        <div
          onClick={() => setSelectedCrewShift(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-md flex flex-col gap-4 shadow-premium max-h-[90vh] overflow-y-auto relative"
          >
            {/* Header Modale Centrato */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-800/80 relative">
              {/* Pulsante X in alto a destra */}
              <button 
                onClick={() => setSelectedCrewShift(null)}
                className="absolute top-0 right-0 text-slate-400 hover:text-slate-200 p-1.5 bg-slate-800 hover:bg-slate-750 rounded-full border border-slate-700 transition-colors flex items-center justify-center"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Data scritta grande */}
              <h3 className="text-xl sm:text-2xl font-black text-slate-100 capitalize tracking-tight mt-2 px-6">
                {(() => {
                  const [y, m, d] = selectedCrewShift.shift.data.split('-').map(Number)
                  const parsedDate = new Date(y, m - 1, d)
                  return format(parsedDate, 'EEEE, d MMMM yyyy', { locale: it })
                })()}
              </h3>

              {/* Orario del turno */}
              <span className="text-sm sm:text-base font-bold text-indigo-400 mt-1">
                Dalle {selectedCrewShift.shift.ora_inizio.slice(0, 5)} alle {selectedCrewShift.shift.ora_fine.slice(0, 5)}
              </span>

              {/* Nome Equipaggio */}
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest mt-3">
                {crews.find(c => String(c.id) === String(selectedCrewShift.shift.crew_id))?.nome || `Equipaggio ${selectedCrewShift.shift.crew_id}`}
              </span>
            </div>

            {/* Slot Espansi */}
            <div className="flex flex-col gap-4 text-left">
              {renderSlot(selectedCrewShift.shift, 'CE')}
              {renderSlot(selectedCrewShift.shift, 'autista')}
            </div>
          </div>
        </div>
      )}

      {/* Modale di Conferma Prenotazione (Inline-Popup) */}
      {bookingConfirm && (
        <div
          onClick={() => setBookingConfirm(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-xs flex flex-col gap-4 shadow-premium relative"
          >
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h3 className="text-base font-bold text-slate-100">Dettaglio Prenotazione</h3>
              <button 
                onClick={() => setBookingConfirm(null)}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-800 hover:bg-slate-750 rounded-full border border-slate-700 transition-colors flex items-center justify-center"
                aria-label="Chiudi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {confirmError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-[11px] font-semibold text-center leading-normal">
                {confirmError}
              </div>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              Vuoi prenotare lo slot come <strong className={`uppercase ${bookingConfirm.role === 'CE' ? 'text-emerald-400' : 'text-amber-400'}`}>{bookingConfirm.role === 'autista' ? 'Autista' : bookingConfirm.role}</strong>?
            </p>

            {/* Assegnazione Utente (Solo per Admin) */}
            {profile?.ruolo === 'admin' && profiles.length > 0 && (
              <div className="flex flex-col gap-1 text-left">
                <label htmlFor="assignUser" className="text-[10px] uppercase font-bold text-slate-500">Assegna a</label>
                <select
                  id="assignUser"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-2 py-2 text-xs font-semibold text-slate-200 outline-none"
                >
                  <option value={user.id}>Me stesso ({profile.username})</option>
                  {profiles
                    .filter(p => p.id !== user.id)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.username} ({p.ruolo})</option>
                    ))
                  }
                </select>
              </div>
            )}

            {/* Opzione Orario Parziale */}
            <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPartial}
                  onChange={(e) => setIsPartial(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-300">Orario parziale</span>
              </label>

              {isPartial && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Inizio</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-200 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Fine</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-200 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 mt-2.5 border-t border-slate-800/80 pt-3.5">
              <button
                onClick={() => setBookingConfirm(null)}
                className="flex-1 py-2 px-3 border border-slate-700 bg-slate-800/30 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleBookSlot}
                disabled={actionLoading}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors flex items-center justify-center"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Prenota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
