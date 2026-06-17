import React, { useState } from 'react'
import { api } from '../lib/api'
import { Plus, Trash2 } from 'lucide-react'

export default function AdminCrewsTab({ crews, onRefresh }) {
  const [newCrewName, setNewCrewName] = useState('')

  // Creazione Equipaggio
  const handleCreateCrew = async (e) => {
    e.preventDefault()
    if (!newCrewName.trim()) return

    try {
      const { error } = await api.createCrew(newCrewName.trim())
      if (error) {
        alert(error.message || "Errore nella creazione dell'equipaggio.")
      } else {
        setNewCrewName('')
        alert('Equipaggio creato con successo!')
        onRefresh()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Eliminazione Equipaggio
  const handleDeleteCrew = async (crewId) => {
    if (!window.confirm('Vuoi davvero eliminare questo equipaggio? Verranno rimossi anche i turni ad esso collegati.')) return

    try {
      const { error } = await api.deleteCrew(crewId)
      if (error) {
        alert(error.message || "Errore nell'eliminazione dell'equipaggio.")
      } else {
        alert('Equipaggio eliminato con successo!')
        onRefresh()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
      
      {/* List of Crews */}
      <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 text-left">
        <h3 className="text-lg font-bold text-slate-100 pb-2 border-b border-slate-800/60 font-sans">Equipaggi Attivi</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {crews.map(c => (
            <div key={c.id} className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-md group font-sans">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold">
                  {c.id}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-200">{c.nome}</span>
                  <span className="text-[10px] text-slate-500">Stato: Attivo per il tabellone</span>
                </div>
              </div>

              {c.id !== 1 && (
                <button
                  onClick={() => handleDeleteCrew(c.id)}
                  className="p-2.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-900/30 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Elimina Equipaggio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {crews.length === 0 && (
            <div className="col-span-2 text-center py-8 text-slate-600 font-bold">
              Nessun equipaggio caricato nel roster
            </div>
          )}
        </div>
      </div>

      {/* Create New Crew Form */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 text-left font-sans">
        <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-800 font-sans">
          Aggiungi Equipaggio
        </h3>
        
        <p className="text-xs text-slate-500 leading-relaxed">
          Creando un nuovo equipaggio operativo (es. "Equipaggio 3" o "Equipaggio H24"), verranno abilitati gli slot nel tabellone e le relative fasce di prenotazione per i soccorritori.
        </p>

        <form onSubmit={handleCreateCrew} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 font-sans">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nome Equipaggio *</label>
            <input
              type="text"
              placeholder="es. Equipaggio 3"
              value={newCrewName}
              onChange={(e) => setNewCrewName(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Crea Equipaggio</span>
          </button>
        </form>
      </div>

    </div>
  )
}
