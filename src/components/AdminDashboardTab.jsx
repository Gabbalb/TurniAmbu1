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

  // Statistiche Dashboard
  const activeUsersCount = profiles.length
  const employeeCount = profiles.filter(p => p.stato === 'dipendente' || p.ruolo === 'dipendente').length
  const volunteerCount = profiles.filter(p => p.stato === 'volontario' || p.ruolo === 'volontario').length

  const totalUnpaidHours = employees.reduce((sum, emp) => sum + (emp.unpaidHours || 0), 0)

  // Copertura dei turni di oggi
  const todayRequiredSlots = todayShifts.length * 2
  const todayBookedSlots = todayBookings.length
  const todayCoveragePercentage = todayRequiredSlots > 0 
    ? Math.round((todayBookedSlots / todayRequiredSlots) * 100)
    : 0

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
      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Metric Card 1 */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-lg shadow-indigo-950/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Personale Attivo</span>
            <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">{activeUsersCount}</span>
            <span className="text-[10px] text-slate-400">Utenti totali</span>
          </div>
          <div className="flex gap-3 mt-3 text-[10px] text-slate-500 font-medium">
            <span>{employeeCount} Dipendenti</span>
            <span>•</span>
            <span>{volunteerCount} Volontari</span>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-cyan-500/30 transition-all shadow-lg shadow-indigo-950/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Copertura Turni Oggi</span>
            <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">{todayCoveragePercentage}%</span>
            <span className="text-[10px] text-slate-400">posizioni coperte</span>
          </div>
          <div className="flex gap-2.5 mt-3 text-[10px] text-slate-500 font-medium">
            <span className="text-cyan-400 font-bold">{todayBookedSlots} prenotazioni</span>
            <span>su {todayRequiredSlots} slot disponibili</span>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-lg shadow-indigo-950/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ore da Convalidare</span>
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-3xl font-extrabold text-slate-100">{totalUnpaidHours.toFixed(1)}h</span>
            <span className="text-xs font-bold text-amber-400">({decimalToHHMM(totalUnpaidHours)})</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-3 font-medium">
            Ore complessive registrate da convalidare
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg shadow-indigo-950/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Log ed Eventi</span>
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">{notifications.length}</span>
            <span className="text-[10px] text-slate-400">notifiche registrate</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-3 font-medium">
            Audit log storico delle azioni di sistema
          </div>
        </div>

      </div>

      {/* SECOND ROW: 2 COLUMN PANELS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Column 1 & 2: Today's Shifts coverage detail */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 font-sans">
            <div>
              <h3 className="text-lg font-bold text-slate-100 font-sans">Copertura Turni Odierna</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-sans">Dettaglio degli slot operativi e volontari assegnati per oggi</p>
            </div>
            <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-full font-bold text-slate-300">
              Oggi: {format(new Date(), 'dd MMMM yyyy', { locale: it })}
            </span>
          </div>

          {todayShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mb-3 border border-slate-700/40">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-400">Nessun turno programmato per oggi</span>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed mt-1">
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
                  <div key={shift.id} className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {crewObj?.nome || `Equipaggio ${shift.crew_id}`}
                      </span>
                      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
                        <span>Fascia: {shift.ora_inizio.slice(0, 5)} - {shift.ora_fine.slice(0, 5)}</span>
                      </div>
                    </div>

                    {/* Ruoli */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Slot Autista */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border font-semibold ${
                        autistaBooking 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/5 border-rose-500/15 text-rose-400 border-dashed animate-pulse-subtle'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${autistaBooking ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="font-bold uppercase text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Autista</span>
                        <span className="truncate max-w-[120px]">
                          {autistaBooking 
                            ? (autistaBooking.profiles?.nome ? `${autistaBooking.profiles.nome} ${autistaBooking.profiles.cognome.slice(0, 1)}.` : autistaBooking.profiles?.username) 
                            : 'Vuoto'}
                        </span>
                      </div>

                      {/* Slot Capo Equipaggio */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border font-semibold ${
                        ceBooking 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/5 border-rose-500/15 text-rose-400 border-dashed animate-pulse-subtle'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${ceBooking ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="font-bold uppercase text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">CE / Soccorritore</span>
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
          <form onSubmit={handleAddCrewToShift} className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row items-end gap-3 mt-2">
            <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Giorno del Turno</label>
              <input 
                type="date"
                value={crewDate}
                onChange={(e) => setCrewDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-all"
                required
              />
            </div>

            <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fascia Oraria</label>
              <select
                value={crewShiftId}
                onChange={(e) => setCrewShiftId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-all"
              >
                <option value="1">Mattina (06:00 - 14:00)</option>
                <option value="2">Pomeriggio (14:00 - 22:00)</option>
                <option value="3">Notte (22:00 - 06:00)</option>
              </select>
            </div>

            <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seleziona Equipaggio</label>
              <select
                value={crewSelectedId}
                onChange={(e) => setCrewSelectedId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-all"
                required
              >
                {crews.filter(c => c.id !== 1).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-102 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi</span>
            </button>
          </form>
        </div>

        {/* Column 3: Quick Telegram Broadcaster & Recent Audit Log */}
        <div className="flex flex-col gap-6">
          
          {/* Telegram Broadcaster */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 font-semibold font-sans">
              <h3 className="text-base font-bold text-slate-100">Broadcast Telegram</h3>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed text-left">
              Invia un annuncio flash a tutti i soccorritori. Il trigger del database pubblicherà immediatamente il messaggio nel gruppo Telegram integrato.
            </p>

            <form onSubmit={handleSendAnnouncement} className="flex flex-col gap-3 font-sans">
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Scrivi qui il tuo avviso ufficiale... (es: Cercasi urgente autista per stasera!)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl p-3 text-xs font-semibold text-slate-200 outline-none transition-all h-24 placeholder:text-slate-700 resize-none font-sans"
                required
              />

              {announcementSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl text-center text-[10px] font-bold">
                  ✓ Annuncio inviato e pubblicato con successo!
                </div>
              )}

              <button
                type="submit"
                disabled={announcementLoading || !announcementText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow cursor-pointer font-sans"
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
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-3 shadow-xl font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 font-semibold font-sans">
              <h3 className="text-base font-bold text-slate-100">Attività Recenti</h3>
              <button 
                onClick={() => setActiveTab('notifiche')}
                className="text-[10px] text-indigo-400 font-bold hover:underline cursor-pointer"
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
                      <p className="text-xs font-semibold text-slate-200 leading-normal line-clamp-2">
                        {notif.messaggio}
                      </p>
                      <span className="text-[9px] text-slate-500 font-medium mt-1">
                        {formatItalianDateTime(notif.created_at)}
                      </span>
                    </div>
                  </div>
                )
              })}
              
              {notifications.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-600">
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
        bg: 'bg-indigo-500/10',
        color: 'text-indigo-400',
        border: 'border-indigo-500/15',
        icon: <Users className="w-4 h-4" />
      }
    case 'prenotazione_effettuata':
      return {
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-400',
        border: 'border-emerald-500/15',
        icon: <Check className="w-4 h-4" />
      }
    case 'prenotazione_cancellata':
      return {
        bg: 'bg-rose-500/10',
        color: 'text-rose-400',
        border: 'border-rose-500/15',
        icon: <X className="w-4 h-4" />
      }
    case 'timbratura_inizio':
    case 'timbratura_fine':
      return {
        bg: 'bg-amber-500/10',
        color: 'text-amber-400',
        border: 'border-amber-500/15',
        icon: <Clock className="w-4 h-4" />
      }
    case 'annuncio':
      return {
        bg: 'bg-purple-500/10',
        color: 'text-purple-400',
        border: 'border-purple-500/15',
        icon: <PlusCircle className="w-4 h-4" />
      }
    case 'accesso_admin':
      return {
        bg: 'bg-indigo-500/15',
        color: 'text-indigo-300',
        border: 'border-indigo-500/25',
        icon: <ShieldAlert className="w-4 h-4" />
      }
    default:
      return {
        bg: 'bg-slate-800',
        color: 'text-slate-400',
        border: 'border-slate-700/50',
        icon: <AlertCircle className="w-4 h-4" />
      }
  }
}
