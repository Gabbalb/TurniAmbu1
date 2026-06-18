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
  last_device_id text
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
  -- Previene duplicati accidentali di turni per lo stesso equipaggio nello stesso orario/giorno
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
  created_at timestamptz DEFAULT now() NOT NULL
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
  nome text NOT NULL,
  targa text,
  attivo boolean DEFAULT true NOT NULL,
  km_attuali numeric DEFAULT 0 NOT NULL
);

-- Tabella Trasporti
CREATE TABLE IF NOT EXISTS public.transports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift_id bigint REFERENCES public.shifts(id) ON DELETE SET NULL,
  data date NOT NULL,
  stato text NOT NULL,
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
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabella Equipaggio Trasporti
CREATE TABLE IF NOT EXISTS public.transport_crew (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transport_id bigint REFERENCES public.transports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ruolo text NOT NULL,
  vehicle_id bigint REFERENCES public.vehicles(id) ON DELETE SET NULL,
  attivo boolean DEFAULT true NOT NULL,
  ora_inizio_ruolo timestamptz NOT NULL,
  ora_fine_ruolo timestamptz,
  is_partial boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
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

-- =========================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Abilita RLS su tutte le tabelle
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

-- Funzione helper per verificare se l'utente è un admin (evita ricorsione RLS)
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND ruolo = 'admin' AND attivo = true
  );
$$;

-- Policies per PROFILES
DROP POLICY IF EXISTS "Consenti lettura profili a tutti gli utenti loggati" ON public.profiles;
CREATE POLICY "Consenti lettura profili a tutti gli utenti loggati"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Consenti scrittura profili solo ad admin" ON public.profiles;
CREATE POLICY "Consenti scrittura profili solo ad admin"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Policies per CREWS
DROP POLICY IF EXISTS "Consenti lettura equipaggi a tutti gli utenti loggati" ON public.crews;
CREATE POLICY "Consenti lettura equipaggi a tutti gli utenti loggati"
  ON public.crews FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Consenti gestione equipaggi solo ad admin" ON public.crews;
CREATE POLICY "Consenti gestione equipaggi solo ad admin"
  ON public.crews FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Policies per SHIFTS
DROP POLICY IF EXISTS "Consenti lettura turni a tutti gli utenti loggati" ON public.shifts;
CREATE POLICY "Consenti lettura turni a tutti gli utenti loggati"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Consenti inserimento turni a tutti gli utenti loggati" ON public.shifts;
CREATE POLICY "Consenti inserimento turni a tutti gli utenti loggati"
  ON public.shifts FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti modifica turni solo ad admin" ON public.shifts;
CREATE POLICY "Consenti modifica turni solo ad admin"
  ON public.shifts FOR UPDATE
  TO authenticated
  USING (public.es_admin());

DROP POLICY IF EXISTS "Consenti cancellazione turni solo ad admin" ON public.shifts;
CREATE POLICY "Consenti cancellazione turni solo ad admin"
  ON public.shifts FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- Policies per BOOKINGS
DROP POLICY IF EXISTS "Consenti lettura prenotazioni a tutti gli utenti loggati" ON public.bookings;
CREATE POLICY "Consenti lettura prenotazioni a tutti gli utenti loggati"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Consenti inserimento prenotazioni personali o admin" ON public.bookings;
CREATE POLICY "Consenti inserimento prenotazioni personali o admin"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND attivo = true))
    OR public.es_admin()
  );

DROP POLICY IF EXISTS "Consenti modifica prenotazioni solo ad admin" ON public.bookings;
CREATE POLICY "Consenti modifica prenotazioni solo ad admin"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS "Consenti cancellazione prenotazioni personali o admin" ON public.bookings;
CREATE POLICY "Consenti cancellazione prenotazioni personali o admin"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.es_admin()
  );

-- Policies per CLOCKED_SHIFTS
DROP POLICY IF EXISTS "Consenti lettura timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti lettura timbrature personali o admin"
  ON public.clocked_shifts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS "Consenti inserimento timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti inserimento timbrature personali o admin"
  ON public.clocked_shifts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS "Consenti modifica timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti modifica timbrature personali o admin"
  ON public.clocked_shifts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.es_admin())
  WITH CHECK (user_id = auth.uid() OR public.es_admin());

DROP POLICY IF EXISTS "Consenti eliminazione timbrature ad admin" ON public.clocked_shifts;
CREATE POLICY "Consenti eliminazione timbrature ad admin"
  ON public.clocked_shifts FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- Policies per VEHICLES
