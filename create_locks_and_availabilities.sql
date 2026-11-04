-- =========================================================================
-- TURNIAMBU - SCRIPT SQL PER TABELLE 'shift_locks' E 'user_availabilities'
-- Esegui questo script nel Supabase SQL Editor per sincronizzare il database remoto.
-- =========================================================================

-- 1. Tabella Blocco Turni Ufficiali (Blocca modifiche ai non-admin)
CREATE TABLE IF NOT EXISTS public.shift_locks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data date NOT NULL UNIQUE,
  is_locked boolean DEFAULT true NOT NULL,
  locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  locked_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Tabella Disponibilità Utenti (impostate manualmente da admin o utente)
CREATE TABLE IF NOT EXISTS public.user_availabilities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  data date NOT NULL,
  slot_id integer NOT NULL CHECK (slot_id BETWEEN 1 AND 4),
  disponibile boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_date_slot UNIQUE (user_id, data, slot_id)
);

-- Indici di ricerca rapida
CREATE INDEX IF NOT EXISTS idx_shift_locks_date ON public.shift_locks(data);
CREATE INDEX IF NOT EXISTS idx_user_availabilities_date ON public.user_availabilities(data);
CREATE INDEX IF NOT EXISTS idx_user_availabilities_user ON public.user_availabilities(user_id);

-- Abilitazione Row Level Security (RLS)
ALTER TABLE public.shift_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availabilities ENABLE ROW LEVEL SECURITY;

-- Policies per shift_locks
DROP POLICY IF EXISTS "Consenti lettura lock a tutti gli autenticati" ON public.shift_locks;
CREATE POLICY "Consenti lettura lock a tutti gli autenticati"
  ON public.shift_locks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Consenti gestione lock solo agli amministratori" ON public.shift_locks;
CREATE POLICY "Consenti gestione lock solo agli amministratori"
  ON public.shift_locks FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Policies per user_availabilities
DROP POLICY IF EXISTS "Consenti lettura disponibilità a tutti gli autenticati" ON public.user_availabilities;
CREATE POLICY "Consenti lettura disponibilità a tutti gli autenticati"
  ON public.user_availabilities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Consenti gestione disponibilità ad admin o proprietario" ON public.user_availabilities;
CREATE POLICY "Consenti gestione disponibilità ad admin o proprietario"
  ON public.user_availabilities FOR ALL TO authenticated
  USING (public.es_admin() OR auth.uid() = user_id)
  WITH CHECK (public.es_admin() OR auth.uid() = user_id);
