import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Building2, Home as HomeIcon, Stethoscope, ArrowRightLeft, Check, Circle, MapPin } from 'lucide-react';
import { useTransports } from '../context/TransportContext';

const LUOGO_ICONS = { ospedale: Stethoscope, rsa: Building2, abitazione: HomeIcon };

function sectionStatus(t) {
  const sections = [];
  sections.push({
    key: "tipo", label: "Tipo trasporto",
    complete: Boolean(t.tipo_trasporto) && (t.tipo_trasporto !== "altro" || t.altro_descrizione),
  });
  sections.push({
    key: "percorso", label: "Percorso (Da / A)",
    complete: Boolean(t.da_tipo_luogo) && Boolean(t.a_tipo_luogo) &&
      (t.da_tipo_luogo !== "abitazione" ? Boolean(t.da_nome) : Boolean(t.da_via)) &&
      (t.a_tipo_luogo !== "abitazione" ? Boolean(t.a_nome) : Boolean(t.a_via)),
  });
  sections.push({
    key: "equipaggio", label: "Equipaggio e mezzo",
    complete: Boolean(t.ce) && Boolean(t.autista) && Boolean(t.vehicle_id) && Boolean(t.km_iniziali),
  });
  sections.push({
    key: "paziente", label: "Dati paziente",
    complete: Boolean(t.paziente_nome) && Boolean(t.paziente_tel),
  });
  sections.push({
    key: "pagamento", label: "Pagamento",
    complete: !t.importo || Boolean(t.tipo_pagamento),
  });
  return sections;
}

function LuogoField({ label, prefix, value, onChange }) {
  const tipo = value[`${prefix}_tipo_luogo`];
  const placeholderNome = tipo === "ospedale" ? "es: Chiari" : tipo === "rsa" ? "es: Girasole" : "";
  const placeholderReparto = tipo === "ospedale" ? "es: P.S." : "es: Reparto";

  return (
    <div className="mb-4 last:mb-0">
      <label className="block text-[12.5px] font-bold text-slate-300 mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        {["ospedale", "rsa", "abitazione"].map((opt) => {
          const Icon = LUOGO_ICONS[opt];
          const active = tipo === opt;
          return (
            <button
              key={opt}
              type="button"
              className={`flex-1 flex flex-col items-center gap-1 p-2 border rounded-xl text-[11.5px] transition-all ${
                active ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700/50'
              }`}
              onClick={() => onChange({ [`${prefix}_tipo_luogo`]: opt })}
            >
              <Icon size={16} />
              <span>{opt === "ospedale" ? "Ospedale" : opt === "rsa" ? "RSA" : "Abitazione"}</span>
            </button>
          );
        })}
      </div>

      {(tipo === "ospedale" || tipo === "rsa") && (
        <div className="flex flex-col gap-2">
          <input
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            placeholder={placeholderReparto}
            value={value[`${prefix}_reparto`] || ""}
            onChange={(e) => onChange({ [`${prefix}_reparto`]: e.target.value })}
          />
          <input
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            placeholder={placeholderNome}
            value={value[`${prefix}_nome`] || ""}
            onChange={(e) => onChange({ [`${prefix}_nome`]: e.target.value })}
          />
        </div>
      )}
      {tipo === "abitazione" && (
        <input
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          placeholder="Via, civico, comune"
          value={value[`${prefix}_via`] || ""}
          onChange={(e) => onChange({ [`${prefix}_via`]: e.target.value })}
        />
      )}
    </div>
  );
}

