import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { History, Calendar, Clock, CircleDollarSign, CheckCircle, AlertCircle, Loader2, Landmark, Pencil, Plus, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export default function StoricoOre() {
  const { profile, refreshProfile } = useAuth()
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // States for Add Manual Shift Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addStartDate, setAddStartDate] = useState('')
  const [addStartTime, setAddStartTime] = useState('')
  const [addEndDate, setAddEndDate] = useState('')
  const [addEndTime, setAddEndTime] = useState('')
  const [addHourlyRate, setAddHourlyRate] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

  // States for Edit Shift Modal
  const [editingShift, setEditingShift] = useState(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editHourlyRate, setEditHourlyRate] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)

  const getLocalDateString = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'yyyy-MM-dd')
    } catch (e) {
      return ''
    }
  }

  const getLocalTimeString = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'HH:mm')
    } catch (e) {
      return ''
    }
  }

  const handleOpenAddModal = () => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const timeStr = format(now, 'HH:mm')
    
    setAddStartDate(todayStr)
    setAddStartTime(timeStr)
    setAddEndDate(todayStr)
    // Default end time to 8 hours later
    const eightHoursLater = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    setAddEndDate(format(eightHoursLater, 'yyyy-MM-dd'))
    setAddEndTime(format(eightHoursLater, 'HH:mm'))
    
    setAddHourlyRate(profile?.paga_oraria || 0)
    setAddError(null)
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (shift) => {
    setEditingShift(shift)
    setEditStartDate(getLocalDateString(shift.start_time))
    setEditStartTime(getLocalTimeString(shift.start_time))
    setEditEndDate(getLocalDateString(shift.end_time))
    setEditEndTime(getLocalTimeString(shift.end_time))
    setEditHourlyRate(shift.paga_oraria_storica || 0)
    setEditError(null)
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)

    try {
      if (!addStartDate || !addStartTime) {
        throw new Error('Inserisci data e ora di inizio.')
      }
      
      const start = new Date(`${addStartDate}T${addStartTime}`)
      if (isNaN(start.getTime())) {
        throw new Error('Data o ora di inizio non valida.')
      }

      let end = null
      if (addEndDate && addEndTime) {
        end = new Date(`${addEndDate}T${addEndTime}`)
        if (isNaN(end.getTime())) {
          throw new Error('Data o ora di fine non valida.')
        }
        if (end <= start) {
          throw new Error('La data/ora di fine deve essere successiva a quella di inizio.')
        }
      }

      const { error: apiError } = await api.addManualClockedShift(
        profile.id,
        start.toISOString(),
        end ? end.toISOString() : null,
        addHourlyRate
      )

      if (apiError) throw apiError

      setIsAddModalOpen(false)
      await loadShifts()
    } catch (err) {
      console.error(err)
      setAddError(err.message || 'Si è verificato un errore durante l\'aggiunta del turno.')
    } finally {
      setAddLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)

    try {
      if (!editStartDate || !editStartTime) {
        throw new Error('Inserisci data e ora di inizio.')
      }

      const start = new Date(`${editStartDate}T${editStartTime}`)
      if (isNaN(start.getTime())) {
        throw new Error('Data o ora di inizio non valida.')
      }

      let end = null
      if (editEndDate && editEndTime) {
        end = new Date(`${editEndDate}T${editEndTime}`)
        if (isNaN(end.getTime())) {
          throw new Error('Data o ora di fine non valida.')
        }
        if (end <= start) {
          throw new Error('La data/ora di fine deve essere successiva a quella di inizio.')
        }
      }

      const { error: apiError } = await api.updateClockedShift(
        editingShift.id,
        start.toISOString(),
        end ? end.toISOString() : null,
        editHourlyRate
      )

      if (apiError) throw apiError

      setEditingShift(null)
      await loadShifts()
    } catch (err) {
      console.error(err)
      setEditError(err.message || 'Si è verificato un errore durante la modifica del turno.')
    } finally {
      setEditLoading(false)
    }
  }

  const loadShifts = async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    try {
      // Refresh profile to get the most updated credito_surplus
      await refreshProfile()
      
      const { data, error: apiError } = await api.fetchClockedShifts(profile.id)
      if (apiError) throw apiError
      setShifts(data || [])
    } catch (err) {
      console.error(err)
      setError('Impossibile caricare lo storico dei turni.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShifts()
  }, [profile?.id])

  // Calcoli delle statistiche
  const calculateStats = () => {
    let oreTotali = 0
    let oreNonPagate = 0
    let importoLordoNonPagato = 0

    shifts.forEach(s => {
      if (s.end_time) {
        const durationHours = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
        oreTotali += durationHours
        if (!s.pagato) {
          oreNonPagate += durationHours
          importoLordoNonPagato += durationHours * Number(s.paga_oraria_storica || 0)
        }
      }
    })

    const surplus = Number(profile?.credito_surplus || 0)
    // Totale dovuto all'utente al netto del surplus
    const totaleDovuto = Math.max(0, Number((importoLordoNonPagato - surplus).toFixed(2)))

    return {
      oreTotali: oreTotali.toFixed(2),
      oreNonPagate: oreNonPagate.toFixed(2),
      importoLordoNonPagato: importoLordoNonPagato.toFixed(2),
      totaleDovuto,
      surplus: surplus.toFixed(2)
    }
  }

  const stats = calculateStats()

  const formatShiftDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'eeee dd MMMM yyyy', { locale: it })
    } catch (e) {
      return dateStr
    }
  }

  const formatShiftTime = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'HH:mm')
    } catch (e) {
      return ''
    }
  }

  const getDurationString = (start, end) => {
    if (!end) return 'In corso'
    const diffMs = new Date(end) - new Date(start)
    const hours = diffMs / (1000 * 60 * 60)
    return `${hours.toFixed(2)} ore`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs text-slate-400">Caricamento storico ore...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-6">
      {/* Intestazione */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Storico Ore
          </h2>
          <p className="text-xs text-slate-400">Riepilogo e storico dei turni di lavoro effettuati</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/10 transition-all duration-200 flex-shrink-0"
          title="Aggiungi turno manuale"
        >
          <Plus className="w-4 h-4" />
          <span>Aggiungi</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards Riepilogo */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-3xl flex flex-col gap-1 shadow-md">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ore Totali</span>
          <span className="text-2xl font-black text-slate-100 font-mono">{stats.oreTotali}</span>
          <span className="text-[9px] text-slate-500 leading-none">Ore lavorate complessive</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-3xl flex flex-col gap-1 shadow-md">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Da Pagare</span>
          <span className="text-2xl font-black text-indigo-400 font-mono">€{stats.totaleDovuto}</span>
          <span className="text-[9px] text-slate-500 leading-none">Al netto di acconti/surplus</span>
        </div>

        {Number(stats.surplus) !== 0 && (
          <div className="col-span-2 bg-indigo-950/20 border border-indigo-900/30 p-3.5 rounded-3xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                {Number(stats.surplus) > 0 ? 'Surplus Registrato' : 'Debito Residuo'}
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {Number(stats.surplus) > 0 
                  ? `Hai un credito di €${stats.surplus} (già anticipato dall'amministratore)`
                  : `Mancano €${Math.abs(Number(stats.surplus)).toFixed(2)} dal pagamento precedente`
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lista Turni */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Elenco Timbrature</h3>
        
        {shifts.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-3xl text-center flex flex-col items-center gap-2.5">
            <Clock className="w-8 h-8 text-slate-600" />
            <span className="text-xs font-semibold text-slate-400">Nessun turno registrato in storico.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shifts.map((shift) => {
              const isCompleted = !!shift.end_time
              const isPagato = shift.pagato
              const durationHrs = isCompleted 
                ? (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60)
                : 0
              const importoShift = durationHrs * Number(shift.paga_oraria_storica || 0)

              return (
                <div
                  key={shift.id}
                  className={`bg-slate-900 border transition-all duration-300 p-4 rounded-3xl flex flex-col gap-3 ${
                    isPagato 
                      ? 'opacity-55 border-slate-900/80 shadow-none' 
                      : 'border-slate-800/80 shadow-md hover:border-slate-700/60'
                  }`}
                >
                  {/* Header riga */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-200 capitalize truncate">
                        {formatShiftDate(shift.start_time)}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatShiftTime(shift.start_time)}
                        {isCompleted ? ` - ${formatShiftTime(shift.end_time)}` : ' (In corso)'}
                      </span>
                    </div>

                    {/* Badge Stato & Edit Button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(shift)}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors flex items-center justify-center border border-slate-800/40 hover:border-slate-700/60"
                        title="Modifica data e ora"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {isPagato ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-800/60 text-slate-400 border border-slate-700/35">
                          <CheckCircle className="w-3 h-3 text-slate-400" />
                          Pagato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <CircleDollarSign className="w-3 h-3 text-indigo-400 animate-pulse" />
                          Da Pagare
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dettagli della durata e importo */}
                  <div className="flex items-center justify-between border-t border-slate-800/50 pt-2.5 mt-0.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Durata</span>
                      <span className="text-xs font-semibold text-slate-300 font-mono">
                        {getDurationString(shift.start_time, shift.end_time)}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Guadagno</span>
                      <span className="text-xs font-bold text-slate-200 font-mono">
                        {isCompleted 
                          ? `€${importoShift.toFixed(2)} (${Number(shift.paga_oraria_storica).toFixed(2)}/h)` 
                          : '-'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODALE DI AGGIUNTA TURNO MANUALE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-slide-up relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-indigo-400">
              <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-100 font-bold">Aggiungi Turno</h3>
            </div>

            {addError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              {/* Inizio */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Inizio Turno</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={addStartDate}
                    onChange={(e) => setAddStartDate(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                  <input
                    type="time"
                    value={addStartTime}
                    onChange={(e) => setAddStartTime(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Fine */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Fine Turno</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={addEndDate}
                    onChange={(e) => setAddEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                  <input
                    type="time"
                    value={addEndTime}
                    onChange={(e) => setAddEndTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
                <span className="text-[9px] text-slate-500 leading-none">Lascia vuoto se il turno è ancora in corso.</span>
              </div>

              {/* Paga Oraria */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Paga Oraria (€/ora)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addHourlyRate}
                  onChange={(e) => setAddHourlyRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-700 bg-slate-800/20 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/15 disabled:opacity-50 transition-all duration-200"
                >
                  {addLoading ? 'Salvataggio...' : 'Conferma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DI MODIFICA TURNO */}
      {editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-slide-up relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingShift(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-indigo-400">
              <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <Pencil className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-100 font-bold">Modifica Turno</h3>
            </div>

            {editingShift.pagato && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-2xl text-[10px] font-medium leading-relaxed">
                ⚠️ <strong>Attenzione:</strong> Questo turno è già stato pagato. Modificando data/ora, i conteggi storici e i pagamenti già effettuati potrebbero risultare disallineati rispetto ai dettagli nel database.
              </div>
            )}

            {editError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              {/* Inizio */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Inizio Turno</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Fine */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Fine Turno</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
                <span className="text-[9px] text-slate-500 leading-none">Lascia vuoto se il turno è ancora in corso.</span>
              </div>

              {/* Paga Oraria */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Paga Oraria (€/ora)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editHourlyRate}
                  onChange={(e) => setEditHourlyRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingShift(null)}
                  className="flex-1 py-2.5 border border-slate-700 bg-slate-800/20 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/15 disabled:opacity-50 transition-all duration-200"
                >
                  {editLoading ? 'Salvataggio...' : 'Conferma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
