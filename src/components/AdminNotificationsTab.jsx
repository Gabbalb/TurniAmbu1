import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Check,
  X,
  ShieldAlert,
  Search,
  Truck
} from 'lucide-react'

export default function AdminNotificationsTab({
  notifications,
  formatItalianDateTime,
  onRefresh
}) {
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementLoading, setAnnouncementLoading] = useState(false)
  const [announcementSuccess, setAnnouncementSuccess] = useState(false)

  // Telegram Settings State
  const [telegramSettings, setTelegramSettings] = useState([])
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await api.fetchTelegramSettings()
        if (!error && data) {
          setTelegramSettings(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleToggleTelegramSetting = async (tipo, currentStatus) => {
    setTelegramSettings(prev => 
      prev.map(s => s.tipo === tipo ? { ...s, attivo: !currentStatus } : s)
    )
    try {
      const { error } = await api.updateTelegramSetting(tipo, !currentStatus)
      if (error) {
        setTelegramSettings(prev => 
          prev.map(s => s.tipo === tipo ? { ...s, attivo: currentStatus } : s)
        )
        alert("Errore nell'aggiornamento dell'impostazione: " + error.message)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getEventLabel = (tipo) => {
    switch (tipo) {
      case 'timbratura_inizio': return 'Inizio Turno (Timbratura)';
      case 'timbratura_fine': return 'Fine Turno (Timbratura)';
      case 'trasporto_creato': return 'Creazione Trasporto';
      case 'trasporto_attivato': return 'Avvio Trasporto';
      case 'trasporto_concluso': return 'Conclusione Trasporto';
      case 'trasporto_eliminato': return 'Cancellazione Trasporto';
      case 'trasporto_trasferito': return 'Passaggio Consegna Trasporto';
      case 'registrazione': return 'Registrazione Nuovo Utente';
      case 'prenotazione_creata': return 'Prenotazione Turno (Singola)';
      case 'prenotazione_creata_bulk': return 'Prenotazioni Turno (Multiple)';
      case 'prenotazione_cancellata': return 'Cancellazione Turno (Singola)';
      case 'prenotazione_cancellata_bulk': return 'Cancellazioni Turno (Multiple)';
      case 'prenotazione_modificata': return 'Modifica Prenotazione';
      case 'profilo_modificato': return 'Modifica Profilo Utente';
      case 'accesso_admin': return 'Accesso Amministratore';
      default: return tipo;
    }
  }

  // Filters State
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = notif.messaggio?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          notif.creato_da?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    if (filterType === 'all') return true
    if (filterType === 'timbrature') {
      return notif.tipo === 'timbratura_inizio' || notif.tipo === 'timbratura_fine'
    }
    if (filterType === 'prenotazioni') {
      return notif.tipo?.startsWith('prenotazione_')
    }
    if (filterType === 'trasporti') {
      return notif.tipo?.startsWith('trasporto_')
    }
    if (filterType === 'admin') {
      return notif.tipo === 'accesso_admin'
    }
    if (filterType === 'utenti') {
      return notif.tipo === 'registrazione' || notif.tipo === 'profilo_modificato'
    }
    return true
  })

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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in text-left font-sans">
      
      {/* Notifications Table (Left/Center Wide) */}
      <div className="xl:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-4">
        <div className="pb-2 border-b border-slate-200 font-sans flex flex-col gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-sans">Audit Log Completo delle Notifiche</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">Registro storico degli accessi, prenotazioni, disdette e timbrature</p>
          </div>
          
          {/* Sezione Filtri di ricerca */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-t border-slate-100 pt-3 mt-1">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cerca nei log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap gap-1 w-full md:w-auto">
              {[
                { id: 'all', label: 'Tutte' },
                { id: 'timbrature', label: 'Timbrature' },
                { id: 'prenotazioni', label: 'Prenotazioni' },
                { id: 'trasporti', label: 'Trasporti' },
                { id: 'admin', label: 'Accessi Admin' },
                { id: 'utenti', label: 'Utenti' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    filterType === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[560px] pr-1">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-4 w-12 text-center">Tipo</th>
                <th className="py-2.5 px-4">Messaggio dell'Evento</th>
                <th className="py-2.5 px-4">Operatore</th>
                <th className="py-2.5 px-4 text-right">Data/Ora Notifica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
              {filteredNotifications.map(notif => {
                const style = getNotificationBadgeStyle(notif.tipo)
                const isAdminAccess = notif.tipo === 'accesso_admin'
                return (
                  <tr key={notif.id} className={`hover:bg-slate-50 transition-colors ${isAdminAccess ? 'bg-rose-50/20 hover:bg-rose-50/30' : ''}`}>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center p-1.5 rounded-lg ${style.bg} ${style.color} border ${style.border}`} title={notif.tipo}>
                        {style.icon}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 font-bold leading-normal max-w-sm ${isAdminAccess ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                      {notif.messaggio}
                    </td>
                    <td className={`py-3.5 px-5 font-mono ${isAdminAccess ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                      {notif.creato_da}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono ${isAdminAccess ? 'text-rose-500 font-bold' : 'text-slate-455'}`}>
                      {formatItalianDateTime(notif.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredNotifications.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-bold">
              Nessuna notifica corrisponde ai filtri selezionati.
            </div>
          )}
        </div>
      </div>

      {/* Announcements Panel (Right side) */}
      <div className="flex flex-col gap-6 font-sans">
        
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-4 font-sans">
          <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200 font-sans">
            Console Telegram Integrata
          </h3>

          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm animate-pulse-subtle">
            <PlusCircle className="w-5 h-5" />
          </div>

          <p className="text-xs text-slate-550 leading-relaxed font-medium">
            Questo strumento comunica direttamente col bot Telegram integrato del gruppo soccorritori. Digitando un annuncio, questo verrà inserito come notifica di sistema e inoltrato istantaneamente su Telegram tramite HTTP POST (pg_net) programmato a livello di database.
          </p>

          <form onSubmit={handleSendAnnouncement} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5 font-sans">
              <label className="text-[10px] text-slate-550 font-bold uppercase tracking-widest">Messaggio dell'Avviso *</label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Digita qui il testo dell'annuncio ufficiale..."
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-3.5 text-xs font-semibold text-slate-800 outline-none transition-all h-32 placeholder:text-slate-400 resize-none font-sans"
                required
              />
            </div>

            {announcementSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2.5 rounded-xl text-center text-xs font-bold font-sans">
                ✓ Annuncio inviato a Telegram con successo!
              </div>
            )}

            <button
              type="submit"
              disabled={announcementLoading || !announcementText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              {announcementLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Pubblicazione...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Pubblica Annuncio</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Gestione Notifiche Telegram */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-4 font-sans">
          <div className="pb-2 border-b border-slate-200 font-semibold font-sans">
            <h3 className="text-base font-bold text-slate-800">Filtri Notifiche Telegram</h3>
            <p className="text-[10px] text-slate-550 mt-0.5 font-sans">Attiva/disattiva quali eventi inoltrare sul canale Telegram</p>
          </div>

          {settingsLoading ? (
            <div className="text-center py-6 text-xs text-slate-400 font-bold">
              Caricamento impostazioni...
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
              {telegramSettings.map(setting => (
                <div key={setting.tipo} className="flex items-center justify-between gap-4 text-xs font-semibold py-1 border-b border-slate-50">
                  <span className="text-slate-700 font-bold truncate max-w-[200px]" title={setting.tipo}>
                    {getEventLabel(setting.tipo)}
                  </span>
                  
                  <button
                    onClick={() => handleToggleTelegramSetting(setting.tipo, setting.attivo)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-all flex items-center cursor-pointer ${
                      setting.attivo ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend of Notification Types */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-3 font-sans">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-200 font-sans">Tipi di Notifica Audit</h4>
          
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg border border-indigo-100">
                <Users className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-700">registrazione / profilo_modificato</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg border border-emerald-100">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-700">prenotazione_effettuata</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-rose-50 text-rose-600 p-1.5 rounded-lg border border-rose-100">
                <X className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-700">prenotazione_cancellata</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-amber-50 text-amber-700 p-1.5 rounded-lg border border-amber-100">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-700">timbratura_inizio / timbratura_fine</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-purple-50 text-purple-700 p-1.5 rounded-lg border border-purple-100">
                <PlusCircle className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-700">annuncio (Telegram / Avviso)</span>
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