DROP POLICY IF EXISTS "Consenti lettura veicoli a tutti gli utenti loggati" ON public.vehicles;
CREATE POLICY "Consenti lettura veicoli a tutti gli utenti loggati"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Consenti inserimento veicoli ad admin" ON public.vehicles;
CREATE POLICY "Consenti inserimento veicoli ad admin"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS "Consenti modifica veicoli a utenti loggati" ON public.vehicles;
CREATE POLICY "Consenti modifica veicoli a utenti loggati"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti eliminazione veicoli ad admin" ON public.vehicles;
CREATE POLICY "Consenti eliminazione veicoli ad admin"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- Policies per TRANSPORTS
DROP POLICY IF EXISTS "Consenti lettura trasporti a tutti gli utenti loggati" ON public.transports;
CREATE POLICY "Consenti lettura trasporti a tutti gli utenti loggati"
  ON public.transports FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Consenti inserimento trasporti a tutti gli utenti loggati" ON public.transports;
CREATE POLICY "Consenti inserimento trasporti a tutti gli utenti loggati"
  ON public.transports FOR INSERT
  TO authenticated
  WITH CHECK (
    public.es_admin() OR 
    (
      creato_da = auth.uid() AND
      EXISTS (
        SELECT 1 FROM public.clocked_shifts
        WHERE user_id = auth.uid() AND end_time IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "Consenti modifica trasporti a tutti gli utenti loggati" ON public.transports;
CREATE POLICY "Consenti modifica trasporti a tutti gli utenti loggati"
  ON public.transports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti cancellazione trasporti solo ad admin" ON public.transports;
CREATE POLICY "Consenti cancellazione trasporti solo ad admin"
  ON public.transports FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- Policies per TRANSPORT_CREW
DROP POLICY IF EXISTS "Consenti lettura equipaggio trasporti a tutti gli utenti loggati" ON public.transport_crew;
CREATE POLICY "Consenti lettura equipaggio trasporti a tutti gli utenti loggati"
  ON public.transport_crew FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Consenti inserimento equipaggio trasporti a tutti gli utenti loggati" ON public.transport_crew;
CREATE POLICY "Consenti inserimento equipaggio trasporti a tutti gli utenti loggati"
  ON public.transport_crew FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti modifica equipaggio trasporti a tutti gli utenti loggati" ON public.transport_crew;
CREATE POLICY "Consenti modifica equipaggio trasporti a tutti gli utenti loggati"
  ON public.transport_crew FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti cancellazione equipaggio trasporti ad admin o interessato" ON public.transport_crew;
CREATE POLICY "Consenti cancellazione equipaggio trasporti ad admin o interessato"
  ON public.transport_crew FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.es_admin());

-- Policies per TRANSPORT_HANDOFFS
DROP POLICY IF EXISTS "Consenti lettura passaggi di consegne a tutti gli utenti loggati" ON public.transport_handoffs;
CREATE POLICY "Consenti lettura passaggi di consegne a tutti gli utenti loggati"
  ON public.transport_handoffs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Consenti inserimento passaggi di consegne a tutti gli utenti loggati" ON public.transport_handoffs;
CREATE POLICY "Consenti inserimento passaggi di consegne a tutti gli utenti loggati"
  ON public.transport_handoffs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti modifica passaggi di consegne a tutti gli utenti loggati" ON public.transport_handoffs;
CREATE POLICY "Consenti modifica passaggi di consegne a tutti gli utenti loggati"
  ON public.transport_handoffs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Consenti cancellazione passaggi di consegne ad admin" ON public.transport_handoffs;
CREATE POLICY "Consenti cancellazione passaggi di consegne ad admin"
  ON public.transport_handoffs FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- Policies per NOTIFICATIONS
DROP POLICY IF EXISTS "Consenti lettura notifiche solo ad admin" ON public.notifications;
CREATE POLICY "Consenti lettura notifiche solo ad admin"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (public.es_admin());

DROP POLICY IF EXISTS "Consenti inserimento notifiche a tutti" ON public.notifications;
CREATE POLICY "Consenti inserimento notifiche a tutti"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- =========================================================================
-- 3. FUNZIONI E TRIGGER COMUNI/UTENTI
-- =========================================================================

-- Trigger per auto-aggiornare updated_at in public.transports
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_transports_updated_at ON public.transports;
CREATE TRIGGER tr_transports_updated_at
  BEFORE UPDATE ON public.transports
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

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
  email_val text;
BEGIN
  username_val := COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1));
  ruolo_val := COALESCE(NEW.raw_user_meta_data ->> 'ruolo', 'dipendente');
  nome_val := NEW.raw_user_meta_data ->> 'nome';
  cognome_val := NEW.raw_user_meta_data ->> 'cognome';
  email_val := NEW.email;

  INSERT INTO public.profiles (id, username, ruolo, attivo, nome, cognome, email)
  VALUES (NEW.id, username_val, ruolo_val, true, nome_val, cognome_val, email_val)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, 
      ruolo = EXCLUDED.ruolo,
      nome = COALESCE(profiles.nome, EXCLUDED.nome),
      cognome = COALESCE(profiles.cognome, EXCLUDED.cognome),
      email = COALESCE(profiles.email, EXCLUDED.email);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- Funzione RPC per consentire all'admin di aggiornare le password degli utenti
