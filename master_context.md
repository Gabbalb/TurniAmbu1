# Master Context - TurniAmbu (gm-turni)

Questo file funge da "fonte di verità" per il progetto. Deve essere aggiornato dopo ogni modifica strutturale o aggiunta di nuove funzionalità.

## Panoramica del Progetto
TurniAmbu (nome interno: `gm-turni`) è un'applicazione web single-page (SPA) destinata alla gestione dei turni e dei trasporti per ambulanze/associazioni di soccorso. Permette agli operatori di visualizzare i propri turni, timbrare l'orario e gestire i trasporti in tempo reale. Include inoltre un completo pannello di amministrazione per gestire utenti, equipaggi, veicoli, orari e storici dei trasporti.

## Tech Stack & Dipendenze
- **Frontend**: React 19, Vite (bundler), TailwindCSS (styling).
- **Backend / Database**: Supabase (PostgreSQL, Auth).
- **Librerie Principali**:
  - `lucide-react`: per le icone UI.
  - `date-fns`: per la manipolazione e formattazione delle date.
  - `jspdf` & `html2canvas`: per l'esportazione in PDF.

## Architettura e Struttura File
- `/src/components/`: Contiene tutti i componenti UI React.
  - I file con prefisso `Admin*` (es. `AdminPanel.jsx`, `AdminTransportsTab.jsx`) sono riservati al ruolo di amministratore.
  - I componenti core per gli operatori includent `TurniBoard.jsx`, `IMieiTurni.jsx`, `TimbraTurno.jsx`, `StoricoOre.jsx`, `TransportTab.jsx` e `TransportDrawer.jsx`.
- `/src/context/`: `AuthContext.jsx` gestisce l'autenticazione, la sessione e il profilo/ruolo dell'utente connesso tramite Supabase.
- `/src/lib/`:
  - `api.js`: File monolitico che astrae le interazioni con Supabase (query CRUD, RPC).
  - `supabaseClient.js`: Inizializzazione del client Supabase.
- `/src/utils/`: Contiene logica di business pura, come `shiftLogic.js` per il calcolo e la gestione delle regole sui turni.
- `supabase_setup.sql`: Descrive l'intero schema del database. Di seguito la composizione attuale:

### Schema del Database (Supabase)

<details>
<summary>Composizione delle Tabelle</summary>

#### Table `profiles`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `username` | `text` |  Unique |
| `ruolo` | `text` |  |
| `attivo` | `bool` |  |
| `nome` | `text` |  Nullable |
| `cognome` | `text` |  Nullable |
| `codice_fiscale` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `telefono` | `text` |  Nullable |
| `data_nascita` | `date` |  Nullable |
| `stato` | `text` |  Nullable |
| `qualifica` | `text` |  Nullable |
| `paga_oraria` | `numeric` |  Nullable |
| `credito_surplus` | `numeric` |  |
| `session_token` | `text` |  Nullable |
| `last_device_id` | `text` |  Nullable |

#### Table `crews`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `nome` | `text` |  Unique |
| `attivo` | `bool` |  |

#### Table `shifts`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `data` | `date` |  |
| `ora_inizio` | `time` |  |
| `ora_fine` | `time` |  |
| `crew_id` | `int8` |  |

#### Table `bookings`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `shift_id` | `int8` |  |
| `user_id` | `uuid` |  |
| `ruolo_turno` | `text` |  |
| `ora_inizio_effettiva` | `time` |  Nullable |
| `ora_fine_effettiva` | `time` |  Nullable |
| `is_partial` | `bool` |  |
| `nota_parziale` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

#### Table `notifications`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `tipo` | `text` |  |
| `messaggio` | `text` |  |
| `creato_da` | `text` |  |
| `created_at` | `timestamptz` |  |

#### Table `telegram_settings`
| Name | Type | Constraints |
|------|------|-------------|
| `tipo` | `text` | Primary |
| `attivo` | `bool` |  |

#### Table `clocked_shifts`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `user_id` | `uuid` |  |
| `start_time` | `timestamptz` |  |
| `end_time` | `timestamptz` |  Nullable |
| `pagato` | `bool` |  |
| `paga_oraria_storica` | `numeric` |  |