function PassaTrasportoModal({ transport, onClose, onConfirm, operatori, mezzi }) {
  const [nuovoCe, setNuovoCe] = useState("");
  const [nuovoAutista, setNuovoAutista] = useState("");
  const [nuovoSoccorritore, setNuovoSoccorritore] = useState("");
  const [nuovoMezzo, setNuovoMezzo] = useState(transport.vehicle_id || "");
  const [motivo, setMotivo] = useState("");

  const valido = nuovoCe && nuovoAutista;
  const operatoreNome = (id) => operatori.find((o) => o.id === id)?.nome || "—";
  const mezzoNome = (id) => mezzi.find((m) => m.id == id)?.nome || "—";

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2 text-indigo-400">
          <ArrowRightLeft size={20} />
          <h3 className="text-lg font-bold text-slate-100 flex-1">Passa trasporto</h3>
          <button onClick={onClose} className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-[12.5px] text-slate-400 mb-5 leading-relaxed">
          Equipaggio attuale: <strong className="text-slate-200">{operatoreNome(transport.ce)}</strong> (CE),{" "}
          {operatoreNome(transport.autista)} (autista) — {mezzoNome(transport.vehicle_id)}
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Nuovo CE *</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={nuovoCe} onChange={e => setNuovoCe(e.target.value)}>
              <option value="">Seleziona...</option>
              {operatori.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Nuovo Autista *</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={nuovoAutista} onChange={e => setNuovoAutista(e.target.value)}>
              <option value="">Seleziona...</option>
              {operatori.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Soccorritore</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={nuovoSoccorritore} onChange={e => setNuovoSoccorritore(e.target.value)}>
              <option value="">Nessuno</option>
              {operatori.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Mezzo</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={nuovoMezzo} onChange={e => setNuovoMezzo(e.target.value)}>
              <option value="">Seleziona...</option>
              {mezzi.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Motivo (opzionale)</label>
            <input className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none placeholder:text-slate-600" placeholder="es: fine turno, urgenza..." value={motivo} onChange={e => setMotivo(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl py-3 text-[13.5px] font-bold transition-all" onClick={onClose}>Annulla</button>
          <button 
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-[13.5px] font-bold transition-all disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500" 
            disabled={!valido}
            onClick={() => onConfirm({ id: transport.id, nuovoCe, nuovoAutista, nuovoSoccorritore, nuovoMezzo, motivo })}
          >
            Conferma
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransportSheet() {
  const { 
    activeTransport: transport, openTransportId, closeTransport, updateTransport, 
    attivaTurno, terminaServizio, passaTrasporto,
    suggestCrew, getLastKmForVehicle, operatori, mezzi 
  } = useTransports();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmPassaggio, setConfirmPassaggio] = useState(false);
  const [localDraft, setLocalDraft] = useState(null);

  // Sync local draft con context quando si apre
  useEffect(() => {
    if (transport) {
      setLocalDraft(transport);
    }
  }, [transport, openTransportId]);

  // Debounce salvataggio automatico (oppure si salva esplicitamente)
  // Per semplicità facciamo update ad ogni modifica campo (nel context c'è già try catch)
  // Essendo un mockup avanzato, chiamiamo updateTransport direttamente on blur o con un timeout,
  // Ma qui passiamo localDraft e salviamo
  const patch = (fields) => {
    const updated = { ...localDraft, ...fields };
    setLocalDraft(updated);
    updateTransport(updated);
  };

  if (!openTransportId || !localDraft) return null;

  const t = localDraft;
  const sections = sectionStatus(t);
  const showAR = t.tipo_trasporto === "visita" || t.tipo_trasporto === "altro";

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[80] flex flex-col justify-end">
      <div className="w-full bg-slate-900 shadow-2xl h-[90vh] sm:h-full flex flex-col rounded-t-3xl sm:rounded-none border-t border-slate-800 overflow-hidden relative mt-auto translate-y-0 transition-transform animate-layout-transition-enter-active">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 p-4 bg-slate-900 border-b border-slate-800 shrink-0 relative z-10">
          <button className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl transition-all" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={20} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
              t.stato === 'attivo' ? 'bg-indigo-500/20 text-indigo-400' :
              t.stato === 'terminato' ? 'bg-slate-800/80 text-slate-400' :
              'bg-slate-800 text-slate-300'
            }`}>
              {t.stato === "attivo" ? "Turno attivo" : t.stato === "terminato" ? "Terminato" : "Bozza"}
            </span>
          </div>
          <button className="p-2 bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition-all" onClick={closeTransport}>
            <X size={20} />
          </button>
        </div>

        {/* MENU HAMBURGER */}
        {menuOpen && (
          <div className="absolute top-[68px] left-4 w-[260px] bg-slate-800 border border-slate-700 rounded-2xl shadow-xl z-20 overflow-hidden animate-layout-transition-enter-active">
            <div className="p-3 border-b border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Sezioni scheda
            </div>
            <div className="p-1.5 flex flex-col gap-0.5">
              {sections.map(s => (
                <button key={s.key} className="flex items-center gap-3 w-full p-2.5 hover:bg-slate-700 rounded-xl text-left text-[13px] text-slate-200" onClick={() => {
                  setMenuOpen(false);
                  document.getElementById(`sec-${s.key}`)?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  {s.complete ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Circle size={10} className="text-amber-500 shrink-0" fill="currentColor" />}
                  <span className="flex-1">{s.label}</span>
                  <ChevronRight size={14} className="text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
            {t.stato === 'attivo' && (
              <div className="p-3 border-t border-slate-700 flex flex-col gap-2">
                <button className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-[13px] font-bold" onClick={() => { setMenuOpen(false); setConfirmPassaggio(true); }}>
                  <ArrowRightLeft size={15} /> Passa trasporto
                </button>
              </div>
            )}
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth">
          
          {/* TIPO */}
          <section id="sec-tipo" className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4">Tipo trasporto</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {["dimissione", "visita", "trasferimento", "altro"].map((opt) => (
                <button
                  key={opt}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] border transition-all ${t.tipo_trasporto === opt ? 'bg-indigo-600 border-indigo-600 text-white font-bold' : 'bg-slate-950 border-slate-700 text-slate-400'}`}
                  onClick={() => patch({ tipo_trasporto: opt, variante_ar: opt === "dimissione" || opt === "trasferimento" ? "" : t.variante_ar })}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            {t.tipo_trasporto === "altro" && (
              <input className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-200 mb-3 focus:border-indigo-500 focus:outline-none" placeholder="Specifica..." value={t.altro_descrizione || ""} onChange={(e) => patch({ altro_descrizione: e.target.value })} />
            )}
            {showAR && (
              <div className="mb-4">
                <label className="block text-[12.5px] font-bold text-slate-300 mb-2">Variante A/R</label>
                <div className="flex gap-2">
                  {[ { v: "andata_ritorno", l: "A/R" }, { v: "andata", l: "Andata" }, { v: "ritorno", l: "Ritorno" } ].map((o) => (
                    <button key={o.v} className={`px-3 py-1.5 rounded-full text-[12.5px] border transition-all ${t.variante_ar === o.v ? 'bg-indigo-600 border-indigo-600 text-white font-bold' : 'bg-slate-950 border-slate-700 text-slate-400'}`} onClick={() => patch({ variante_ar: o.v })}>{o.l}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Ora servizio</label>
              <input type="time" className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.ora_servizio || ""} onChange={(e) => {
                const val = e.target.value;
                const p = { ora_servizio: val };
                const sugg = suggestCrew(val);
                if (sugg && !t.ce && !t.autista) {
                  p.ce = sugg.ce;
                  p.autista = sugg.autista;
                }
                patch(p);
              }} />
            </div>
          </section>

          {/* PERCORSO */}
          <section id="sec-percorso" className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4">Percorso</h4>
            <LuogoField label="Da" prefix="da" value={t} onChange={patch} />
            <LuogoField label="A" prefix="a" value={t} onChange={patch} />
          </section>

          {/* EQUIPAGGIO */}
          <section id="sec-equipaggio" className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider m-0">Equipaggio e mezzo</h4>
              <button className="text-indigo-400 text-[12px] font-bold hover:text-indigo-300" onClick={() => {
                const sugg = suggestCrew(t.ora_servizio);
                if (sugg) patch({ ce: sugg.ce, autista: sugg.autista });
              }}>Prendi da tabellone</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">CE *</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.ce || ""} onChange={e => patch({ ce: e.target.value })}>
                  <option value="">Seleziona...</option>
                  {operatori.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Autista *</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.autista || ""} onChange={e => patch({ autista: e.target.value })}>
                  <option value="">Seleziona...</option>
                  {operatori.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Soccorritore</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.soccorritore || ""} onChange={e => patch({ soccorritore: e.target.value })}>
                <option value="">Nessuno</option>
                {operatori.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Mezzo *</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.vehicle_id || ""} onChange={e => patch({ vehicle_id: e.target.value, km_iniziali: getLastKmForVehicle(e.target.value) })}>
                  <option value="">Seleziona...</option>
                  {mezzi.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Km iniziali *</label>
                <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.km_iniziali || ""} onChange={e => patch({ km_iniziali: e.target.value })} />
              </div>
            </div>
            {t.stato !== 'bozza' && (
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Km finali</label>
                <input type="number" className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.km_finali || ""} onChange={e => patch({ km_finali: e.target.value })} disabled={t.stato === "terminato"} />
              </div>
            )}
          </section>

          {/* PAZIENTE */}
          <section id="sec-paziente" className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4">Dati Paziente</h4>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Cognome e Nome *</label>
                <input className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.paziente_nome || ""} onChange={e => patch({ paziente_nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Telefono *</label>
                  <input className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.paziente_tel || ""} onChange={e => patch({ paziente_tel: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Codice Fiscale</label>
                  <input className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none uppercase" value={t.paziente_cf || ""} onChange={e => patch({ paziente_cf: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Email</label>
                <input className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" type="email" value={t.paziente_email || ""} onChange={e => patch({ paziente_email: e.target.value })} />
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Note</label>
                <textarea rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.note || ""} onChange={e => patch({ note: e.target.value })} placeholder="Le note di cambio equipaggio vengono aggiunte qui..."></textarea>
              </div>
            </div>
          </section>

          {/* PAGAMENTO */}
          <section id="sec-pagamento" className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-4">Pagamento</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Importo (€)</label>
                <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.importo || ""} onChange={e => patch({ importo: e.target.value })} />
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-slate-300 mb-1.5">Tipo {t.importo ? '*' : ''}</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-[13.5px] text-slate-200 focus:border-indigo-500 focus:outline-none" value={t.tipo_pagamento || ""} onChange={e => patch({ tipo_pagamento: e.target.value })}>
                  <option value="">Seleziona...</option>
                  <option value="contante">Contante</option>
                  <option value="pos">POS</option>
                  <option value="bonifico">Bonifico</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          {t.stato === "bozza" && (
            <button 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all" 
              onClick={() => {
                // Autocompilazione all'attivazione del turno
                const ora = t.ora_servizio || new Date().toTimeString().slice(0,5);
                const sugg = suggestCrew(ora);
                if (sugg && (!t.ce && !t.autista)) {
                  patch({ ce: sugg.ce, autista: sugg.autista, ora_servizio: ora });
                }
                attivaTurno(t.id).catch(err => alert("Errore del server: " + err.message));
              }}
            >
              Attiva turno
            </button>
          )}
          {t.stato === "attivo" && (
            <div className="flex gap-3">
              <button className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2" onClick={() => setConfirmPassaggio(true)}>
                <ArrowRightLeft size={16} /> Passa
              </button>
              <button className="flex-[2] bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => {
                const completato = sections.every(s => s.complete);
                if (!completato) {
                  alert("Compila tutti i campi obbligatori (le sezioni col check verde) prima di terminare!");
                  return;
                }
                if (!t.km_finali) alert("Inserisci i km finali per terminare il servizio");
                else terminaServizio(t.id, t.km_finali);
              }}>
                Termina servizio
              </button>
            </div>
          )}
          {t.stato === "terminato" && (
            <div className="w-full flex items-center justify-center gap-2 text-indigo-400 font-bold text-[13.5px] py-2">
              <Check size={16} /> Servizio terminato
            </div>
          )}
        </div>
      </div>

      {confirmPassaggio && (
        <PassaTrasportoModal
          transport={t}
          operatori={operatori}
          mezzi={mezzi}
          onClose={() => setConfirmPassaggio(false)}
          onConfirm={(payload) => {
            passaTrasporto(payload);
            setConfirmPassaggio(false);
          }}
        />
      )}
    </div>
  );
}

export function ActiveTransportBar() {
  const { transports, openTransportId, openTransport, operatori } = useTransports();
  
  if (openTransportId) return null;
  
  const activeT = transports.find(t => t.stato === "attivo");
  if (!activeT) return null;

  const operatoreNome = (id) => operatori.find(o => o.id === id)?.nome || "—";
  
  return (
    <button
      className="fixed bottom-[80px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md bg-slate-950 text-slate-100 border border-slate-800/80 rounded-full py-3 px-5 flex items-center gap-3 text-[13px] font-bold shadow-[0_8px_30px_rgb(0,0,0,0.4)] z-[45] transition-all hover:bg-slate-900 animate-layout-transition-enter-active group"
      onClick={() => openTransport(activeT.id)}
    >
      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse shrink-0" />
      <span className="truncate flex-1 text-left">
        Scheda attiva — {operatoreNome(activeT.ce)} — {activeT.paziente_nome || "In corso"}
      </span>
      <ChevronRight size={18} className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
    </button>
  );
}
