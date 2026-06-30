import React, { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import {
  Menu,
  ChevronDown,
  User,
  Truck,
  MapPin,
  FileText,
  DollarSign,
  Check,
  X,
  AlertCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Users
} from 'lucide-react'


// Time helper: convert 'HH:MM' or 'HH:MM:SS' to minutes from midnight
const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const hours = Number(parts[0]) || 0
  const minutes = Number(parts[1]) || 0
  return hours * 60 + minutes
}

// Parse hidden JSON metadata from note field
const parseExternalCrewFromNotes = (noteText) => {
  if (!noteText) return { notes: '', ce_esterno: '', as_esterno: '' }
  const match = noteText.match(/<!--(\{.*\})-->/)
  if (match) {
    try {
      const meta = JSON.parse(match[1])
      const notes = noteText.replace(/<!--(\{.*\})-->/, '').trim()
      return { notes, ce_esterno: meta.ce_esterno || '', as_esterno: meta.as_esterno || '' }
    } catch (e) {
      return { notes: noteText, ce_esterno: '', as_esterno: '' }
    }
  }
  return { notes: noteText, ce_esterno: '', as_esterno: '' }
}

// Build note text appending hidden JSON metadata
const buildNotesWithExternalCrew = (userNotes, ceEsterno, asEsterno) => {
  const notesPart = (userNotes || '').trim()
  if (!ceEsterno && !asEsterno) return notesPart
  const meta = { ce_esterno: ceEsterno || '', as_esterno: asEsterno || '' }
  return `${notesPart}\n\n<!--${JSON.stringify(meta)}-->`
}

