-- =========================================================================
-- MODULO TRASPORTI
-- Tabelle: vehicles (mezzi), transports (record trasporto), 
--          transport_crew (equipaggio per trasporto), transport_handoffs (log passaggi)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. TABELLA MEZZI
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text UNIQUE NOT NULL,         
  targa text,
  attivo boolean DEFAULT true NOT NULL,
  km_attuali numeric DEFAULT 0 NOT NULL  
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lettura mezzi a tutti gli utenti loggati" ON public.vehicles;
CREATE POLICY "Lettura mezzi a tutti gli utenti loggati"
  ON public.vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestione mezzi solo ad admin" ON public.vehicles;
CREATE POLICY "Gestione mezzi solo ad admin"
  ON public.vehicles FOR ALL TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

-- -------------------------------------------------------------------------
-- 2. TABELLA TRASPORTI
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES public.shifts(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT current_date,
  stato text NOT NULL DEFAULT 'bozza'
    CHECK (stato IN ('bozza', 'attivo', 'terminato')),
  ora_inizio timestamptz,            
  ora_fine timestamptz,              
  ora_servizio time,
  tipo_trasporto text NOT NULL
    CHECK (tipo_trasporto IN ('dimissione', 'visita', 'trasferimento', 'altro')),
  altro_descrizione text,            
  variante_ar text
    CHECK (variante_ar IN ('andata_ritorno', 'andata', 'ritorno')),
  da_tipo_luogo text NOT NULL CHECK (da_tipo_luogo IN ('ospedale', 'rsa', 'abitazione')),
  da_reparto text,                   
  da_nome text,                      
  da_via text,                       
  a_tipo_luogo text NOT NULL CHECK (a_tipo_luogo IN ('ospedale', 'rsa', 'abitazione')),
  a_reparto text,
  a_nome text,
  a_via text,
  vehicle_id bigint REFERENCES public.vehicles(id) ON DELETE SET NULL,
  km_iniziali numeric,               
  km_finali numeric,
  paziente_cognome_nome text,
  paziente_codice_fiscale text,      
  paziente_telefono text,
  paziente_email text,
  note text,
  tipo_pagamento text CHECK (tipo_pagamento IN ('contante', 'pos', 'bonifico', 'altro')),
  importo numeric,                   
  creato_da uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  precompilato_da_admin boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Forza l'aggiornamento dei constraints in caso la tabella esistesse già
ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_altro_richiede_descrizione;
ALTER TABLE public.transports ADD CONSTRAINT chk_altro_richiede_descrizione CHECK (stato <> 'terminato' OR tipo_trasporto <> 'altro' OR altro_descrizione IS NOT NULL);

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_ar_solo_visita_altro;
ALTER TABLE public.transports ADD CONSTRAINT chk_ar_solo_visita_altro CHECK (variante_ar IS NULL OR tipo_trasporto IN ('visita', 'altro'));

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_da_ospedale_richiede_nome;
ALTER TABLE public.transports ADD CONSTRAINT chk_da_ospedale_richiede_nome CHECK (stato <> 'terminato' OR da_tipo_luogo <> 'ospedale' OR da_nome IS NOT NULL);

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_da_rsa_richiede_nome;
ALTER TABLE public.transports ADD CONSTRAINT chk_da_rsa_richiede_nome CHECK (stato <> 'terminato' OR da_tipo_luogo <> 'rsa' OR da_nome IS NOT NULL);

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_da_abitazione_richiede_via;
ALTER TABLE public.transports ADD CONSTRAINT chk_da_abitazione_richiede_via CHECK (stato <> 'terminato' OR da_tipo_luogo <> 'abitazione' OR da_via IS NOT NULL);

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_a_ospedale_richiede_nome;
ALTER TABLE public.transports ADD CONSTRAINT chk_a_ospedale_richiede_nome CHECK (stato <> 'terminato' OR a_tipo_luogo <> 'ospedale' OR a_nome IS NOT NULL);

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_a_rsa_richiede_nome;
ALTER TABLE public.transports ADD CONSTRAINT chk_a_rsa_richiede_nome CHECK (stato <> 'terminato' OR a_tipo_luogo <> 'rsa' OR a_nome IS NOT NULL);

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_a_abitazione_richiede_via;
ALTER TABLE public.transports ADD CONSTRAINT chk_a_abitazione_richiede_via CHECK (stato <> 'terminato' OR a_tipo_luogo <> 'abitazione' OR a_via IS NOT NULL);

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_km_finali_dopo_iniziali;
ALTER TABLE public.transports ADD CONSTRAINT chk_km_finali_dopo_iniziali CHECK (km_finali IS NULL OR km_iniziali IS NULL OR km_finali >= km_iniziali);

ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS chk_terminato_ha_ora_fine;
ALTER TABLE public.transports ADD CONSTRAINT chk_terminato_ha_ora_fine CHECK (stato <> 'terminato' OR ora_fine IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_transports_data ON public.transports(data);
CREATE INDEX IF NOT EXISTS idx_transports_stato ON public.transports(stato);

ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lettura trasporti a tutti gli utenti loggati" ON public.transports;
DROP POLICY IF EXISTS "Lettura trasporti" ON public.transports;
CREATE POLICY "Lettura trasporti"
  ON public.transports FOR SELECT TO authenticated
  USING (
    public.es_admin() 
    OR EXISTS (SELECT 1 FROM public.transport_crew tc WHERE tc.transport_id = id AND tc.user_id = auth.uid())
    OR (
      stato = 'bozza' 
      AND EXISTS (
        SELECT 1 FROM public.shifts s 
        JOIN public.bookings b ON s.id = b.shift_id 
        WHERE s.data = transports.data AND b.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Inserimento trasporti personale o admin" ON public.transports;
CREATE POLICY "Inserimento trasporti personale o admin"
  ON public.transports FOR INSERT TO authenticated
  WITH CHECK (creato_da = auth.uid() OR public.es_admin());

-- -------------------------------------------------------------------------
-- 3. EQUIPAGGIO DEL TRASPORTO 
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_crew (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transport_id bigint REFERENCES public.transports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ruolo text NOT NULL CHECK (ruolo IN ('CE', 'autista', 'soccorritore')),
  vehicle_id bigint REFERENCES public.vehicles(id) ON DELETE SET NULL,  
  attivo boolean DEFAULT true NOT NULL,   
  ora_inizio_ruolo timestamptz DEFAULT now() NOT NULL,
  ora_fine_ruolo timestamptz,
  is_partial boolean DEFAULT false NOT NULL,  
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transport_crew_transport ON public.transport_crew(transport_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_transport_ruolo_attivo
  ON public.transport_crew(transport_id, ruolo) WHERE attivo = true;

ALTER TABLE public.transport_crew ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lettura equipaggio trasporto a tutti" ON public.transport_crew;
CREATE POLICY "Lettura equipaggio trasporto a tutti"
  ON public.transport_crew FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Scrittura equipaggio trasporto membri o admin" ON public.transport_crew;
CREATE POLICY "Scrittura equipaggio trasporto membri o admin"
  ON public.transport_crew FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------------------------
-- POLICY TRANSPORTS CHE RICHIEDONO TRANSPORT_CREW
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Modifica trasporti equipaggio assegnato o admin" ON public.transports;
CREATE POLICY "Modifica trasporti equipaggio assegnato o admin"
  ON public.transports FOR UPDATE TO authenticated
  USING (
    public.es_admin()
    OR EXISTS (SELECT 1 FROM public.transport_crew tc WHERE tc.transport_id = id AND tc.user_id = auth.uid())
    OR (
      stato = 'bozza'
      AND (
        creato_da = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.shifts s 
          JOIN public.bookings b ON s.id = b.shift_id 
          WHERE s.data = transports.data AND b.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    public.es_admin()
    OR EXISTS (SELECT 1 FROM public.transport_crew tc WHERE tc.transport_id = id AND tc.user_id = auth.uid())
    OR creato_da = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.shifts s 
      JOIN public.bookings b ON s.id = b.shift_id 
      WHERE s.data = transports.data AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Cancellazione trasporti solo admin" ON public.transports;
CREATE POLICY "Cancellazione trasporti solo admin"
  ON public.transports FOR DELETE TO authenticated USING (public.es_admin());

-- -------------------------------------------------------------------------
-- 4. LOG PASSAGGI DI CONSEGNA
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_handoffs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transport_id bigint REFERENCES public.transports(id) ON DELETE CASCADE NOT NULL,
  da_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  a_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  vehicle_id_precedente bigint REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_id_nuovo bigint REFERENCES public.vehicles(id) ON DELETE SET NULL,
  km_al_passaggio numeric,
  motivo text,
  avvenuto_a timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.transport_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lettura passaggi a tutti" ON public.transport_handoffs;
CREATE POLICY "Lettura passaggi a tutti"
  ON public.transport_handoffs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserimento passaggi membri equipaggio o admin" ON public.transport_handoffs;
CREATE POLICY "Inserimento passaggi membri equipaggio o admin"
  ON public.transport_handoffs FOR INSERT TO authenticated
  WITH CHECK (
    public.es_admin()
    OR EXISTS (SELECT 1 FROM public.transport_crew tc WHERE tc.transport_id = transport_id AND tc.user_id = auth.uid())
  );

-- -------------------------------------------------------------------------
-- 5. TRIGGER: aggiorna updated_at su transports
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_transport_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_touch_transport_updated_at ON public.transports;
CREATE TRIGGER tr_touch_transport_updated_at
  BEFORE UPDATE ON public.transports
  FOR EACH ROW EXECUTE PROCEDURE public.touch_transport_updated_at();

-- -------------------------------------------------------------------------
-- 6. TRIGGER: aggiorna km_attuali su vehicles alla chiusura del trasporto
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_transport_terminato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stato = 'terminato' AND NEW.km_finali IS NOT NULL AND NEW.vehicle_id IS NOT NULL
     AND (OLD.stato IS DISTINCT FROM 'terminato' OR OLD.km_finali IS DISTINCT FROM NEW.km_finali) THEN
    UPDATE public.vehicles
    SET km_attuali = NEW.km_finali
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_transport_terminato ON public.transports;
CREATE TRIGGER tr_transport_terminato
  AFTER UPDATE ON public.transports
  FOR EACH ROW EXECUTE PROCEDURE public.on_transport_terminato();

-- -------------------------------------------------------------------------
-- 7. FUNZIONE RPC: passa_trasporto
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.passa_trasporto(
  p_transport_id bigint,
  p_nuovo_ce uuid,
  p_nuovo_autista uuid,
  p_nuovo_soccorritore uuid DEFAULT NULL,
  p_nuovo_vehicle_id bigint DEFAULT NULL,
  p_km_al_passaggio numeric DEFAULT NULL,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_ce uuid;
  v_old_vehicle bigint;
  v_nota_auto text;
  v_username_old text;
  v_username_new text;
BEGIN
  SELECT user_id INTO v_old_ce FROM public.transport_crew
    WHERE transport_id = p_transport_id AND ruolo = 'CE' AND attivo = true;

  SELECT vehicle_id INTO v_old_vehicle FROM public.transports WHERE id = p_transport_id;

  -- chiude i ruoli attivi correnti
  UPDATE public.transport_crew
  SET attivo = false, ora_fine_ruolo = now()
  WHERE transport_id = p_transport_id AND attivo = true;

  -- apre i nuovi ruoli
  INSERT INTO public.transport_crew (transport_id, user_id, ruolo, vehicle_id, is_partial)
  VALUES (p_transport_id, p_nuovo_ce, 'CE', COALESCE(p_nuovo_vehicle_id, v_old_vehicle), true);

  INSERT INTO public.transport_crew (transport_id, user_id, ruolo, vehicle_id, is_partial)
  VALUES (p_transport_id, p_nuovo_autista, 'autista', COALESCE(p_nuovo_vehicle_id, v_old_vehicle), true);

  IF p_nuovo_soccorritore IS NOT NULL THEN
    INSERT INTO public.transport_crew (transport_id, user_id, ruolo, vehicle_id, is_partial)
    VALUES (p_transport_id, p_nuovo_soccorritore, 'soccorritore', COALESCE(p_nuovo_vehicle_id, v_old_vehicle), true);
  END IF;

  -- aggiorna il mezzo sul trasporto se cambiato
  IF p_nuovo_vehicle_id IS NOT NULL AND p_nuovo_vehicle_id <> v_old_vehicle THEN
    UPDATE public.transports SET vehicle_id = p_nuovo_vehicle_id WHERE id = p_transport_id;
  END IF;

  -- log del passaggio
  INSERT INTO public.transport_handoffs
    (transport_id, da_user_id, a_user_id, vehicle_id_precedente, vehicle_id_nuovo, km_al_passaggio, motivo)
  VALUES
    (p_transport_id, v_old_ce, p_nuovo_ce, v_old_vehicle, COALESCE(p_nuovo_vehicle_id, v_old_vehicle), p_km_al_passaggio, p_motivo);

  -- nota automatica
  SELECT username INTO v_username_old FROM public.profiles WHERE id = v_old_ce;
  SELECT username INTO v_username_new FROM public.profiles WHERE id = p_nuovo_ce;

  v_nota_auto := concat(
    '[Cambio equipaggio ', to_char(now(), 'DD/MM/YYYY HH24:MI'), '] da ',
    COALESCE(v_username_old, 'N/D'), ' a ', COALESCE(v_username_new, 'N/D'),
    CASE WHEN p_nuovo_vehicle_id IS NOT NULL AND p_nuovo_vehicle_id <> v_old_vehicle
         THEN concat(' — mezzo cambiato') ELSE '' END,
    CASE WHEN p_motivo IS NOT NULL THEN concat(' — motivo: ', p_motivo) ELSE '' END
  );

  UPDATE public.transports
  SET note = trim(concat(COALESCE(note, ''), chr(10), v_nota_auto))
  WHERE id = p_transport_id;
END;
$$;
