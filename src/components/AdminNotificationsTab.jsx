import React from 'react'
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in text-left font-sans">
      
      {/* Notifications Table (Left/Center Wide) */}
      <div className="xl:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-4">
        <div className="pb-2 border-b border-slate-200 font-sans">
          <h3 className="text-lg font-bold text-slate-800 font-sans">Audit Log Completo delle Notifiche</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">Registro storico degli accessi, prenotazioni, disdette e timbrature</p>
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
              {notifications.map(notif => {
                const style = getNotificationBadgeStyle(notif.tipo)
                return (
                  <tr key={notif.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center p-1.5 rounded-lg ${style.bg} ${style.color} border ${style.border}`} title={notif.tipo}>
                        {style.icon}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-bold leading-normal max-w-sm">
                      {notif.messaggio}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono">
                      {notif.creato_da}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-455 font-mono">
                      {formatItalianDateTime(notif.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {notifications.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-bold">
              Nessuna notifica presente a sistema.
            </div>
          )}
        </div>
      </div>

      {/* Legend & Info (Right side) */}
      <div className="flex flex-col gap-6 font-sans">

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
