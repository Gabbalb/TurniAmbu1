import { useState, useEffect } from 'react'
import { Truck, RefreshCw, ChevronRight, Clock, User, MapPin } from 'lucide-react'
import { api } from '../lib/api'

export default function TransportTab({
  activeTransport,
  profile,
  activeShift,
  activeShiftLoading,
  setView,
  setIsTransportDrawerOpen,
  startLoading,
  onStartNewTransport,
  onViewOnlyOpen,
  refreshKey
}) {
  const [isConfirmingStart, setIsConfirmingStart] = useState(false)
  const [allActiveTransports, setAllActiveTransports] = useState([])
  const [allActiveLoading, setAllActiveLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [vehicles, setVehicles] = useState([])

  const [assignedScheduled, setAssignedScheduled] = useState([])
  const [isStartingProgrammed, setIsStartingProgrammed] = useState(false)

  const [shiftTransports, setShiftTransports] = useState([])

  const loadAssignedScheduled = async () => {
    if (!profile?.id) return
    try {
      const { data, error } = await api.fetchAssignedScheduledTransports(profile.id)
      if (!error && data) {
        const now = new Date()
        const filtered = data.filter(t => {
          if (!t.data) return false
          const schedTime = t.ora_servizio ? t.ora_servizio.slice(0, 5) : '00:00'
          const schedDate = new Date(`${t.data}T${schedTime}:00`)
          const diffHours = (schedDate - now) / (1000 * 60 * 60)
          return diffHours >= -2 && diffHours <= 24
        })
        setAssignedScheduled(filtered)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleConfirmStart = async () => {
    await onStartNewTransport()
    setIsConfirmingStart(false)
  }

  const handleStartProgrammedTransport = async () => {
    setIsStartingProgrammed(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const { data, error } = await api.createScheduledTransport(profile?.id || 'admin', null, {
        data: todayStr,
        tipo_trasporto: 'dimissione',
        da_tipo_luogo: 'ospedale',
        a_tipo_luogo: 'abitazione'
      })
      if (error) throw error
      
      const { data: detail, error: detError } = await api.fetchTransportDetail(data.id)
      if (detError) throw detError
      
      onViewOnlyOpen(detail)
    } catch (err) {
      console.error('Error starting programmed transport:', err)
      alert(err.message || 'Errore durante la creazione del viaggio programmato.')
    } finally {
      setIsStartingProgrammed(false)
    }
  }

  const loadAllActiveTransports = async () => {
    if (profile?.ruolo !== 'admin') return
    setAllActiveLoading(true)
    try {
      const { data, error } = await api.fetchAllActiveTransports()
      if (!error) {
        setAllActiveTransports(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAllActiveLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.ruolo === 'admin') {
      loadAllActiveTransports()
      
      // Load helper lists
      const loadHelpers = async () => {
        try {
          const { data: usrList } = await api.fetchProfiles()
          setUsers(usrList || [])
          const { data: vehList } = await api.fetchVehicles()
          setVehicles(vehList || [])
        } catch (err) {
          console.error(err)
        }
      }
      loadHelpers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.ruolo])

  useEffect(() => {
    if (profile?.ruolo === 'admin') {
      loadAllActiveTransports()
    }
  }, [refreshKey])

  useEffect(() => {
    if (profile?.id) {
      loadAssignedScheduled()
    }
  }, [profile?.id, refreshKey])

  const loadShiftTransports = async () => {
    if (!profile?.id || !activeShift?.start_time) {
      setShiftTransports([])
      return
    }
    try {
      const { data, error } = await api.fetchShiftTransports(profile.id, activeShift.start_time)
      if (!error && data) {
        setShiftTransports(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadShiftTransports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, activeShift?.start_time, refreshKey, activeTransport])

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-6 text-left">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-400" />
          Servizio Trasporti
        </h2>
        <p className="text-xs text-slate-400 font-sans">Gestisci i trasporti sanitari e assistenziali</p>
      </div>
      
      {!activeTransport ? (
        <div className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl flex flex-col items-center gap-6 shadow-lg text-center mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <Truck className="w-8 h-8" />
          </div>
          
          <div className="space-y-2 flex flex-col items-center">
            <h3 className="text-lg font-bold text-slate-100 font-sans">Nessun trasporto attivo</h3>
            {profile?.ruolo !== 'admin' && !activeShiftLoading && !activeShift ? (
              <p className="text-xs text-rose-455 font-medium leading-relaxed max-w-xs font-sans bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-2xl mt-2">
                ⚠️ Per avviare un trasporto devi prima timbrare l'inizio del turno (turno attivo).
              </p>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-sans">
                Non hai schede di trasporto attive al momento. Per iniziare a compilarne una nuova, premi il pulsante sottostante.
              </p>
            )}
          </div>
          
          {profile?.ruolo !== 'admin' && !activeShiftLoading && !activeShift ? (
            <button
              onClick={() => setView('clock-shift')}
              className="w-full py-4 bg-gradient-to-tr from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base font-sans"
            >
              VAI A TIMBRA TURNO
            </button>
          ) : (
            profile?.ruolo === 'admin' ? (
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => setIsConfirmingStart(true)}
                  className="w-full py-4 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base font-sans"
                >
                  INIZIA NUOVO TRASPORTO
                </button>
                <button
                  type="button"
                  onClick={handleStartProgrammedTransport}
                  disabled={isStartingProgrammed}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700/60 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/30 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-base font-sans disabled:opacity-50"
                >
                  {isStartingProgrammed ? 'Creazione in corso...' : 'NUOVO PROGRAMMATO'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingStart(true)}
                className="w-full py-4 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base font-sans"
              >
                INIZIA NUOVO TRASPORTO
              </button>
            )
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl flex flex-col gap-4 shadow-lg text-center mt-4 animate-fade-in">
          <div className="flex items-center justify-center w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl mx-auto">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 font-sans">Scheda di trasporto attiva</h3>
            {profile?.ruolo !== 'admin' && !activeShiftLoading && !activeShift ? (
              <p className="text-xs text-rose-400 font-medium leading-relaxed max-w-xs font-sans bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-2xl mt-2 mx-auto">
                ⚠️ Per visualizzare e completare la scheda devi prima timbrare l'inizio del turno (turno attivo).
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-sans">
                Hai un trasporto in corso (Scheda #{activeTransport.id}). Clicca qui sotto per riaprire e completare la compilazione.
              </p>
            )}
          </div>
          
          {profile?.ruolo !== 'admin' && !activeShiftLoading && !activeShift ? (
            <button
              onClick={() => setView('clock-shift')}
              className="w-full py-3.5 bg-gradient-to-tr from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
            >
              VAI A TIMBRA TURNO
            </button>
          ) : (
            <button
              onClick={() => setIsTransportDrawerOpen(true)}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
            >
              Apri Scheda
            </button>
          )}
        </div>
      )}

      {/* Altri trasporti eseguiti nel turno attivo */}
      {activeShift && (
        (() => {
          const otherTransports = shiftTransports.filter(t => t.id !== activeTransport?.id)
          if (otherTransports.length === 0) return null
          
          return (
            <div className="space-y-4 mt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Truck className="w-4 h-4 text-emerald-400" />
                Altri trasporti in questo turno ({otherTransports.length})
              </h3>
              <div className="space-y-3">
                {otherTransports.map(t => (
                  <div
                    key={t.id}
                    onClick={async () => {
                      try {
                        const { data: detail, error } = await api.fetchTransportDetail(t.id)
                        if (!error && detail) {
                          onViewOnlyOpen(detail)
                        } else {
                          onViewOnlyOpen(t)
                        }
                      } catch {
                        onViewOnlyOpen(t)
                      }
                    }}
                    className="bg-slate-900/60 border border-slate-800/85 hover:border-indigo-500/30 p-4 rounded-2xl flex flex-col gap-2.5 shadow hover:shadow-md cursor-pointer transition-all hover:bg-slate-900/80 active:scale-[0.98] group relative overflow-hidden text-left"
                  >
                    <div className="flex items-center justify-between pr-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-350 font-mono">Scheda #{t.id}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-sans ${
                          t.stato === 'terminato' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                        }`}>
                          {t.stato === 'terminato' ? 'Concluso' : t.stato}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium font-sans">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t.ora_servizio ? t.ora_servizio.slice(0, 5) : 'N/D'}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-355 space-y-1.5 font-sans pr-6">
                      <div className="flex items-start gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="font-semibold text-slate-200">
                          {t.paziente_cognome_nome || 'Nessun paziente indicato'}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <div className="text-slate-300">
                          <span className="font-medium">{t.da_nome || t.da_via || 'N/D'}</span>
                          <span className="text-slate-500 mx-1.5">➜</span>
                          <span className="font-medium">{t.a_nome || t.a_via || 'N/D'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()
      )}

      {/* Admin view for all active transports in the system */}
      {profile?.ruolo === 'admin' && (
        <div className="space-y-4 border-t border-slate-800/80 pt-6 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-indigo-400" />
              Tutti i trasporti attivi in corso
            </h3>
            <button 
              onClick={loadAllActiveTransports}
              disabled={allActiveLoading}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700/50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${allActiveLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {allActiveTransports.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl text-center text-xs text-slate-500 font-sans">
              Nessun trasporto attivo in corso nel sistema.
            </div>
          ) : (
            <div className="space-y-3.5">
              {allActiveTransports.map(t => {
                const ce = t.crew?.find(c => c.ruolo === 'CE')
                const as = t.crew?.find(c => c.ruolo === 'AS')
                
                const ceUser = users.find(u => u.id === ce?.user_id)
                const asUser = users.find(u => u.id === as?.user_id)
                
                const veh = vehicles.find(v => v.id === t.vehicle_id)
                const creator = users.find(u => u.id === t.creato_da)

                return (
                  <div key={t.id} className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col gap-3 shadow relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 font-sans">Scheda #{t.id}</span>
                        <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full uppercase font-sans">
                          {t.tipo_trasporto}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans font-medium">
                        Inizio: {t.ora_servizio || 'N/D'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1 text-left font-sans">
                      <p>
                        <strong className="text-slate-350">Da:</strong> {t.da_nome || 'N/D'} {t.da_reparto ? `(Rep: ${t.da_reparto})` : ''}
                      </p>
                      <p>
                        <strong className="text-slate-355">A:</strong> {t.a_nome || 'N/D'} {t.a_reparto ? `(Rep: ${t.a_reparto})` : ''}
                      </p>
                      <p>
                        <strong className="text-slate-355">Mezzo:</strong> {veh ? `${veh.nome} (${veh.targa})` : 'Da assegnare'}
                      </p>
                      <p>
                        <strong className="text-slate-355">Equipaggio:</strong> ATS: {ceUser ? `${ceUser.nome} ${ceUser.cognome}` : 'Da assegnare'} | AS: {asUser ? `${asUser.nome} ${asUser.cognome}` : 'Da assegnare'}
                      </p>
                      <p>
                        <strong className="text-slate-355">Avviato da:</strong> {creator ? `${creator.nome} ${creator.cognome}` : 'Sconosciuto'}
                      </p>
                    </div>

                    <button
                      onClick={() => onViewOnlyOpen(t)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
                    >
                      Visualizza Scheda
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {isConfirmingStart && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in text-center">
          <div className="bg-slate-900/90 border border-slate-800/80 p-6 rounded-3xl w-full max-w-sm space-y-5 shadow-2xl relative overflow-hidden animate-slide-up">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <Truck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-100 font-sans">Nuovo Trasporto</h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-sans">
                  Confermi di voler attivare una nuova scheda di trasporto?
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setIsConfirmingStart(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={startLoading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 font-sans flex items-center justify-center gap-1.5"
              >
                {startLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Creazione...
                  </>
                ) : (
                  'Sì, Attiva'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE: VIAGGI PROGRAMMATI ASSEGNATI */}
      {assignedScheduled.length > 0 && (
        <div className="space-y-4 border-t border-slate-800/80 pt-6 mt-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Truck className="w-4 h-4 text-indigo-400" />
            I tuoi viaggi programmati ({assignedScheduled.length})
          </h3>
          <div className="space-y-3.5">
            {assignedScheduled.map(t => (
              <div key={t.id} className="bg-indigo-950/20 border border-indigo-500/25 p-4 rounded-2xl flex flex-col gap-3 shadow relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-300 font-mono">Scheda #{t.id}</span>
                    <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full uppercase font-sans">
                      {t.tipo_trasporto}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">
                    Ora: {t.ora_servizio ? t.ora_servizio.slice(0, 5) : 'N/D'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-350 space-y-1 text-left font-sans">
                  <p>
                    <strong className="text-slate-450">Paziente:</strong> {t.paziente_cognome_nome || 'N/D'}
                  </p>
                  <p>
                    <strong className="text-slate-450">Percorso:</strong> {t.da_nome || t.da_via || 'N/D'} ➜ {t.a_nome || t.a_via || 'N/D'}
                  </p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const { data: detail, error } = await api.fetchTransportDetail(t.id)
                      if (!error && detail) {
                        onViewOnlyOpen(detail)
                      } else {
                        onViewOnlyOpen(t)
                      }
                    } catch {
                      onViewOnlyOpen(t)
                    }
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-sans text-center"
                >
                  Visualizza Scheda per Attivare
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  )
}
