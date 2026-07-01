-- =========================================================================
-- TURNIAMBU (GM-TURNI) - SCHEMA COMPLETO DEL DATABASE (SUPABASE)
-- =========================================================================

-- Abilita le estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- =========================================================================
-- 1. TABELLE E STRUTTURA
-- =========================================================================

-- Tabella Profili (estensione di auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  ruolo text NOT NULL,
  attivo boolean DEFAULT true NOT NULL,
  nome text,
  cognome text,
  codice_fiscale text,
  email text,
  telefono text,
  data_nascita date,
  stato text,
  qualifica text,
  paga_oraria numeric,
  credito_surplus numeric DEFAULT 0.00 NOT NULL,
  session_token text,
  last_device_id text,
  CONSTRAINT profiles_ruolo_check CHECK (ruolo IN ('admin', 'dipendente', 'volontario')),
  CONSTRAINT profiles_stato_check CHECK (stato IN ('admin', 'dipendente', 'volontario')),
  CONSTRAINT profiles_qualifica_check CHECK (qualifica IN ('autista', 'CE'))
);

-- Tabella Equipaggi
CREATE TABLE IF NOT EXISTS public.crews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text UNIQUE NOT NULL,
  attivo boolean DEFAULT true NOT NULL
);

-- Tabella Turni
CREATE TABLE IF NOT EXISTS public.shifts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data date NOT NULL,
  ora_inizio time NOT NULL,
  ora_fine time NOT NULL,
  crew_id bigint REFERENCES public.crews(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT unique_shift_time UNIQUE (data, ora_inizio, crew_id)
);

-- Tabella Prenotazioni
CREATE TABLE IF NOT EXISTS public.bookings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES public.shifts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ruolo_turno text NOT NULL,
  ora_inizio_effettiva time,
  ora_fine_effettiva time,
  is_partial boolean DEFAULT false NOT NULL,
  nota_parziale text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT bookings_ruolo_turno_check CHECK (ruolo_turno IN ('CE', 'autista'))
);

-- Tabella Timbrature (Clocked Shifts)
CREATE TABLE IF NOT EXISTS public.clocked_shifts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  pagato boolean DEFAULT false NOT NULL,
  paga_oraria_storica numeric NOT NULL
);

-- Tabella Veicoli
CREATE TABLE IF NOT EXISTS public.vehicles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text UNIQUE NOT NULL,
  targa text,
  attivo boolean DEFAULT true NOT NULL,
  km_attuali numeric DEFAULT 0 NOT NULL
);

-- Tabella Trasporti
CREATE TABLE IF NOT EXISTS public.transports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES public.shifts(id) ON DELETE SET NULL,
  data date DEFAULT CURRENT_DATE NOT NULL,
  stato text DEFAULT 'bozza'::text NOT NULL,
  ora_inizio timestamptz,
  ora_fine timestamptz,
  ora_servizio time,
  tipo_trasporto text NOT NULL,
  altro_descrizione text,
  variante_ar text,
  da_tipo_luogo text NOT NULL,
  da_reparto text,
  da_nome text,
  da_via text,
  a_tipo_luogo text NOT NULL,
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
  tipo_pagamento text,
  importo numeric,
  creato_da uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  precompilato_da_admin boolean DEFAULT false NOT NULL,
  stato_trasporto text DEFAULT 'Diretti dal paziente'::text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT transports_stato_check CHECK (stato IN ('attivo', 'terminato', 'programmato')),
  CONSTRAINT transports_stato_trasporto_check CHECK (stato_trasporto IN ('Diretti dal paziente', 'Diretti alla destinazione', 'In rientro')),
  CONSTRAINT transports_tipo_trasporto_check CHECK (tipo_trasporto IN ('dimissione', 'visita', 'trasferimento', 'altro')),
  CONSTRAINT transports_variante_ar_check CHECK (variante_ar IN ('andata_ritorno', 'andata', 'ritorno')),
  CONSTRAINT transports_da_tipo_luogo_check CHECK (da_tipo_luogo IN ('ospedale', 'rsa', 'abitazione')),
  CONSTRAINT transports_a_tipo_luogo_check CHECK (a_tipo_luogo IN ('ospedale', 'rsa', 'abitazione')),
  CONSTRAINT chk_altro_richiede_descrizione CHECK ((stato <> 'terminato') OR (tipo_trasporto <> 'altro') OR (altro_descrizione IS NOT NULL)),
  CONSTRAINT chk_ar_solo_visita_altro CHECK ((variante_ar IS NULL) OR (tipo_trasporto = ANY (ARRAY['visita', 'altro']))),
  CONSTRAINT chk_da_ospedale_richiede_nome CHECK ((stato <> 'terminato') OR (da_tipo_luogo <> 'ospedale') OR (da_nome IS NOT NULL)),
  CONSTRAINT chk_da_rsa_richiede_nome CHECK ((stato <> 'terminato') OR (da_tipo_luogo <> 'rsa') OR (da_nome IS NOT NULL)),
  CONSTRAINT chk_da_abitazione_richiede_via CHECK ((stato <> 'terminato') OR (da_tipo_luogo <> 'abitazione') OR (da_via IS NOT NULL)),
  CONSTRAINT chk_a_ospedale_richiede_nome CHECK ((stato <> 'terminato') OR (a_tipo_luogo <> 'ospedale') OR (a_nome IS NOT NULL)),
  CONSTRAINT chk_a_rsa_richiede_nome CHECK ((stato <> 'terminato') OR (a_tipo_luogo <> 'rsa') OR (a_nome IS NOT NULL)),
  CONSTRAINT chk_a_abitazione_richiede_via CHECK ((stato <> 'terminato') OR (a_tipo_luogo <> 'abitazione') OR (a_via IS NOT NULL)),
  CONSTRAINT chk_km_finali_dopo_iniziali CHECK ((km_finali IS NULL) OR (km_iniziali IS NULL) OR (km_finali >= km_iniziali)),
  CONSTRAINT chk_terminato_ha_ora_fine CHECK ((stato <> 'terminato') OR (ora_fine IS NOT NULL))
);