export default function TransportDrawer({
  activeTransport,
  setActiveTransport,
  isOpen,
  onClose,
  onRefresh,
  profile,
  onTerminateSuccess,
  readOnly = false,
  onActivate,
  activeShift,
  onGoToClockIn
}) {
  const [vehicles, setVehicles] = useState([])
  const [users, setUsers] = useState([])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditCrewOpen, setIsEditCrewOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelChoice, setCancelChoice] = useState(null) // null | 'delete' | 'transfer'
  const [selectedNewAuthorId, setSelectedNewAuthorId] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isLocalUnlocked, setIsLocalUnlocked] = useState(false)

  const isEffectiveReadOnly = readOnly && !isLocalUnlocked

  const handleActivateProgrammed = async () => {
    setIsActionLoading(true)
    try {
      const { data, error } = await api.startScheduledTransport(activeTransport.id, profile.id)
      if (error) throw error
      if (onActivate) {
        await onActivate(activeTransport.id)
      } else {
        onRefresh?.()
        onClose()
      }
    } catch (err) {
      console.error("Error activating programmed transport:", err)
      alert("Errore durante l'attivazione del trasporto: " + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Local Form States
  const [localNotes, setLocalNotes] = useState('')
  const [ceEsterno, setCeEsterno] = useState('')
  const [asEsterno, setAsEsterno] = useState('')
  const [isCeEsterno, setIsCeEsterno] = useState(false)
  const [isAsEsterno, setIsAsEsterno] = useState(false)

  const [localOraServizio, setLocalOraServizio] = useState('')
  const [localKmIniziali, setLocalKmIniziali] = useState('')
  const [localAltroDescrizione, setLocalAltroDescrizione] = useState('')
  const [localDaReparto, setLocalDaReparto] = useState('')
  const [localDaNome, setLocalDaNome] = useState('')
  const [localDaVia, setLocalDaVia] = useState('')
  const [localAReparto, setLocalAReparto] = useState('')
  const [localANome, setLocalANome] = useState('')
  const [localAVia, setLocalAVia] = useState('')
  const [localPazienteNome, setLocalPazienteNome] = useState('')
  const [localPazienteCF, setLocalPazienteCF] = useState('')
  const [localPazienteTel, setLocalPazienteTel] = useState('')
  const [localImporto, setLocalImporto] = useState('')
  const [localAltroPagamento, setLocalAltroPagamento] = useState('')

  // Termination State
  const [isTerminating, setIsTerminating] = useState(false)
  const [kmFinali, setKmFinali] = useState('')
  const [terminateError, setTerminateError] = useState('')

  // Section Refs for scrolling
  const sectionRefs = {
    equipaggio: useRef(null),
    mezzo: useRef(null),
    tipo: useRef(null),
    percorsoDa: useRef(null),
    percorsoA: useRef(null),
    paziente: useRef(null),
    pagamento: useRef(null)
  }

  // Load vehicles and profiles
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: vehs } = await api.fetchVehicles()
        setVehicles(vehs || [])

        const { data: profs } = await api.fetchProfiles()
        setUsers(profs || [])
      } catch (err) {
        console.error('Error loading drawer assets:', err)
      }
    }
    loadData()
  }, [])

  // Auto-focus centering for inputs when virtual keyboard pops up on mobile
  useEffect(() => {
    const handleGlobalFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }
    }
    document.addEventListener('focus', handleGlobalFocus, true)
    return () => {
      document.removeEventListener('focus', handleGlobalFocus, true)
    }
  }, [])

  // Auto-autocompile crew from board on mount/open if crew is empty and ora_servizio is set
  useEffect(() => {
    if (isOpen && activeTransport) {
      const activeCe = activeTransport.crew?.find(c => c.ruolo === 'CE' && c.attivo)
      const activeAs = activeTransport.crew?.find(c => c.ruolo === 'AS' && c.attivo)
      const serviceTime = activeTransport.ora_servizio
      if (!activeCe && !activeAs && serviceTime && activeTransport.stato === 'attivo') {
        const autocompile = async () => {
          try {
            const { data: shifts } = await api.fetchActiveShiftsAndBookingsForDate(activeTransport.data)
            if (!shifts || shifts.length === 0) return

            const serviceMin = timeStringToMinutes(serviceTime)
            
            // Find matching shift
            let matchedShift = null
            for (const s of shifts) {
              const startMin = timeStringToMinutes(s.ora_inizio)
              const endMin = timeStringToMinutes(s.ora_fine)
              if (startMin < endMin) {
                if (serviceMin >= startMin && serviceMin < endMin) {
                  matchedShift = s
                  break
                }
              } else {
                if (serviceMin >= startMin || serviceMin < endMin) {
                  matchedShift = s
                  break
                }
              }
            }

            if (matchedShift) {
              // Find CE
              const ceBookings = matchedShift.bookings?.filter(b => b.ruolo_turno === 'CE') || []
              let matchedCe = null
              for (const b of ceBookings) {
                const startStr = b.is_partial && b.ora_inizio_effettiva ? b.ora_inizio_effettiva : matchedShift.ora_inizio
                const endStr = b.is_partial && b.ora_fine_effettiva ? b.ora_fine_effettiva : matchedShift.ora_fine
                const startMin = timeStringToMinutes(startStr)
                const endMin = timeStringToMinutes(endStr)
                if (startMin < endMin) {
                  if (serviceMin >= startMin && serviceMin < endMin) { matchedCe = b; break; }
                } else {
                  if (serviceMin >= startMin || serviceMin < endMin) { matchedCe = b; break; }
                }
              }
              if (!matchedCe && ceBookings.length > 0) matchedCe = ceBookings[0]

              // Find AS/Autista
              const asBookings = matchedShift.bookings?.filter(b => b.ruolo_turno === 'autista') || []
              let matchedAs = null
              for (const b of asBookings) {
                const startStr = b.is_partial && b.ora_inizio_effettiva ? b.ora_inizio_effettiva : matchedShift.ora_inizio
                const endStr = b.is_partial && b.ora_fine_effettiva ? b.ora_fine_effettiva : matchedShift.ora_fine
                const startMin = timeStringToMinutes(startStr)
                const endMin = timeStringToMinutes(endStr)
                if (startMin < endMin) {
                  if (serviceMin >= startMin && serviceMin < endMin) { matchedAs = b; break; }
                } else {
                  if (serviceMin >= startMin || serviceMin < endMin) { matchedAs = b; break; }
                }
              }
              if (!matchedAs && asBookings.length > 0) matchedAs = asBookings[0]

              if (matchedCe?.user_id) {
                setIsCeEsterno(false)
                setCeEsterno('')
              }
              if (matchedAs?.user_id) {
                setIsAsEsterno(false)
                setAsEsterno('')
              }

              // Save shift and crew atomically
              await handleSaveShiftAndCrew(
                matchedShift.id,
                matchedCe?.user_id || null,
                matchedAs?.user_id || null
              )
            }
          } catch (err) {
            console.error('Error auto-autocompiling crew from board:', err)
          }
        }
        autocompile()
      }
    }
  }, [isOpen, activeTransport?.id])

  // Sync state with activeTransport when it changes
  useEffect(() => {
    if (activeTransport) {
      const activeField = document.activeElement ? document.activeElement.getAttribute('data-field') : null

      const { notes, ce_esterno, as_esterno } = parseExternalCrewFromNotes(activeTransport.note)
      if (activeField !== 'note') setLocalNotes(notes)
      if (activeField !== 'ce_esterno') setCeEsterno(ce_esterno)
      if (activeField !== 'as_esterno') setAsEsterno(as_esterno)
      setIsCeEsterno(!!ce_esterno)
      setIsAsEsterno(!!as_esterno)

      if (activeField !== 'ora_servizio') setLocalOraServizio(activeTransport.ora_servizio ? activeTransport.ora_servizio.slice(0, 5) : '')
      if (activeField !== 'km_iniziali') setLocalKmIniziali(activeTransport.km_iniziali || '')
      if (activeField !== 'altro_descrizione') setLocalAltroDescrizione(activeTransport.altro_descrizione || '')
      if (activeField !== 'da_reparto') setLocalDaReparto(activeTransport.da_reparto || '')
      if (activeField !== 'da_nome') setLocalDaNome(activeTransport.da_nome || '')
      if (activeField !== 'da_via') setLocalDaVia(activeTransport.da_via || '')
      if (activeField !== 'a_reparto') setLocalAReparto(activeTransport.a_reparto || '')
      if (activeField !== 'a_nome') setLocalANome(activeTransport.a_nome || '')
      if (activeField !== 'a_via') setLocalAVia(activeTransport.a_via || '')
      if (activeField !== 'paziente_cognome_nome') setLocalPazienteNome(activeTransport.paziente_cognome_nome || '')
      if (activeField !== 'paziente_codice_fiscale') setLocalPazienteCF(activeTransport.paziente_codice_fiscale || '')
      if (activeField !== 'paziente_telefono') setLocalPazienteTel(activeTransport.paziente_telefono || '')
      if (activeField !== 'importo') setLocalImporto(activeTransport.importo || '')
      
      const payVal = activeTransport.tipo_pagamento || ''
      const payValLower = payVal.toLowerCase()
      const isCustomPay = payValLower && !['contante', 'pos', 'buono', 'convenzione'].includes(payValLower)
      if (activeField !== 'tipo_pagamento') {
        setLocalAltroPagamento(isCustomPay ? (payValLower === 'altro' ? '' : payVal) : '')
      }
    }
  }, [activeTransport])

  if (!activeTransport) return null

  // Check which users are currently active in the crew
  const activeCe = activeTransport.crew?.find(c => c.ruolo === 'CE' && c.attivo)
  const activeAs = activeTransport.crew?.find(c => c.ruolo === 'AS' && c.attivo)

  const isCrewEditable = !isEffectiveReadOnly || (activeTransport.stato === 'programmato' && (profile?.ruolo === 'admin' || profile?.id === activeCe?.user_id || profile?.id === activeAs?.user_id || !activeCe?.user_id))

  // Section validation for blue dots
  const isSectionIncomplete = (section) => {
    switch (section) {
      case 'equipaggio':
        return isCeEsterno ? !ceEsterno : !activeCe?.user_id
      case 'mezzo':
        return !activeTransport.vehicle_id || !localOraServizio || !localKmIniziali
      case 'tipo':
        if (!activeTransport.tipo_trasporto) return true
        if (activeTransport.tipo_trasporto.toLowerCase() === 'altro' && !localAltroDescrizione) return true
        return false
      case 'percorsoDa':
        if (!activeTransport.da_tipo_luogo) return true
        if (activeTransport.da_tipo_luogo.toLowerCase() === 'abitazione') return !localDaVia
        return !localDaNome
      case 'percorsoA':
        if (!activeTransport.a_tipo_luogo) return true
        if (activeTransport.a_tipo_luogo.toLowerCase() === 'abitazione') return !localAVia
        return !localANome
      case 'paziente':
        return !localPazienteNome
      case 'pagamento':
        return !activeTransport.tipo_pagamento
      default:
        return false
    }
  }

  // Field change & blur handlers
  const handleSaveField = async (field, value) => {
    if (isEffectiveReadOnly) return
    // Optimistic Update
    setActiveTransport(prev => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
    
    try {
      const { error } = await api.updateTransportField(activeTransport.id, field, value)
      if (error) throw error
    } catch (err) {
      console.error(`Error saving field ${field}:`, err)
      onRefresh?.() // revert on error
    }
  }

  const handleSaveFields = async (fieldsObj) => {
    if (isEffectiveReadOnly) return
    // Optimistic Update
    setActiveTransport(prev => {
      if (!prev) return prev
      return { ...prev, ...fieldsObj }
    })
    
    try {
      const { error } = await api.updateTransportFields(activeTransport.id, fieldsObj)
      if (error) throw error
    } catch (err) {
      console.error('Error saving fields:', err)
      onRefresh?.() // revert on error
    }
  }

  const handleSaveShiftAndCrew = async (shiftId, ceUserId, asUserId) => {
    if (!isCrewEditable) return
    // Optimistic Update
    setActiveTransport(prev => {
      if (!prev) return prev
      const newCrewList = [...(prev.crew || [])]
      // Deactivate current active members
      newCrewList.forEach((c, idx) => {
        if (c.attivo) {
          newCrewList[idx] = { ...c, attivo: false, ora_fine_ruolo: new Date().toISOString() }
        }
      })
      // Add new members
      if (ceUserId) {
        newCrewList.push({
          id: Date.now(),
          transport_id: prev.id,
          user_id: ceUserId,
          ruolo: 'CE',
          attivo: true,
          ora_inizio_ruolo: new Date().toISOString()
        })
      }
      if (asUserId) {
        newCrewList.push({
          id: Date.now() + 1,
          transport_id: prev.id,
          user_id: asUserId,
          ruolo: 'AS',
          attivo: true,
          ora_inizio_ruolo: new Date().toISOString()
        })
      }
      return {
        ...prev,
        shift_id: shiftId,
        crew: newCrewList
      }
    })

    try {
      const { error } = await api.updateTransportShiftAndCrew(activeTransport.id, shiftId, ceUserId, asUserId)
      if (error) throw error
    } catch (err) {
      console.error('Error saving shift and crew:', err)
      onRefresh?.() // revert on error
    }
  }

  // Save notes with metadata
  const handleSaveNotes = async (notesVal, ceEst, asEst) => {
    const fullNotesText = buildNotesWithExternalCrew(notesVal, ceEst, asEst)
    // Optimistic Update
    setActiveTransport(prev => {
      if (!prev) return prev
      return { ...prev, note: fullNotesText }
    })
    
    try {
      const { error } = await api.updateTransportField(activeTransport.id, 'note', fullNotesText)
      if (error) throw error
    } catch (err) {
      console.error('Error saving notes and metadata:', err)
      onRefresh?.() // revert on error
    }
  }

  // Save crew members (internal users)
  const handleSaveCrewMember = async (role, userId) => {
    if (!isCrewEditable) return
    // Optimistic Update
    setActiveTransport(prev => {
      if (!prev) return prev
      
      const newCrewList = [...(prev.crew || [])]
      // Deactivate current active member for this role
      const activeIdx = newCrewList.findIndex(c => c.ruolo === role && c.attivo)
      if (activeIdx !== -1) {
        newCrewList[activeIdx] = {
          ...newCrewList[activeIdx],
          attivo: false,
          ora_fine_ruolo: new Date().toISOString()
        }
      }
      
      // If we are assigning a user, add them
      if (userId) {
        newCrewList.push({
          id: Date.now(), // temporary id
          transport_id: prev.id,
          user_id: userId,
          ruolo: role,
          attivo: true,
          ora_inizio_ruolo: new Date().toISOString()
        })
      }
      
      return {
        ...prev,
        crew: newCrewList
      }
    })

    try {
      const { error } = await api.updateTransportCrewMember(activeTransport.id, role, userId)
      if (error) throw error
    } catch (err) {
      console.error(`Error saving crew member for role ${role}:`, err)
      onRefresh?.() // revert on error
    }
  }

  // Trigger autocompilation from tabellone/shifts
  const handleAutocompileFromBoard = async () => {
    if (!isCrewEditable) return
    if (!localOraServizio) return
    try {
      const { data: shifts } = await api.fetchActiveShiftsAndBookingsForDate(activeTransport.data)
      if (!shifts || shifts.length === 0) return

      const serviceMin = timeStringToMinutes(localOraServizio)
      
      // Find matching shift
      let matchedShift = null
      for (const s of shifts) {
        const startMin = timeStringToMinutes(s.ora_inizio)
        const endMin = timeStringToMinutes(s.ora_fine)
        if (startMin < endMin) {
          if (serviceMin >= startMin && serviceMin < endMin) {
            matchedShift = s
            break
          }
        } else {
          if (serviceMin >= startMin || serviceMin < endMin) {
            matchedShift = s
            break
          }
        }
      }

      if (matchedShift) {
        // Find CE
        const ceBookings = matchedShift.bookings?.filter(b => b.ruolo_turno === 'CE') || []
        let matchedCe = null
        for (const b of ceBookings) {
          const startStr = b.is_partial && b.ora_inizio_effettiva ? b.ora_inizio_effettiva : matchedShift.ora_inizio
          const endStr = b.is_partial && b.ora_fine_effettiva ? b.ora_fine_effettiva : matchedShift.ora_fine
          const startMin = timeStringToMinutes(startStr)
          const endMin = timeStringToMinutes(endStr)
          if (startMin < endMin) {
            if (serviceMin >= startMin && serviceMin < endMin) { matchedCe = b; break; }
          } else {
            if (serviceMin >= startMin || serviceMin < endMin) { matchedCe = b; break; }
          }
        }
        if (!matchedCe && ceBookings.length > 0) matchedCe = ceBookings[0]

        // Find AS/Autista
        const asBookings = matchedShift.bookings?.filter(b => b.ruolo_turno === 'autista') || []
        let matchedAs = null
        for (const b of asBookings) {
          const startStr = b.is_partial && b.ora_inizio_effettiva ? b.ora_inizio_effettiva : matchedShift.ora_inizio
          const endStr = b.is_partial && b.ora_fine_effettiva ? b.ora_fine_effettiva : matchedShift.ora_fine
          const startMin = timeStringToMinutes(startStr)
          const endMin = timeStringToMinutes(endStr)
          if (startMin < endMin) {
            if (serviceMin >= startMin && serviceMin < endMin) { matchedAs = b; break; }
          } else {
            if (serviceMin >= startMin || serviceMin < endMin) { matchedAs = b; break; }
          }
        }
        if (!matchedAs && asBookings.length > 0) matchedAs = asBookings[0]

        if (matchedCe?.user_id) {
          setIsCeEsterno(false)
          setCeEsterno('')
        }
        if (matchedAs?.user_id) {
          setIsAsEsterno(false)
          setAsEsterno('')
        }

        // Save shift and crew atomically
        await handleSaveShiftAndCrew(
          matchedShift.id,
          matchedCe?.user_id || null,
          matchedAs?.user_id || null
        )
      }
    } catch (err) {
      console.error('Error autocompiling crew from board:', err)
    }
  }

  // Handle vehicle selection
  const handleSelectVehicle = async (vehicleId) => {
    if (vehicleId) {
      try {
        const { km } = await api.fetchLastKmForVehicle(Number(vehicleId))
        setLocalKmIniziali(km || 0)
        await handleSaveFields({
          vehicle_id: Number(vehicleId),
          km_iniziali: km || 0
        })
      } catch (err) {
        console.error('Error fetching vehicle km:', err)
        await handleSaveFields({
          vehicle_id: Number(vehicleId),
          km_iniziali: 0
        })
      }
    } else {
      setLocalKmIniziali('')
      await handleSaveFields({
        vehicle_id: null,
        km_iniziali: null
      })
    }
  }

  // Terminate transport
  const handleTerminateTransport = async () => {
    if (isEffectiveReadOnly) return
    setTerminateError('')
    if (!kmFinali || isNaN(Number(kmFinali))) {
      setTerminateError('Inserisci un valore numerico valido.')
      return
    }
    const finalVal = Number(kmFinali)
    const initVal = Number(localKmIniziali || 0)
    if (finalVal < initVal) {
      setTerminateError(`I chilometri finali non possono essere minori dei chilometri iniziali (${initVal}).`)
      return
    }

    try {
      const currentNotes = localNotes || ''
      const appendedNote = (profile?.ruolo === 'admin')
        ? (currentNotes.trim() ? `${currentNotes}\n\nscheda chiusa da [admin]` : 'scheda chiusa da [admin]')
        : currentNotes
      setLocalNotes(appendedNote)
      const fullNotesText = buildNotesWithExternalCrew(appendedNote, ceEsterno, asEsterno)
      await api.updateTransportField(activeTransport.id, 'note', fullNotesText)

      const { error } = await api.terminateTransport(activeTransport.id, finalVal, activeTransport.vehicle_id)
      if (error) throw error
      setIsTerminating(false)
      setKmFinali('')
      onClose()
      onRefresh?.()
      if (onTerminateSuccess) {
        onTerminateSuccess()
      }
    } catch (err) {
      console.error('Error terminating transport:', err)
      setTerminateError('Errore durante la chiusura del trasporto.')
    }
  }

  // Abort/Delete active transport completely
  const handleDeleteActiveTransport = async () => {
    setIsActionLoading(true)
    try {
      const { error } = await api.deleteTransport(activeTransport.id)
      if (error) throw error
      setActiveTransport(null)
      setIsCancelModalOpen(false)
      setCancelChoice(null)
      onClose()
      onRefresh?.()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Errore durante l\'eliminazione del trasporto.')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Transfer active transport to a new operator
  const handleTransferActiveTransport = async () => {
    if (!selectedNewAuthorId) return
    setIsActionLoading(true)
    try {
      const newUser = users.find(u => u.id === selectedNewAuthorId)
      if (!newUser) throw new Error('Nuovo operatore non trovato.')
      
      const appendText = `\ntrasporto concluso da: ${newUser.nome} ${newUser.cognome}`
      const currentNotes = activeTransport.note || ''
      const updatedNotes = currentNotes.trim() ? `${currentNotes}\n${appendText}` : appendText
      
      const updates = {
        creato_da: selectedNewAuthorId,
        note: updatedNotes
      }
      
      const { error } = await api.updateTransportFields(activeTransport.id, updates)
      if (error) throw error
      
      setActiveTransport(null)
      setIsCancelModalOpen(false)
      setCancelChoice(null)
      setSelectedNewAuthorId('')
      onClose()
      onRefresh?.()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Errore durante il trasferimento del trasporto.')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Scroll to section helper
  const scrollToSection = (sectionName) => {
    sectionRefs[sectionName]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setIsMenuOpen(false)
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 max-w-md mx-auto bg-slate-900 border-t border-slate-800 shadow-2xl rounded-t-3xl transition-transform duration-500 ease-out z-50 overflow-hidden flex flex-col ${
        isOpen ? 'h-[92dvh] translate-y-0' : 'h-0 translate-y-full'
      }`}
    >
      {/* HEADER */}
      <header className="flex-shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          {/* Menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            aria-label="Menu sezioni"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Active indicator */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              activeTransport.stato === 'programmato' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}></span>
            <span className="text-xs font-bold text-slate-200">
              {activeTransport.stato === 'programmato' ? 'Trasporto Programmato' : 'Trasporto Attivo'}
            </span>
          </div>
        </div>

        {/* Header title */}
        <span className="text-xs font-semibold text-slate-450">
          Scheda #{activeTransport.id}
        </span>

        {/* Expand/Collapse Button */}
        <button
          onClick={onClose}
          className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
          aria-label="Minimizza"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </header>

      {/* SECTION LIST OVERLAY MENU (☰) */}
      {isMenuOpen && (
        <div className="absolute inset-x-0 top-[52px] bottom-0 bg-slate-950/90 backdrop-blur-md z-30 animate-fade-in flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
              <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sezioni della Scheda</span>
              <button onClick={() => setIsMenuOpen(false)} className="text-slate-500 hover:text-slate-305 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {[
              { id: 'equipaggio', label: '1. Equipaggio' },
              { id: 'mezzo', label: '2. Mezzo e Orario' },
              { id: 'tipo', label: '3. Tipo Trasporto' },
              { id: 'percorsoDa', label: '4. Percorso Da' },
              { id: 'percorsoA', label: '5. Percorso A' },
              { id: 'paziente', label: '6. Dati Paziente' },
              { id: 'pagamento', label: '7. Pagamento' }
            ].map(sec => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-900 hover:bg-slate-800/80 border border-slate-880 hover:border-slate-700 rounded-2xl text-sm font-semibold transition-all cursor-pointer"
              >
                <span>{sec.label}</span>
                {isSectionIncomplete(sec.id) ? (
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" title="Dato obbligatorio mancante"></span>
                ) : (
                  <Check className="w-4.5 h-4.5 text-emerald-500" />
                )}
              </button>
            ))}

            {/* Action buttons inside menu */}
            {activeTransport && (!isEffectiveReadOnly || (activeTransport.stato === 'programmato' && (profile?.ruolo === 'admin' || profile?.id === activeCe?.user_id || profile?.id === activeAs?.user_id))) && (
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  setIsCancelModalOpen(true)
                  setCancelChoice(null)
                  setSelectedNewAuthorId('')
                }}
                className="w-full flex items-center justify-between p-3.5 bg-rose-950/30 hover:bg-rose-950/40 border border-rose-900/40 hover:border-rose-800 rounded-2xl text-sm font-bold text-rose-400 transition-all cursor-pointer mt-4"
              >
                <span>{activeTransport.stato === 'programmato' ? 'Elimina / Annulla Trasporto' : 'Annulla / Trasferisci Trasporto'}</span>
                <Trash2 className="w-4 h-4 text-rose-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SCROLLABLE FORM BODY */}
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-24 scroll-smooth">
        {activeTransport.stato === 'programmato' ? (
          <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-indigo-400 font-sans">Viaggio Programmato</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal font-sans">
                  Questo viaggio è precompilato. Premi "Attiva Trasporto" per iniziare la compilazione.
                </p>
              </div>
            </div>
            {(profile?.ruolo === 'admin' || profile?.id === activeCe?.user_id || profile?.id === activeAs?.user_id) && (
              <button
                onClick={(!activeShift && profile?.ruolo !== 'admin') ? onGoToClockIn : handleActivateProgrammed}
                disabled={isActionLoading}
                className={`px-4 py-2 text-white font-bold rounded-xl text-xs transition-all shrink-0 cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${
                  (!activeShift && profile?.ruolo !== 'admin')
                    ? 'bg-amber-600 hover:bg-amber-550 border border-amber-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-550'
                }`}
              >
                {isActionLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Attivazione...
                  </>
                ) : (
                  (!activeShift && profile?.ruolo !== 'admin') ? 'Timbra per attivare' : 'Attiva Trasporto'
                )}
              </button>
            )}
          </div>
        ) : (
          readOnly && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-400 font-sans">Scheda in Sola Lettura</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-normal font-sans">
                    {isLocalUnlocked 
                      ? "Modifica sbloccata come Amministratore. Puoi apportare cambiamenti o concludere il trasporto."
                      : "Questa scheda di trasporto è attiva ed è gestita da un altro soccorritore."}
                  </p>
                </div>
              </div>
              {profile?.ruolo === 'admin' && (
                <button
                  onClick={() => setIsLocalUnlocked(!isLocalUnlocked)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm font-sans ${
                    isLocalUnlocked 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' 
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                  }`}
                >
                  {isLocalUnlocked ? "Ripristina Blocco" : "Sblocca Modifica"}
                </button>
              )}
            </div>
          )
        )}

        <div className={isCrewEditable ? '' : 'pointer-events-none select-none'}>
        
        {/* SECTION 1: EQUIPAGGIO BOX */}
        <section ref={sectionRefs.equipaggio} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-400" />
              1. Equipaggio
            </h3>
          </div>

          {/* Yellow Summary Card */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-2 relative">
            {isCrewEditable && (
              <button
                onClick={() => setIsEditCrewOpen(!isEditCrewOpen)}
                className="absolute top-3.5 right-3.5 p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 rounded-xl transition-colors cursor-pointer"
                title="Modifica equipaggio"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/90 leading-none">Riepilogo Equipaggio</span>
            <div className="space-y-1 mt-1 text-left">
              <p className="text-xs font-semibold text-slate-300">
                Capo Equipaggio (CE):{' '}
                <strong className="text-slate-100 font-bold">
                  {isCeEsterno ? ceEsterno + ' (Esterno)' : users.find(u => u.id === activeCe?.user_id)
                    ? `${users.find(u => u.id === activeCe.user_id).nome} ${users.find(u => u.id === activeCe.user_id).cognome}`
                    : 'Da assegnare'}
                </strong>
              </p>
              <p className="text-xs font-semibold text-slate-300">
                Autista/Soccorritore (AS):{' '}
                <strong className="text-slate-100 font-bold">
                  {isAsEsterno ? asEsterno + ' (Esterno)' : users.find(u => u.id === activeAs?.user_id)
                    ? `${users.find(u => u.id === activeAs.user_id).nome} ${users.find(u => u.id === activeAs.user_id).cognome}`
                    : 'Da assegnare'}
                </strong>
              </p>
            </div>
          </div>

          {/* Edit Crew Section (Collapsible) */}
          {isEditCrewOpen && (
            <div className="bg-slate-800/40 border border-slate-800/80 p-4 rounded-2xl space-y-4 animate-fade-in text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase">Configura Operatori</span>
                <button
                  onClick={handleAutocompileFromBoard}
                  disabled={!localOraServizio}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/25 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
                >
                  Prendi da Tabellone
                </button>
              </div>

              {/* CE Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400">Capo Equipaggio (CE)</label>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-450 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isCeEsterno}
                      onChange={(e) => {
                        setIsCeEsterno(e.target.checked)
                        if (!e.target.checked) {
                          setCeEsterno('')
                          handleSaveNotes(localNotes, '', asEsterno)
                        } else {
                          handleSaveCrewMember('CE', null)
                        }
                      }}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    Operatore Esterno
                  </label>
                </div>

                {isCeEsterno ? (
                  <input
                    type="text"
                    data-field="ce_esterno"
                    placeholder="Nome operatore esterno"
                    value={ceEsterno}
                    onChange={(e) => setCeEsterno(e.target.value)}
                    onBlur={() => handleSaveNotes(localNotes, ceEsterno, asEsterno)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-700"
                  />
                ) : (
                  <select
                    value={activeCe?.user_id || ''}
                    onChange={(e) => handleSaveCrewMember('CE', e.target.value || null)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all"
                  >
                    <option value="">Seleziona operatore...</option>
                    {users
                      .filter(u => u.attivo)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nome} {u.cognome} ({u.username})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* AS Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400">Autista/Soccorritore (AS)</label>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-455 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAsEsterno}
                      onChange={(e) => {
                        setIsAsEsterno(e.target.checked)
                        if (!e.target.checked) {
                          setAsEsterno('')
                          handleSaveNotes(localNotes, ceEsterno, '')
                        } else {
                          handleSaveCrewMember('AS', null)
                        }
                      }}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    Operatore Esterno
                  </label>
                </div>

                {isAsEsterno ? (
                  <input
                    type="text"
                    data-field="as_esterno"
                    placeholder="Nome operatore esterno"
                    value={asEsterno}
                    onChange={(e) => setAsEsterno(e.target.value)}
                    onBlur={() => handleSaveNotes(localNotes, ceEsterno, asEsterno)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-700"
                  />
                ) : (
                  <select
                    value={activeAs?.user_id || ''}
                    onChange={(e) => handleSaveCrewMember('AS', e.target.value || null)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all"
                  >
                    <option value="">Seleziona operatore...</option>
                    {users
                      .filter(u => u.attivo)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nome} {u.cognome} ({u.username})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </section>
        </div>
        <div className={isEffectiveReadOnly ? 'pointer-events-none select-none' : ''}>

        {/* SECTION 2: DATI TRASPORTO */}
        <section ref={sectionRefs.mezzo} className="space-y-3.5 text-left border-t border-slate-800 pt-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-indigo-400" />
            2. Dati trasporto
          </h3>

          <div className="flex flex-col gap-4">
            {/* Mezzo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Mezzo *</label>
              <select
                value={activeTransport.vehicle_id || ''}
                onChange={(e) => handleSelectVehicle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-3 text-xs font-semibold text-slate-205 outline-none transition-all"
              >
                <option value="">Seleziona mezzo...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nome}{v.targa ? ` (${v.targa})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Ora Servizio */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400">Ora Servizio *</label>
              </div>
              <input
                type="time"
                data-field="ora_servizio"
                value={localOraServizio}
                onChange={(e) => setLocalOraServizio(e.target.value)}
                onBlur={async () => {
                  await handleSaveField('ora_servizio', localOraServizio || null)
                  if (activeTransport.stato !== 'programmato') {
                    await handleAutocompileFromBoard()
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all"
              />
            </div>

            {/* Km Iniziali */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Km Iniziali *</label>
              <input
                type="number"
                data-field="km_iniziali"
                value={localKmIniziali}
                onChange={(e) => setLocalKmIniziali(e.target.value)}
                onBlur={() => handleSaveField('km_iniziali', localKmIniziali ? Number(localKmIniziali) : null)}
                placeholder="Km di partenza"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: TIPO TRASPORTO */}
        <section ref={sectionRefs.tipo} className="space-y-3 text-left border-t border-slate-800 pt-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-400" />
            3. Tipo trasporto
          </h3>

          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-3xl space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {['Dimissione', 'Visita', 'Trasferimento', 'Altro'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const updates = { tipo_trasporto: t.toLowerCase() }
                    if (t !== 'Altro') {
                      setLocalAltroDescrizione('')
                      updates.altro_descrizione = null
                    }
                    if (t !== 'Visita' && t !== 'Altro') {
                      updates.variante_ar = null
                    }
                    handleSaveFields(updates)
                  }}
                  className={`py-3 px-4 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                    activeTransport.tipo_trasporto?.toLowerCase() === t.toLowerCase()
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/15'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {activeTransport.tipo_trasporto?.toLowerCase() === 'altro' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Specifica Altro *</label>
                <input
                  type="text"
                  data-field="altro_descrizione"
                  value={localAltroDescrizione}
                  onChange={(e) => setLocalAltroDescrizione(e.target.value)}
                  onBlur={() => handleSaveField('altro_descrizione', localAltroDescrizione)}
                  placeholder="Es. Accompagnamento dialisi"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-700"
                />
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: VARIANTE A/R */}
        {(activeTransport.tipo_trasporto?.toLowerCase() === 'visita' || activeTransport.tipo_trasporto?.toLowerCase() === 'altro') && (
          <section className="space-y-3 text-left border-t border-slate-800 pt-5 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              4. Variante A/R
            </h3>

            <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-3xl flex justify-around gap-2">
              {['Andata', 'Ritorno', 'A/R'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleSaveField('variante_ar', v === 'A/R' ? 'andata_ritorno' : v.toLowerCase())}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    (activeTransport.variante_ar === 'andata_ritorno' && v === 'A/R') || activeTransport.variante_ar === v.toLowerCase()
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900/65 border-slate-800 text-slate-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 5: PERCORSO - DA */}
        <section ref={sectionRefs.percorsoDa} className="space-y-3.5 text-left border-t border-slate-800 pt-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-indigo-400" />
            5. Percorso — Da
          </h3>

          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-3xl space-y-4">
            <div className="flex justify-between gap-1.5">
              {['Ospedale', 'RSA', 'Abitazione'].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setLocalDaReparto('')
                    setLocalDaNome('')
                    setLocalDaVia('')
                    handleSaveFields({
                      da_tipo_luogo: l.toLowerCase(),
                      da_reparto: null,
                      da_nome: null,
                      da_via: null
                    })
                  }}
                  className={`flex-1 py-2.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    activeTransport.da_tipo_luogo?.toLowerCase() === l.toLowerCase()
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {activeTransport.da_tipo_luogo?.toLowerCase() === 'abitazione' ? (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Indirizzo Abitazione *</label>
                <input
                  type="text"
                  data-field="da_via"
                  value={localDaVia}
                  onChange={(e) => setLocalDaVia(e.target.value)}
                  onBlur={() => handleSaveField('da_via', localDaVia)}
                  placeholder="Es. Via dei Fiori 4, Rovato"
                  className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Reparto</label>
                  <input
                    type="text"
                    data-field="da_reparto"
                    value={localDaReparto}
                    onChange={(e) => setLocalDaReparto(e.target.value)}
                    onBlur={() => handleSaveField('da_reparto', localDaReparto)}
                    placeholder={activeTransport.da_tipo_luogo?.toLowerCase() === 'ospedale' ? 'Es. P.S.' : 'Es. Girasole'}
                    className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Struttura *</label>
                  <input
                    type="text"
                    data-field="da_nome"
                    value={localDaNome}
                    onChange={(e) => setLocalDaNome(e.target.value)}
                    onBlur={() => handleSaveField('da_nome', localDaNome)}
                    placeholder={activeTransport.da_tipo_luogo?.toLowerCase() === 'ospedale' ? 'Es. Chiari' : 'Es. RSA Rovato'}
                    className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 6: PERCORSO - A */}
        <section ref={sectionRefs.percorsoA} className="space-y-3.5 text-left border-t border-slate-800 pt-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-indigo-400" />
            6. Percorso — A
          </h3>

          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-3xl space-y-4">
            <div className="flex justify-between gap-1.5">
              {['Ospedale', 'RSA', 'Abitazione'].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setLocalAReparto('')
                    setLocalANome('')
                    setLocalAVia('')
                    handleSaveFields({
                      a_tipo_luogo: l.toLowerCase(),
                      a_reparto: null,
                      a_nome: null,
                      a_via: null
                    })
                  }}
                  className={`flex-1 py-2.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    activeTransport.a_tipo_luogo?.toLowerCase() === l.toLowerCase()
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-405'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {activeTransport.a_tipo_luogo?.toLowerCase() === 'abitazione' ? (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Indirizzo Abitazione *</label>
                <input
                  type="text"
                  data-field="a_via"
                  value={localAVia}
                  onChange={(e) => setLocalAVia(e.target.value)}
                  onBlur={() => handleSaveField('a_via', localAVia)}
                  placeholder="Es. Via dei Fiori 4, Rovato"
                  className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Reparto</label>
                  <input
                    type="text"
                    data-field="a_reparto"
                    value={localAReparto}
                    onChange={(e) => setLocalAReparto(e.target.value)}
                    onBlur={() => handleSaveField('a_reparto', localAReparto)}
                    placeholder={activeTransport.a_tipo_luogo?.toLowerCase() === 'ospedale' ? 'Es. Zaffiro' : 'Es. Iris'}
                    className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Struttura *</label>
                  <input
                    type="text"
                    data-field="a_nome"
                    value={localANome}
                    onChange={(e) => setLocalANome(e.target.value)}
                    onBlur={() => handleSaveField('a_nome', localANome)}
                    placeholder={activeTransport.a_tipo_luogo?.toLowerCase() === 'ospedale' ? 'Es. Mellini' : 'Es. RSA Girasole'}
                    className="w-full bg-slate-950 border border-slate-805 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 7: DATI PAZIENTE */}
        <section ref={sectionRefs.paziente} className="space-y-3.5 text-left border-t border-slate-800 pt-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-400" />
            7. Dati paziente
          </h3>

          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-3xl space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Cognome e nome *</label>
              <input
                type="text"
                data-field="paziente_cognome_nome"
                value={localPazienteNome}
                onChange={(e) => setLocalPazienteNome(e.target.value)}
                onBlur={() => handleSaveField('paziente_cognome_nome', localPazienteNome)}
                placeholder="Cognome Nome Paziente"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Telefono</label>
                <input
                  type="text"
                  data-field="paziente_telefono"
                  value={localPazienteTel}
                  onChange={(e) => setLocalPazienteTel(e.target.value)}
                  onBlur={() => handleSaveField('paziente_telefono', localPazienteTel)}
                  placeholder="333..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Codice Fiscale</label>
                <input
                  type="text"
                  data-field="paziente_codice_fiscale"
                  value={localPazienteCF}
                  onChange={(e) => setLocalPazienteCF(e.target.value)}
                  onBlur={() => handleSaveField('paziente_codice_fiscale', localPazienteCF)}
                  placeholder="Solo per fattura"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Note</label>
              <textarea
                data-field="note"
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={() => handleSaveNotes(localNotes, ceEsterno, asEsterno)}
                placeholder="Inserisci eventuali note aggiuntive..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-700 resize-none"
              />
            </div>
          </div>
        </section>

        {/* SECTION 8: PAGAMENTO */}
        <section ref={sectionRefs.pagamento} className="space-y-3.5 text-left border-t border-slate-800 pt-5">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            8. Pagamento
          </h3>

          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-3xl space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {['Contante', 'POS', 'Buono', 'convenzione', 'Altro...'].map(p => {
                const dbPay = activeTransport.tipo_pagamento?.toLowerCase() || ''
                const isSelected = p === 'Altro...'
                  ? (dbPay && !['contante', 'pos', 'buono', 'convenzione'].includes(dbPay))
                  : dbPay === p.toLowerCase()

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setLocalAltroPagamento('')
                      if (p === 'Altro...') {
                        handleSaveFields({ tipo_pagamento: 'altro' })
                      } else {
                        const updates = { tipo_pagamento: p.toLowerCase() }
                        if (p.toLowerCase() === 'convenzione') {
                          setLocalImporto('')
                          updates.importo = null
                        }
                        handleSaveFields(updates)
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            {activeTransport.tipo_pagamento !== undefined &&
              activeTransport.tipo_pagamento !== null &&
              !['contante', 'pos', 'buono', 'convenzione'].includes(activeTransport.tipo_pagamento.toLowerCase()) && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Specifica Pagamento *</label>
                  <input
                    type="text"
                    data-field="tipo_pagamento"
                    value={localAltroPagamento}
                    onChange={(e) => setLocalAltroPagamento(e.target.value)}
                    onBlur={() => handleSaveField('tipo_pagamento', localAltroPagamento.trim() || 'altro')}
                    placeholder="Es. Bonifico bancario"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
              )}

            {activeTransport.tipo_pagamento?.toLowerCase() !== 'convenzione' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-semibold text-slate-400">Importo (€)</label>
                <input
                  type="number"
                  data-field="importo"
                  value={localImporto}
                  onChange={(e) => setLocalImporto(e.target.value)}
                  onBlur={() => handleSaveField('importo', localImporto ? Number(localImporto) : null)}
                  placeholder="Importo riscosso"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all placeholder:text-slate-800"
                />
              </div>
            )}
          </div>
        </section>

        </div>

        {/* TERMINA SERVIZIO BUTTON */}
        {!isEffectiveReadOnly && (
          <div className="pt-6 border-t border-slate-800 text-left">
            {isTerminating ? (
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-3xl space-y-4 animate-fade-in">
                <span className="text-xs font-bold text-slate-300 uppercase block">Chiusura Servizio</span>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Km Finali *</label>
                  <input
                    type="number"
                    placeholder="Es. 120550"
                    value={kmFinali}
                    onChange={(e) => setKmFinali(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-202 outline-none transition-all"
                  />
                </div>

                {terminateError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 leading-normal">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>{terminateError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleTerminateTransport}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Conferma Termina
                  </button>
                  <button
                    onClick={() => {
                      setIsTerminating(false)
                      setKmFinali('')
                      setTerminateError('')
                    }}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              activeTransport.stato === 'programmato' ? (
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-base"
                >
                  Assegna
                </button>
              ) : (
                <button
                  onClick={() => setIsTerminating(true)}
                  className="w-full py-4 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-base"
                >
                  Termina servizio
                </button>
              )
            )}
          </div>
        )}

      </main>

      {/* CANCEL / TRANSFER MODAL */}
      {isCancelModalOpen && activeTransport && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in text-center font-sans">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm space-y-5 shadow-2xl relative overflow-hidden animate-slide-up text-left">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Gestione Trasporto
              </h4>
              <button 
                onClick={() => {
                  setIsCancelModalOpen(false)
                  setCancelChoice(null)
                  setSelectedNewAuthorId('')
                }} 
                className="text-slate-500 hover:text-slate-300 transition-colors p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cancelChoice === null ? (
              <div className="space-y-4 py-2">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {activeTransport.stato === 'programmato' 
                    ? 'Scegli cosa fare con questa scheda di trasporto programmata.' 
                    : 'Scegli cosa fare con questa scheda di trasporto attualmente attiva.'}
                </p>
                <div className="flex flex-col gap-3 font-sans">
                  <button
                    onClick={() => setCancelChoice('delete')}
                    className="w-full py-3 bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 hover:border-red-800/80 text-rose-400 hover:text-rose-350 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Elimina/Annulla Scheda
                  </button>
                  {activeTransport.stato !== 'programmato' && (
                    <button
                      onClick={() => setCancelChoice('transfer')}
                      className="w-full py-3 bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-900/40 hover:border-indigo-800/80 text-indigo-400 hover:text-indigo-350 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Cambia Autore (Trasferisci)
                    </button>
                  )}
                </div>
              </div>
            ) : cancelChoice === 'delete' ? (
              <div className="space-y-4 py-1 font-sans">
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 leading-relaxed">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>Sei sicuro di voler eliminare definitivamente questo trasporto dal sistema? Questa azione non può essere annullata.</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCancelChoice(null)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    disabled={isActionLoading}
                  >
                    Indietro
                  </button>
                  <button
                    onClick={handleDeleteActiveTransport}
                    disabled={isActionLoading}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isActionLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Eliminazione...
                      </>
                    ) : (
                      'Sì, Elimina'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-1 font-sans">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Seleziona il nuovo operatore che prenderà in consegna questa scheda. L'autore originario non la vedrà più attiva nel suo menu. Il nuovo autore la vedrà attiva solo se ha timbrato il turno.
                </p>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nuovo Gestore Scheda</label>
                  <select
                    value={selectedNewAuthorId}
                    onChange={(e) => setSelectedNewAuthorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-205 outline-none transition-all cursor-pointer"
                  >
                    <option value="">Seleziona operatore...</option>
                    {users.filter(u => u.id !== profile?.id).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nome} {u.cognome} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCancelChoice(null)
                      setSelectedNewAuthorId('')
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    disabled={isActionLoading}
                  >
                    Indietro
                  </button>
                  <button
                    onClick={handleTransferActiveTransport}
                    disabled={isActionLoading || !selectedNewAuthorId}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isActionLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Trasferimento...
                      </>
                    ) : (
                      'Sì, Trasferisci'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