#### Table `vehicles`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `nome` | `text` |  Unique |
| `targa` | `text` |  Nullable |
| `attivo` | `bool` |  |
| `km_attuali` | `numeric` |  |

#### Table `transports`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `shift_id` | `int8` |  Nullable |
| `data` | `date` |  |
| `stato` | `text` |  |
| `ora_inizio` | `timestamptz` |  Nullable |
| `ora_fine` | `timestamptz` |  Nullable |
| `ora_servizio` | `time` |  Nullable |
| `tipo_trasporto` | `text` |  |
| `altro_descrizione` | `text` |  Nullable |
| `variante_ar` | `text` |  Nullable |
| `da_tipo_luogo` | `text` |  |
| `da_reparto` | `text` |  Nullable |
| `da_nome` | `text` |  Nullable |
| `da_via` | `text` |  Nullable |
| `a_tipo_luogo` | `text` |  |
| `a_reparto` | `text` |  Nullable |
| `a_nome` | `text` |  Nullable |
| `a_via` | `text` |  Nullable |
| `vehicle_id` | `int8` |  Nullable |
| `km_iniziali` | `numeric` |  Nullable |
| `km_finali` | `numeric` |  Nullable |
| `paziente_cognome_nome` | `text` |  Nullable |
| `paziente_codice_fiscale` | `text` |  Nullable |
| `paziente_telefono` | `text` |  Nullable |
| `paziente_email` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `tipo_pagamento` | `text` |  Nullable |
| `importo` | `numeric` |  Nullable |
| `creato_da` | `uuid` |  Nullable |
| `precompilato_da_admin` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

#### Table `transport_crew`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `transport_id` | `int8` |  |
| `user_id` | `uuid` |  Nullable |
| `ruolo` | `text` |  |
| `vehicle_id` | `int8` |  Nullable |
| `attivo` | `bool` |  |
| `ora_inizio_ruolo` | `timestamptz` |  |
| `ora_fine_ruolo` | `timestamptz` |  Nullable |
| `is_partial` | `bool` |  |
| `created_at` | `timestamptz` |  |

#### Table `transport_handoffs`
| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `transport_id` | `int8` |  |
| `da_user_id` | `uuid` |  Nullable |
| `a_user_id` | `uuid` |  Nullable |
| `vehicle_id_precedente` | `int8` |  Nullable |
| `vehicle_id_nuovo` | `int8` |  Nullable |
| `km_al_passaggio` | `numeric` |  Nullable |
| `motivo` | `text` |  Nullable |
| `avvenuto_a` | `timestamptz` |  |

</details>

