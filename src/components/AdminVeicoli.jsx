import React, { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export default function AdminVeicoli() {
  const [veicoli, setVeicoli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [nome, setNome] = useState('');
  const [kmAttuali, setKmAttuali] = useState('');
  const [attivo, setAttivo] = useState(true);

  useEffect(() => {
    fetchVeicoli();
  }, []);

  const fetchVeicoli = async () => {
    setLoading(true);
    const { data, err } = await api.adminGetVehicles();
    if (err) setError(err.message);
    else setVeicoli(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setNome('');
    setKmAttuali('');
    setAttivo(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (v) => {
    setEditingId(v.id);
    setNome(v.nome);
    setKmAttuali(v.km_attuali || '');
    setAttivo(v.attivo);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = { 
      nome, 
      km_attuali: kmAttuali ? parseFloat(kmAttuali) : null,
      attivo 
    };

    if (editingId) {
      const { error: err } = await api.adminUpdateVehicle(editingId, payload);
      if (err) setError(err.message);
      else {
        fetchVeicoli();
        resetForm();
      }
    } else {
      const { error: err } = await api.adminCreateVehicle(payload);
      if (err) setError(err.message);
      else {
        fetchVeicoli();
        resetForm();
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo veicolo? L'operazione non può essere annullata e fallirà se ci sono trasporti associati.")) return;
    const { error: err } = await api.adminDeleteVehicle(id);
    if (err) setError(err.message);
    else fetchVeicoli();
  };

  if (loading && !veicoli.length) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Truck className="text-indigo-500" />
            Gestione Veicoli
          </h1>
          <p className="text-slate-400 text-sm mt-1">Aggiungi, modifica o disattiva i mezzi della flotta.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nuovo Mezzo</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">{editingId ? 'Modifica Mezzo' : 'Nuovo Mezzo'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Nome / Targa *</label>
              <input 
                required 
                type="text" 
                value={nome} 
                onChange={e => setNome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="es. MSA 01"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Km Attuali</label>
              <input 
                type="number" 
                value={kmAttuali} 
                onChange={e => setKmAttuali(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                placeholder="es. 150000"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={attivo} 
                onChange={e => setAttivo(e.target.checked)}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm font-bold text-slate-300">Veicolo Attivo (visibile nei trasporti)</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all">
              Salva
            </button>
            <button type="button" onClick={resetForm} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2.5 rounded-xl font-bold transition-all">
              Annulla
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nome/Targa</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Km Attuali</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Stato</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {veicoli.map(v => (
                <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">{v.nome}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-300">{v.km_attuali?.toLocaleString('it-IT') || '-'}</div>
                  </td>
                  <td className="p-4">
                    {v.attivo ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle size={14} /> Attivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        <XCircle size={14} /> Disattivo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(v)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all" title="Modifica">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all" title="Elimina">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {veicoli.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">Nessun veicolo registrato.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
