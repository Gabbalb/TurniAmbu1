import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { History, Calendar, Clock, CircleDollarSign, CheckCircle, AlertCircle, Loader2, Landmark } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export default function StoricoOre() {
  const { profile, refreshProfile } = useAuth()
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          Storico Ore
        </h2>
        <p className="text-xs text-slate-400">Riepilogo e storico dei turni di lavoro effettuati</p>
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

                    {/* Badge Stato */}
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
    </div>
  )
}