-- Tabella Equipaggio Trasporti
CREATE TABLE IF NOT EXISTS public.transport_crew (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transport_id bigint REFERENCES public.transports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ruolo text NOT NULL,
  vehicle_id bigint REFERENCES public.vehicles(id) ON DELETE SET NULL,
  attivo boolean DEFAULT true NOT NULL,
  ora_inizio_ruolo timestamptz DEFAULT now() NOT NULL,
  ora_fine_ruolo timestamptz,
  is_partial boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT transport_crew_ruolo_check CHECK (ruolo IN ('CE', 'autista', 'soccorritore'))
);

-- Tabella Passaggi di Consegne
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

-- Tabella Notifiche (Audit Log)
CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo text NOT NULL,
  messaggio text NOT NULL,
  creato_da text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Tabella Impostazioni Notifiche Telegram
CREATE TABLE IF NOT EXISTS public.telegram_settings (
  tipo text PRIMARY KEY,
  attivo boolean DEFAULT true NOT NULL
);

-- =========================================================================
-- 2. ABILITAZIONE ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clocked_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. FUNZIONI DI SUPPORTO E RPC
-- =========================================================================

-- Funzione per verificare se l'utente connesso è un amministratore attivo
CREATE OR REPLACE FUNCTION public.es_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND ruolo = 'admin' AND attivo = true
  );
$function$;

-- Funzione RPC per consentire all'admin di aggiornare le password degli utenti
CREATE OR REPLACE FUNCTION public.admin_set_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Non autorizzato: Solo gli amministratori possono cambiare le password.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$function$;

-- Funzione RPC per consentire all'admin di eliminare definitivamente un utente
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Non autorizzato: Solo gli amministratori possono eliminare utenti.';
  END IF;

  DELETE FROM auth.users
  WHERE id = target_user_id;
END;
$function$;

-- =========================================================================
-- 4. POLICIES DI ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- POLICIES: PROFILES
DROP POLICY IF EXISTS "Consenti lettura profili a tutti gli utenti loggati" ON public.profiles;
CREATE POLICY "Consenti lettura profili a tutti gli utenti loggati"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Consenti scrittura profili solo ad admin" ON public.profiles;
CREATE POLICY "Consenti scrittura profili solo ad admin"
  ON public.profiles FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

-- POLICIES: CREWS
DROP POLICY IF EXISTS "Consenti lettura equipaggi a tutti gli utenti loggati" ON public.crews;
CREATE POLICY "Consenti lettura equipaggi a tutti gli utenti loggati"
  ON public.crews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Consenti gestione equipaggi solo ad admin" ON public.crews;
CREATE POLICY "Consenti gestione equipaggi solo ad admin"
  ON public.crews FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

-- POLICIES: SHIFTS
DROP POLICY IF EXISTS "Consenti lettura turni a tutti gli utenti loggati" ON public.shifts;
CREATE POLICY "Consenti lettura turni a tutti gli utenti loggati"
  ON public.shifts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Consenti inserimento turni a tutti gli utenti loggati" ON public.shifts;
CREATE POLICY "Consenti inserimento turni a tutti gli utenti loggati"
  ON public.shifts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti modifica turni solo ad admin" ON public.shifts;
CREATE POLICY "Consenti modifica turni solo ad admin"
  ON public.shifts FOR UPDATE TO authenticated USING (public.es_admin());

DROP POLICY IF EXISTS "Consenti cancellazione turni solo ad admin" ON public.shifts;
CREATE POLICY "Consenti cancellazione turni solo ad admin"
  ON public.shifts FOR DELETE TO authenticated USING (public.es_admin());

-- POLICIES: BOOKINGS
DROP POLICY IF EXISTS "Consenti lettura prenotazioni a tutti gli utenti loggati" ON public.bookings;
CREATE POLICY "Consenti lettura prenotazioni a tutti gli utenti loggati"
  ON public.bookings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Consenti inserimento prenotazioni personali o admin" ON public.bookings;
CREATE POLICY "Consenti inserimento prenotazioni personali o admin"
  ON public.bookings FOR INSERT TO authenticated 
  WITH CHECK (
    ((user_id = auth.uid()) AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND attivo = true)))
    OR public.es_admin()
  );

DROP POLICY IF EXISTS "Consenti modifica prenotazioni solo ad admin" ON public.bookings;
CREATE POLICY "Consenti modifica prenotazioni solo ad admin"
  ON public.bookings FOR UPDATE TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS "Consenti cancellazione prenotazioni personali o admin" ON public.bookings;
CREATE POLICY "Consenti cancellazione prenotazioni personali o admin"
  ON public.bookings FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR public.es_admin());

-- POLICIES: CLOCKED_SHIFTS
DROP POLICY IF EXISTS "Consenti lettura timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti lettura timbrature personali o admin"
  ON public.clocked_shifts FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR public.es_admin());

DROP POLICY IF EXISTS "Consenti inserimento timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti inserimento timbrature personali o admin"
  ON public.clocked_shifts FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()) OR public.es_admin());

DROP POLICY IF EXISTS "Consenti modifica timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti modifica timbrature personali o admin"
  ON public.clocked_shifts FOR UPDATE TO authenticated USING (public.es_admin() OR ((user_id = auth.uid()) AND (NOT pagato))) WITH CHECK (public.es_admin() OR ((user_id = auth.uid()) AND (NOT pagato)));