## Stato Attuale
- Sistema di base completato e funzionante (Auth, Dashboard Amministratore, Gestione Turni e Tabellone, Timbrature).
- Modulo Trasporti implementato con tracking in tempo reale (polling attivo in `App.jsx`).
- I moduli utente (visualizzazione propri turni, disponibilità, storico) sono strutturati e collegati.
- **Risolto Bug Eliminazione Trasporti**: Aggiornate le policy RLS su `transports`, `transport_crew` e `transport_handoffs` per consentire al proprietario (creatore) del trasporto di eliminarlo e pulire a cascata i record figli (evitando il blocco di PostgreSQL su RLS cascade).
- **Consolidamento Database**: Unificato lo schema di configurazione in un unico file `supabase_setup.sql` eliminando il vecchio `supabase_update.sql`.
- **Notifiche Telegram Avanzate con Gestione Configurazione (via Vault e RLS)**: Configurato un sistema di notifiche automatiche tramite trigger su `public.notifications` che invia a Telegram un report formattato. Per motivi di sicurezza, token e chat ID sono memorizzati in modo crittografato su Supabase Vault. Introdotto un pannello di gestione dei filtri Telegram ("Filtri Notifiche Telegram" in `AdminNotificationsTab.jsx`) associato alla nuova tabella `telegram_settings` del database, che consente di abilitare/disabilitare l'inoltro di specifiche tipologie di eventi.
- **Protezione Turni Convalidati**: Implementato il blocco di modifica/cancellazione sui turni convalidati (`pagato = true`) sia a livello di policy RLS sul database che a livello di interfaccia utente (Pencil button nascosto per i non-admin).
- **Annullamento della Convalida dei Turni**: Aggiunta la possibilità per gli amministratori, sia dall'interfaccia responsive (`AdminPanel.jsx`) che da quella desktop (`AdminHoursTab.jsx`), di annullare la convalida di un turno timbrato (`pagato = false`) in caso di errore, chiamando la nuova funzione API `unvalidateShift`.
- **Gestione Roster Utenti & Ottimizzazione Performance**: Ridisegnato il pannello dettagli utenti (`AdminUsersTab.jsx`) con schede di profilo e avatar ad iniziali. Aggiunto il pulsante di rimozione diretta nel form dettagli ed eliminati i colli di bottiglia di interaction timing (sostituendo `window.confirm` sincrono con modal React asincroni).
- **Storico Turni con Calendario Navigabile**: Riprogettata la sezione dello storico turni (`AdminHistoryTab.jsx`) con un calendario mensile interattivo a griglia. Ogni cella mostra le 3 fasce orarie tramite icone dedicate (`Sunrise`, `Sun`, `Moon`) con supporto completo per i turni parziali/spezzati (unendo le iniziali con `+` ed evidenziando i parziali con `*`). Cliccando su un giorno si apre la scheda dettagliata della giornata sul pannello destro (ATS in verde, Autista (AS) in giallo con nomi ben chiari e visibili), consentendo l'assegnazione e la modifica inline dei turni tramite gli stessi metodi API mobile del roster (`api.bookSlot` e `api.cancelBooking`).
- **Visualizzazione Storico Trasporti del Turno Attivo**: Aggiunto il tracciamento e la visualizzazione di tutti i trasporti completati e in corso dello stesso turno attivo per l'operatore mobile (`TransportTab.jsx`). Le schede dei trasporti conclusi o diversi da quello attivo corrente vengono mostrate in blocchi dedicati con dettagli di base (Nome e Cognome paziente, Da-A, orario) e possono essere cliccate per aprire i dettagli completi in modalità di sola lettura nel `TransportDrawer`.
- **Notifica Persistente Turno e Trasporto Attivo**: Aggiunta una barra di stato sticky in overlay posizionata subito sotto la TopBar di navigazione nel layout principale (`Layout.jsx`). La barra mostra dinamicamente dei badge pulsanti per indicare se c'è un turno attivo (verde) e/o un trasporto in corso (indaco), con la dicitura "⚠️ RICORDATI DI CHIUDERE!" per evitare dimenticanze. Cliccando su ciascun badge si viene reindirizzati rispettivamente alla schermata di timbratura o all'espansione dei dettagli del trasporto.
- **Equipaggi Occasionali Extra**: Introdotta la possibilità per gli amministratori di aggiungere un secondo equipaggio occasionale per una specifica fascia oraria in un giorno specifico, direttamente dal tabellone/calendario tramite un pulsante "+" con la dicitura "Aggiungi equipaggio". Questi equipaggi occasionali sono salvati con un pattern di nome unico (`Extra - Data Ora`) per salvaguardare i vincoli del DB senza richiedere modifiche allo schema DDL, e vengono visualizzati come "Equipaggio Extra" (con badge "Rinforzo"). Sono esclusi dalla gestione degli equipaggi fissi della Dashboard/AdminCrewsTab per garantire la separazione logica richiesta.




## To-Do / Lavori in Corso
- In attesa di feedback dall'utente sulle nuove modifiche al calendario storico, sulla scheda dettagliata della giornata, sull'assegnazione ed editing inline, sulla gestione della rimozione utenti e sul superamento del blocco sincrono di confirm.

## Convenzioni del Progetto
- **Codice**: Componenti React scritti in `.jsx` utilizzando functional components e hooks.
- **Styling**: Utilizzo rigoroso di Tailwind CSS per stili e layout.
- **Dati**: L'accesso ai dati deve passare preferibilmente per le funzioni esportate da `src/lib/api.js` piuttosto che chiamare direttamente il client Supabase nei componenti, al fine di mantenere il codice pulito e centralizzato.
- **Gestione Stato**: Polling utilizzato per mantenere sincronizzati i trasporti attivi e i turni tra amministratore e operatori.
