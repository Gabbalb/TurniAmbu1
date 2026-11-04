import React, { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import { generateShifts, GENERATOR_SLOTS, isWeekend } from '../utils/shiftGenerator'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addDays,
  getDay
} from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Wand2,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Save,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react'

export default function AdminGenerateShiftsTab({ profiles = [], crews = [], onRefresh }) {
  // 1. Stato del Periodo (Mese selezionato)
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()))
  
  // Step attivo: 'disponibilita' | 'config' | 'bozza'
  const [activeStep, setActiveStep] = useState('disponibilita')

  // Date del periodo
  const periodDates = useMemo(() => {
    const start = startOfMonth(selectedMonth)
    const end = endOfMonth(selectedMonth)
    const days = eachDayOfInterval({ start, end })
    return days.map(d => format(d, 'yyyy-MM-dd'))
  }, [selectedMonth])

  const startDateStr = periodDates[0]
  const endDateStr = periodDates[periodDates.length - 1]

  // 2. Stato Disponibilità caricate dal DB/Mock
  // Struttura: Set di chiavi `${userId}_${date}_${slotId}`
  const [availSet, setAvailSet] = useState(new Set())
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [savingAvail, setSavingAvail] = useState(false)
  const [availSuccessMsg, setAvailSuccessMsg] = useState(null)

  // 3. Stato Blocco Periodo
  const [lockedDates, setLockedDates] = useState(new Set())
  const [togglingLock, setTogglingLock] = useState(false)

  // Filtro ricerca operatori in griglia disponibilità
  const [userFilter, setUserFilter] = useState('all') // 'all' | 'autista' | 'CE'
  const [searchTerm, setSearchTerm] = useState('')

  // 4. Configurazione Equipaggi (User requirement: "fammi decidere dove mettere 2 equipaggi e dove no")
  // Mappa `${date}_${slotId}` -> 1 | 2 (default 1)
  const [slotCrewsConfig, setSlotCrewsConfig] = useState({})

  // Parametri dell'algoritmo
  const [options, setOptions] = useState({
    respectRestTime: true,
    maxShiftsPerDay: 1,
    allowDriverAsCE: true // user confirmed: "si gli autisti possono essere usati"
  })

  // 5. Risultato della Bozza generata dall'algoritmo
  const [draftResult, setDraftResult] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [selectedDraftAssignment, setSelectedDraftAssignment] = useState(null) // per modifica manuale

  // Profili attivi (esclusi disattivi)
  const activeProfiles = useMemo(() => {
    return (profiles || []).filter(p => p.attivo !== false)
  }, [profiles])

  // Equipaggi fissi disponibili (massimo 2)
  const fixedCrews = useMemo(() => {
    return (crews || []).filter(c => !c.nome.startsWith('Extra')).slice(0, 2)
  }, [crews])

  // =========================================================================
  // CARICAMENTO DISPONIBILITÀ & LOCK ALL'AVVIO O CAMBIO MESE
  // =========================================================================
  const loadPeriodData = async () => {
    if (!startDateStr || !endDateStr) return
    setLoadingAvail(true)
    setAvailSuccessMsg(null)
    try {
      const [availRes, locksRes] = await Promise.all([
        api.fetchUserAvailabilities(startDateStr, endDateStr),
        api.fetchShiftLocks(startDateStr, endDateStr)
      ])

      const newSet = new Set()
      if (availRes.data) {
        availRes.data.forEach(a => {
          if (a.disponibile !== false) {
            newSet.add(`${a.user_id}_${a.data}_${a.slot_id}`)
          }
        })
      }
      setAvailSet(newSet)

      const lockSet = new Set()
      if (locksRes.data) {
        locksRes.data.forEach(l => {
          if (l.is_locked) lockSet.add(l.data)
        })
      }
      setLockedDates(lockSet)
    } catch (err) {
      console.error('Errore nel caricamento disponibilità e lock:', err)
    } finally {
      setLoadingAvail(false)
    }
  }

  useEffect(() => {
    loadPeriodData()
    // Reset bozza al cambio mese
    setDraftResult(null)
    setPublishSuccess(false)
  }, [startDateStr, endDateStr])

  // Inizializza la configurazione equipaggi di default (1 equipaggio dappertutto)
  useEffect(() => {
    const initialConfig = {}
    periodDates.forEach(d => {
      GENERATOR_SLOTS.forEach(s => {
        initialConfig[`${d}_${s.id}`] = 1
      })
    })
    setSlotCrewsConfig(initialConfig)
  }, [periodDates])

  // =========================================================================
  // GESTIONE DISPONIBILITÀ (CLICK CELLE E PRESET RAPIDI)
  // =========================================================================
  const toggleAvailability = (userId, date, slotId) => {
    setAvailSet(prev => {
      const next = new Set(prev)
      const key = `${userId}_${date}_${slotId}`
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Seleziona/deseleziona tutta la giornata per un utente
  const toggleUserFullDay = (userId, date) => {
    const keys = GENERATOR_SLOTS.map(s => `${userId}_${date}_${s.id}`)
    const allActive = keys.every(k => availSet.has(k))

    setAvailSet(prev => {
      const next = new Set(prev)
      keys.forEach(k => {
        if (allActive) next.delete(k)
        else next.add(k)
      })
      return next
    })
  }

  // Preset riga: utente per tutto il mese in una fascia specifica
  const applyUserSlotPreset = (userId, slotId, makeActive = true) => {
    setAvailSet(prev => {
      const next = new Set(prev)
      periodDates.forEach(d => {
        const key = `${userId}_${d}_${slotId}`
        if (makeActive) next.add(key)
        else next.delete(key)
      })
      return next
    })
  }

  // Preset globale: tutti disponibili su una certa fascia
  const applyGlobalSlotPreset = (slotId, makeActive = true) => {
    setAvailSet(prev => {
      const next = new Set(prev)
      activeProfiles.forEach(p => {
        periodDates.forEach(d => {
          const key = `${p.id}_${d}_${slotId}`
          if (makeActive) next.add(key)
          else next.delete(key)
        })
      })
      return next
    })
  }

  // Salva le disponibilità nel DB
  const handleSaveAvailabilities = async () => {
    setSavingAvail(true)
    setAvailSuccessMsg(null)
    try {
      const listToSave = []
      activeProfiles.forEach(p => {
        periodDates.forEach(d => {
          GENERATOR_SLOTS.forEach(s => {
            const isAvail = availSet.has(`${p.id}_${d}_${s.id}`)
            listToSave.push({
              user_id: p.id,
              data: d,
              slot_id: s.id,
              disponibile: isAvail
            })
          })
        })
      })

      const { error } = await api.saveUserAvailabilities(listToSave)
      if (error) {
        alert('Errore nel salvataggio disponibilità: ' + error.message)
      } else {
        setAvailSuccessMsg('Disponibilità salvate con successo!')
        setTimeout(() => setAvailSuccessMsg(null), 3000)
      }
    } catch (err) {
      console.error('Errore nel salvataggio disponibilità:', err)
      alert('Si è verificato un errore.')
    } finally {
      setSavingAvail(false)
    }
  }

  // =========================================================================
  // GESTIONE CONFIGURAZIONE EQUIPAGGI (1 vs 2)
  // =========================================================================
  const toggleSlotCrew = (date, slotId) => {
    const key = `${date}_${slotId}`
    setSlotCrewsConfig(prev => ({
      ...prev,
      [key]: (prev[key] || 1) === 1 ? 2 : 1
    }))
  }

  const applyCrewPreset = (presetType) => {
    const newConfig = {}
    periodDates.forEach(d => {
      const isWk = isWeekend(d)
      GENERATOR_SLOTS.forEach(s => {
        const key = `${d}_${s.id}`
        if (presetType === 'all_1') {
          newConfig[key] = 1
        } else if (presetType === 'all_2') {
          newConfig[key] = 2
        } else if (presetType === 'day2_night1') {
          // 2 equipaggi Mattina (1) e Pomeriggio (2), 1 equipaggio Sera (3) e Notte (4)
          newConfig[key] = (s.id === 1 || s.id === 2) ? 2 : 1
        } else if (presetType === 'weekend2') {
          newConfig[key] = isWk ? 2 : 1
        }
      })
    })
    setSlotCrewsConfig(newConfig)
  }

  // =========================================================================
  // ESECUZIONE ALGORITMO DI GENERAZIONE
  // =========================================================================
  const handleRunGenerator = async () => {
    setIsGenerating(true)
    setDraftResult(null)
    setPublishSuccess(false)

    // Breve timeout per permettere il re-render dell'interfaccia di caricamento
    setTimeout(() => {
      try {
        const availList = []
        availSet.forEach(key => {
          const [user_id, data, slot_id] = key.split('_')
          availList.push({ user_id, data, slot_id: Number(slot_id), disponibile: true })
        })

        const result = generateShifts({
          dates: periodDates,
          crews: fixedCrews,
          profiles: activeProfiles,
          availabilities: availList,
          slotCrewsConfig,
          options
        })

        setDraftResult(result)
        setActiveStep('bozza')
      } catch (err) {
        console.error('Errore durante la generazione dei turni:', err)
        alert('Si è verificato un errore nel calcolo dei turni.')
      } finally {
        setIsGenerating(false)
      }
    }, 150)
  }

  // Modifica manuale di una singola assegnazione nella bozza
  const handleReassignDraftSlot = (assignmentIndex, newUserId) => {
    if (!draftResult) return
    const newAssignments = [...draftResult.assignments]
    const target = newAssignments[assignmentIndex]
    const newProfile = activeProfiles.find(p => p.id === newUserId)

    if (newProfile) {
      newAssignments[assignmentIndex] = {
        ...target,
        user_id: newProfile.id,
        user_nome: newProfile.nome ? `${newProfile.nome} ${newProfile.cognome || ''}`.trim() : newProfile.username,
        user_qualifica: newProfile.qualifica,
        is_driver_acting_as_ce: target.ruolo_turno === 'CE' && newProfile.qualifica === 'autista'
      }

      setDraftResult(prev => ({
        ...prev,
        assignments: newAssignments
      }))
    }
    setSelectedDraftAssignment(null)
  }

  // =========================================================================
  // PUBBLICAZIONE NEL TABELLONE UFFICIALE & BLOCCO
  // =========================================================================
  const handleConfirmPublish = async () => {
    if (!draftResult || !draftResult.assignments) return
    setPublishing(true)

    try {
      const { error } = await api.publishGeneratedShifts({
        dates: periodDates,
        assignments: draftResult.assignments,
        crews: fixedCrews,
        lockDates: true, // Blocca sempre per rendere il tabellone ufficiale
        adminId: null,
        clearExistingInPeriod: true
      })

      if (error) {
        alert('Errore durante la pubblicazione dei turni: ' + error.message)
      } else {
        setPublishSuccess(true)
        setShowPublishModal(false)
        // Aggiorna stato di blocco locale
        setLockedDates(new Set(periodDates))
        if (onRefresh) onRefresh()
      }
    } catch (err) {
      console.error('Errore nella pubblicazione:', err)
      alert('Si è verificato un errore durante la pubblicazione.')
    } finally {
      setPublishing(false)
    }
  }

  // Toggle blocco periodo manuale
  const handleTogglePeriodLock = async (newLockState) => {
    setTogglingLock(true)
    try {
      await api.setPeriodLocks(periodDates, newLockState)
      setLockedDates(newLockState ? new Set(periodDates) : new Set())
      if (onRefresh) onRefresh()
    } catch (e) {
      console.error('Errore toggle lock:', e)
    } finally {
      setTogglingLock(false)
    }
  }

  // Operatori filtrati per la matrice
  const displayedProfiles = useMemo(() => {
    return activeProfiles.filter(p => {
      if (userFilter === 'autista' && p.qualifica !== 'autista') return false
      if (userFilter === 'CE' && p.qualifica !== 'CE') return false
      if (searchTerm) {
        const full = `${p.nome || ''} ${p.cognome || ''} ${p.username}`.toLowerCase()
        if (!full.includes(searchTerm.toLowerCase())) return false
      }
      return true
    })
  }, [activeProfiles, userFilter, searchTerm])

  const isPeriodFullyLocked = periodDates.length > 0 && periodDates.every(d => lockedDates.has(d))

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 overflow-y-auto">
      {/* HEADER PRINCIPALE CON CONTROLLO MESE E STATO BLOCCO */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Crea Turni & Assegnazione Automatica
              {isPeriodFullyLocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Lock className="w-3 h-3" /> Ufficiale Bloccato
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                  <Unlock className="w-3 h-3" /> Modificabile
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Imposta le disponibilità, seleziona dove disporre 2 equipaggi e lascia che l'algoritmo distribuisca i turni con pari equità.
            </p>
          </div>
        </div>

        {/* CONTROLLI MESE E BLOCCO RAPIDO */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Navigatore Mese */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-none hover:shadow-sm"
              title="Mese precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-extrabold capitalize text-slate-800 min-w-[130px] text-center">
              {format(selectedMonth, 'MMMM yyyy', { locale: it })}
            </span>
            <button
              onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-none hover:shadow-sm"
              title="Mese successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Lock Periodo */}
          <button
            onClick={() => handleTogglePeriodLock(!isPeriodFullyLocked)}
            disabled={togglingLock}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
              isPeriodFullyLocked
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title={isPeriodFullyLocked ? 'Sblocca il mese per permettere modifiche' : 'Blocca il mese per impedire modifiche ai non-admin'}
          >
            {isPeriodFullyLocked ? <Unlock className="w-4 h-4 text-amber-600" /> : <Lock className="w-4 h-4 text-slate-600" />}
            <span>{isPeriodFullyLocked ? 'Sblocca Mese' : 'Blocca Mese'}</span>
          </button>
        </div>
      </div>

      {/* STEPPER DI NAVIGAZIONE A 3 FASI */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* STEP 1 */}
          <button
            onClick={() => setActiveStep('disponibilita')}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStep === 'disponibilita'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
            <Users className="w-4 h-4" />
            <span>1. Disponibilità Operatori</span>
          </button>

          <div className="h-0.5 w-12 bg-slate-200 hidden sm:block" />

          {/* STEP 2 */}
          <button
            onClick={() => setActiveStep('config')}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStep === 'config'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
            <Sliders className="w-4 h-4" />
            <span>2. Dove 2 Equipaggi & Regole</span>
          </button>

          <div className="h-0.5 w-12 bg-slate-200 hidden sm:block" />

          {/* STEP 3 */}
          <button
            onClick={() => {
              if (draftResult) setActiveStep('bozza')
              else handleRunGenerator()
            }}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeStep === 'bozza'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">3</span>
            <Sparkles className="w-4 h-4" />
            <span>3. Anteprima Bozza & Approvazione</span>
          </button>
        </div>
      </div>

      {/* CONTENUTO PRINCIPALE IN BASE ALLO STEP */}
      <div className="p-6 flex-1 flex flex-col">
        {/* ========================================================================= */}
        {/* STEP 1: MATRICE DELLE DISPONIBILITÀ OPERATORI */}
        {/* ========================================================================= */}
        {activeStep === 'disponibilita' && (
          <div className="flex flex-col gap-4 flex-1">
            {/* Barra delle Azioni e Filtri */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Filtra:</span>
                <button
                  onClick={() => setUserFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    userFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tutti ({activeProfiles.length})
                </button>
                <button
                  onClick={() => setUserFilter('autista')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    userFilter === 'autista' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Solo Autisti ({activeProfiles.filter(p => p.qualifica === 'autista').length})
                </button>
                <button
                  onClick={() => setUserFilter('CE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    userFilter === 'CE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Solo Soccorritori ({activeProfiles.filter(p => p.qualifica === 'CE').length})
                </button>

                <input
                  type="text"
                  placeholder="Cerca nome o cognome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-44 ml-2"
                />
              </div>

              {/* Bottoni Rapidi e Salvataggio */}
              <div className="flex items-center gap-2">
                {availSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-4 h-4" /> {availSuccessMsg}
                  </span>
                )}
                <button
                  onClick={handleSaveAvailabilities}
                  disabled={savingAvail}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingAvail ? 'Salvataggio...' : 'Salva Disponibilità'}</span>
                </button>
                <button
                  onClick={() => setActiveStep('config')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <span>Passo 2: Configura Regole</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Legenda Fasce Orarie */}
            <div className="flex flex-wrap items-center justify-between text-xs bg-slate-100/80 px-4 py-2 rounded-xl border border-slate-200 text-slate-600">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700">Fasce:</span>
                <span className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-amber-500 text-white font-bold flex items-center justify-center text-[10px]">M</span>
                  Mattina (06:00–13:00)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-blue-500 text-white font-bold flex items-center justify-center text-[10px]">P</span>
                  Pomeriggio (13:00–18:00)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-rose-500 text-white font-bold flex items-center justify-center text-[10px]">S</span>
                  Sera (18:00–00:00)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">N</span>
                  Notte (00:00–06:00)
                </span>
              </div>
              <span className="text-slate-500 italic">
                Clicca su una lettera per attivare/disattivare. Clicca sul giorno per selezionare tutta la giornata.
              </span>
            </div>

            {/* Tabella / Matrice Disponibilità */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto flex-1 max-h-[600px]">
              {loadingAvail ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-sm font-semibold">Caricamento disponibilità in corso...</span>
                </div>
              ) : displayedProfiles.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  Nessun operatore attivo trovato per i filtri selezionati.
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 z-20 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 min-w-[200px] sticky left-0 bg-slate-50 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                        Operatore
                      </th>
                      {periodDates.map(date => {
                        const parsed = parseISO(date)
                        const isWk = isWeekend(date)
                        return (
                          <th
                            key={date}
                            className={`p-2 text-center font-extrabold min-w-[90px] border-l border-slate-200 ${
                              isWk ? 'bg-indigo-50/50 text-indigo-900' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                {format(parsed, 'eee', { locale: it })}
                              </span>
                              <span className="text-sm font-black text-slate-800">
                                {format(parsed, 'd')}
                              </span>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedProfiles.map(p => {
                      const isAutista = p.qualifica === 'autista'
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Colonna Utente Sticky */}
                          <td className="p-3 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.04)] border-r border-slate-100">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">
                                  {p.nome ? `${p.nome} ${p.cognome || ''}`.trim() : p.username}
                                </span>
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider mt-1 ${
                                    isAutista
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {isAutista ? 'Autista (AS)' : 'Soccorritore (CE)'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Colonne Giorni */}
                          {periodDates.map(date => {
                            const isWk = isWeekend(date)
                            const isDayAllActive = GENERATOR_SLOTS.every(s =>
                              availSet.has(`${p.id}_${date}_${s.id}`)
                            )

                            return (
                              <td
                                key={date}
                                className={`p-1.5 text-center border-l border-slate-100 ${
                                  isWk ? 'bg-indigo-50/20' : ''
                                }`}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {/* Pulsante rapido toggle intero giorno */}
                                  <button
                                    type="button"
                                    onClick={() => toggleUserFullDay(p.id, date)}
                                    title="Seleziona/deseleziona tutta la giornata"
                                    className={`w-full py-0.5 rounded text-[9px] font-bold transition-all ${
                                      isDayAllActive
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-400 hover:bg-slate-200/60'
                                    }`}
                                  >
                                    All
                                  </button>

                                  {/* Micro-bottoni 4 Fasce: M, P, S, N */}
                                  <div className="grid grid-cols-2 gap-1 w-full max-w-[65px]">
                                    {GENERATOR_SLOTS.map(s => {
                                      const isAvail = availSet.has(`${p.id}_${date}_${s.id}`)
                                      const badgeColors = {
                                        1: isAvail ? 'bg-amber-500 text-white font-black' : 'bg-slate-100 text-slate-400 hover:bg-amber-100',
                                        2: isAvail ? 'bg-blue-500 text-white font-black' : 'bg-slate-100 text-slate-400 hover:bg-blue-100',
                                        3: isAvail ? 'bg-rose-500 text-white font-black' : 'bg-slate-100 text-slate-400 hover:bg-rose-100',
                                        4: isAvail ? 'bg-purple-600 text-white font-black' : 'bg-slate-100 text-slate-400 hover:bg-purple-100'
                                      }
                                      const letterMap = { 1: 'M', 2: 'P', 3: 'S', 4: 'N' }

                                      return (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => toggleAvailability(p.id, date, s.id)}
                                          className={`h-6 rounded text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer border ${
                                            isAvail ? 'border-transparent shadow-xs scale-102' : 'border-slate-200'
                                          } ${badgeColors[s.id]}`}
                                          title={`${s.label} - ${isAvail ? 'Disponibile' : 'Non disponibile'}`}
                                        >
                                          {letterMap[s.id]}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: CONFIGURAZIONE EQUIPAGGI (1 vs 2) E REGOLE ALGORITMO */}
        {/* ========================================================================= */}
        {activeStep === 'config' && (
          <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            {/* Box spiegazione & preset rapidi equipaggi */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Dove mettere 2 equipaggi e dove no?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Scegli un preset rapido o personalizza cliccando direttamente sulle singole fasce del calendario in basso.
                  </p>
                </div>
              </div>

              {/* Bottoni Preset Rapidi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => applyCrewPreset('all_1')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/30 text-left transition-all"
                >
                  <span className="block text-xs font-black text-slate-800">1 Equipaggio Fisso</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">1 Autista e 1 CE per ogni turno del mese.</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyCrewPreset('day2_night1')}
                  className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 text-left transition-all ring-1 ring-indigo-500/20"
                >
                  <span className="block text-xs font-black text-indigo-900">2 Eq. Giorno / 1 Notte</span>
                  <span className="text-[11px] text-indigo-700/80 mt-0.5 block">Mattina & Pom: 2 eq. Sera & Notte: 1 eq.</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyCrewPreset('weekend2')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/30 text-left transition-all"
                >
                  <span className="block text-xs font-black text-slate-800">2 Eq. nei Weekend</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Rinforzo a 2 equipaggi solo Sabato e Domenica.</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyCrewPreset('all_2')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/30 text-left transition-all"
                >
                  <span className="block text-xs font-black text-slate-800">2 Equipaggi Sempre</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Doppio equipaggio per tutti i giorni e tutte le fasce.</span>
                </button>
              </div>
            </div>

            {/* Opzioni e Vincoli dell'Algoritmo */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Preferenze & Vincoli di Assegnazione
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Tutti pari equità */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-950">Pari Equità Assoluta</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 mt-1">
                      L'algoritmo distribuisce lo stesso numero di turni a tutti gli operatori disponibili, bilanciando anche weekend e notti.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 mt-2 block">✓ Sempre Attivo</span>
                </div>

                {/* 2. Autisti usabili come soccorritori CE */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.allowDriverAsCE}
                        onChange={(e) => setOptions(prev => ({ ...prev, allowDriverAsCE: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-black text-slate-900">Autisti come Soccorritori</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Se mancano soccorritori CE in una fascia, un autista disponibile può coprire il ruolo CE anziché lasciare il turno vuoto.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 mt-2 block">
                    {options.allowDriverAsCE ? 'Abilitato (Consigliato)' : 'Disabilitato'}
                  </span>
                </div>

                {/* 3. Riposo minimo post-notte */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.respectRestTime}
                        onChange={(e) => setOptions(prev => ({ ...prev, respectRestTime: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-black text-slate-900">Riposo Minimo Obbligatorio</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Blocca l'assegnazione del turno Mattina se l'operatore ha fatto la Notte (00–06) o la Sera precedente (18–00).
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 mt-2 block">
                    {options.respectRestTime ? 'Rispettato' : 'Ignorato'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabella di Regolazione Fine Giornaliera (Dove 1 vs 2 equipaggi) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Mappa Equipaggi Richiesti per Fascia
                  </h4>
                  <p className="text-xs text-slate-500">
                    Clicca su una casella per alternare tra 1 equipaggio (2 persone) e 2 equipaggi (4 persone).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[350px] border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 font-bold text-slate-700 min-w-[120px]">Giorno</th>
                      {GENERATOR_SLOTS.map(s => (
                        <th key={s.id} className="p-2.5 font-extrabold text-slate-700 text-center min-w-[130px]">
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {periodDates.map(date => {
                      const parsed = parseISO(date)
                      const isWk = isWeekend(date)
                      return (
                        <tr key={date} className={`hover:bg-slate-50 ${isWk ? 'bg-indigo-50/20' : ''}`}>
                          <td className="p-2.5 font-bold text-slate-800">
                            <span className="capitalize">{format(parsed, 'EEEE d MMM', { locale: it })}</span>
                          </td>
                          {GENERATOR_SLOTS.map(s => {
                            const key = `${date}_${s.id}`
                            const crewCount = slotCrewsConfig[key] || 1
                            const isDouble = crewCount === 2

                            return (
                              <td key={s.id} className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSlotCrew(date, s.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                    isDouble
                                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  }`}
                                  title="Clicca per cambiare tra 1 o 2 equipaggi"
                                >
                                  {isDouble ? '2 Equipaggi (4 op.)' : '1 Equipaggio (2 op.)'}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Azioni di Avanzamento */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveStep('disponibilita')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Indietro: Disponibilità</span>
              </button>

              <button
                type="button"
                onClick={handleRunGenerator}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Calcolo in corso...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Calcola e Genera Turni (Algoritmo)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: ANTEPRIMA BOZZA GENERATA & APPROVAZIONE FINALE */}
        {/* ========================================================================= */}
        {activeStep === 'bozza' && (
          <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            {!draftResult ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 flex flex-col items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <h3 className="text-base font-bold text-slate-800">Nessuna bozza calcolata</h3>
                <p className="text-xs text-slate-500">
                  Torna al passo 2 e clicca su "Calcola e Genera Turni" per visualizzare l'anteprima.
                </p>
                <button
                  onClick={() => setActiveStep('config')}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  Vai a Regole & Calcolo
                </button>
              </div>
            ) : (
              <>
                {/* Banner di Successo se appena pubblicato */}
                {publishSuccess && (
                  <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6" />
                      <div>
                        <span className="font-extrabold text-sm block">Tabellone Ufficiale Pubblicato con Successo!</span>
                        <span className="text-xs text-emerald-100">
                          Tutti i turni sono ora visibili nel tabellone ufficiale e il periodo è bloccato per i non-admin.
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold">🔒 Bloccato Ufficiale</span>
                  </div>
                )}

                {/* 4 Card di Metriche & Risultati */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Copertura Totale</span>
                    <span className="text-2xl font-black text-indigo-600 mt-1 block">
                      {draftResult.summary.coveragePercent}%
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {draftResult.summary.totalCovered} di {draftResult.summary.totalSlotsRequired} posti
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Posti Scoperti</span>
                    <span className={`text-2xl font-black mt-1 block ${
                      draftResult.uncoveredSlots.length > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {draftResult.uncoveredSlots.length}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {draftResult.uncoveredSlots.length > 0 ? 'Disponibilità insufficienti' : 'Tutti coperti al 100%!'}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Indice di Equità</span>
                    <span className="text-2xl font-black text-slate-800 mt-1 block">
                      {draftResult.summary.minShifts} - {draftResult.summary.maxShifts}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Media: {draftResult.summary.avgShifts} turni/operatore
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stato Protezione</span>
                    <span className="text-2xl font-black text-amber-600 mt-1 block flex items-center gap-1.5">
                      <Lock className="w-5 h-5 text-amber-500" /> Blocco ON
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Non modificabile da volontari
                    </span>
                  </div>
                </div>

                {/* Se ci sono slot scoperti, mostra l'alert */}
                {draftResult.uncoveredSlots.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Attenzione: Ci sono {draftResult.uncoveredSlots.length} slot rimasti scoperti per mancanza di operatori disponibili:
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pt-1">
                      {draftResult.uncoveredSlots.map((u, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 text-[11px] font-bold border border-rose-200">
                          {format(parseISO(u.date), 'dd/MM')} {u.slot_label} ({u.crew_nome}): Manca {u.ruolo_turno === 'autista' ? 'Autista' : 'Soccorritore'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabella di Verifica Equità tra Operatori */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Verifica Distribuzione del Carico ("Tutti Pari Equità")</span>
                    <span className="text-indigo-600 font-extrabold">{draftResult.userStats.length} Operatori analizzati</span>
                  </h4>

                  <div className="overflow-x-auto max-h-[220px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-2 font-bold">Operatore</th>
                          <th className="p-2 font-bold text-center">Qualifica</th>
                          <th className="p-2 font-bold text-center">Turni Totali</th>
                          <th className="p-2 font-bold text-center">Notti</th>
                          <th className="p-2 font-bold text-center">Weekend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draftResult.userStats.map(u => (
                          <tr key={u.userId} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{u.nome}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.qualifica === 'autista' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {u.qualifica === 'autista' ? 'Autista' : 'Soccorritore'}
                              </span>
                            </td>
                            <td className="p-2 text-center font-extrabold text-indigo-600 text-sm">{u.totalShifts}</td>
                            <td className="p-2 text-center text-slate-600 font-semibold">{u.nightShifts}</td>
                            <td className="p-2 text-center text-slate-600 font-semibold">{u.weekendShifts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vista Dettagliata Bozza Giorno per Giorno */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Bozza Dettagliata per Giorno
                  </h4>

                  <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                    {periodDates.map(date => {
                      const dayAssignments = draftResult.assignments.filter(a => a.date === date)
                      const dayUncovered = draftResult.uncoveredSlots.filter(u => u.date === date)
                      const parsed = parseISO(date)
                      const isWk = isWeekend(date)

                      return (
                        <div key={date} className={`p-3.5 rounded-xl border ${isWk ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-xs capitalize text-slate-800">
                              {format(parsed, 'EEEE d MMMM yyyy', { locale: it })}
                            </span>
                            {dayUncovered.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                {dayUncovered.length} scoperto/i
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {GENERATOR_SLOTS.map(s => {
                              const slotAssignments = dayAssignments.filter(a => a.slot_id === s.id)
                              const slotUncovered = dayUncovered.filter(u => u.slot_id === s.id)

                              return (
                                <div key={s.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</span>
                                  
                                  {/* Assegnati */}
                                  {slotAssignments.map((asgn, idx) => (
                                    <div key={idx} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[9px] font-extrabold uppercase ${
                                          asgn.ruolo_turno === 'autista' ? 'text-amber-600' : 'text-emerald-600'
                                        }`}>
                                          {asgn.ruolo_turno === 'autista' ? 'Autista' : 'ATS'}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-semibold">{asgn.crew_nome}</span>
                                      </div>
                                      <span className="font-bold text-slate-900 mt-0.5 truncate" title={asgn.user_nome}>
                                        {asgn.user_nome}
                                      </span>
                                      {asgn.is_driver_acting_as_ce && (
                                        <span className="text-[8px] text-indigo-500 font-bold mt-0.5">
                                          (Autista impiegato come ATS)
                                        </span>
                                      )}
                                    </div>
                                  ))}

                                  {/* Scoperti */}
                                  {slotUncovered.map((unc, idx) => (
                                    <div key={`u_${idx}`} className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px] flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>Manca {unc.ruolo_turno === 'autista' ? 'Autista' : 'ATS'} ({unc.crew_nome})</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Azione di Approvazione Ufficiale */}
                <div className="bg-white p-6 rounded-2xl border-2 border-indigo-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-indigo-600" />
                      Pronto per l'Approvazione Ufficiale?
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      I turni verranno salvati nel database. Il mese sarà marcato come <strong>Ufficiale (Bloccato)</strong> e non potrà più essere modificato da nessuno se non da te (admin).
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveStep('config')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Ricalcola Regole
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPublishModal(true)}
                      disabled={publishing}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approva e Pubblica nel Tabellone</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODALE DI CONFERMA APPROVAZIONE & PUBBLICAZIONE */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Confermi la Pubblicazione?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Stai per inserire <strong>{draftResult?.assignments.length} turni</strong> nel tabellone ufficiale per il periodo di <strong>{format(selectedMonth, 'MMMM yyyy', { locale: it })}</strong>.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Blocco di sicurezza attivo:</strong> da questo momento i volontari e dipendenti non potranno più modificare o cancellare i propri turni senza l'intervento di un amministratore.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={publishing}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={publishing}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-colors flex items-center justify-center gap-1.5"
              >
                {publishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pubblicazione...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Conferma e Blocca</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
