import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Calendar, Clock, Trash2, ArrowRight, RefreshCw, ClipboardList, Key, X } from 'lucide-react'

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

const mergeBookings = (bookingsList) => {
  // 1. Convert each booking to an interval
  const enrichedBookings = bookingsList.map(b => {
    const shift = b.shifts
    if (!shift) return null

    const p = Number(shift.ora_inizio.startsWith('06:') ? 1 : shift.ora_inizio.startsWith('14:') ? 2 : 3)
    const stdStart = p === 1 ? '06:00' : p === 2 ? '14:00' : '22:00'
    const stdEnd = p === 1 ? '14:00' : p === 2 ? '22:00' : '06:00'

    const startStr = b.ora_inizio_effettiva ? b.ora_inizio_effettiva.slice(0, 5) : stdStart
    const endStr = b.ora_fine_effettiva ? b.ora_fine_effettiva.slice(0, 5) : stdEnd

    let startMin = timeToMinutes(startStr)
    let endMin = timeToMinutes(endStr)

    if (p === 3) {
      if (startMin < 720) startMin += 1440
      if (endMin < 720) endMin += 1440
      if (endMin <= startMin) endMin += 1440
    } else {
      if (endMin <= startMin) endMin += 1440
    }

    return {
      ...b,
      startMin,
      endMin,
      p
    }
  }).filter(Boolean)

  // 2. Group by date and role
  const groups = {}
  enrichedBookings.forEach(b => {
    const key = `${b.shifts.data}-${b.ruolo_turno}`
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })

  const mergedList = []

  // 3. Merge intervals in each group
  Object.keys(groups).forEach(key => {
    const groupBookings = groups[key]
    groupBookings.sort((a, b) => a.startMin - b.startMin)

    const mergedGroup = []
    for (const b of groupBookings) {
      if (mergedGroup.length === 0) {
        mergedGroup.push({
          bookingIds: [b.id],
          shifts: b.shifts,
          ruolo_turno: b.ruolo_turno,
          startMin: b.startMin,
          endMin: b.endMin,
          is_partial: b.is_partial,
          nota_parziale: b.nota_parziale,
          p: b.p
        })
      } else {
        const last = mergedGroup[mergedGroup.length - 1]
        // Se si sovrappongono o sono contigui
        if (b.startMin <= last.endMin) {
          last.endMin = Math.max(last.endMin, b.endMin)
          last.bookingIds.push(b.id)
          last.is_partial = last.is_partial || b.is_partial
          
          const sStr = minutesToTimeStr(last.startMin)
          const eStr = minutesToTimeStr(last.endMin)
          last.nota_parziale = `Dalle ${sStr} alle ${eStr}`
        } else {
          mergedGroup.push({
            bookingIds: [b.id],
            shifts: b.shifts,
            ruolo_turno: b.ruolo_turno,
            startMin: b.startMin,
            endMin: b.endMin,
            is_partial: b.is_partial,
            nota_parziale: b.nota_parziale,
            p: b.p
          })
        }
      }
    }

    mergedGroup.forEach(mb => {
      const startStr = minutesToTimeStr(mb.startMin)
      const endStr = minutesToTimeStr(mb.endMin)
      
      mergedList.push({
        id: mb.bookingIds[0],
        bookingIds: mb.bookingIds,
        shifts: mb.shifts,
        ruolo_turno: mb.ruolo_turno,
        ora_inizio: startStr,
        ora_fine: endStr,
        is_partial: mb.is_partial,
        nota_parziale: mb.nota_parziale,
        p: mb.p
      })
    })
  })

  // Ordina per data e poi per ora_inizio
  mergedList.sort((a, b) => {
    if (a.shifts.data !== b.shifts.data) return a.shifts.data.localeCompare(b.shifts.data)
    return a.ora_inizio.localeCompare(b.ora_inizio)
  })

  return mergedList
}

