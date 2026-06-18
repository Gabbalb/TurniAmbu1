import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Plus,
  Check,
  X,
  ShieldAlert
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
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementLoading, setAnnouncementLoading] = useState(false)
  const [announcementSuccess, setAnnouncementSuccess] = useState(false)

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



  // Invio Annuncio Telegram
  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementText.trim()) return

    setAnnouncementLoading(true)
    setAnnouncementSuccess(false)

    try {
      const { error } = await api.createAnnouncement(
        announcementText.trim(),
        'admin.system'
      )
      if (error) {
        alert("Errore nell'invio dell'annuncio: " + error.message)
      } else {
        setAnnouncementText('')
        setAnnouncementSuccess(true)
        setTimeout(() => setAnnouncementSuccess(false), 5000)
        onRefresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAnnouncementLoading(false)
    }
  }

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
      {/* SECOND ROW: 2 COLUMN PANELS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Column 1 & 2: Today's Shifts coverage detail and Active Transports */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          {/* Today's Shifts Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-sans">
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-sans">Copertura Turni Odierna</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-sans">Dettaglio degli slot operativi e volontari assegnati per oggi</p>
            </div>
            <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-bold text-slate-700">
              Oggi: {format(new Date(), 'dd MMMM yyyy', { locale: it })}
            </span>
          </div>

          {todayShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-650">Nessun turno programmato per oggi</span>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed mt-1 font-medium">
                Crea o aggiungi equipaggi per questa data per far registrare i volontari.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {todayShifts.map(shift => {
                const crewObj = crews.find(c => c.id === shift.crew_id)
                const bookingsForShift = todayBookings.filter(b => b.shift_id === shift.id)
                
                // Trova i ruoli occupati
                const autistaBooking = bookingsForShift.find(b => b.ruolo_turno === 'autista')
                const ceBooking = bookingsForShift.find(b => b.ruolo_turno === 'CE')

                return (
                  <div key={shift.id} className="bg-slate-55 border border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        {crewObj?.nome || `Equipaggio ${shift.crew_id}`}
                      </span>
                      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                        <span>Fascia: {shift.ora_inizio.slice(0, 5)} - {shift.ora_fine.slice(0, 5)}</span>
                      </div>
                    </div>

                    {/* Ruoli */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Slot Autista */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border font-semibold ${
                        autistaBooking 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : 'bg-rose-50 border-rose-200/80 text-rose-600 border-dashed animate-pulse-subtle'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${autistaBooking ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="font-bold uppercase text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Autista</span>
                        <span className="truncate max-w-[120px]">
                          {autistaBooking 
                            ? (autistaBooking.profiles?.nome ? `${autistaBooking.profiles.nome} ${autistaBooking.profiles.cognome.slice(0, 1)}.` : autistaBooking.profiles?.username) 
                            : 'Vuoto'}
                        </span>
                      </div>

                      {/* Slot Capo Equipaggio */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border font-semibold ${
                        ceBooking 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : 'bg-rose-50 border-rose-200/80 text-rose-600 border-dashed animate-pulse-subtle'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${ceBooking ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="font-bold uppercase text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">CE / Soccorritore</span>
                        <span className="truncate max-w-[120px]">
                          {ceBooking 
                            ? (ceBooking.profiles?.nome ? `${ceBooking.profiles.nome} ${ceBooking.profiles.cognome.slice(0, 1)}.` : ceBooking.profiles?.username) 
                            : 'Vuoto'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Action: Aggiungi Equipaggio a Turno */}
          <form onSubmit={handleAddCrewToShift} className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row items-end gap-3 mt-2">
            <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Giorno del Turno</label>
              <input 
                type="date"
                value={crewDate}
                onChange={(e) => setCrewDate(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all"
                required
              />
            </div>

            <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest">Fascia Oraria</label>
              <select
                value={crewShiftId}
                onChange={(e) => setCrewShiftId(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all"
              >
                <option value="1">Mattina (06:00 - 14:00)</option>
                <option value="2">Pomeriggio (14:00 - 22:00)</option>
                <option value="3">Notte (22:00 - 06:00)</option>
              </select>
            </div>

            <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Seleziona Equipaggio</label>
              <select
                value={crewSelectedId}
                onChange={(e) => setCrewSelectedId(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-all"
                required
              >
                {crews.filter(c => c.id !== 1).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-102 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi</span>
            </button>
          </form>
          </div>

          {/* Active Transports Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col gap-4 shadow-sm font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-650" />
                  Trasporti Attivi in Corso
                  {activeTransports.length > 0 && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Monitoraggio in tempo reale dei trasporti attualmente in corso</p>
              </div>
              <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-bold text-slate-700">
                Attivi: {activeTransports.length}
              </span>
            </div>

            {activeTransports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-405 mb-3 border border-slate-200">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-650">Nessun trasporto attivo al momento</span>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed mt-1 font-medium">
                  Non ci sono schede di trasporto attive nel sistema in questo momento.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activeTransports.map(t => {
                  const ce = t.crew?.find(c => c.ruolo === 'CE')
                  const as = t.crew?.find(c => c.ruolo === 'AS')
                  
                  const ceUser = profiles.find(u => u.id === ce?.user_id)
                  const asUser = profiles.find(u => u.id === as?.user_id)
                  
                  const creator = profiles.find(u => u.id === t.creato_da)

                  return (
                    <div key={t.id} className="bg-slate-55 border border-slate-200/60 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex flex-col gap-2 min-w-0 text-left">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-xs font-bold text-indigo-650 font-mono">Scheda #{t.id}</span>
                          <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-2.5 py-0.5 rounded-full uppercase">
                            {t.tipo_trasporto || 'Trasporto'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Inizio: {t.ora_servizio ? t.ora_servizio.slice(0, 5) : 'N/D'}
                          </span>
                          {creator && (
                            <span className="text-[10px] text-slate-400 italic">
                              (di {creator.nome} {creator.cognome})
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 space-y-1 text-left leading-relaxed">
                          <p className="truncate">
                            <strong className="text-slate-500 font-semibold">Paziente:</strong> <span className="font-bold text-slate-800">{t.paziente_cognome_nome || 'N/D'}</span>
                          </p>
                          <p className="truncate">
                            <strong className="text-slate-500 font-semibold">Percorso:</strong> {t.da_nome || t.da_via || 'N/D'} {t.da_reparto ? `[${t.da_reparto}]` : ''} ➜ {t.a_nome || t.a_via || 'N/D'} {t.a_reparto ? `[${t.a_reparto}]` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
                        <div className="flex gap-2">
                          <div className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                            CE: {ceUser ? `${ceUser.nome} ${ceUser.cognome.slice(0, 1)}.` : 'Da assegnare'}
                          </div>
                          <div className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                            AS: {asUser ? `${asUser.nome} ${asUser.cognome.slice(0, 1)}.` : 'Da assegnare'}
                          </div>
                        </div>

                        <button
                          onClick={() => onViewTransportDetails(t.id)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-indigo-650 border border-slate-250 hover:border-indigo-150 rounded-xl text-xs font-bold transition-all cursor-pointer w-full text-center hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Visualizza Scheda
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Quick Telegram Broadcaster & Recent Audit Log */}
        <div className="flex flex-col gap-6">
          
          {/* Telegram Broadcaster */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-semibold font-sans">
              <h3 className="text-base font-bold text-slate-800">Broadcast Telegram</h3>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            </div>
            
            <p className="text-[11px] text-slate-550 leading-relaxed text-left">
              Invia un annuncio flash a tutti i soccorritori. Il trigger del database pubblicherà immediatamente il messaggio nel gruppo Telegram integrato.
            </p>

            <form onSubmit={handleSendAnnouncement} className="flex flex-col gap-3 font-sans">
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Scrivi qui il tuo avviso ufficiale... (es: Cercasi urgente autista per stasera!)"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none transition-all h-24 placeholder:text-slate-400 resize-none font-sans"
                required
              />

              {announcementSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-center text-[10px] font-bold">
                  ✓ Annuncio inviato e pubblicato con successo!
                </div>
              )}

              <button
                type="submit"
                disabled={announcementLoading || !announcementText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow cursor-pointer font-sans"
              >
                {announcementLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Invio in corso...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Invia a Telegram</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Mini-Audit Log (Last 4 logs) */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col gap-3 shadow-sm font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-semibold font-sans">
              <h3 className="text-base font-bold text-slate-800">Attività Recenti</h3>
              <button 
                onClick={() => setActiveTab('notifiche')}
                className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Vedi tutti
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {notifications.slice(0, 4).map(notif => {
                const style = getNotificationBadgeStyle(notif.tipo)
                return (
                  <div key={notif.id} className="flex gap-3 text-left">
                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${style.bg} ${style.color} border ${style.border}`}>
                      {style.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-normal line-clamp-2">
                        {notif.messaggio}
                      </p>
                      <span className="text-[9px] text-slate-400 font-medium mt-1">
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
    case 'prenotazione_effettuata':
      return {
        bg: 'bg-emerald-50',
        color: 'text-emerald-700',
        border: 'border-emerald-150',
        icon: <Check className="w-4 h-4" />
      }
    case 'prenotazione_cancellata':
      return {
        bg: 'bg-rose-50',
        color: 'text-rose-650',
        border: 'border-rose-150',
        icon: <X className="w-4 h-4" />
      }
    case 'timbratura_inizio':
    case 'timbratura_fine':
      return {
        bg: 'bg-amber-50',
        color: 'text-amber-700',
        border: 'border-amber-150',
        icon: <Clock className="w-4 h-4" />
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
        bg: 'bg-indigo-50',
        color: 'text-indigo-700',
        border: 'border-indigo-200',
        icon: <ShieldAlert className="w-4 h-4" />
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
