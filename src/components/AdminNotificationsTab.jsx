import React, { useState } from 'react'
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
  ShieldAlert
} from 'lucide-react'

export default function AdminNotificationsTab({
  notifications,
  formatItalianDateTime,
  onRefresh
}) {
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementLoading, setAnnouncementLoading] = useState(false)
  const [announcementSuccess, setAnnouncementSuccess] = useState(false)

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
      <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4">
        <div className="pb-2 border-b border-slate-800/60 font-sans">
          <h3 className="text-lg font-bold text-slate-100 font-sans">Audit Log Completo delle Notifiche</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">Registro storico degli accessi, prenotazioni, disdette e timbrature</p>
        </div>

        <div className="overflow-x-auto max-h-[560px] pr-1">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-4 w-12 text-center">Tipo</th>
                <th className="py-2.5 px-4">Messaggio dell'Evento</th>
                <th className="py-2.5 px-4">Operatore</th>
                <th className="py-2.5 px-4 text-right">Data/Ora Notifica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
              {notifications.map(notif => {
                const style = getNotificationBadgeStyle(notif.tipo)
                return (
                  <tr key={notif.id} className="hover:bg-slate-800/25 transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center p-1.5 rounded-lg ${style.bg} ${style.color} border ${style.border}`} title={notif.tipo}>
                        {style.icon}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-bold leading-normal max-w-sm">
                      {notif.messaggio}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {notif.creato_da}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                      {formatItalianDateTime(notif.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {notifications.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-bold">
              Nessuna notifica presente a sistema.
            </div>
          )}
        </div>
      </div>

      {/* Announcements Panel (Right side) */}
      <div className="flex flex-col gap-6 font-sans">
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 font-sans">
          <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-800 font-sans">
            Console Telegram Integrata
          </h3>

          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-subtle">
            <PlusCircle className="w-5 h-5" />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Questo strumento comunica direttamente col bot Telegram integrato del gruppo soccorritori. Digitando un annuncio, questo verrà inserito come notifica di sistema e inoltrato istantaneamente su Telegram tramite HTTP POST (pg_net) programmato a livello di database.
          </p>

          <form onSubmit={handleSendAnnouncement} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5 font-sans">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Messaggio dell'Avviso *</label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Digita qui il testo dell'annuncio ufficiale..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl p-3.5 text-xs font-semibold text-slate-200 outline-none transition-all h-32 placeholder:text-slate-700 resize-none font-sans"
                required
              />
            </div>

            {announcementSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2.5 rounded-xl text-center text-xs font-bold font-sans">
                ✓ Annuncio inviato a Telegram con successo!
              </div>
            )}

            <button
              type="submit"
              disabled={announcementLoading || !announcementText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer font-sans"
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

        {/* Legend of Notification Types */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-3 font-sans">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-800 font-sans">Tipi di Notifica Audit</h4>
          
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/15 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/15">
                <Users className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-300">registrazione / profilo_modificato</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/15 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/15">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-300">prenotazione_effettuata</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-rose-500/15 text-rose-400 p-1.5 rounded-lg border border-rose-500/15">
                <X className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-300">prenotazione_cancellata</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-amber-500/15 text-amber-400 p-1.5 rounded-lg border border-amber-500/15">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-300">timbratura_inizio / timbratura_fine</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-purple-500/15 text-purple-400 p-1.5 rounded-lg border border-purple-500/15">
                <PlusCircle className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-slate-300">annuncio (Telegram / Avviso)</span>
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