export default function IMieiTurni({ onJumpToShift, setView }) {
  const { user } = useAuth()
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // ID della prenotazione da confermare

  const loadMyBookings = async () => {
    setLoading(true)
    try {
      const { data } = await api.fetchMyFutureBookings(user.id)
      setMyBookings(mergeBookings(data || []))
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
    const { bookingIds } = confirmDelete
    setConfirmDelete(null)
    setCancelingId(confirmDelete.id)

    try {
      const deletePromises = bookingIds.map(id => api.cancelBooking(id))
      const results = await Promise.all(deletePromises)
      
      const firstError = results.find(r => r.error)?.error
      if (firstError) {
        alert(firstError.message)
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
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">I Miei Turni Prenotati</h2>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Turni futuri programmati</span>
          </div>
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
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-slate-400">Nessun turno prenotato</span>
            <span className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed mb-4">
              Non hai ancora prenotato alcun turno futuro. Usa il pulsante (+) in basso per impostare le tue disponibilità!
            </span>
            <button
              onClick={() => setView('board')}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 active:scale-95 duration-150"
            >
              Visita il Tabellone
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {myBookings.map((booking, idx) => {
            const shift = booking.shifts
            if (!shift) return null
            const isCanceling = cancelingId === booking.id
            const isClosest = idx === 0
            const cardStyle = isClosest
              ? 'border-2 border-slate-100 shadow-[0_0_15px_rgba(255,255,255,0.08)] bg-slate-900/50 hover:bg-slate-900/75'
              : 'border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/60'

            return (
              <div
                key={booking.id}
                onClick={() => onJumpToShift(parseISO(shift.data), booking.p)}
                className={`p-4 sm:p-5 rounded-3xl flex items-center justify-between shadow-premium hover:border-indigo-500/40 transition-all duration-200 cursor-pointer group text-left ${cardStyle}`}
              >
                <div className="flex flex-col gap-2 flex-1 min-w-0 pr-4">
                  {/* Data Turno Ingrandita */}
                  <div className="flex flex-col">
                    {isClosest && (
                      <span className="text-[9px] bg-white text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-widest self-start mb-2 shadow-sm">
                        Prossimo turno
                      </span>
                    )}
                    <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 leading-none">
                      {format(parseISO(shift.data), 'EEEE', { locale: it })}
                    </span>
                    <span className="text-xl font-black text-slate-100 mt-1 capitalize leading-tight">
                      {format(parseISO(shift.data), 'd MMMM yyyy', { locale: it })}
                    </span>
                  </div>

                  {/* Dettagli Fascia / Orario Ingranditi */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 border rounded-xl flex items-center gap-1.5 ${getShiftBadgeStyle(shift.ora_inizio)}`}>
                      <Clock className="w-4 h-4" />
                      {booking.ora_inizio}–{booking.ora_fine}
                    </span>
                    <span className="text-xs sm:text-sm font-bold px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-300">
                      Ruolo: <strong className={`uppercase ${booking.ruolo_turno === 'CE' ? 'text-emerald-400' : 'text-amber-400'}`}>{booking.ruolo_turno === 'autista' ? 'Autista' : booking.ruolo_turno}</strong>
                    </span>
                  </div>

                  {/* Nota orario parziale se presente */}
                  {booking.is_partial && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-bold mt-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      <span>Orario parziale</span>
                    </div>
                  )}
                </div>

                {/* Pulsante Cancella */}
                <button
                  onClick={(e) => {
                    e.stopPropagation() // Evita il jump click
                    setConfirmDelete(booking)
                  }}
                  disabled={isCanceling}
                  className="p-3.5 bg-slate-950 border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-2xl transition-all duration-200 flex-shrink-0 z-10"
                  title="Elimina prenotazione"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog di conferma cancellazione */}
      {confirmDelete && (
        <div 
          onClick={() => setConfirmDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-xs flex flex-col gap-4 shadow-premium relative"
          >
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h3 className="text-base font-bold text-slate-100">Rilascia Turno</h3>
              <button 
                onClick={() => setConfirmDelete(null)}
                className="text-slate-400 hover:text-slate-200 p-1 bg-slate-800 hover:bg-slate-750 rounded-full border border-slate-700 transition-colors flex items-center justify-center"
                aria-label="Chiudi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed text-left">
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