DROP POLICY IF EXISTS "Consenti eliminazione timbrature personali o ad admin" ON public.clocked_shifts;
CREATE POLICY "Consenti eliminazione timbrature personali o ad admin"
  ON public.clocked_shifts FOR DELETE TO authenticated USING (((user_id = auth.uid()) AND (NOT pagato)) OR public.es_admin());

-- POLICIES: VEHICLES
DROP POLICY IF EXISTS "Lettura mezzi a tutti gli utenti loggati" ON public.vehicles;
CREATE POLICY "Lettura mezzi a tutti gli utenti loggati"
  ON public.vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestione mezzi solo ad admin" ON public.vehicles;
CREATE POLICY "Gestione mezzi solo ad admin"
  ON public.vehicles FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

-- POLICIES: TRANSPORTS
DROP POLICY IF EXISTS "Lettura trasporti a tutti gli utenti loggati" ON public.transports;
CREATE POLICY "Lettura trasporti a tutti gli utenti loggati"
  ON public.transports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Consenti inserimento trasporti a tutti gli utenti loggati" ON public.transports;
DROP POLICY IF EXISTS "Inserimento trasporti personale o admin" ON public.transports;
CREATE POLICY "Consenti inserimento trasporti a tutti gli utenti loggati"
  ON public.transports FOR INSERT TO authenticated 
  WITH CHECK (
    public.es_admin() 
    OR (
      (creato_da = auth.uid()) 
      AND (EXISTS (SELECT 1 FROM public.clocked_shifts WHERE clocked_shifts.user_id = auth.uid() AND clocked_shifts.end_time IS NULL))
    )
  );