CREATE OR REPLACE FUNCTION public.admin_set_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Controlla se il chiamante è admin
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Non autorizzato: Solo gli amministratori possono cambiare le password.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;

-- Funzione RPC per consentire all'admin di eliminare definitivamente un utente
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Controlla se il chiamante è admin
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Non autorizzato: Solo gli amministratori possono eliminare utenti.';
  END IF;

  -- Elimina l'utente da auth.users
  DELETE FROM auth.users
  WHERE id = target_user_id;
END;
$$;

-- =========================================================================
-- 4. SEED DATA (CREAZIONE ADMIN DI DEFAULT E EQUIPAGGIO INIZIALE)
-- =========================================================================

-- 4a. Inserisci equipaggio predefinito se non esiste
INSERT INTO public.crews (nome, attivo)
VALUES ('Equipaggio 1', true)
ON CONFLICT (nome) DO NOTHING;

-- 4b. Crea l'utente admin iniziale in auth.users
DO $$
DECLARE
  admin_uuid uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Elimina eventuale record admin preesistente per resettarlo con i token corretti
  DELETE FROM auth.users WHERE id = admin_uuid;

  -- Inserimento in auth.users (password: admin12345)
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

-- =========================================================================
-- 5. TABELLA NOTIFICHE E TRIGGER AUDIT LOG (PER TELEGRAM E PANNELLO)
-- =========================================================================

-- Trigger 1: Registrazione di un nuovo profilo
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

-- Trigger 2: Modifica di un profilo (attivo/disattivo o stato)
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

-- Trigger 3: Creazione, Modifica o Cancellazione di prenotazioni turni
DROP TRIGGER IF EXISTS tr_booking_change ON public.bookings;
DROP TRIGGER IF EXISTS tr_booking_insert ON public.bookings;
DROP TRIGGER IF EXISTS tr_booking_update ON public.bookings;
DROP TRIGGER IF EXISTS tr_booking_delete ON public.bookings;
DROP FUNCTION IF EXISTS public.on_booking_change();

-- Sostituito da trigger statement-level con transition tables. Definiamo la funzione:
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
  -- Trova l'username di chi sta effettuando l'operazione (auth.uid())
  SELECT COALESCE(username, 'Sistema') INTO actor_name FROM public.profiles WHERE id = auth.uid();
  actor_name := COALESCE(actor_name, 'Sistema');

  IF TG_OP = 'INSERT' THEN
    -- Controlla il numero di righe inserite tramite la transition table "new_table"
    SELECT COUNT(*) INTO inserted_count FROM new_table;
    
    IF inserted_count = 1 THEN
      -- Singolo inserimento: mantieni la notifica dettagliata esistente
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
      -- Inserimento multiplo (Bulk): genera una singola notifica riassuntiva
      SELECT COUNT(DISTINCT user_id) INTO inserted_count FROM new_table;
      
      IF inserted_count = 1 THEN
        SELECT COALESCE(p.username, 'Utente') INTO user_name 
        FROM new_table n 
        JOIN public.profiles p ON p.id = n.user_id 
        LIMIT 1;
        
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
    -- Controlla il numero di righe eliminate tramite la transition table "old_table"
    SELECT COUNT(*) INTO deleted_count FROM old_table;
    
    IF deleted_count = 1 THEN
      -- Singola cancellazione: mantieni la notifica dettagliata esistente
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
      -- Cancellazione multipla (Bulk): genera una singola notifica riassuntiva
      SELECT COUNT(DISTINCT user_id) INTO deleted_count FROM old_table;
      
      IF deleted_count = 1 THEN
        SELECT COALESCE(p.username, 'Utente') INTO user_name 
        FROM old_table o 
        JOIN public.profiles p ON p.id = o.user_id 
        LIMIT 1;
        
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
    -- Controlla il numero di righe modificate tramite la transition table "new_table"
    SELECT COUNT(*) INTO updated_count FROM new_table;
    
    IF updated_count = 1 THEN
      -- Singola modifica
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
      -- Modifica multipla (Bulk)
      SELECT COUNT(DISTINCT user_id) INTO updated_count FROM new_table;
      
      IF updated_count = 1 THEN
        SELECT COALESCE(p.username, 'Utente') INTO user_name 
        FROM new_table n 
        JOIN public.profiles p ON p.id = n.user_id 
        LIMIT 1;
        
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
  
  RETURN NULL; -- Per i trigger AFTER STATEMENT il valore di ritorno è ignorato
