-- Abilita le estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 1. TABELLE E STRUTTURA
-- =========================================================================

-- Tabella Profili (estensione di auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  ruolo text NOT NULL CHECK (ruolo IN ('admin', 'dipendente')),
  attivo boolean DEFAULT true NOT NULL
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
  ruolo_turno text NOT NULL CHECK (ruolo_turno IN ('CE', 'autista')),
  ora_inizio_effettiva time,
  ora_fine_effettiva time,
  is_partial boolean DEFAULT false NOT NULL,
  nota_parziale text,
  created_at timestamptz DEFAULT now() NOT NULL,
  -- Garantisce max 1 CE e 1 Autista per equipaggio per turno
  CONSTRAINT unique_shift_role UNIQUE (shift_id, ruolo_turno)
);

-- =========================================================================
-- 2. FUNZIONI E TRIGGER
-- =========================================================================

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
BEGIN
  username_val := COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1));
  ruolo_val := COALESCE(NEW.raw_user_meta_data ->> 'ruolo', 'dipendente');

  INSERT INTO public.profiles (id, username, ruolo, attivo)
  VALUES (NEW.id, username_val, ruolo_val, true)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, ruolo = EXCLUDED.ruolo;
  
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
SET search_path = public
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

-- =========================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Abilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policies per PROFILES
CREATE POLICY "Consenti lettura profili a tutti gli utenti loggati"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Consenti scrittura profili solo ad admin"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Policies per CREWS
CREATE POLICY "Consenti lettura equipaggi a tutti gli utenti loggati"
  ON public.crews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Consenti gestione equipaggi solo ad admin"
  ON public.crews FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Policies per SHIFTS
CREATE POLICY "Consenti lettura turni a tutti gli utenti loggati"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Consenti gestione turni solo ad admin"
  ON public.shifts FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Policies per BOOKINGS
CREATE POLICY "Consenti lettura prenotazioni a tutti gli utenti loggati"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Consenti inserimento prenotazioni personali o admin"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND attivo = true))
    OR public.es_admin()
  );

CREATE POLICY "Consenti modifica prenotazioni solo ad admin"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

CREATE POLICY "Consenti cancellazione prenotazioni personali o admin"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.es_admin()
  );

-- =========================================================================
-- 4. SEED DATA (CREAZIONE ADMIN DI DEFAULT E EQUIPAGGIO INIZIALE)
-- =========================================================================

-- 4a. Inserisci equipaggio predefinito se non esiste
INSERT INTO public.crews (nome, attivo)
VALUES ('Equipaggio 1', true)
ON CONFLICT (nome) DO NOTHING;

-- 4b. Crea l'utente admin iniziale in auth.users se non esiste
DO $$
DECLARE
  admin_uuid uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@app.internal') THEN
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
      role
    ) VALUES (
      admin_uuid,
      '00000000-0000-0000-0000-000000000000',
      'admin@app.internal',
      crypt('admin12345', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","ruolo":"admin"}'::jsonb,
      'authenticated',
      'authenticated'
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
  END IF;
END $$;
