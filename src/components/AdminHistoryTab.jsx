import React, { useState, useEffect } from 'react'
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns'
import { it } from 'date-fns/locale'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Loader2 
} from 'lucide-react'
import { api } from '../lib/api'

export default function AdminHistoryTab({ profiles, crews, onRefresh, formatItalianDateTime }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [bookings, setBookings] = useState([])
  const [loadingData, setLoadingData] = useState(false)

  // Stati per Assegnazione / Modifica Inline
  // Struttura: { shiftId, role, booking } (se booking è presente è Modifica, altrimenti Assegna)
  const [editingSlot, setEditingSlot] = useState(null)

  // Stati Form
  const [formUserId, setFormUserId] = useState('')
  const [formIsPartial, setFormIsPartial] = useState(false)
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Stato per Modal Cancellazione
  const [bookingToDelete, setBookingToDelete] = useState(null)

  // Caricamento Dati del Mese
  const loadMonthData = async () => {
    setLoadingData(true)
    try {
      const startMonth = startOfMonth(currentMonth)
      const endMonth = endOfMonth(currentMonth)
      const startGrid = startOfWeek(startMonth, { weekStartsOn: 1 })
      const endGrid = endOfWeek(endMonth, { weekStartsOn: 1 })

      const startRange = format(startGrid, 'yyyy-MM-dd')
      const endRange = format(endGrid, 'yyyy-MM-dd')

      // Genera elenco di date del calendario da assicurare in DB
      const daysInGrid = eachDayOfInterval({ start: startGrid, end: endGrid })
      const datesList = daysInGrid.map(d => format(d, 'yyyy-MM-dd'))

      let activeCrews = crews
      if (!activeCrews || activeCrews.length === 0) {
        const { data: cData } = await api.fetchCrews()
        activeCrews = cData || []
      }

      // Inizializza i turni (le 3 fasce per ogni giorno) se non esistono
      if (activeCrews && activeCrews.length > 0) {
        await api.ensureShiftsExistForDates(datesList, activeCrews)
      }

      // Carica i dati aggiornati
      const [shiftsRes, bookingsRes] = await Promise.all([
        api.fetchShifts(startRange, endRange),
        api.fetchBookings(startRange, endRange)
      ])

      setShifts(shiftsRes.data || [])
      setBookings(bookingsRes.data || [])
    } catch (err) {
      console.error('Errore nel caricamento storico calendar:', err)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    loadMonthData()
  }, [currentMonth])

  // Navigazione
  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
    setEditingSlot(null)
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
    setEditingSlot(null)
  }

  // Helper per iniziali
  const formatInitials = (booking) => {
    if (!booking || !booking.profiles) return '-'
    const p = booking.profiles
    const nome = p.nome || ''
    const cognome = p.cognome || ''
    if (!nome && !cognome) return p.username ? p.username.slice(0, 3) : '-'
    return `${nome.charAt(0) || ''}${cognome.charAt(0) || ''}`.toUpperCase()
  }

  // Prepara l'editor per un determinato ruolo/shift
  const startEditing = (shiftId, role, booking = null, shiftStartTime = '06:00', shiftEndTime = '14:00') => {
    setEditingSlot({ shiftId, role, booking })
    if (booking) {
      setFormUserId(booking.user_id || '')
      setFormIsPartial(booking.is_partial || false)
      setFormStartTime(booking.ora_inizio_effettiva ? booking.ora_inizio_effettiva.slice(0, 5) : shiftStartTime.slice(0, 5))
      setFormEndTime(booking.ora_fine_effettiva ? booking.ora_fine_effettiva.slice(0, 5) : shiftEndTime.slice(0, 5))
      setFormNote(booking.nota_parziale || '')
    } else {
      // Trova il primo profilo ordinato alfabeticamente per impostarlo come default nel form
      const sortedProfiles = [...profiles].sort((a, b) => {
        const nameA = `${a.cognome || ''} ${a.nome || ''}`.toLowerCase()
        const nameB = `${b.cognome || ''} ${b.nome || ''}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
      setFormUserId(sortedProfiles[0]?.id || '')
      setFormIsPartial(false)
      setFormStartTime(shiftStartTime.slice(0, 5))
      setFormEndTime(shiftEndTime.slice(0, 5))
      setFormNote('')
    }
  }

  // Salva l'assegnazione o la modifica
  const handleSaveBooking = async (e) => {
    e.preventDefault()
    if (!formUserId) {
      alert("Seleziona un soccorritore.")
      return
    }

    setFormLoading(true)
    try {
      const payload = {
        shiftId: editingSlot.shiftId,
        role: editingSlot.role,
        userId: formUserId,
        isPartial: formIsPartial,
        startTime: formIsPartial ? (formStartTime ? `${formStartTime}:00` : null) : null,
        endTime: formIsPartial ? (formEndTime ? `${formEndTime}:00` : null) : null,
        note: formIsPartial ? formNote : null
      }

      if (editingSlot.booking) {
        // Modifica: usiamo gli stessi metodi cancellando prima la prenotazione precedente
        // come indicato dal commento utente ("i metodi non posso usare gli stessi che uso già nell'interfaccia mobile...")
        const cancelRes = await api.cancelBooking(editingSlot.booking.id)
        if (cancelRes.error) {
          alert(cancelRes.error.message || "Errore nella rimozione del turno precedente.")
          setFormLoading(false)
          return
        }
      }

      // Effettua la prenotazione
      const bookRes = await api.bookSlot(payload)
      if (bookRes.error) {
        alert(bookRes.error.message || "Errore nel salvataggio del turno.")
      } else {
        setEditingSlot(null)
        await loadMonthData()
        if (onRefresh) onRefresh()
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  // Conferma ed esegue eliminazione
  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return
    const id = bookingToDelete.id
    setBookingToDelete(null)

    try {
      const { error } = await api.cancelBooking(id)
      if (error) {
        alert(error.message || "Errore durante l'eliminazione.")
      } else {
        await loadMonthData()
        if (onRefresh) onRefresh()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Genera griglia giorni
  const startMonth = startOfMonth(currentMonth)
  const endMonth = endOfMonth(currentMonth)
  const startGrid = startOfWeek(startMonth, { weekStartsOn: 1 })
  const endGrid = endOfWeek(endMonth, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: startGrid, end: endGrid })

  // Raggruppa turni e prenotazioni del giorno selezionato
  const selectedDayStr = format(selectedDay, 'yyyy-MM-dd')
  const selectedDayShifts = shifts.filter(s => s.data === selectedDayStr)

  const getSlotData = (shiftsList, oraInizio) => {
    const shift = shiftsList.find(s => s.ora_inizio === oraInizio)
    if (!shift) return null
    const shiftBks = bookings.filter(b => b.shift_id === shift.id)
    const autista = shiftBks.find(b => b.ruolo_turno === 'autista')
    const ce = shiftBks.find(b => b.ruolo_turno === 'CE')
    return { shift, autista, ce }
  }

  // Ordinamento dei profili per cognome e nome nel form di assegnazione
  const sortedProfilesForSelect = [...profiles].sort((a, b) => {
    const nameA = `${a.cognome || ''} ${a.nome || ''}`.toLowerCase()
    const nameB = `${b.cognome || ''} ${b.nome || ''}`.toLowerCase()
    return nameA.localeCompare(nameB)
  })

  // Rendering di una riga di riepilogo fasce nella cella del giorno
  const renderCellFascia = (label, shiftData) => {
    if (!shiftData) return <div className="text-[9px] text-slate-350 font-mono">{label}: - / -</div>
    const { autista, ce } = shiftData
    const hasAutista = !!autista
    const hasCe = !!ce

    let colorClass = "text-slate-400"
    if (hasAutista && hasCe) {
      colorClass = "text-emerald-600 font-extrabold"
    } else if (hasAutista || hasCe) {
      colorClass = "text-amber-600 font-bold"
    }

    return (
      <div className={`text-[9px] font-mono leading-none py-0.5 truncate ${colorClass}`}>
        {label}: {formatInitials(autista)} / {formatInitials(ce)}
      </div>
    )
  }

  // Rendering di un ruolo nella scheda della giornata
  const renderRosterSlotCard = (shift, role, booking, label, textClass, bgClass, borderClass) => {
    const isEditingThis = editingSlot && editingSlot.shiftId === shift.id && editingSlot.role === role

    if (isEditingThis) {
      // Form di modifica / assegnazione inline
      return (
        <div className={`p-4 rounded-2xl border ${borderClass} bg-white shadow-sm flex flex-col gap-3 text-left font-sans animate-fade-in`}>
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <span className={`text-[10px] font-black uppercase tracking-widest ${textClass}`}>
              {editingSlot.booking ? 'Modifica' : 'Assegna'} {label}
            </span>
            <button
              onClick={() => setEditingSlot(null)}
              className="text-slate-400 hover:text-slate-650 p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleSaveBooking} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase">Soccorritore</label>
              <select
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none"
                required
              >
                <option value="">Seleziona soccorritore...</option>
                {sortedProfilesForSelect.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.cognome && p.nome ? `${p.cognome} ${p.nome}` : p.username} ({p.stato || 'volontario'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 px-3 py-2 rounded-xl">
              <input
                type="checkbox"
                id="isPartialCheckbox"
                checked={formIsPartial}
                onChange={(e) => setFormIsPartial(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
              />
              <label htmlFor="isPartialCheckbox" className="text-[10px] font-bold text-slate-650 cursor-pointer">
                Turno Parziale (Orario Personalizzato)
              </label>
            </div>

            {formIsPartial && (
              <div className="grid grid-cols-2 gap-2.5 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Inizio</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                    required={formIsPartial}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Fine</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                    required={formIsPartial}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Nota / Motivo</label>
                  <input
                    type="text"
                    placeholder="es. dalle ore 9:00, solo per urgenze"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    className="bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-855 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                {formLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Salva</span>
              </button>
            </div>
          </form>
        </div>
      )
    }

    if (!booking) {
      // Posto Libero (scheda con bordo tratteggiato)
      return (
        <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between text-left font-sans transition-all">
          <div className="flex flex-col gap-0.5">
            <span className={`text-[10px] font-black uppercase tracking-widest ${textClass}`}>
              {label}
            </span>
            <span className="text-xs font-semibold text-slate-400 italic">Posto libero</span>
          </div>
          <button
            onClick={() => startEditing(shift.id, role, null, shift.ora_inizio, shift.ora_fine)}
            className="flex items-center gap-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assegna</span>
          </button>
        </div>
      )
    }

    // Posto Occupato (con il nome e cognome scritti in modo molto chiaro e visibile come da feedback)
    const displayName = booking.profiles 
      ? `${booking.profiles.nome || ''} ${booking.profiles.cognome || ''}`.trim() || booking.profiles.username 
      : 'Utente N/D'

    return (
      <div className={`p-4 rounded-2xl border ${borderClass} ${bgClass} flex items-center justify-between text-left font-sans shadow-sm`}>
        <div className="flex flex-col min-w-0 pr-3">
          <span className={`text-[9px] font-black uppercase tracking-widest ${textClass}`}>
            {label}
          </span>
          <span className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight mt-0.5 truncate">
            {displayName}
          </span>
          {booking.is_partial && (
            <div className="flex flex-col gap-0.5 mt-1.5 border-t border-slate-200/40 pt-1.5">
              <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Dalle {booking.ora_inizio_effettiva ? booking.ora_inizio_effettiva.slice(0, 5) : ''} alle {booking.ora_fine_effettiva ? booking.ora_fine_effettiva.slice(0, 5) : ''}
              </span>
              {booking.nota_parziale && (
                <span className="text-[9px] text-slate-450 italic font-semibold">
                  "{booking.nota_parziale}"
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => startEditing(shift.id, role, booking, shift.ora_inizio, shift.ora_fine)}
            className="p-2 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
            title={`Modifica Assegnazione ${label}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setBookingToDelete(booking)}
            className="p-2 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
            title={`Rimuovi Assegnazione ${label}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in text-left">
      
      {/* Calendar Area (Left / Center) */}
      <div className="xl:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-5">
        
        {/* Calendar Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 font-sans uppercase tracking-wider">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">Storico turni mensile ed assegnazioni roster</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loadingData && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin mr-1" />}
            <button
              onClick={handlePrevMonth}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCurrentMonth(new Date())
                setSelectedDay(new Date())
                setEditingSlot(null)
              }}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Oggi
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days grid headers */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mer</div>
          <div>Gio</div>
          <div>Ven</div>
          <div>Sab</div>
          <div>Dom</div>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDay)
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const dateStr = format(day, 'yyyy-MM-dd')

            // Raggruppa i dati per questo giorno
            const dayShifts = shifts.filter(s => s.data === dateStr)
            const mattinaData = getSlotData(dayShifts, '06:00:00')
            const pomeriggioData = getSlotData(dayShifts, '14:00:00')
            const notteData = getSlotData(dayShifts, '22:00:00')

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDay(day)
                  setEditingSlot(null)
                }}
                className={`min-h-[96px] p-2 border rounded-2xl flex flex-col justify-between transition-all cursor-pointer relative select-none ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50/15 shadow-sm ring-2 ring-indigo-500/20' 
                    : isToday
                      ? 'border-indigo-200 bg-slate-50/50 hover:bg-slate-50'
                      : isCurrentMonth
                        ? 'border-slate-200 bg-white hover:bg-slate-50/30'
                        : 'border-slate-150 bg-slate-50/40 text-slate-350 opacity-40 hover:bg-slate-50/60'
                }`}
              >
                {/* Giorno Numero */}
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-black font-mono px-1.5 py-0.5 rounded-md ${
                    isToday 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : isSelected
                        ? 'text-indigo-600 font-extrabold'
                        : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Indicatori sintetici di copertura */}
                  {isCurrentMonth && (
                    <div className="flex gap-0.5">
                      <span className={`w-1 h-1 rounded-full ${
                        mattinaData ? (mattinaData.autista && mattinaData.ce ? 'bg-emerald-500' : (mattinaData.autista || mattinaData.ce ? 'bg-amber-400' : 'bg-slate-300')) : 'bg-slate-200'
                      }`} />
                      <span className={`w-1 h-1 rounded-full ${
                        pomeriggioData ? (pomeriggioData.autista && pomeriggioData.ce ? 'bg-emerald-500' : (pomeriggioData.autista || pomeriggioData.ce ? 'bg-amber-400' : 'bg-slate-300')) : 'bg-slate-200'
                      }`} />
                      <span className={`w-1 h-1 rounded-full ${
                        notteData ? (notteData.autista && notteData.ce ? 'bg-emerald-500' : (notteData.autista || notteData.ce ? 'bg-amber-400' : 'bg-slate-300')) : 'bg-slate-200'
                      }`} />
                    </div>
                  )}
                </div>

                {/* Dettaglio compatto delle 3 fasce */}
                <div className="flex flex-col gap-0.5 mt-2">
                  {renderCellFascia('M', mattinaData)}
                  {renderCellFascia('P', pomeriggioData)}
                  {renderCellFascia('N', notteData)}
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* Selected Day Details Card (Right) */}
      <div className="xl:col-span-1 flex flex-col gap-6">
        
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-4">
          
          {/* Header data selezionata */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200 font-sans">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-650 shadow-sm">
              <Calendar className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 capitalize leading-tight">
                {format(selectedDay, 'EEEE dd MMMM', { locale: it })}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold font-mono uppercase">{format(selectedDay, 'yyyy')}</p>
            </div>
          </div>

          {/* Lista delle 3 Fasce del Giorno */}
          <div className="flex flex-col gap-5 text-left">
            
            {/* 1. FASCIA MATTINA */}
            {(() => {
              const data = getSlotData(selectedDayShifts, '06:00:00')
              if (!data) return null
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-black text-slate-800 font-sans">Mattina (06:00 - 14:00)</span>
                  </div>
                  <div className="flex flex-col gap-2 pl-3 border-l border-slate-150">
                    {renderRosterSlotCard(data.shift, 'CE', data.ce, 'Capo Equipaggio (CE)', 'text-emerald-700', 'bg-emerald-50/40', 'border-emerald-200/85')}
                    {renderRosterSlotCard(data.shift, 'autista', data.autista, 'Autista Soccorritore', 'text-amber-700', 'bg-amber-50/40', 'border-amber-200/85')}
                  </div>
                </div>
              )
            })()}

            {/* 2. FASCIA POMERIGGIO */}
            {(() => {
              const data = getSlotData(selectedDayShifts, '14:00:00')
              if (!data) return null
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-black text-slate-800 font-sans">Pomeriggio (14:00 - 22:00)</span>
                  </div>
                  <div className="flex flex-col gap-2 pl-3 border-l border-slate-150">
                    {renderRosterSlotCard(data.shift, 'CE', data.ce, 'Capo Equipaggio (CE)', 'text-emerald-700', 'bg-emerald-50/40', 'border-emerald-200/85')}
                    {renderRosterSlotCard(data.shift, 'autista', data.autista, 'Autista Soccorritore', 'text-amber-700', 'bg-amber-50/40', 'border-amber-200/85')}
                  </div>
                </div>
              )
            })()}

            {/* 3. FASCIA NOTTE */}
            {(() => {
              const data = getSlotData(selectedDayShifts, '22:00:00')
              if (!data) return null
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-indigo-550" />
                    <span className="text-xs font-black text-slate-800 font-sans">Notte (22:00 - 06:00)</span>
                  </div>
                  <div className="flex flex-col gap-2 pl-3 border-l border-slate-150">
                    {renderRosterSlotCard(data.shift, 'CE', data.ce, 'Capo Equipaggio (CE)', 'text-emerald-700', 'bg-emerald-50/40', 'border-emerald-200/85')}
                    {renderRosterSlotCard(data.shift, 'autista', data.autista, 'Autista Soccorritore', 'text-amber-700', 'bg-amber-50/40', 'border-amber-200/85')}
                  </div>
                </div>
              )
            })()}

          </div>

        </div>

      </div>

      {/* Modal di Conferma Cancellazione Turno */}
      {bookingToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-left shadow-2xl animate-scale-up font-sans">
            <div className="flex items-center gap-2.5 text-rose-650">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Rimuovi Assegnazione</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Sei sicuro di voler rimuovere la prenotazione per il ruolo <span className="text-slate-800 font-bold uppercase">{bookingToDelete.ruolo_turno}</span> di <span className="text-slate-855 font-extrabold">{bookingToDelete.profiles ? `${bookingToDelete.profiles.nome} ${bookingToDelete.profiles.cognome}` : 'Utente'}</span>?
            </p>

            <p className="text-[10px] text-rose-650 bg-rose-50 border border-rose-100 p-3 rounded-xl font-bold leading-normal">
              ⚠️ L'operazione libererà il posto sul tabellone. Questa azione è immediata.
            </p>

            <div className="flex items-center gap-3 mt-1 font-sans">
              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDeleteBooking}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/10 cursor-pointer"
              >
                Sì, Rimuovi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
