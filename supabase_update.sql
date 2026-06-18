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

-- 6. Inserisci veicoli di prova se non esistono
INSERT INTO public.vehicles (nome, targa, attivo, km_attuali)
VALUES 
  ('Ambulanza 1', 'AM123BU', true, 120500),
  ('Ambulanza 2', 'AM456BU', true, 89400),
  ('Auto Medica', 'MD789MD', true, 45200),
  ('Mezzo Disabili', 'DS321DB', true, 15300)
ON CONFLICT (id) DO NOTHING;

-- 7. Aggiorna il vincolo tipo_pagamento per accettare buono e convenzione
ALTER TABLE public.transports
DROP CONSTRAINT IF EXISTS transports_tipo_pagamento_check;

ALTER TABLE public.transports
ADD CONSTRAINT transports_tipo_pagamento_check
CHECK (tipo_pagamento IN ('contante', 'pos', 'bonifico', 'buono', 'convenzione', 'altro', ''));

-- 8. Aggiorna la policy RLS per l'inserimento dei trasporti
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

-- 9. Consenti cancellazione trasporti a proprietari e admin
DROP POLICY IF EXISTS "Consenti cancellazione trasporti solo ad admin" ON public.transports;
CREATE POLICY "Consenti cancellazione trasporti a proprietari e admin"
  ON public.transports FOR DELETE
  TO authenticated
  USING (public.es_admin() OR creato_da = auth.uid());


