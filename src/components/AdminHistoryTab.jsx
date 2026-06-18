import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Search } from 'lucide-react'

export default function AdminHistoryTab({ pastBookings, formatItalianDateTime }) {
  const [filterUser, setFilterUser] = useState('')
  const [filterShift, setFilterShift] = useState('all')

  // Filtra storico prenotazioni
  const filteredPastBookings = pastBookings.filter(b => {
    const matchUser = `${b.profiles?.nome} ${b.profiles?.cognome} ${b.profiles?.username}`.toLowerCase().includes(filterUser.toLowerCase()) || !filterUser
    let matchShift = true
    if (filterShift !== 'all') {
      const shiftStart = b.shifts?.ora_inizio
      if (filterShift === '1') matchShift = shiftStart ? shiftStart.startsWith('06:') : false
      if (filterShift === '2') matchShift = shiftStart ? shiftStart.startsWith('14:') : false
      if (filterShift === '3') matchShift = shiftStart ? shiftStart.startsWith('22:') : false
    }
    return matchUser && matchShift
  })

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-6 animate-fade-in text-left">
      
      {/* Header with Search and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 font-sans">
        <div>
          <h3 className="text-lg font-bold text-slate-800 font-sans">Storico dei Turni Passati</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">Visualizza le presenze e i turni prenotati dai soccorritori nel passato</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Cerca utente */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtra per soccorritore..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-white border border-slate-200 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 font-sans"
            />
          </div>

          {/* Filtra fascia */}
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
          >
            <option value="all">Tutte le Fasce</option>
            <option value="1">Mattina (06:00 - 14:00)</option>
            <option value="2">Pomeriggio (14:00 - 22:00)</option>
            <option value="3">Notte (22:00 - 06:00)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Data Turno</th>
              <th className="py-3 px-4">Orario</th>
              <th className="py-3 px-4">Soccorritore</th>
              <th className="py-3 px-4">Ruolo Preso</th>
              <th className="py-3 px-4">Tipo Prenotazione</th>
              <th className="py-3 px-4 text-right">Data Prenotazione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
            {filteredPastBookings.map(b => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-slate-850">
                  {b.shifts?.data ? format(parseISO(b.shifts.data), 'dd EEEE MMM yyyy', { locale: it }) : 'Data N/D'}
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono">
                  {b.shifts ? `${b.shifts.ora_inizio.slice(0, 5)} - ${b.shifts.ora_fine.slice(0, 5)}` : 'N/D'}
                </td>
                <td className="py-3 px-4 text-slate-900 font-bold">
                  {b.profiles?.nome && b.profiles?.cognome ? `${b.profiles.nome} ${b.profiles.cognome}` : (b.profiles?.username || 'Username N/D')}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                    b.ruolo_turno === 'autista' 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  }`}>
                    {b.ruolo_turno}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {b.is_partial ? (
                    <span className="text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]" title={b.nota_parziale}>
                      Parziale (Nota: {b.nota_parziale || 'Nessuna'})
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      Turno Intero
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-slate-500">
                  {formatItalianDateTime(b.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPastBookings.length === 0 && (
          <div className="text-center py-16 text-slate-400 font-bold">
            Nessuna prenotazione passata registrata o corrisponde ai filtri selezionati.
          </div>
        )}
      </div>

    </div>
  )
}
