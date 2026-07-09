import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { calculateShiftIntersections } from '../utils/shiftLogic'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Calendar, Clock, UserCheck, AlertTriangle, X, CheckCircle } from 'lucide-react'

export default function DisponibilitaModal({ isOpen, onClose, onSuccess }) {
  const { user, profile } = useAuth()
  
  // Campi del Form
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [role, setRole] = useState('CE') // 'CE' | 'autista'
  const [timeMode, setTimeMode] = useState('standard') // 'standard' | 'custom'
  const [selectedShift, setSelectedShift] = useState('1') // '1' | '2' | '3' (fascia standard)
  const [customStart, setCustomStart] = useState('17:00')
  const [customEnd, setCustomEnd] = useState('01:00')

  // Stati della logica di validazione
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState([]) // lista conflitti trovati
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [formErrors, setFormErrors] = useState([])
  const [successMsg, setSuccessMsg] = useState(null)

  // Resetta i dati all'apertura
  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date().toISOString().split('T')[0]
      setStartDate(todayStr)
      setEndDate(todayStr)
      setConflicts([])
      setShowConflictDialog(false)
      setFormErrors([])
      setSuccessMsg(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Sottomette la disponibilità bulk
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormErrors([])
    setSuccessMsg(null)
    setLoading(true)

    // Verifica qualifica autista
    if (role === 'autista' && profile?.qualifica !== 'autista') {
      setFormErrors(["Operazione non consentita: non hai la qualifica di Autista (AS)."])
      setLoading(false)
      return
    }

    try {
      // Validazione date
      if (!startDate || !endDate) {
        setFormErrors(['Inserisci sia la data di inizio che quella di fine.'])
        setLoading(false)
        return
      }

      if (endDate < startDate) {
        setFormErrors(['La data di fine non può essere precedente alla data di inizio.'])
        setLoading(false)
        return
      }

      // 1. Genera l'elenco dei giorni del range
      const start = parseISO(startDate)
      const end = parseISO(endDate)
      const days = eachDayOfInterval({ start, end })

      // 2. Costruisce l'elenco dei turni target
      const targetShifts = []

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        
        if (timeMode === 'standard') {
          const shiftIdNum = Number(selectedShift)
          const labels = { 
            1: '06:00–13:00', 
            2: '13:00–18:00', 
            3: '18:00–00:00', 
            4: '00:00–06:00' 
          }
          targetShifts.push({
            date: dateStr,
            shift_id_placeholder: shiftIdNum,
            label: labels[shiftIdNum],
            ora_inizio_effettiva: null,
            ora_fine_effettiva: null,
            is_partial: false,
            nota_parziale: null
          })
        } else {
          // Modalità Orario Personalizzato
          const intersections = calculateShiftIntersections(customStart, customEnd)
          intersections.forEach(inter => {
            targetShifts.push({
              date: dateStr,
              shift_id_placeholder: inter.shift_id_placeholder,
              label: inter.label,
              ora_inizio_effettiva: inter.ora_inizio_effettiva,
              ora_fine_effettiva: inter.ora_fine_effettiva,
              is_partial: inter.is_partial,
              nota_parziale: inter.nota_parziale
            })
          })
        }
      })

      if (targetShifts.length === 0) {
        setFormErrors(['L\'orario personalizzato inserito non copre nessuna delle fasce standard. Rivedi gli orari.'])
        setLoading(false)
        return
      }

      // 3. Controlla i conflitti nel DB
      const { conflicts: foundConflicts, error: conflictError } = await api.checkBulkConflicts(
        user.id,
        targetShifts,
        role
      )

      if (conflictError) {
        throw new Error(conflictError.message || 'Errore durante la verifica dei conflitti.')
      }

      if (foundConflicts.length > 0) {
        // Mostra i conflitti bloccanti
        setConflicts(foundConflicts)
        setShowConflictDialog(true)
        setLoading(false)
        return
      }

      // 4. Se non ci sono conflitti, esegui la prenotazione bulk
      const { error: bookingError } = await api.executeBulkBooking(user.id, targetShifts, role)
      
      if (bookingError) {
        throw new Error(bookingError.message || 'Errore durante l\'inserimento dei turni.')
      }

      setSuccessMsg('Disponibilità salvate con successo!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)

    } catch (err) {
      setFormErrors([err.message || 'Si è verificato un errore inaspettato.'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800/80 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 bg-slate-900">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Inserisci Disponibilità Bulk
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          
          {/* Visualizzazione Errori del Form (Inclusi i Conflitti precedenti) */}
          {formErrors.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-2xl text-xs flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Attenzione:
              </span>
              <ul className="list-disc pl-4 space-y-0.5">
                {formErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* Visualizzazione Conflitti Recenti come avviso inline in cima al form */}
          {conflicts.length > 0 && !showConflictDialog && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3.5 rounded-2xl text-xs flex flex-col gap-1.5">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Conflitti rilevati (Correggi prima di salvare):
              </span>
              <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                {conflicts.map((c, i) => (
                  <div key={i} className="border-b border-amber-500/10 pb-1 last:border-0">
                    [{c.date}] {c.shiftLabel} &rarr; {c.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3.5 rounded-2xl text-xs flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Sezione Date Range */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="startDate" className="text-xs font-semibold text-slate-400">Data Inizio</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 outline-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="endDate" className="text-xs font-semibold text-slate-400">Data Fine</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Sezione Ruolo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Ruolo Turno</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setRole('CE')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  role === 'CE'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> ATS
              </button>
              <button
                type="button"
                onClick={() => setRole('autista')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  role === 'autista'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Autista (AS)
              </button>
            </div>
          </div>

          {/* Selettore Modalità Orario */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Modalità Orario</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTimeMode('standard')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  timeMode === 'standard'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Fascia Standard
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('custom')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  timeMode === 'custom'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Personalizzato
              </button>
            </div>
          </div>

          {/* Input Condizionali in base alla modalità */}
          {timeMode === 'standard' ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="shiftSelect" className="text-xs font-semibold text-slate-400">Seleziona Fascia Standard</label>
              <select
                id="shiftSelect"
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 outline-none transition-colors"
              >
                <option value="1">Fascia 1: Mattina (06:00–13:00)</option>
                <option value="2">Fascia 2: Pomeriggio (13:00–18:00)</option>
                <option value="3">Fascia 3: Sera (18:00–00:00)</option>
                <option value="4">Fascia 4: Notte (00:00–06:00)</option>
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-2 bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl">
              <span className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                Dettaglio Orario Personalizzato
              </span>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="customStart" className="text-[10px] uppercase font-bold text-slate-500">Ora Inizio</label>
                  <input
                    id="customStart"
                    type="time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-200 outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="customEnd" className="text-[10px] uppercase font-bold text-slate-500">Ora Fine</label>
                  <input
                    id="customEnd"
                    type="time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-200 outline-none transition-colors"
                  />
                </div>
              </div>
              <span className="text-[10px] text-slate-500 italic mt-2">
                * Nota: Verranno create prenotazioni parziali per tutte le fasce standard intersecate (es. 17:00-01:00 interseca Pomeriggio e Notte).
              </span>
            </div>
          )}

          {/* Footer Form */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-slate-700 bg-slate-800/20 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/15 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? 'Verifica...' : 'Conferma e Salva'}
            </button>
          </div>
        </form>
      </div>

      {/* MODALE DI CONFLITTO (Bloccante ed Informativo) */}
      {showConflictDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-100">Rilevati Conflitti Turni</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Impossibile completare la prenotazione bulk. Sono presenti prenotazioni in conflitto nelle seguenti date e fasce:
            </p>

            {/* Lista dei Conflitti */}
            <div className="max-h-[180px] overflow-y-auto border border-slate-800 bg-slate-950/60 p-3 rounded-2xl space-y-2.5 font-mono text-[10px]">
              {conflicts.map((conflict, i) => (
                <div key={i} className="border-b border-slate-800/80 pb-2 last:border-0 last:pb-0 text-slate-300">
                  <div className="font-bold text-indigo-400">
                    {format(parseISO(conflict.date), 'dd MMM yyyy', { locale: it })} - {conflict.shiftLabel}
                  </div>
                  <div className="text-slate-400 mt-0.5">{conflict.message}</div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              * Nota: Per procedere, torna alla schermata precedente e modifica il range di date o il ruolo.
            </p>

            <button
              onClick={() => {
                // Chiude la modale di conflitto e rimanda al form preservando i dati inseriti
                setShowConflictDialog(false)
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors shadow-inner"
            >
              Ritorna e Modifica
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
