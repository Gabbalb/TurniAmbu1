import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Calendar, Clock, Trash2, ArrowRight, RefreshCw, ClipboardList } from 'lucide-react'

export default function IMieiTurni() {
  const { user } = useAuth()
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // ID della prenotazione da confermare

  const loadMyBookings = async () => {
    setLoading(true)
    try {
      const { data } = await api.fetchMyFutureBookings(user.id)
      setMyBookings(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMyBookings()
  }, [])

  const handleCancelBooking = async () => {
    if (!confirmDelete) return
    const bookingId = confirmDelete
    setConfirmDelete(null)
    setCancelingId(bookingId)

    try {
      const { error } = await api.cancelBooking(bookingId)
      if (error) {
        alert(error.message)
      } else {
        await loadMyBookings()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCancelingId(null)
    }
  }

  const getShiftBadgeStyle = (ora_inizio) => {
    if (ora_inizio.startsWith('06:')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    if (ora_inizio.startsWith('14:')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    return 'bg-violet-500/20 text-violet-300 border-violet-500/30'
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header Sezione */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/60">
        <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">I Miei Turni Prenotati</h2>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Turni futuri programmati</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm italic">Caricamento dei tuoi turni...</span>
        </div>
      ) : myBookings.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-3 mt-4">
          <Calendar className="w-12 h-12 text-slate-700" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-400">Nessun turno prenotato</span>
            <span className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
              Non hai ancora prenotato alcun turno futuro. Usa il pulsante (+) in basso per impostare le tue disponibilità!
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {myBookings.map(booking => {
            const shift = booking.shifts
            if (!shift) return null
            const isCanceling = cancelingId === booking.id

            return (
              <div
                key={booking.id}
                className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between shadow-premium transition-all hover:border-slate-700/60"
              >
                <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-3">
                  {/* Data Turno */}
                  <span className="text-sm font-bold capitalize text-slate-100 leading-none">
                    {format(parseISO(shift.data), 'EEEE d MMMM yyyy', { locale: it })}
                  </span>

                  {/* Dettagli Fascia / Orario */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-md ${getShiftBadgeStyle(shift.ora_inizio)}`}>
                      {shift.ora_inizio.slice(0, 5)}–{shift.ora_fine.slice(0, 5)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      Ruolo: <strong className="text-indigo-400 uppercase">{booking.ruolo_turno}</strong>
                    </span>
                  </div>

                  {/* Nota orario parziale se presente */}
                  {booking.is_partial && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{booking.nota_parziale}</span>
                    </div>
                  )}
                </div>

                {/* Pulsante Cancella */}
                <button
                  onClick={() => setConfirmDelete(booking.id)}
                  disabled={isCanceling}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl transition-all flex-shrink-0"
                  title="Elimina prenotazione"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog di conferma cancellazione */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-xs flex flex-col gap-4 shadow-premium">
            <h3 className="text-base font-bold text-slate-100">Rilascia Turno</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sei sicuro di voler cancellare questa prenotazione? Lo slot tornerà disponibile per i colleghi.
            </p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 px-3 border border-slate-700 bg-slate-800/30 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Mantieni
              </button>
              <button
                onClick={handleCancelBooking}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-colors"
              >
                Rilascia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
