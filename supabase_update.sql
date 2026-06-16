-- =========================================================================
-- AGGIORNAMENTI PER TIMBRA TURNO E PAGAMENTI DIPENDENTI
-- =========================================================================

-- 1. Aggiungi il campo credito_surplus alla tabella profiles (se non esiste già)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credito_surplus numeric DEFAULT 0.00 NOT NULL;

-- 2. Crea la tabella clocked_shifts per registrare le timbrature dei dipendenti
CREATE TABLE IF NOT EXISTS public.clocked_shifts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  pagato boolean DEFAULT false NOT NULL,
  paga_oraria_storica numeric NOT NULL
);

-- 3. Abilita la Row Level Security (RLS) sulla nuova tabella
ALTER TABLE public.clocked_shifts ENABLE ROW LEVEL SECURITY;

-- 4. Definisci le policy RLS per la tabella clocked_shifts

-- Lettura: l'utente può vedere le sue timbrature; l'admin può vedere tutte le timbrature
DROP POLICY IF EXISTS "Consenti lettura timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti lettura timbrature personali o admin"
  ON public.clocked_shifts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.es_admin());

-- Inserimento: l'utente può inserire per se stesso; l'admin può inserire per chiunque
DROP POLICY IF EXISTS "Consenti inserimento timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti inserimento timbrature personali o admin"
  ON public.clocked_shifts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.es_admin());

-- Modifica: l'utente o l'admin possono aggiornare (ad esempio per terminare il turno)
DROP POLICY IF EXISTS "Consenti modifica timbrature personali o admin" ON public.clocked_shifts;
CREATE POLICY "Consenti modifica timbrature personali o admin"
  ON public.clocked_shifts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.es_admin())
  WITH CHECK (user_id = auth.uid() OR public.es_admin());

-- Cancellazione: solo l'admin può eliminare record di timbrature
DROP POLICY IF EXISTS "Consenti eliminazione timbrature ad admin" ON public.clocked_shifts;
CREATE POLICY "Consenti eliminazione timbrature ad admin"
  ON public.clocked_shifts FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- 5. Aggiungi il campo session_token alla tabella profiles per forzare sessioni singole per gli admin
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS session_token text;