DROP POLICY IF EXISTS "Consenti modifica trasporti a tutti gli utenti loggati" ON public.transports;
DROP POLICY IF EXISTS "Modifica trasporti equipaggio assegnato o admin" ON public.transports;
CREATE POLICY "Modifica trasporti equipaggio assegnato o admin"
  ON public.transports FOR UPDATE TO authenticated 
  USING (
    public.es_admin() 
    OR (EXISTS (SELECT 1 FROM public.transport_crew tc WHERE tc.transport_id = transports.id AND tc.user_id = auth.uid()))
    OR (
      (stato = 'bozza'::text) 
      AND (
        (creato_da = auth.uid()) 
        OR (EXISTS (SELECT 1 FROM public.shifts s JOIN public.bookings b ON s.id = b.shift_id WHERE s.data = transports.data AND b.user_id = auth.uid()))
      )
    )
  )
  WITH CHECK (
    public.es_admin() 
    OR (EXISTS (SELECT 1 FROM public.transport_crew tc WHERE tc.transport_id = transports.id AND tc.user_id = auth.uid()))
    OR (creato_da = auth.uid()) 
    OR (EXISTS (SELECT 1 FROM public.shifts s JOIN public.bookings b ON s.id = b.shift_id WHERE s.data = transports.data AND b.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Cancellazione trasporti solo admin" ON public.transports;
DROP POLICY IF EXISTS "Consenti cancellazione trasporti solo ad admin" ON public.transports;
DROP POLICY IF EXISTS "Consenti cancellazione trasporti a proprietari e admin" ON public.transports;
CREATE POLICY "Consenti cancellazione trasporti a proprietari e admin"
  ON public.transports FOR DELETE TO authenticated 
  USING (public.es_admin() OR (creato_da = auth.uid()));

-- POLICIES: TRANSPORT_CREW
DROP POLICY IF EXISTS "Lettura equipaggio trasporto a tutti" ON public.transport_crew;
CREATE POLICY "Lettura equipaggio trasporto a tutti"
  ON public.transport_crew FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Scrittura equipaggio trasporto membri o admin" ON public.transport_crew;
DROP POLICY IF EXISTS "Consenti modifica equipaggio trasporti a tutti gli utenti logga" ON public.transport_crew;
CREATE POLICY "Scrittura equipaggio trasporto membri o admin"
  ON public.transport_crew FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti cancellazione equipaggio trasporti ad admin o interess" ON public.transport_crew;
DROP POLICY IF EXISTS "Consenti cancellazione equipaggio trasporti ad admin o interessato" ON public.transport_crew;
DROP POLICY IF EXISTS "Consenti cancellazione equipaggio trasporti ad admin o interessato o proprietario trasporto" ON public.transport_crew;
CREATE POLICY "Consenti cancellazione equipaggio trasporti ad admin o interessato o proprietario trasporto"
  ON public.transport_crew FOR DELETE TO authenticated 
  USING (
    (user_id = auth.uid()) 
    OR public.es_admin() 
    OR (EXISTS (SELECT 1 FROM public.transports WHERE transports.id = transport_crew.transport_id AND transports.creato_da = auth.uid()))
  );

-- POLICIES: TRANSPORT_HANDOFFS
DROP POLICY IF EXISTS "Lettura passaggi a tutti" ON public.transport_handoffs;
CREATE POLICY "Lettura passaggi a tutti"
  ON public.transport_handoffs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inserimento passaggi membri equipaggio o admin" ON public.transport_handoffs;
CREATE POLICY "Inserimento passaggi membri equipaggio o admin"
  ON public.transport_handoffs FOR INSERT TO authenticated 
  WITH CHECK (
    public.es_admin() 
    OR (EXISTS (SELECT 1 FROM public.transport_crew tc WHERE tc.transport_id = transport_handoffs.transport_id AND tc.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Consenti cancellazione passaggi di consegne ad admin" ON public.transport_handoffs;
DROP POLICY IF EXISTS "Consenti cancellazione passaggi di consegne ad admin o propriet" ON public.transport_handoffs;
DROP POLICY IF EXISTS "Consenti cancellazione passaggi di consegne ad admin o proprietario trasporto" ON public.transport_handoffs;
CREATE POLICY "Consenti cancellazione passaggi di consegne ad admin o proprietario trasporto"
  ON public.transport_handoffs FOR DELETE TO authenticated 
  USING (
    public.es_admin() 
    OR (EXISTS (SELECT 1 FROM public.transports WHERE transports.id = transport_handoffs.transport_id AND transports.creato_da = auth.uid()))
  );

-- POLICIES: NOTIFICATIONS
DROP POLICY IF EXISTS "Consenti lettura notifiche solo ad admin" ON public.notifications;
CREATE POLICY "Consenti lettura notifiche solo ad admin"
  ON public.notifications FOR SELECT TO authenticated USING (public.es_admin());

DROP POLICY IF EXISTS "Consenti inserimento notifiche a tutti" ON public.notifications;
CREATE POLICY "Consenti inserimento notifiche a tutti"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- POLICIES: TELEGRAM_SETTINGS
DROP POLICY IF EXISTS "Consenti gestione impostazioni telegram solo ad admin" ON public.telegram_settings;
CREATE POLICY "Consenti gestione impostazioni telegram solo ad admin"
  ON public.telegram_settings FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

-- =========================================================================
-- 5. TRIGGER E LOGICA APPLICATIVA
-- =========================================================================

-- Trigger per aggiornare automaticamente updated_at dei trasporti
CREATE OR REPLACE FUNCTION public.touch_transport_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_touch_transport_updated_at ON public.transports;
CREATE TRIGGER tr_touch_transport_updated_at
  BEFORE UPDATE ON public.transports
  FOR EACH ROW EXECUTE FUNCTION public.touch_transport_updated_at();

-- Trigger prima dell'inserimento in auth.users per auto-confermare l'account
CREATE OR REPLACE FUNCTION public.handle_auth_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
CREATE TRIGGER on_auth_user_before_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_before_insert();

-- Trigger dopo l'inserimento in auth.users per sincronizzare public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val text;
  ruolo_val text;
  nome_val text;
  cognome_val text;
  cf_val text;
  email_val text;
  tel_val text;
  dob_val date;
  stato_val text;
  qual_val text;
  paga_val numeric;
BEGIN
  username_val := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'username', ''), split_part(NEW.email, '@', 1));
  ruolo_val := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'ruolo', ''), 'dipendente');
  nome_val := NULLIF(NEW.raw_user_meta_data ->> 'nome', '');
  cognome_val := NULLIF(NEW.raw_user_meta_data ->> 'cognome', '');
  cf_val := NULLIF(NEW.raw_user_meta_data ->> 'codice_fiscale', '');
  email_val := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'email', ''), NEW.email);
  tel_val := NULLIF(NEW.raw_user_meta_data ->> 'telefono', '');
  dob_val := NULLIF(NEW.raw_user_meta_data ->> 'data_nascita', '')::date;
  stato_val := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'stato', ''), ruolo_val);
  qual_val := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'qualifica', ''), 'CE');
  paga_val := NULLIF(NEW.raw_user_meta_data ->> 'paga_oraria', '')::numeric;

  IF stato_val = 'admin' THEN
    ruolo_val := 'admin';
  ELSE
    ruolo_val := 'dipendente';
  END IF;

  INSERT INTO public.profiles (
    id, username, ruolo, attivo, nome, cognome, codice_fiscale, email, telefono, data_nascita, stato, qualifica, paga_oraria
  )
  VALUES (
    NEW.id, username_val, ruolo_val, true, nome_val, cognome_val, cf_val, email_val, tel_val, dob_val, stato_val, qual_val, paga_val
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    username = EXCLUDED.username, 
    ruolo = EXCLUDED.ruolo,
    nome = EXCLUDED.nome,
    cognome = EXCLUDED.cognome,
    codice_fiscale = EXCLUDED.codice_fiscale,
    email = EXCLUDED.email,
    telefono = EXCLUDED.telefono,
    data_nascita = EXCLUDED.data_nascita,
    stato = EXCLUDED.stato,
    qualifica = EXCLUDED.qualifica,
    paga_oraria = EXCLUDED.paga_oraria;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- Trigger: Registrazione di un nuovo profilo
CREATE OR REPLACE FUNCTION public.on_profile_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (tipo, messaggio, creato_da)
  VALUES (
    'registrazione',
    concat('Nuovo utente registrato in piattaforma: "', COALESCE(NEW.username, 'Utente'), '" con stato "', COALESCE(NEW.stato, 'volontario'), '".'),
    COALESCE(NEW.username, 'Utente')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profile_created ON public.profiles;
CREATE TRIGGER tr_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.on_profile_created();

-- Trigger: Modifica di un profilo (attivo/disattivo o stato)
CREATE OR REPLACE FUNCTION public.on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
  msg text;
BEGIN
  IF OLD.stato IS DISTINCT FROM NEW.stato OR OLD.attivo IS DISTINCT FROM NEW.attivo THEN
    SELECT COALESCE(username, 'Sistema') INTO actor_name FROM public.profiles WHERE id = auth.uid();
    actor_name := COALESCE(actor_name, 'Sistema');

    msg := concat(
      'Profilo di ', COALESCE(NEW.username, 'Utente'), ' aggiornato: ',
      CASE WHEN OLD.stato IS DISTINCT FROM NEW.stato THEN concat('Stato modificato da ', COALESCE(OLD.stato, 'N/D'), ' a ', COALESCE(NEW.stato, 'N/D'), '. ') ELSE '' END,
      CASE WHEN OLD.attivo IS DISTINCT FROM NEW.attivo THEN concat('Stato attivo cambiato da ', OLD.attivo::text, ' a ', NEW.attivo::text, '.') ELSE '' END
    );

    INSERT INTO public.notifications (tipo, messaggio, creato_da)
    VALUES (
      'profilo_modificato',
      COALESCE(msg, 'Profilo utente aggiornato.'),
      COALESCE(actor_name, 'Sistema')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profile_update ON public.profiles;
CREATE TRIGGER tr_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.on_profile_update();

-- Trigger: Modifica dei chilometri attuali del veicolo al termine di un trasporto
CREATE OR REPLACE FUNCTION public.on_transport_terminato()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
  FOR EACH ROW EXECUTE FUNCTION public.on_transport_terminato();

-- Trigger: Creazione, Modifica o Cancellazione di prenotazioni turni (STATEMENT LEVEL)
CREATE OR REPLACE FUNCTION public.on_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count int;
  deleted_count int;
  updated_count int;
  actor_name text;
  msg text;
  action_type text;
  r RECORD;
  user_name text;
  shift_date date;
  shift_time time;
  shift_end_time time;
  role_name text;
  booking_user_id uuid;
BEGIN
  SELECT COALESCE(username, 'Sistema') INTO actor_name FROM public.profiles WHERE id = auth.uid();
  actor_name := COALESCE(actor_name, 'Sistema');

  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO inserted_count FROM new_table;
    
    IF inserted_count = 1 THEN
      SELECT * INTO r FROM new_table LIMIT 1;
      SELECT COALESCE(username, 'Utente'), id INTO user_name, booking_user_id FROM public.profiles WHERE id = r.user_id;
      SELECT data, ora_inizio, ora_fine INTO shift_date, shift_time, shift_end_time FROM public.shifts WHERE id = r.shift_id;
      role_name := COALESCE(r.ruolo_turno, 'ruolo');
      action_type := 'prenotazione_creata';
      
      msg := concat(
        'Il dipendente ', user_name, ' si è prenotato per il turno del ', 
        to_char(COALESCE(shift_date, CURRENT_DATE), 'DD/MM/YYYY'), 
        ' (', 
        CASE 
          WHEN r.is_partial = true THEN concat(to_char(r.ora_inizio_effettiva, 'HH24:MI'), '-', to_char(r.ora_fine_effettiva, 'HH24:MI'), ' [Parziale]')
          ELSE concat(to_char(shift_time, 'HH24:MI'), '-', to_char(shift_end_time, 'HH24:MI'))
        END,
        ') nel ruolo "', role_name, '".',
        CASE WHEN actor_name <> user_name THEN concat(' (Assegnato dall''amministratore: ', actor_name, ')') ELSE '' END
      );
      
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (action_type, msg, actor_name);
      
    ELSIF inserted_count > 1 THEN
      SELECT COUNT(DISTINCT user_id) INTO inserted_count FROM new_table;
      
      IF inserted_count = 1 THEN
        SELECT COALESCE(p.username, 'Utente') INTO user_name FROM new_table n JOIN public.profiles p ON p.id = n.user_id LIMIT 1;
        msg := concat('Il dipendente ', user_name, ' ha inserito prenotazioni multiple (bulk):');
      ELSE
        msg := 'Inserite prenotazioni multiple (bulk) per più utenti:';
      END IF;
      
      FOR r IN (
        SELECT n.*, s.data, s.ora_inizio, s.ora_fine, p.username 
        FROM new_table n
        JOIN public.shifts s ON s.id = n.shift_id
        LEFT JOIN public.profiles p ON p.id = n.user_id
        ORDER BY s.data, s.ora_inizio
      ) LOOP
        msg := concat(
          msg, chr(10), 
          '- ', to_char(r.data, 'DD/MM/YYYY'), 
          ' (',
          CASE 
            WHEN r.is_partial = true THEN concat(to_char(r.ora_inizio_effettiva, 'HH24:MI'), '-', to_char(r.ora_fine_effettiva, 'HH24:MI'), ' [Parziale]')
            ELSE concat(to_char(r.ora_inizio, 'HH24:MI'), '-', to_char(r.ora_fine, 'HH24:MI'))
          END,
          ') come "', r.ruolo_turno, '"',
          CASE WHEN inserted_count > 1 THEN concat(' per ', r.username) ELSE '' END
        );
      END LOOP;
      
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES ('prenotazione_creata_bulk', msg, actor_name);
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO deleted_count FROM old_table;
    
    IF deleted_count = 1 THEN
      SELECT * INTO r FROM old_table LIMIT 1;
      SELECT COALESCE(username, 'Utente'), id INTO user_name, booking_user_id FROM public.profiles WHERE id = r.user_id;
      SELECT data, ora_inizio, ora_fine INTO shift_date, shift_time, shift_end_time FROM public.shifts WHERE id = r.shift_id;
      role_name := COALESCE(r.ruolo_turno, 'ruolo');
      action_type := 'prenotazione_cancellata';
      
      msg := concat(
        'Il dipendente ', user_name, ' ha cancellato la prenotazione per il turno del ', 
        to_char(COALESCE(shift_date, CURRENT_DATE), 'DD/MM/YYYY'), 
        ' (', 
        CASE 
          WHEN r.is_partial = true THEN concat(to_char(r.ora_inizio_effettiva, 'HH24:MI'), '-', to_char(r.ora_fine_effettiva, 'HH24:MI'), ' [Parziale]')
          ELSE concat(to_char(shift_time, 'HH24:MI'), '-', to_char(shift_end_time, 'HH24:MI'))
        END,
        ') nel ruolo "', role_name, '".',
        CASE WHEN actor_name <> user_name THEN concat(' (Cancellato dall''amministratore: ', actor_name, ')') ELSE '' END
      );
      
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (action_type, msg, actor_name);
      
    ELSIF deleted_count > 1 THEN
      SELECT COUNT(DISTINCT user_id) INTO deleted_count FROM old_table;
      
      IF deleted_count = 1 THEN
        SELECT COALESCE(p.username, 'Utente') INTO user_name FROM old_table o JOIN public.profiles p ON p.id = o.user_id LIMIT 1;
        msg := concat('Il dipendente ', user_name, ' ha cancellato prenotazioni multiple (bulk):');
      ELSE
        msg := 'Cancellate prenotazioni multiple (bulk) per più utenti:';
      END IF;
      
      FOR r IN (
        SELECT o.*, s.data, s.ora_inizio, s.ora_fine, p.username 
        FROM old_table o
        JOIN public.shifts s ON s.id = o.shift_id
        LEFT JOIN public.profiles p ON p.id = o.user_id
        ORDER BY s.data, s.ora_inizio
      ) LOOP
        msg := concat(
          msg, chr(10), 
          '- ', to_char(r.data, 'DD/MM/YYYY'), 
          ' (',
          CASE 
            WHEN r.is_partial = true THEN concat(to_char(r.ora_inizio_effettiva, 'HH24:MI'), '-', to_char(r.ora_fine_effettiva, 'HH24:MI'), ' [Parziale]')
            ELSE concat(to_char(r.ora_inizio, 'HH24:MI'), '-', to_char(r.ora_fine, 'HH24:MI'))
          END,
          ') come "', r.ruolo_turno, '"',
          CASE WHEN deleted_count > 1 THEN concat(' per ', r.username) ELSE '' END
        );
      END LOOP;
      
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES ('prenotazione_cancellata_bulk', msg, actor_name);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) INTO updated_count FROM new_table;
    
    IF updated_count = 1 THEN
      SELECT * INTO r FROM new_table LIMIT 1;
      SELECT COALESCE(username, 'Utente') INTO user_name FROM public.profiles WHERE id = r.user_id;
      SELECT data, ora_inizio, ora_fine INTO shift_date, shift_time, shift_end_time FROM public.shifts WHERE id = r.shift_id;
      role_name := COALESCE(r.ruolo_turno, 'ruolo');
      action_type := 'prenotazione_modificata';
      
      msg := concat(
        'La prenotazione del dipendente ', user_name, ' per il turno del ', 
        to_char(COALESCE(shift_date, CURRENT_DATE), 'DD/MM/YYYY'), 
        ' è stata modificata (Ruolo: "', role_name, '", Fascia: ',
        CASE 
          WHEN r.is_partial = true THEN concat(to_char(r.ora_inizio_effettiva, 'HH24:MI'), '-', to_char(r.ora_fine_effettiva, 'HH24:MI'), ' [Parziale]')
          ELSE concat(to_char(shift_time, 'HH24:MI'), '-', to_char(shift_end_time, 'HH24:MI'))
        END,
        ').',
        ' (Modificato da: ', actor_name, ')'
      );
      
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (action_type, msg, actor_name);
      
    ELSIF updated_count > 1 THEN
      SELECT COUNT(DISTINCT user_id) INTO updated_count FROM new_table;
      
      IF updated_count = 1 THEN
        SELECT COALESCE(p.username, 'Utente') INTO user_name FROM new_table n JOIN public.profiles p ON p.id = n.user_id LIMIT 1;
        msg := concat('Le prenotazioni del dipendente ', user_name, ' sono state modificate in bulk:');
      ELSE
        msg := 'Modificate prenotazioni multiple (bulk) per più utenti:';
      END IF;
      
      FOR r IN (
        SELECT n.*, s.data, s.ora_inizio, s.ora_fine, p.username 
        FROM new_table n
        JOIN public.shifts s ON s.id = n.shift_id
        LEFT JOIN public.profiles p ON p.id = n.user_id
        ORDER BY s.data, s.ora_inizio
      ) LOOP
        msg := concat(
          msg, chr(10), 
          '- ', to_char(r.data, 'DD/MM/YYYY'), 
          ' (',
          CASE 
            WHEN r.is_partial = true THEN concat(to_char(r.ora_inizio_effettiva, 'HH24:MI'), '-', to_char(r.ora_fine_effettiva, 'HH24:MI'), ' [Parziale]')
            ELSE concat(to_char(r.ora_inizio, 'HH24:MI'), '-', to_char(r.ora_fine, 'HH24:MI'))
          END,
          ') come "', r.ruolo_turno, '"',
          CASE WHEN updated_count > 1 THEN concat(' per ', r.username) ELSE '' END
        );
      END LOOP;
      
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES ('prenotazione_modificata_bulk', msg, actor_name);
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Collega i trigger STATEMENT LEVEL per bookings
DROP TRIGGER IF EXISTS tr_booking_insert ON public.bookings;
CREATE TRIGGER tr_booking_insert
  AFTER INSERT ON public.bookings
  REFERENCING NEW TABLE AS new_table
  FOR EACH STATEMENT EXECUTE PROCEDURE public.on_booking_change();

DROP TRIGGER IF EXISTS tr_booking_update ON public.bookings;
CREATE TRIGGER tr_booking_update
  AFTER UPDATE ON public.bookings
  REFERENCING NEW TABLE AS new_table OLD TABLE AS old_table
  FOR EACH STATEMENT EXECUTE PROCEDURE public.on_booking_change();

DROP TRIGGER IF EXISTS tr_booking_delete ON public.bookings;
CREATE TRIGGER tr_booking_delete
  AFTER DELETE ON public.bookings
  REFERENCING OLD TABLE AS old_table
  FOR EACH STATEMENT EXECUTE PROCEDURE public.on_booking_change();

-- -------------------------------------------------------------------------
-- Trigger e Logica per tracciare le timbrature dei turni (Clocked Shifts)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_clocked_shift_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val text;
BEGIN
  SELECT COALESCE(username, 'Utente') INTO username_val FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (tipo, messaggio, creato_da)
    VALUES (
      'timbratura_inizio',
      concat('Turno iniziato alle ', to_char(NEW.start_time AT TIME ZONE 'Europe/Rome', 'HH24:MI:SS'), ' del ', to_char(NEW.start_time AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY')),
      username_val
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (
        'timbratura_fine',
        concat('Turno concluso alle ', to_char(NEW.end_time AT TIME ZONE 'Europe/Rome', 'HH24:MI:SS'), ' del ', to_char(NEW.end_time AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY')),
        username_val
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_clocked_shift_change ON public.clocked_shifts;
CREATE TRIGGER tr_clocked_shift_change
  AFTER INSERT OR UPDATE ON public.clocked_shifts
  FOR EACH ROW EXECUTE FUNCTION public.on_clocked_shift_change();

-- -------------------------------------------------------------------------
-- Trigger e Logica per tracciare le azioni dei trasporti
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_transport_notification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name text;
  new_creator_name text;
  actor_name text;
  veh_name text := 'N/D';
BEGIN
  SELECT COALESCE(username, 'Sistema') INTO actor_name FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(username, 'Utente') INTO creator_name FROM public.profiles WHERE id = NEW.creato_da;
    
    IF NEW.stato = 'programmato' THEN
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (
        'trasporto_creato',
        concat('Creato trasporto programmato #', NEW.id, ' per il ', to_char(NEW.data, 'DD/MM/YYYY'), ' alle ', COALESCE(to_char(NEW.ora_servizio, 'HH24:MI'), 'N/D'), ' (Da: ', COALESCE(NEW.da_nome, NEW.da_via, 'N/D'), ' A: ', COALESCE(NEW.a_nome, NEW.a_via, 'N/D'), ')'),
        creator_name
      );
    ELSE
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (
        'trasporto_attivato',
        concat('Avviato trasporto attivo #', NEW.id, ' (Da: ', COALESCE(NEW.da_nome, NEW.da_via, 'N/D'), ' A: ', COALESCE(NEW.a_nome, NEW.a_via, 'N/D'), ')'),
        creator_name
      );
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(username, 'Utente') INTO creator_name FROM public.profiles WHERE id = NEW.creato_da;
    
    -- Caso A: Attivazione di un trasporto programmato (lo stato passa da 'programmato' a 'attivo')
    IF OLD.stato = 'programmato' AND NEW.stato = 'attivo' THEN
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (
        'trasporto_attivato',
        concat('Attivato trasporto programmato #', NEW.id, ' (Da: ', COALESCE(NEW.da_nome, NEW.da_via, 'N/D'), ' A: ', COALESCE(NEW.a_nome, NEW.a_via, 'N/D'), ')'),
        creator_name
      );
      
    -- Caso B: Conclusione di un trasporto attivo (lo stato passa da 'attivo' a 'terminato')
    ELSIF OLD.stato = 'attivo' AND NEW.stato = 'terminato' THEN
      IF NEW.vehicle_id IS NOT NULL THEN
        SELECT COALESCE(nome, 'Mezzo') INTO veh_name FROM public.vehicles WHERE id = NEW.vehicle_id;
      END IF;
      
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (
        'trasporto_concluso',
        concat('Concluso trasporto #', NEW.id, ' (Mezzo: ', veh_name, ', KM Finali: ', COALESCE(NEW.km_finali::text, 'N/D'), ', Note: ', COALESCE(NEW.note, 'Nessuna'), ')'),
        creator_name
      );
      
    -- Caso C: Trasferimento di proprietario/creatore (cambio autore)
    ELSIF OLD.creato_da IS DISTINCT FROM NEW.creato_da THEN
      SELECT COALESCE(username, 'Utente') INTO new_creator_name FROM public.profiles WHERE id = NEW.creato_da;
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (
        'trasporto_trasferito',
        concat('Trasferito trasporto #', NEW.id, ' da ', creator_name, ' a ', new_creator_name),
        actor_name
      );
    END IF;

    -- Caso D: Cambio dello stato del percorso (stato_trasporto)
    IF OLD.stato_trasporto IS DISTINCT FROM NEW.stato_trasporto AND OLD.stato_trasporto IS NOT NULL AND NEW.stato_trasporto IS NOT NULL THEN
      INSERT INTO public.notifications (tipo, messaggio, creato_da)
      VALUES (
        'trasporto_stato_modificato',
        concat('Stato del trasporto #', NEW.id, ' cambiato in: ', NEW.stato_trasporto),
        actor_name
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(username, 'Utente') INTO creator_name FROM public.profiles WHERE id = OLD.creato_da;
    INSERT INTO public.notifications (tipo, messaggio, creato_da)
    VALUES (
      'trasporto_eliminato',
      concat('Eliminato/Annullato trasporto #', OLD.id, ' (Da: ', COALESCE(OLD.da_nome, OLD.da_via, 'N/D'), ' A: ', COALESCE(OLD.a_nome, OLD.a_via, 'N/D'), ')'),
      actor_name
    );
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_transport_notification_change ON public.transports;
CREATE TRIGGER tr_transport_notification_change
  AFTER INSERT OR UPDATE OR DELETE ON public.transports
  FOR EACH ROW EXECUTE FUNCTION public.on_transport_notification_change();

-- Funzione e Trigger per inviare le notifiche a Telegram tramite pg_net
CREATE OR REPLACE FUNCTION public.send_notification_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  telegram_token text;
  telegram_chat_id text;
  title_text text;
  formatted_msg text;
BEGIN
  -- Verifica se le notifiche per questo tipo di evento sono abilitate
  IF EXISTS (
    SELECT 1 FROM public.telegram_settings 
    WHERE tipo = NEW.tipo AND attivo = false
  ) THEN
    RETURN NEW;
  END IF;

  -- Recupera il token dal Supabase Vault
  BEGIN
    SELECT decrypted_secret INTO telegram_token 
    FROM vault.decrypted_secrets 
    WHERE name = 'telegram_token' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    telegram_token := NULL;
  END;

  -- Recupera il chat ID dal Supabase Vault
  BEGIN
    SELECT decrypted_secret INTO telegram_chat_id 
    FROM vault.decrypted_secrets 
    WHERE name = 'telegram_chat_id' 
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    telegram_chat_id := NULL;
  END;

  -- Se il token o il chat_id non sono configurati nel Vault, esce senza errori
  IF telegram_token IS NULL OR telegram_chat_id IS NULL THEN
     RETURN NEW;
  END IF;

  -- Determina il titolo del messaggio in base al tipo di notifica (incluso l'emoji e il grassetto)
  CASE NEW.tipo
    WHEN 'timbratura_inizio' THEN title_text := '🟢 <b>Turno timbrato</b>';
    WHEN 'timbratura_fine' THEN title_text := '🔴 <b>Turno concluso</b>';
    WHEN 'trasporto_creato' THEN title_text := '📅 <b>Trasporto creato</b>';
    WHEN 'trasporto_attivato' THEN title_text := '🚑 <b>Trasporto iniziato</b>';
    WHEN 'trasporto_stato_modificato' THEN title_text := '🚑 <b>Stato Trasporto</b>';
    WHEN 'trasporto_concluso' THEN title_text := '🏁 <b>Trasporto concluso</b>';
    WHEN 'trasporto_eliminato' THEN title_text := '🗑️ <b>Trasporto eliminato</b>';
    WHEN 'trasporto_trasferito' THEN title_text := '🔄 <b>Trasporto trasferito</b>';
    WHEN 'registrazione' THEN title_text := '🆕 <b>Registrazione nuovo utente</b>';
    WHEN 'prenotazione_creata' THEN title_text := '✅ <b>Prenotazione turno</b>';
    WHEN 'prenotazione_creata_bulk' THEN title_text := '✅ <b>Prenotazioni multiple (Bulk)</b>';
    WHEN 'prenotazione_cancellata' THEN title_text := '❌ <b>Prenotazione cancellata</b>';
    WHEN 'prenotazione_cancellata_bulk' THEN title_text := '❌ <b>Prenotazioni cancellate (Bulk)</b>';
    WHEN 'prenotazione_modificata' THEN title_text := '🔄 <b>Prenotazione modificata</b>';
    WHEN 'profilo_modificato' THEN title_text := '👤 <b>Profilo modificato</b>';
    WHEN 'accesso_admin' THEN title_text := '🚨 <b>Accesso Amministratore</b>';
    WHEN 'annuncio' THEN title_text := '📢 <b>Annuncio di Servizio</b>';
    ELSE title_text := '🔔 <b>GM Turni - Notifica</b>';
  END CASE;

  -- Formatta il messaggio secondo la struttura richiesta dall'utente, stampando il titolo in prima riga senza etichette
  formatted_msg := concat(
    title_text, chr(10), chr(10),
    '👤 <b>Utente:</b> ', COALESCE(NEW.creato_da, 'Sistema'), chr(10),
    '📝 <b>Azione:</b> ', COALESCE(NEW.messaggio, 'Notifica'), chr(10),
    '⏰ <b>Ora:</b> ', to_char(COALESCE(NEW.created_at, now()) AT TIME ZONE 'Europe/Rome', 'HH24:MI "del" DD/MM/YYYY')
  );

  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot' || telegram_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'chat_id', telegram_chat_id,
      'text', formatted_msg,
      'parse_mode', 'HTML'
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_send_notification_telegram ON public.notifications;
CREATE TRIGGER tr_send_notification_telegram
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE PROCEDURE public.send_notification_telegram();

-- =========================================================================
-- 6. SEED DATA (DATI INIZIALI DI TEST)
-- =========================================================================

-- Inserisci equipaggio predefinito
INSERT INTO public.crews (nome, attivo)
VALUES ('Equipaggio 1', true)
ON CONFLICT (nome) DO NOTHING;

-- Inserisci veicoli predefiniti
INSERT INTO public.vehicles (nome, targa, attivo, km_attuali)
VALUES 
  ('Ambulanza 1', 'AM123BU', true, 120500),
  ('Ambulanza 2', 'AM456BU', true, 89400),
  ('Auto Medica', 'MD789MD', true, 45200),
  ('Mezzo Disabili', 'DS321DB', true, 15300)
ON CONFLICT (nome) DO NOTHING;

-- Inserisci impostazioni notifiche Telegram predefinite
INSERT INTO public.telegram_settings (tipo, attivo)
VALUES
  ('timbratura_inizio', true),
  ('timbratura_fine', true),
  ('trasporto_creato', true),
  ('trasporto_attivato', true),
  ('trasporto_stato_modificato', true),
  ('trasporto_concluso', true),
  ('trasporto_eliminato', true),
  ('trasporto_trasferito', true),
  ('registrazione', true),
  ('prenotazione_creata', true),
  ('prenotazione_creata_bulk', true),
  ('prenotazione_cancellata', true),
  ('prenotazione_cancellata_bulk', true),
  ('prenotazione_modificata', true),
  ('profilo_modificato', true),
  ('accesso_admin', true)
ON CONFLICT (tipo) DO NOTHING;

-- Crea l'utente admin iniziale in auth.users
DO $$
DECLARE
  admin_uuid uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Elimina eventuale record admin preesistente per resettarlo con i dati corretti
  DELETE FROM auth.users WHERE id = admin_uuid;

  -- Inserimento in auth.users (password di test: admin12345)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    admin_uuid,
    '00000000-0000-0000-0000-000000000000',
    'admin@app.internal',
    crypt('admin12345', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"admin","ruolo":"admin"}'::jsonb,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  );

  -- Inserimento in auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    admin_uuid,
    admin_uuid,
    jsonb_build_object('sub', admin_uuid, 'email', 'admin@app.internal'),
    'email',
    admin_uuid::text,
    now(),
    now(),
    now()
  );
END $$;
