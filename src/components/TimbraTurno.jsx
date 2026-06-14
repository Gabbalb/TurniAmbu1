import React, { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Clock, Play, Square, Calendar, Timer, AlertCircle, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export default function TimbraTurno() {
  const { profile } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeShift, setActiveShift] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [elapsedString, setElapsedString] = useState('00:00:00')
  const [successInfo, setSuccessInfo] = useState(null) // { duration }

  // Interval references
  const clockIntervalRef = useRef(null)
  const timerIntervalRef = useRef(null)

  // Aggiorna l'orologio digitale corrente
  useEffect(() => {
    clockIntervalRef.current = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current)
    }
  }, [])

  // Carica il turno attivo all'avvio
  const checkActiveShift = async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: apiError } = await api.fetchActiveShift(profile.id)
      if (apiError) throw apiError
      setActiveShift(data)
    } catch (err) {
      console.error(err)
      setError('Impossibile caricare lo stato del turno.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkActiveShift()
  }, [profile?.id])

  // Gestisce il timer della durata del turno in corso
  useEffect(() => {
    if (activeShift && activeShift.start_time) {
      const startMs = new Date(activeShift.start_time).getTime()

      const updateTimer = () => {
        const nowMs = new Date().getTime()
        const diffMs = Math.max(0, nowMs - startMs)

        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

        const pad = (num) => String(num).padStart(2, '0')
        setElapsedString(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`)
      }

      updateTimer()
      timerIntervalRef.current = setInterval(updateTimer, 1000)
    } else {
      setElapsedString('00:00:00')
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [activeShift])

  const handleStartShift = async () => {
    if (!profile?.id) return
    setActionLoading(true)
    setError(null)
    setSuccessInfo(null)
    try {
      const { data, error: apiError } = await api.startShift(profile.id, profile.paga_oraria || 0)
      if (apiError) throw apiError
      setActiveShift(data)
    } catch (err) {
      console.error(err)
      setError('Errore durante l\'avvio del turno.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEndShift = async () => {
    if (!activeShift?.id) return
    setActionLoading(true)
    setError(null)
    setSuccessInfo(null)
    try {
      const duration = elapsedString
      const { error: apiError } = await api.endShift(activeShift.id)
      if (apiError) throw apiError
      setActiveShift(null)
      setSuccessInfo({ duration })
    } catch (err) {
      console.error(err)
      setError('Errore durante la chiusura del turno.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDateString = (date) => {
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs text-slate-400">Verifica turni attivi...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-6">
      {/* Intestazione */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Timbra Turno
        </h2>
        <p className="text-xs text-slate-400">Gestisci l'inizio e la fine della tua attività lavorativa</p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successInfo && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-3xl text-xs font-semibold flex flex-col gap-1.5 animate-fade-in text-left">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-bold text-slate-100">Turno terminato!</span>
          </div>
          <p className="text-slate-350 font-normal leading-relaxed">
            Hai completato un turno di <strong className="text-indigo-400 font-mono font-bold">{successInfo.duration}</strong>.
            Le ore sono state registrate e sono visibili nello storico.
          </p>
        </div>
      )}

      {/* Clock Display Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center gap-4 text-center">
        {/* Decorative subtle background glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase select-none">
          {formatDateString(currentTime)}
        </span>

        <h3 className="text-4xl sm:text-5xl font-black tracking-widest text-slate-100 font-mono drop-shadow-[0_2px_8px_rgba(99,102,241,0.2)]">
          {formatTime(currentTime)}
        </h3>

        {profile?.paga_oraria ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 border border-slate-700/40 rounded-full text-[10px] font-bold text-slate-300">
            Tariffa oraria: €{Number(profile.paga_oraria).toFixed(2)} / ora
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-400">
            Nessuna tariffa oraria impostata. Contatta l'admin.
          </span>
        )}
      </div>

      {/* Action panel */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl flex flex-col gap-6 shadow-lg backdrop-blur-md">
        {!activeShift ? (
          /* NO ACTIVE SHIFT: START SHIFT BUTTON */
          <div className="flex flex-col gap-4 text-center py-4">
            <p className="text-xs text-slate-400 leading-relaxed px-4">
              Clicca sul pulsante sottostante per avviare la registrazione delle ore del tuo turno.
            </p>
            <button
              onClick={handleStartShift}
              disabled={actionLoading}
              className="w-full py-4 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-base disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Avvio in corso...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Inizia Turno
                </>
              )}
            </button>
          </div>
        ) : (
          /* ACTIVE SHIFT: TIMER AND END SHIFT BUTTON */
          <div className="flex flex-col gap-5">
            {/* Live shift information */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Timer className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Turno in corso</span>
                  <span className="text-base font-black text-indigo-400 font-mono tracking-wider">{elapsedString}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-2xl flex flex-col gap-1">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Data Inizio
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    {format(parseISO(activeShift.start_time), 'dd MMM yyyy', { locale: it })}
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-2xl flex flex-col gap-1">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Ora Inizio
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    {format(parseISO(activeShift.start_time), 'HH:mm:ss')}
                  </span>
                </div>
              </div>
            </div>

            {/* Terminate shift button */}
            <button
              onClick={handleEndShift}
              disabled={actionLoading}
              className="w-full py-4 bg-gradient-to-tr from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-base disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Chiusura in corso...
                </>
              ) : (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  Termina Turno
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
