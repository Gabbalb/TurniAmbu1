import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Edit2, Trash2, Check, AlertCircle, RefreshCw, Truck } from 'lucide-react'

export default function AdminVehiclesTab() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Create / Edit Form State
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [nome, setNome] = useState('')
  const [targa, setTarga] = useState('')
  const [kmAttuali, setKmAttuali] = useState('')
  const [attivo, setAttivo] = useState(true)
  const [formError, setFormError] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  const loadVehicles = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: apiErr } = await api.fetchAllVehiclesForAdmin()
      if (apiErr) throw apiErr
      setVehicles(data || [])
    } catch (err) {
      console.error(err)
      setError('Impossibile caricare i dati dei veicoli.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setNome('')
    setTarga('')
    setKmAttuali('0')
    setAttivo(true)
    setFormError(null)
    setIsEditing(true)
  }

  const handleOpenEdit = (v) => {
    setEditingId(v.id)
    setNome(v.nome)
    setTarga(v.targa || '')
    setKmAttuali(String(v.km_attuali || 0))
    setAttivo(v.attivo)
    setFormError(null)
    setIsEditing(true)
  }

  const handleSaveSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!nome.trim()) {
      setFormError("Il nome del veicolo è obbligatorio.")
      return
    }

    const payload = {
      nome: nome.trim(),
      targa: targa.trim().toUpperCase(),
      km_attuali: Number(kmAttuali || 0),
      attivo
    }

    setFormLoading(true)
    try {
      if (editingId) {
        // Update
        const { error: updErr } = await api.updateVehicle(editingId, payload)
        if (updErr) throw updErr
      } else {
        // Create
        const { error: insErr } = await api.createVehicle(payload)
        if (insErr) throw insErr
      }
      setIsEditing(false)
      loadVehicles()
    } catch (err) {
      console.error(err)
      setFormError("Errore durante il salvataggio dei dati.")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Sei sicuro di voler disattivare questo veicolo? Rimarrà nello storico ma non sarà selezionabile nei nuovi trasporti.")) return
    try {
      const { error: delErr } = await api.deleteVehicle(id)
      if (delErr) throw delErr
      loadVehicles()
    } catch (err) {
      console.error(err)
      alert("Errore durante la disattivazione del veicolo.")
    }
  }

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error: updErr } = await api.updateVehicle(id, { attivo: !currentStatus })
      if (updErr) throw updErr
      loadVehicles()
    } catch (err) {
      console.error(err)
      alert("Errore durante l'aggiornamento dello stato del veicolo.")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-500" />
            Gestione Parco Mezzi
          </h2>
          <p className="text-xs text-slate-500 leading-normal">
            Aggiungi, modifica o disattiva i veicoli dell'associazione disponibili per il servizio trasporti.
          </p>
        </div>

        <div className="flex gap-2 z-10">
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Nuovo Veicolo
          </button>
          <button
            onClick={loadVehicles}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="Aggiorna veicoli"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-4 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Editor Modal/Panel */}
      {isEditing && (
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm animate-fade-in">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">
            {editingId ? 'Modifica Veicolo' : 'Aggiungi Nuovo Veicolo'}
          </h3>

          <form onSubmit={handleSaveSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Nome */}
            <div className="space-y-1.5 text-left col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500">Nome Veicolo *</label>
              <input
                type="text"
                placeholder="Es. Ambulanza 1 (Fiat Ducato)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {/* Targa */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500">Targa</label>
              <input
                type="text"
                placeholder="Es. AM123BU"
                value={targa}
                onChange={(e) => setTarga(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Km Attuali */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500">Chilometri Attuali</label>
              <input
                type="number"
                placeholder="Es. 120500"
                value={kmAttuali}
                onChange={(e) => setKmAttuali(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none transition-all"
              />
            </div>

            {/* Attivo Checkbox */}
            <div className="h-12 flex items-center justify-start text-left pl-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-500">
                <input
                  type="checkbox"
                  checked={attivo}
                  onChange={(e) => setAttivo(e.target.checked)}
                  className="rounded bg-white border-slate-200 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4.5 h-4.5"
                />
                Mezzo Attivo / Disponibile
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-550 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                Salva
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Annulla
              </button>
            </div>
          </form>

          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs font-semibold mt-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}
        </div>
      )}

      {/* Vehicles Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase select-none">
                <th className="py-3.5 px-6">ID</th>
                <th className="py-3.5 px-6">Nome Mezzo</th>
                <th className="py-3.5 px-6">Targa</th>
                <th className="py-3.5 px-6">Chilometri Attuali</th>
                <th className="py-3.5 px-6 text-center">Stato</th>
                <th className="py-3.5 px-6 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 font-semibold">
              {vehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-semibold font-mono text-slate-400">{v.id}</td>
                  <td className="py-4 px-6 font-bold text-slate-800">{v.nome}</td>
                  <td className="py-4 px-6 font-mono font-semibold text-slate-500">{v.targa || '-'}</td>
                  <td className="py-4 px-6 font-mono font-bold text-indigo-600">{v.km_attuali.toLocaleString('it-IT')} km</td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => handleToggleActive(v.id, v.attivo)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                        v.attivo
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-250 hover:bg-emerald-100/60'
                          : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {v.attivo ? 'ATTIVO' : 'NON ATTIVO'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(v)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Modifica"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {v.attivo && (
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title="Disattiva"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vehicles.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-400 font-bold">
              Nessun veicolo registrato.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
