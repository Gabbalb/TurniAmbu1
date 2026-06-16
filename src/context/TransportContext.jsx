import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const TransportContext = createContext();

export const TransportProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [operatori, setOperatori] = useState([]);
  const [mezzi, setMezzi] = useState([]);
  const [tabelloneOggi, setTabelloneOggi] = useState([]);
  const [transports, setTransports] = useState([]);
  
  const [openTransportId, setOpenTransportId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBaseData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch operatori attivi
      const { data: opData } = await supabase
        .from('profiles')
        .select('id, nome, cognome, username')
        .eq('attivo', true);
        
      if (opData) {
        setOperatori(opData.map(o => ({
          id: o.id,
          nome: o.nome && o.cognome ? `${o.nome} ${o.cognome}` : o.username
        })));
      }

      // Fetch mezzi
      const { data: mezziData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('attivo', true)
        .order('nome');
      if (mezziData) setMezzi(mezziData);

      // Fetch tabellone di oggi
      const today = new Date().toISOString().split('T')[0];
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select(`
          id, data, ora_inizio, ora_fine, crew_id,
          crews (nome),
          bookings (
            id, user_id, ruolo_turno, ora_inizio_effettiva, ora_fine_effettiva, is_partial
          )
        `)
        .eq('data', today);

      if (shiftsData) {
        // Appiattiamo il tabellone per facilitare la ricerca
        // Un turno può avere più "segmenti" se ci sono turni parziali.
        // Per semplificare, restituiamo un array di prenotazioni indicizzate.
        setTabelloneOggi(shiftsData);
      }
    } catch (err) {
      console.error('Errore fetch base data trasporti:', err);
    }
  }, [user]);

  const fetchTransports = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data: transData, error } = await supabase
        .from('transports')
        .select(`
          *,
          transport_crew (
            id, user_id, ruolo, vehicle_id, attivo, is_partial
          )
        `)
        .eq('data', today)
        .order('id', { ascending: false });

      if (error) throw error;

      // Mappiamo i trasporti per farli somigliare alla struttura del frontend
      const mapped = (transData || []).map(t => {
        const activeCrew = t.transport_crew.filter(c => c.attivo);
        const ce = activeCrew.find(c => c.ruolo === 'CE')?.user_id || '';
        const autista = activeCrew.find(c => c.ruolo === 'autista')?.user_id || '';
        const soccorritore = activeCrew.find(c => c.ruolo === 'soccorritore')?.user_id || '';
        
        return {
          ...t,
          ce,
          autista,
          soccorritore,
          paziente_nome: t.paziente_cognome_nome || '',
          paziente_cf: t.paziente_codice_fiscale || '',
          paziente_tel: t.paziente_telefono || '',
        };
      });

      setTransports(mapped);
    } catch (err) {
      console.error('Errore fetch transports:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBaseData();
    fetchTransports();
  }, [fetchBaseData, fetchTransports]);

  // Metodi pubblici
  const openTransport = (id) => setOpenTransportId(id);
  const closeTransport = () => setOpenTransportId(null);
  const activeTransport = useMemo(() => transports.find(t => t.id === openTransportId) || null, [transports, openTransportId]);
  
  const anyActiveTransport = useMemo(() => transports.find(t => t.stato === 'attivo'), [transports]);

  const createTransport = async (newT) => {
    try {
      const payload = {
        data: new Date().toISOString().split('T')[0],
        stato: 'bozza',
        tipo_trasporto: newT.tipo_trasporto || 'visita',
        da_tipo_luogo: newT.da_tipo_luogo || 'ospedale',
        a_tipo_luogo: newT.a_tipo_luogo || 'abitazione',
        creato_da: user.id,
      };

      const { data, error } = await supabase.from('transports').insert([payload]).select().single();
      if (error) throw error;
      
      await fetchTransports();
      setOpenTransportId(data.id);
    } catch (err) {
      console.error('Errore creazione trasporto', err);
      alert('Errore nella creazione del trasporto');
    }
  };

  const updateTransport = async (updatedT) => {
    try {
      const payload = {
        ora_servizio: updatedT.ora_servizio || null,
        tipo_trasporto: updatedT.tipo_trasporto,
        altro_descrizione: updatedT.altro_descrizione || null,
        variante_ar: updatedT.variante_ar || null,
        da_tipo_luogo: updatedT.da_tipo_luogo,
        da_reparto: updatedT.da_reparto || null,
        da_nome: updatedT.da_nome || null,
        da_via: updatedT.da_via || null,
        a_tipo_luogo: updatedT.a_tipo_luogo,
        a_reparto: updatedT.a_reparto || null,
        a_nome: updatedT.a_nome || null,
        a_via: updatedT.a_via || null,
        vehicle_id: updatedT.vehicle_id || null,
        km_iniziali: updatedT.km_iniziali || null,
        km_finali: updatedT.km_finali || null,
        paziente_cognome_nome: updatedT.paziente_nome || null,
        paziente_codice_fiscale: updatedT.paziente_cf || null,
        paziente_telefono: updatedT.paziente_tel || null,
        paziente_email: updatedT.paziente_email || null,
        note: updatedT.note || null,
        tipo_pagamento: updatedT.tipo_pagamento || null,
        importo: updatedT.importo || null,
      };

      const { error } = await supabase.from('transports').update(payload).eq('id', updatedT.id);
      if (error) throw error;

      // Aggiorna equipaggio se siamo ancora in bozza (altrimenti si usa passa_trasporto)
      if (updatedT.stato === 'bozza') {
        // Rimuoviamo vecchi crew
        await supabase.from('transport_crew').delete().eq('transport_id', updatedT.id);
        
        // Inseriamo i nuovi
        const crewInserts = [];
        if (updatedT.ce) crewInserts.push({ transport_id: updatedT.id, user_id: updatedT.ce, ruolo: 'CE', vehicle_id: updatedT.vehicle_id });
        if (updatedT.autista) crewInserts.push({ transport_id: updatedT.id, user_id: updatedT.autista, ruolo: 'autista', vehicle_id: updatedT.vehicle_id });
        if (updatedT.soccorritore) crewInserts.push({ transport_id: updatedT.id, user_id: updatedT.soccorritore, ruolo: 'soccorritore', vehicle_id: updatedT.vehicle_id });

        if (crewInserts.length > 0) {
          await supabase.from('transport_crew').insert(crewInserts);
        }
      }

      await fetchTransports();
    } catch (err) {
      console.error('Errore update trasporto', err);
      alert('Errore nel salvataggio: ' + err.message);
      throw err;
    }
  };

  const attivaTurno = async (id, updates = null) => {
    try {
      if (updates) {
        await updateTransport({ id, ...updates, stato: 'bozza' });
      }
      const { error } = await supabase
        .from('transports')
        .update({ stato: 'attivo', ora_inizio: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchTransports();
    } catch (err) {
      console.error('Errore attivazione', err);
      throw err; // propagates to the UI
    }
  };

  const terminaServizio = async (id, km_finali) => {
    try {
      const { error } = await supabase
        .from('transports')
        .update({ stato: 'terminato', ora_fine: new Date().toISOString(), km_finali })
        .eq('id', id);
      if (error) throw error;
      await fetchTransports();
      fetchBaseData(); // Aggiorna i km dei mezzi
    } catch (err) {
      console.error('Errore termine', err);
    }
  };

  const passaTrasporto = async ({ id, nuovoCe, nuovoAutista, nuovoSoccorritore, nuovoMezzo, km_al_passaggio, motivo }) => {
    try {
      const { error } = await supabase.rpc('passa_trasporto', {
        p_transport_id: id,
        p_nuovo_ce: nuovoCe,
        p_nuovo_autista: nuovoAutista,
        p_nuovo_soccorritore: nuovoSoccorritore || null,
        p_nuovo_vehicle_id: nuovoMezzo || null,
        p_km_al_passaggio: km_al_passaggio || null,
        p_motivo: motivo || null
      });
      if (error) throw error;
      await fetchTransports();
    } catch (err) {
      console.error('Errore passa trasporto', err);
      alert('Errore durante il passaggio di consegne');
    }
  };

  // Helper suggerimento equipaggio
  const suggestCrew = useCallback((oraServizio) => {
    if (!oraServizio) return null;
    
    const normalize = (t) => t ? t.slice(0, 5) : "";
    const os = normalize(oraServizio);

    const isTimeInInterval = (t, start, end) => {
      if (start <= end) {
        return t >= start && t <= end;
      } else {
        return t >= start || t <= end;
      }
    };

    for (const shift of tabelloneOggi) {
      const sInizio = normalize(shift.ora_inizio);
      const sFine = normalize(shift.ora_fine);
      
      // Controlla se l'ora del servizio ricade nell'orario del turno principale
      if (isTimeInInterval(os, sInizio, sFine)) {
        
        // Cerca chi copre questa fascia considerando anche l'orario parziale
        const ce = shift.bookings.find(b => {
          if (b.ruolo_turno !== 'CE') return false;
          if (!b.is_partial) return true;
          const bInizio = normalize(b.ora_inizio_effettiva || shift.ora_inizio);
          const bFine = normalize(b.ora_fine_effettiva || shift.ora_fine);
          return isTimeInInterval(os, bInizio, bFine);
        });
        
        const autista = shift.bookings.find(b => {
          if (b.ruolo_turno !== 'autista') return false;
          if (!b.is_partial) return true;
          const bInizio = normalize(b.ora_inizio_effettiva || shift.ora_inizio);
          const bFine = normalize(b.ora_fine_effettiva || shift.ora_fine);
          return isTimeInInterval(os, bInizio, bFine);
        });
        
        if (ce || autista) {
          return {
            ce: ce?.user_id || null,
            autista: autista?.user_id || null,
            soccorritore: null,
            mezzo: null
          };
        }
      }
    }
    return null;
  }, [tabelloneOggi]);

  const getLastKmForVehicle = useCallback((vid) => {
    const m = mezzi.find(x => x.id == vid);
    return m ? String(m.km_attuali) : "";
  }, [mezzi]);

  return (
    <TransportContext.Provider value={{
      operatori, mezzi, tabelloneOggi, transports, loading,
      openTransportId, activeTransport, anyActiveTransport,
      openTransport, closeTransport, createTransport, updateTransport,
      attivaTurno, terminaServizio, passaTrasporto,
      suggestCrew, getLastKmForVehicle, refreshTransports: fetchTransports
    }}>
      {children}
    </TransportContext.Provider>
  );
};

export const useTransports = () => useContext(TransportContext);
