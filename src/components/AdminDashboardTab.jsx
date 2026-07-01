import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  PlusCircle,
  Plus,
  Check,
  X,
  ShieldAlert,
  Truck
} from 'lucide-react'

export default function AdminDashboardTab({
  profiles,
  todayShifts,
  todayBookings,
  crews,
  employees,
  notifications,
  activeTransports = [],
  onViewTransportDetails,
  onRefresh,
  formatItalianDateTime,
  decimalToHHMM,
  setActiveTab
}) {
  // Local state for Quick Action Crew addition
  const [crewDate, setCrewDate] = useState('')
  const [crewShiftId, setCrewShiftId] = useState('1')
  const [crewSelectedId, setCrewSelectedId] = useState('')

  useEffect(() => {
    setCrewDate(new Date().toISOString().split('T')[0])
    const reinforcementCrews = (crews || []).filter(c => c.id !== 1)
    if (reinforcementCrews.length > 0) {
      setCrewSelectedId(String(reinforcementCrews[0].id))
    }
  }, [crews])

  // Aggiungi Equipaggio ad un Turno
  const handleAddCrewToShift = async (e) => {
    e.preventDefault()
    if (!crewDate || !crewSelectedId) return

    const slots = {
      1: { start: '06:00:00', end: '14:00:00' },
      2: { start: '14:00:00', end: '22:00:00' },
      3: { start: '22:00:00', end: '06:00:00' }
    }

    const slot = slots[crewShiftId]
    try {
      const { error } = await api.adminAddCrewToShift(
        crewDate,
        slot.start,
        slot.end,
        Number(crewSelectedId)
      )

      if (error) {
        alert(error.message || "Errore nell'aggiunta dell'equipaggio.")
      } else {
        alert('Equipaggio aggiunto con successo a questa fascia oraria!')
        onRefresh()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      
      {/* BARRA DELLE OPERAZIONI RAPIDE */}
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
        <div className="text-left">
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Operazioni Rapide</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Azioni frequenti di gestione amministrativa</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
          <button
            onClick={() => setActiveTab('trasporti')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Programma trasporto</span>
          </button>
          <button
            onClick={() => setActiveTab('trasporti')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-55 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-2xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Truck className="w-4 h-4" />
            <span>Gestisci trasporti</span>
          </button>
          <button
            onClick={() => setActiveTab('ore')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 rounded-2xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Clock className="w-4 h-4" />
            <span>Convalida ore</span>
          </button>
        </div>
      </div>

      {/* GRIGLIA PRINCIPALE DELLA DASHBOARD */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Colonna Sinistra / Centrale (Griglia di blocchi dei trasporti) */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col gap-4 shadow-sm font-sans text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-650" />
                  Trasporti Attivi e Programmati
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Elenco dei viaggi attivi e programmati gestibili</p>
              </div>
              <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-bold text-slate-700">
                Totale: {activeTransports.length}
              </span>
            </div>

            {activeTransports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-650">Nessun trasporto attivo o programmato</span>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed mt-1 font-medium">
                  Non ci sono schede di trasporto attive o programmate in questo momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTransports.map(t => {
                  const ce = t.crew?.find(c => c.ruolo === 'CE')
                  const as = t.crew?.find(c => c.ruolo === 'AS')
                  const ceUser = profiles.find(u => u.id === ce?.user_id)
                  const asUser = profiles.find(u => u.id === as?.user_id)

                  const dateFormatted = t.data 
                    ? format(new Date(t.data), 'dd MMM yyyy', { locale: it })
                    : 'N/D'

                  const isAttivo = t.stato === 'attivo'

                  return (
                    <div 
                      key={t.id} 
                      onClick={() => onViewTransportDetails(t.id)}
                      className={`relative overflow-hidden bg-slate-55 border p-5 rounded-2xl flex flex-col justify-between gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group duration-200 text-left ${
                        isAttivo 
                          ? 'border-emerald-250 bg-emerald-500/[0.01] hover:border-emerald-400' 
                          : 'border-slate-200 hover:border-indigo-305'
                      }`}
                    >
                      {/* Active status pulsing bar on top */}
                      {isAttivo && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-pulse" />
                      )}

                      <div className="flex flex-col gap-2">
                        {/* Status & ID Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-indigo-650 font-mono">Scheda #{t.id}</span>
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                            isAttivo 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : 'bg-indigo-50 border-indigo-150 text-indigo-600'
                          }`}>
                            {t.stato}
                          </span>
                        </div>

                        {/* Date & Time Row */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-extrabold font-sans">
                          <Calendar className="w-3.5 h-3.5 text-slate-505" />
                          <span>{dateFormatted}</span>
                          <span className="text-slate-300">•</span>
                          <Clock className="w-3.5 h-3.5 text-slate-505 ml-0.5" />
                          <span>{t.ora_servizio ? t.ora_servizio.slice(0, 5) : 'N/D'}</span>
                        </div>

                        {/* Patient Name */}
                        <div className="text-xs bg-white/70 border border-slate-100 p-2.5 rounded-xl flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Paziente</span>
                          <span className="font-extrabold text-slate-800 truncate">
                            {t.paziente_cognome_nome || 'Non specificato'}
                          </span>
                        </div>

                        {/* Route: Da / A */}
                        <div className="text-xs space-y-1.5 mt-1">
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] font-bold text-emerald-650 bg-emerald-50 px-1 py-0.5 rounded uppercase mt-0.5">DA</span>
                            <span className="font-bold text-slate-705 leading-normal truncate" title={t.da_nome || t.da_via}>
                              {t.da_nome || t.da_via || 'N/D'} {t.da_reparto ? `[${t.da_reparto}]` : ''}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] font-bold text-rose-650 bg-rose-50 px-1 py-0.5 rounded uppercase mt-0.5">A</span>
                            <span className="font-bold text-slate-705 leading-normal truncate" title={t.a_nome || t.a_via}>
                              {t.a_nome || t.a_via || 'N/D'} {t.a_reparto ? `[${t.a_reparto}]` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Crew Row */}
                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-655">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded font-mono">CE</span>
                          <span className="text-slate-755 truncate max-w-[90px]">
                            {ceUser ? `${ceUser.nome} ${ceUser.cognome.slice(0, 1)}.` : 'Da assegnare'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded font-mono">AS</span>
                          <span className="text-slate-755 truncate max-w-[90px]">
                            {asUser ? `${asUser.nome} ${asUser.cognome.slice(0, 1)}.` : 'Da assegnare'}
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

        {/* Colonna Destra (Turni compatti + Attività Recenti) */}
        <div className="flex flex-col gap-6">
          
          {/* Blocchetto Turni di Oggi (Super compatta con nomi completi) */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col gap-3 shadow-sm font-sans text-left">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 font-sans">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Turni di Oggi</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Copertura odierna degli slot</p>
              </div>
              <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-700">
                Oggi
              </span>
            </div>

            {todayShifts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-bold">
                Nessun turno oggi
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {todayShifts.map(shift => {
                  const crewObj = crews.find(c => c.id === shift.crew_id)
                  const bookingsForShift = todayBookings.filter(b => b.shift_id === shift.id)
                  
                  const autistaBooking = bookingsForShift.find(b => b.ruolo_turno === 'autista')
                  const ceBooking = bookingsForShift.find(b => b.ruolo_turno === 'CE')

                  const getFullName = (booking) => {
                    if (!booking?.profiles) return 'Vuoto'
                    const p = booking.profiles
                    return p.nome && p.cognome ? `${p.nome} ${p.cognome}` : p.username
                  }

                  return (
                    <div key={shift.id} className="bg-slate-55 border border-slate-200/60 p-3 rounded-xl flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-indigo-650 uppercase tracking-wider">
                          {crewObj?.nome || `Equipaggio ${shift.crew_id}`}
                        </span>
                        <span className="text-slate-800">
                          {shift.ora_inizio.slice(0, 5)} - {shift.ora_fine.slice(0, 5)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs">
                        {/* Autista */}
                        <div className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-100 rounded-lg">
                          <span className="text-[9px] font-extrabold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">AUTISTA</span>
                          <span className={`font-semibold truncate max-w-[150px] ${autistaBooking ? 'text-slate-800' : 'text-rose-505 font-bold italic text-[10px]'}`}>
                            {autistaBooking ? getFullName(autistaBooking) : 'Da coprire'}
                          </span>
                        </div>

                        {/* CE */}
                        <div className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-100 rounded-lg">
                          <span className="text-[9px] font-extrabold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">CE</span>
                          <span className={`font-semibold truncate max-w-[150px] ${ceBooking ? 'text-slate-800' : 'text-rose-505 font-bold italic text-[10px]'}`}>
                            {ceBooking ? getFullName(ceBooking) : 'Da coprire'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quick Action: Aggiungi Turno Straordinario */}
            <details className="mt-1 border border-slate-200 rounded-2xl bg-slate-55 overflow-hidden group">
              <summary className="text-[10px] font-bold text-slate-650 px-3.5 py-2.5 cursor-pointer list-none flex items-center justify-between hover:bg-slate-100/60 select-none">
                <span>Aggiungi turno straordinario</span>
                <span className="text-[8px] transition-transform duration-200 group-open:rotate-180">▼</span>
              </summary>
              <div className="p-3.5 border-t border-slate-200/50 flex flex-col gap-3 bg-white">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Giorno</label>
                  <input 
                    type="date"
                    value={crewDate}
                    onChange={(e) => setCrewDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fascia</label>
                  <select
                    value={crewShiftId}
                    onChange={(e) => setCrewShiftId(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                  >
                    <option value="1">Mattina (06:00 - 14:00)</option>
                    <option value="2">Pomeriggio (14:00 - 22:00)</option>
                    <option value="3">Notte (22:00 - 06:00)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Equipaggio</label>
                  <select
                    value={crewSelectedId}
                    onChange={(e) => setCrewSelectedId(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                    required
                  >
                    {crews.filter(c => c.id !== 1).map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddCrewToShift}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-[10px] py-2 rounded-lg shadow-sm transition-all hover:scale-102 flex items-center justify-center gap-1 cursor-pointer font-sans"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi</span>
                </button>
              </div>
            </details>
          </div>

          {/* Mini-Audit Log (Attività Recenti) */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col gap-3 shadow-sm font-sans">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 font-semibold font-sans">
              <h3 className="text-sm font-extrabold text-slate-800">Attività Recenti</h3>
              <button 
                onClick={() => setActiveTab('notifiche')}
                className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Vedi tutti
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {notifications.slice(0, 4).map(notif => {
                const style = getNotificationBadgeStyle(notif.tipo)
                const isAdminAccess = notif.tipo === 'accesso_admin'
                return (
                  <div key={notif.id} className={`flex gap-3 text-left p-1.5 rounded-2xl transition-all ${isAdminAccess ? 'bg-rose-50/30 border border-rose-500/10' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${style.bg} ${style.color} border ${style.border}`}>
                      {style.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className={`text-xs font-semibold leading-normal line-clamp-2 ${isAdminAccess ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                        {notif.messaggio}
                      </p>
                      <span className={`text-[9px] font-medium mt-1 ${isAdminAccess ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        {formatItalianDateTime(notif.created_at)}
                      </span>
                    </div>
                  </div>
                )
              })}
              
              {notifications.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                  Nessuna notifica registrata nel sistema
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

function getNotificationBadgeStyle(tipo) {
  switch (tipo) {
    case 'registrazione':
    case 'profilo_modificato':
      return {
        bg: 'bg-indigo-50',
        color: 'text-indigo-650',
        border: 'border-indigo-150',
        icon: <Users className="w-4 h-4" />
      }
    case 'prenotazione_creata':
    case 'prenotazione_creata_bulk':
      return {
        bg: 'bg-emerald-50',
        color: 'text-emerald-700',
        border: 'border-emerald-150',
        icon: <Check className="w-4 h-4" />
      }
    case 'prenotazione_cancellata':
    case 'prenotazione_cancellata_bulk':
      return {
        bg: 'bg-rose-50',
        color: 'text-rose-650',
        border: 'border-rose-150',
        icon: <X className="w-4 h-4" />
      }
    case 'prenotazione_modificata':
    case 'prenotazione_modificata_bulk':
      return {
        bg: 'bg-blue-50',
        color: 'text-blue-700',
        border: 'border-blue-150',
        icon: <RefreshCw className="w-4 h-4" />
      }
    case 'timbratura_inizio':
    case 'timbratura_fine':
      return {
        bg: 'bg-amber-50',
        color: 'text-amber-700',
        border: 'border-amber-150',
        icon: <Clock className="w-4 h-4" />
      }
    case 'trasporto_creato':
      return {
        bg: 'bg-sky-50',
        color: 'text-sky-700',
        border: 'border-sky-150',
        icon: <Calendar className="w-4 h-4" />
      }
    case 'trasporto_attivato':
    case 'trasporto_trasferito':
      return {
        bg: 'bg-cyan-50',
        color: 'text-cyan-700',
        border: 'border-cyan-150',
        icon: <Truck className="w-4 h-4" />
      }
    case 'trasporto_stato_modificato':
      return {
        bg: 'bg-indigo-50',
        color: 'text-indigo-705',
        border: 'border-indigo-150',
        icon: <Truck className="w-4 h-4" />
      }
    case 'trasporto_concluso':
      return {
        bg: 'bg-emerald-50',
        color: 'text-emerald-700',
        border: 'border-emerald-150',
        icon: <Check className="w-4 h-4" />
      }
    case 'trasporto_eliminato':
      return {
        bg: 'bg-rose-50',
        color: 'text-rose-650',
        border: 'border-rose-150',
        icon: <X className="w-4 h-4" />
      }
    case 'annuncio':
      return {
        bg: 'bg-purple-50',
        color: 'text-purple-700',
        border: 'border-purple-150',
        icon: <PlusCircle className="w-4 h-4" />
      }
    case 'accesso_admin':
      return {
        bg: 'bg-rose-500/10 shadow-[0_0_12px_rgba(239,68,68,0.15)] animate-pulse',
        color: 'text-rose-600 font-extrabold',
        border: 'border-rose-500/30 border-2',
        icon: <ShieldAlert className="w-4 h-4 animate-bounce" />
      }
    default:
      return {
        bg: 'bg-slate-100',
        color: 'text-slate-600',
        border: 'border-slate-200',
        icon: <AlertCircle className="w-4 h-4" />
      }
  }
}
