import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { Sun, SunMoon, Moon, Lock, Trash2, CalendarRange, ListFilter, RefreshCw } from 'lucide-react'

export default function TurniBoard() {
  const { user, profile } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
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

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const getStandardHours = (placeholder) => {
    const p = Number(placeholder)
    if (p === 1) return { start: '06:00:00', end: '14:00:00' }
    if (p === 2) return { start: '14:00:00', end: '22:00:00' }
    return { start: '22:00:00', end: '06:00:00' }
  }

  const handleOpenBookingConfirm = (shift, role) => {
    setBookingConfirm({ shift, role })
    setAssigneeId(user.id)
    setIsPartial(false)
    
    const p = Number(shift.ora_inizio.startsWith('06:') ? 1 : shift.ora_inizio.startsWith('14:') ? 2 : 3)
    const std = getStandardHours(p)
    setStartTime(std.start.slice(0, 5))
    setEndTime(std.end.slice(0, 5))
    setConfirmError(null)
  }

  // Calcola le date della settimana corrente
  const startOfCurrWeek = startOfWeek(currentDate, { weekStartsOn: 1 })
  const endOfCurrWeek = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrWeek, i))

  // Carica i dati dal DB
  const loadBoardData = async () => {
    setLoading(true)
    try {
      const startStr = format(startOfCurrWeek, 'yyyy-MM-dd')
      const endStr = format(endOfCurrWeek, 'yyyy-MM-dd')

      // Carica equipaggi attivi
      const { data: crewsData } = await api.fetchCrews()
      setCrews(crewsData || [])

      // Assicurati che esistano i turni di default (per default equipaggio 1) in queste date
      const datesStr = weekDays.map(d => format(d, 'yyyy-MM-dd'))
      if (crewsData && crewsData.length > 0) {
        await api.ensureShiftsExistForDates(datesStr, crewsData)
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
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBoardData()
  }, [currentDate])

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
    setCurrentDate(addDays(currentDate, -7))
  }

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Esegue la prenotazione di uno slot
  const handleBookSlot = async () => {
    if (!bookingConfirm) return
    const { shift, role } = bookingConfirm
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
    // Trova tutte le prenotazioni per questo ruolo in questo turno
    const slotBookings = bookings.filter(b => b.shift_id === shift.id && b.ruolo_turno === role)
    const slotIdStr = `${shift.id}-${role}`
    
    if (slotBookings.length === 0) {
      const isLoading = actionLoading === slotIdStr
      // Slot completamente Libero
      return (
        <button
          onClick={() => handleOpenBookingConfirm(shift, role)}
          disabled={isLoading || !profile?.attivo}
          className="flex flex-col text-left p-2 sm:p-3 rounded-xl border border-dashed border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/20 hover:bg-indigo-500/5 transition-all duration-200"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{role}</span>
          <span className="text-sm font-medium text-indigo-400/80 mt-0.5 group-hover:text-indigo-400">
            {isLoading ? 'Prenotazione...' : '+ Disponibile'}
          </span>
        </button>
      )
    }

    // Slot con almeno una prenotazione
    return (
      <div className="flex flex-col gap-2 p-2 rounded-xl border border-slate-800/80 bg-slate-950/40">
        <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500 px-1">{role}</span>
        
        <div className="flex flex-col gap-1.5">
          {slotBookings.map(bk => {
            const isCurrentUser = bk.user_id === user.id
            const isAdmin = profile?.ruolo === 'admin'
            const isLoading = actionLoading === bk.id

            if (isCurrentUser) {
              return (
                <div key={bk.id} className="flex items-center justify-between p-2 rounded-lg border border-indigo-500/60 bg-indigo-500/10 shadow-sm animate-touch-ping duration-1000">
                  <div className="flex flex-col min-w-0 pr-1 text-left">
                    <span className="text-xs font-bold text-indigo-300">Io (Prenotato)</span>
                    {bk.is_partial && (
                      <span className="text-[10px] text-indigo-200 mt-0.5 leading-tight">{bk.nota_parziale}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleCancelBooking(bk.id, e)}
                    disabled={isLoading}
                    className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors"
                    title="Cancella prenotazione"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            } else {
              return (
                <div key={bk.id} className={`flex items-center justify-between p-2 rounded-lg border border-slate-800 bg-slate-900/30 text-slate-400 ${isAdmin ? 'hover:border-rose-500/30' : ''}`}>
                  <div className="flex flex-col min-w-0 pr-1 text-left">
                    <span className="text-xs font-medium text-slate-300 truncate max-w-[80px] sm:max-w-[100px]">
                      {bk.profiles?.username || 'Collega'}
                    </span>
                    {bk.is_partial && (
                      <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">{bk.nota_parziale}</span>
                    )}
                  </div>
                  {isAdmin ? (
                    <button
                      onClick={(e) => handleCancelBooking(bk.id, e)}
                      disabled={isLoading}
                      className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors"
                      title="Cancella prenotazione collega (Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <Lock className="w-3 h-3 text-slate-600 mr-1 flex-shrink-0" />
                  )}
                </div>
              )
            }
          })}
        </div>

        {/* Pulsante per aggiungere un'altra disponibilità parziale nello stesso slot */}
        <button
          onClick={() => handleOpenBookingConfirm(shift, role)}
          disabled={!profile?.attivo}
          className="text-center py-1 border border-dashed border-slate-800 hover:border-indigo-500/40 rounded-lg text-[9px] font-bold text-indigo-400/80 hover:text-indigo-400 bg-slate-900/10 hover:bg-indigo-500/5 transition-all mt-0.5"
        >
          + Aggiungi
        </button>
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
          return (
            <div key={shift.id} className="bg-slate-900/40 border border-slate-800/80 p-2.5 sm:p-3.5 rounded-2xl shadow-inner-soft">
              {/* Nome Equipaggio */}
              <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                <span className="text-xs font-bold text-slate-300">
                  {crewObj ? crewObj.nome : `Equipaggio ${shift.crew_id}`}
                </span>
                {idx > 0 && (
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                    Equipaggio Rinforzo
                  </span>
                )}
              </div>

              {/* Grid Coppia: CE + Autista */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {renderSlot(shift, 'CE', matchedShifts)}
                {renderSlot(shift, 'autista', matchedShifts)}
              </div>
            </div>
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
                        {b.profiles?.username || 'Dipendente'} ({b.ruolo_turno === 'CE' ? 'CE' : 'Aut.'})
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
        <div className="flex justify-between gap-1 overflow-x-auto py-1 scroll-smooth">
          {weekDays.map(day => {
            const isSelected = isSameDay(day, currentDate)
            const isToday = isSameDay(day, new Date())
            return (
              <button
                key={day.toString()}
                onClick={() => setCurrentDate(day)}
                className={`flex flex-col items-center flex-1 min-w-[46px] py-2 px-1 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105 font-bold'
                    : 'bg-slate-900/30 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider">
                  {format(day, 'eee', { locale: it }).replace('.', '')}
                </span>
                <span className={`text-base mt-0.5 ${isToday && !isSelected ? 'text-indigo-400 font-bold border-b border-indigo-400' : ''}`}>
                  {format(day, 'd')}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Area dei turni */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm italic">Caricamento turni in corso...</span>
        </div>
      ) : viewType === 'giorno' ? (
        renderDailyShifts(currentDate)
      ) : (
        renderWeeklySummary()
      )}

      {/* Modale di Conferma Prenotazione (Inline-Popup) */}
      {bookingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-xs flex flex-col gap-4 shadow-premium">
            <h3 className="text-base font-bold text-slate-100">Dettaglio Prenotazione</h3>
            
            {confirmError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-[11px] font-semibold text-center leading-normal">
                {confirmError}
              </div>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              Vuoi prenotare lo slot come <strong className="text-indigo-400 uppercase">{bookingConfirm.role}</strong>?
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