END;
$$;

-- Collega i trigger di livello STATEMENT su public.bookings con transition tables
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

-- =========================================================================
-- 6. INVIO NOTIFICHE SU GRUPPO TELEGRAM DIRETTO DA DATABASE
-- =========================================================================
-- Questa funzione e trigger inviano un messaggio Telegram istantaneo a un gruppo
-- utilizzando l'estensione pg_net (preinstallata in Supabase).

CREATE OR REPLACE FUNCTION public.send_notification_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  telegram_token text := 'IL_TUO_TOKEN_BOT_TELEGRAM'; -- <-- INSERISCI IL TOKEN DEL BOT
  telegram_chat_id text := 'IL_TUO_CHAT_ID_GRUPPO';   -- <-- INSERISCI IL CHAT ID DEL GRUPPO (es. -1001234567890 o numero negativo)
  title_text text;
  formatted_msg text;
BEGIN
  -- Se il token o il chat_id non sono inseriti, esce senza errori
  IF telegram_token IS NULL OR telegram_token = 'IL_TUO_TOKEN_BOT_TELEGRAM' OR 
     telegram_chat_id IS NULL OR telegram_chat_id = 'IL_TUO_CHAT_ID_GRUPPO' THEN
     RETURN NEW;
  END IF;

  -- Determina il titolo del messaggio in base al tipo di notifica
  CASE NEW.tipo
    WHEN 'registrazione' THEN
      title_text := '🆕 <b>Registrazione Nuovo Utente</b>';
    WHEN 'prenotazione_creata' THEN
      title_text := '✅ <b>Nuova Prenotazione Turno</b>';
    WHEN 'prenotazione_creata_bulk' THEN
      title_text := '✅ <b>Prenotazioni Multiple Inserite (Bulk)</b>';
    WHEN 'prenotazione_cancellata' THEN
      title_text := '❌ <b>Prenotazione Cancellata</b>';
    WHEN 'prenotazione_cancellata_bulk' THEN
      title_text := '❌ <b>Prenotazioni Multiple Cancellate (Bulk)</b>';
    WHEN 'prenotazione_modificata' THEN
      title_text := '🔄 <b>Prenotazione Modificata</b>';
    WHEN 'prenotazione_modificata_bulk' THEN
      title_text := '🔄 <b>Prenotazioni Multiple Modificate (Bulk)</b>';
    WHEN 'profilo_modificato' THEN
      title_text := '👤 <b>Profilo Modificato</b>';
    ELSE
      title_text := '🔔 <b>GM Turni - Notifica</b>';
  END CASE;

  -- Formatta il messaggio in HTML per Telegram (usando concat per sicurezza)
  formatted_msg := concat(
    title_text, chr(10), chr(10),
    '📝 <b>Dettaglio:</b> ', COALESCE(NEW.messaggio, 'Notifica generica'), chr(10),
    '👤 <b>Autore:</b> ', COALESCE(NEW.creato_da, 'Sistema'), chr(10),
    '📅 <b>Data:</b> ', to_char(COALESCE(NEW.created_at, now()), 'DD/MM/YYYY HH24:MI:SS')
  );

  -- Effettua l'HTTP POST asincrono all'API di Telegram tramite pg_net
  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot' || telegram_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'chat_id', telegram_chat_id,
      'text', formatted_msg,
      'parse_mode', 'HTML'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ignora errori dell'invio HTTP per non bloccare l'azione principale del database
  RETURN NEW;
END;
$$;

-- Collega il trigger alla nuova funzione di Telegram
DROP TRIGGER IF EXISTS tr_send_notification_telegram ON public.notifications;
CREATE TRIGGER tr_send_notification_telegram
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE PROCEDURE public.send_notification_telegram();
