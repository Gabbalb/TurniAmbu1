import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Loader2, MapPin, Clock, Truck, Users, ArrowRightLeft } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

export default function AdminTrasporti() {
  const [transports, setTransports] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [veicoli, setVeicoli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateFilter, setDateFilter] = useState('');
  
  // Form states per nuovo trasporto programmato
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    ora_servizio: '',
    tipo_trasporto: 'visita',
    da_tipo_luogo: 'ospedale', da_nome: '', da_via: '',
    a_tipo_luogo: 'abitazione', a_nome: '', a_via: '',
    paziente_cognome_nome: '', paziente_telefono: '',
    note: ''
  });
  
  // Equipaggio opzionale pre-assegnato
  const [crew, setCrew] = useState({ ce: '', autista: '', vehicle_id: '' });

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    const [tRes, pRes, vRes] = await Promise.all([
      api.adminGetTransports(dateFilter || null),
      supabase.from('profiles').select('*'),
      api.adminGetVehicles()
    ]);
    
    if (tRes.error) setError(tRes.error.message);
    else setTransports(tRes.data || []);
    
    if (!pRes.error) setProfiles(pRes.data || []);
    if (!vRes.error) setVeicoli(vRes.data || []);
    
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    
    const payload = { ...formData };
    if (crew.vehicle_id) payload.vehicle_id = parseInt(crew.vehicle_id, 10);
    
    const crewArray = [];
    if (crew.ce) crewArray.push({ user_id: crew.ce, ruolo: 'CE' });
    if (crew.autista) crewArray.push({ user_id: crew.autista, ruolo: 'autista' });

    const { error: err } = await api.adminCreateTransport(payload, crewArray);
    if (err) setError(err.message);
    else {
      setShowForm(false);
      setFormData({
        data: new Date().toISOString().split('T')[0],
        ora_servizio: '', tipo_trasporto: 'visita',
        da_tipo_luogo: 'ospedale', da_nome: '', da_via: '',
        a_tipo_luogo: 'abitazione', a_nome: '', a_via: '',
        paziente_cognome_nome: '', paziente_telefono: '', note: ''
      });
      setCrew({ ce: '', autista: '', vehicle_id: '' });
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminare definitivamente questo trasporto?")) return;
    const { error: err } = await api.adminDeleteTransport(id);
    if (err) setError(err.message);
    else fetchData();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Calendar className="text-indigo-500" />
            Gestione Trasporti
          </h1>
          <p className="text-slate-400 text-sm mt-1">Supervisiona, crea e modifica tutti i trasporti.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="date" 
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-indigo-500"
          />
          <button 
            onClick={() => setDateFilter('')}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            Tutti
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Programmato</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Nuovo Trasporto Programmato</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Generale</h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">DATA</label>
                <input required type="date" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">ORA SERVIZIO</label>
                <input type="time" value={formData.ora_servizio} onChange={e => setFormData({...formData, ora_servizio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">TIPO TRASPORTO</label>
                <select value={formData.tipo_trasporto} onChange={e => setFormData({...formData, tipo_trasporto: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500">
                  <option value="visita">Visita</option>
                  <option value="dimissione">Dimissione</option>
                  <option value="trasferimento">Trasferimento</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Paziente e Note</h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">COGNOME E NOME</label>
                <input type="text" value={formData.paziente_cognome_nome} onChange={e => setFormData({...formData, paziente_cognome_nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">TELEFONO</label>
                <input type="tel" value={formData.paziente_telefono} onChange={e => setFormData({...formData, paziente_telefono: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">NOTE</label>
                <textarea rows="2" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Assegnazione (Opzionale)</h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">CAPO EQUIPAGGIO</label>
                <select value={crew.ce} onChange={e => setCrew({...crew, ce: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500">
                  <option value="">-- Nessuno (lascia all'operatore) --</option>
                  {profiles.filter(p => p.qualifica === 'CE').map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">AUTISTA</label>
                <select value={crew.autista} onChange={e => setCrew({...crew, autista: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500">
                  <option value="">-- Nessuno (lascia all'operatore) --</option>
                  {profiles.filter(p => p.qualifica === 'autista').map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">MEZZO</label>
                <select value={crew.vehicle_id} onChange={e => setCrew({...crew, vehicle_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500">
                  <option value="">-- Nessuno --</option>
                  {veicoli.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-800">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all">
              Crea Programmato
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2.5 rounded-xl font-bold transition-all">
              Annulla
            </button>
          </div>
        </form>
      )}

      {loading && !transports.length ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
      ) : (
        <div className="space-y-4">
          {transports.map(t => {
            const isBozza = t.stato === 'bozza';
            const isAttivo = t.stato === 'attivo';
            const ceObj = t.transport_crew?.find(c => c.ruolo === 'CE');
            const autObj = t.transport_crew?.find(c => c.ruolo === 'autista');
            return (
              <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group hover:border-slate-700 transition-colors">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border
                      ${isBozza ? 'bg-slate-800 text-slate-300 border-slate-700' : 
                        isAttivo ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 
                        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                      {t.stato.toUpperCase()}
                    </span>
                    {t.precompilato_da_admin && <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">Programmato</span>}
                    <span className="text-slate-400 font-bold">{t.data} {t.ora_servizio && `- ${t.ora_servizio}`}</span>
                  </div>
                  
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    {t.paziente_cognome_nome || 'Paziente Anonimo'}
                    <span className="text-slate-500 text-sm font-normal capitalize">({t.tipo_trasporto})</span>
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-rose-400" />
                      <span>{t.da_tipo_luogo} {t.da_nome}</span>
                      <ArrowRightLeft size={12} className="mx-1 text-slate-600" />
                      <span>{t.a_tipo_luogo} {t.a_nome}</span>
                    </div>
                    {(ceObj || autObj || t.vehicle_id) && (
                      <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
                        {t.vehicle_id && <span className="flex items-center gap-1 text-indigo-400"><Truck size={14}/> {t.vehicles?.nome || 'Mezzo'}</span>}
                        {ceObj && <span className="flex items-center gap-1"><Users size={14}/> CE: {ceObj.profiles?.cognome}</span>}
                        {autObj && <span className="flex items-center gap-1">Aut: {autObj.profiles?.cognome}</span>}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                  <button onClick={() => handleDelete(t.id)} className="w-full md:w-auto p-2.5 md:p-2 flex justify-center items-center gap-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800 md:border-transparent">
                    <Trash2 size={16} /> <span className="md:hidden font-bold">Elimina</span>
                  </button>
                </div>
              </div>
            );
          })}
          {transports.length === 0 && (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
              Nessun trasporto trovato.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
