import React from 'react';
import { Plus, ChevronRight, Clock, Truck, Users, MapPin, Circle } from 'lucide-react';
import { useTransports } from '../context/TransportContext';

const emptyTransport = () => ({
  tipo_trasporto: 'visita',
  da_tipo_luogo: 'ospedale',
  a_tipo_luogo: 'abitazione',
});

function TransportCard({ t, onOpen, operatori, mezzi }) {
  const operatoreNome = (id) => operatori.find((o) => o.id === id)?.nome || "—";
  const mezzoNome = (id) => mezzi.find((m) => m.id == id)?.nome || "—";

  // Calcolo missing semplificato per la card
  let missing = 0;
  if (!t.ce || !t.autista || !t.vehicle_id || !t.km_iniziali) missing++;
  if (!t.paziente_nome || !t.paziente_tel) missing++;

  return (
    <button 
      className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-left cursor-pointer flex flex-col gap-2 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all mb-3"
      onClick={() => onOpen(t.id)}
    >
      <div className="flex items-center gap-2">
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
          t.stato === 'attivo' ? 'bg-indigo-500/20 text-indigo-400' :
          t.stato === 'terminato' ? 'bg-slate-800/80 text-slate-400' :
          'bg-slate-800 text-slate-300'
        }`}>
          {t.stato === "attivo" ? "Attivo" : t.stato === "terminato" ? "Terminato" : "Bozza"}
        </span>
        {missing > 0 && t.stato === 'bozza' && (
          <span className="text-[11px] text-amber-500 flex items-center gap-1 font-bold bg-amber-500/10 px-2 py-1 rounded-full">
            <Circle size={8} fill="currentColor" /> {missing} incompleti
          </span>
        )}
        {t.precompilato_da_admin && t.stato === "bozza" && (
          <span className="text-[11px] bg-amber-500/20 text-amber-500 px-2.5 py-1 rounded-full font-bold ml-auto">
            precompilato
          </span>
        )}
      </div>

      <div className="font-bold text-[15px] text-slate-100 mt-1">
        {t.paziente_nome || "Paziente non specificato"}
      </div>

      <div className="flex items-center gap-1.5 text-[13px] text-slate-400 bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
        <span className="flex items-center gap-1 truncate"><MapPin size={13} className="text-emerald-500" /> {t.da_nome || t.da_via || "—"}</span>
        <ChevronRight size={13} className="opacity-50 shrink-0" />
        <span className="flex items-center gap-1 truncate"><MapPin size={13} className="text-rose-500" /> {t.a_nome || t.a_via || "—"}</span>
      </div>

      <div className="flex flex-wrap gap-4 text-[12px] text-slate-400 mt-1">
        <span className="flex items-center gap-1.5"><Clock size={12} className="text-indigo-400" /> {t.ora_servizio ? t.ora_servizio.slice(0,5) : "—"}</span>
        <span className="flex items-center gap-1.5"><Truck size={12} className="text-slate-300" /> {mezzoNome(t.vehicle_id)}</span>
        <span className="flex items-center gap-1.5"><Users size={12} className="text-slate-300" /> {t.ce ? operatoreNome(t.ce) : "non assegnato"}</span>
      </div>
    </button>
  );
}

export default function Trasporti() {
  const { transports, loading, openTransport, createTransport, operatori, mezzi } = useTransports();

  const handleNuovo = () => {
    createTransport(emptyTransport());
  };

  const todayStr = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-4 animate-layout-transition-enter-active">
      <div className="flex flex-col mb-1">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Trasporti</h1>
        <p className="text-[13px] text-slate-400 capitalize">{todayStr}</p>
      </div>

      <button 
        onClick={handleNuovo}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl p-4 text-[15px] font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
      >
        <Plus size={20} /> Nuovo trasporto
      </button>

      <div className="flex flex-col pb-10">
        {loading && <div className="text-center text-sm text-slate-500 py-8">Caricamento trasporti...</div>}
        {!loading && transports.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-10 bg-slate-900/40 border border-slate-800/80 rounded-2xl border-dashed">
            Nessun trasporto registrato per oggi.
          </div>
        )}
        {!loading && transports.map(t => (
          <TransportCard 
            key={t.id} 
            t={t} 
            onOpen={openTransport} 
            operatori={operatori} 
            mezzi={mezzi} 
          />
        ))}
      </div>
    </div>
  );
}
