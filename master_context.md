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
- **Notifiche Telegram Avanzate**: Configurato un sistema di notifiche automatiche tramite trigger su `clocked_shifts` e `transports` che invia a Telegram un report formattato (Titolo, Utente, Azione, Ora) in occasione di inizio/fine turno e creazione/avvio/conclusione/trasferimento/cancellazione dei trasporti.
- **Protezione Turni Convalidati**: Implementato il blocco di modifica/cancellazione sui turni convalidati (`pagato = true`) sia a livello di policy RLS sul database che a livello di interfaccia utente (Pencil button nascosto per i non-admin).
- **Annullamento della Convalida dei Turni**: Aggiunta la possibilità per gli amministratori, sia dall'interfaccia responsive (`AdminPanel.jsx`) che da quella desktop (`AdminHoursTab.jsx`), di annullare la convalida di un turno timbrato (`pagato = false`) in caso di errore, chiamando la nuova funzione API `unvalidateShift`.

## To-Do / Lavori in Corso
- In attesa di feedback dall'utente sulla corretta eliminazione dei trasporti, ricezione delle notifiche Telegram, blocco dei turni convalidati e annullamento della convalida.

## Convenzioni del Progetto
- **Codice**: Componenti React scritti in `.jsx` utilizzando functional components e hooks.
- **Styling**: Utilizzo rigoroso di Tailwind CSS per stili e layout.
- **Dati**: L'accesso ai dati deve passare preferibilmente per le funzioni esportate da `src/lib/api.js` piuttosto che chiamare direttamente il client Supabase nei componenti, al fine di mantenere il codice pulito e centralizzato.
- **Gestione Stato**: Polling utilizzato per mantenere sincronizzati i trasporti attivi e i turni tra amministratore e operatori.
