import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Users,
  Calendar,
  CircleDollarSign,
  LogOut,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw,
  Check,
  Pencil,
  ShieldAlert,
  Clock,
  Home,
  ShieldCheck,
  X,
  PlusCircle,
  CheckCircle
} from 'lucide-react'

export default function AdminDesktop({ onBackToMobile, onLogout, adminProfile }) {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'utenti' | 'storico' | 'equipaggi' | 'ore' | 'notifiche'
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState([])
  const [crews, setCrews] = useState([])
  const [pastBookings, setPastBookings] = useState([])
  const [employees, setEmployees] = useState([])
  const [notifications, setNotifications] = useState([])
  const [todayShifts, setTodayShifts] = useState([])
  const [todayBookings, setTodayBookings] = useState([])

  // State reload helper
  const [refreshKey, setRefreshKey] = useState(0)

  // Stati Form Creazione Utente
  const [newNome, setNewNome] = useState('')
  const [newCognome, setNewCognome] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newStato, setNewStato] = useState('volontario') // 'admin' | 'dipendente' | 'volontario'
  const [newQualifica, setNewQualifica] = useState('CE') // 'autista' | 'CE'
  const [newCodiceFiscale, setNewCodiceFiscale] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newDataNascita, setNewDataNascita] = useState('')
  const [newPagaOraria, setNewPagaOraria] = useState('')
  const [userActionError, setUserActionError] = useState(null)
  const [userActionSuccess, setUserActionSuccess] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Stati Form Modifica Utente
  const [editingProfile, setEditingProfile] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [editCognome, setEditCognome] = useState('')
  const [editStato, setEditStato] = useState('dipendente')
  const [editQualifica, setEditQualifica] = useState('CE')
  const [editCodiceFiscale, setEditCodiceFiscale] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editDataNascita, setEditDataNascita] = useState('')
  const [editPagaOraria, setEditPagaOraria] = useState('')
  const [editAttivo, setEditAttivo] = useState(true)
  const [editPassword, setEditPassword] = useState('')
  
  // Aggiunta Equipaggio a Turno
  const [crewDate, setCrewDate] = useState('')
  const [crewShiftId, setCrewShiftId] = useState('1')
  const [crewSelectedId, setCrewSelectedId] = useState('')
  const [newCrewName, setNewCrewName] = useState('')

  // Filtri Storico
  const [filterUser, setFilterUser] = useState('')
  const [filterShift, setFilterShift] = useState('all')

  // Filtri Utenti
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [filterUserRole, setFilterUserRole] = useState('all')

  // Gestione Ore / Pagamenti
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedShiftIds, setSelectedShiftIds] = useState([])
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [empLoading, setEmpLoading] = useState(false)
  const [empSearch, setEmpSearch] = useState('')

  // Modifica Timbratura Singola
  const [editingShift, setEditingShift] = useState(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editShiftLoading, setEditShiftLoading] = useState(false)
  const [editShiftError, setEditShiftError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Annuncio Telegram
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementLoading, setAnnouncementLoading] = useState(false)
  const [announcementSuccess, setAnnouncementSuccess] = useState(false)

  // Caricamento Dati
  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Profili
      const { data: profs } = await api.fetchProfiles()
      setProfiles(profs || [])

      // 2. Fetch Equipaggi
      const { data: crws } = await api.fetchCrews()
      setCrews(crws || [])
      const reinforcementCrews = (crws || []).filter(c => c.id !== 1)
      if (reinforcementCrews.length > 0 && !crewSelectedId) {
        setCrewSelectedId(String(reinforcementCrews[0].id))
      }

      // 3. Fetch Storico Prenotazioni
      const { data: pasts } = await api.fetchPastBookings()
      setPastBookings(pasts || [])

      // 4. Fetch Ore Dipendenti
      const { data: emps } = await api.fetchEmployeesWithPayments()
      setEmployees(emps || [])

      // 5. Fetch Notifiche/Audit Log
      const { data: notifs } = await api.fetchNotifications()
      setNotifications(notifs || [])

      // 6. Fetch Turni e Prenotazioni Odierni (per Copertura Dashboard)
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: todayS } = await api.fetchShifts(todayStr, todayStr)
      setTodayShifts(todayS || [])
      const { data: todayB } = await api.fetchBookings(todayStr, todayStr)
      setTodayBookings(todayB || [])

    } catch (err) {
      console.error('Errore nel caricamento dati desktop admin:', err)
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    loadData()
    setCrewDate(new Date().toISOString().split('T')[0])
  }, [refreshKey])

  // Refresh manuale
  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Helper date e ore
  const getLocalDateString = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'yyyy-MM-dd')
    } catch (e) {
      return ''
    }
  }

  const getLocalTimeString = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'HH:mm')
    } catch (e) {
      return ''
    }
  }

  const formatItalianDateTime = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'dd MMM yyyy, HH:mm', { locale: it })
    } catch (e) {
      return ''
    }
  }

  // Invio Annuncio Telegram
  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementText.trim()) return

    setAnnouncementLoading(true)
    setAnnouncementSuccess(false)

    try {
      const { error } = await api.createAnnouncement(
        announcementText.trim(),
        adminProfile?.username || 'admin.system'
      )

      if (error) {
        alert("Errore nell'invio dell'annuncio: " + error.message)
      } else {
        setAnnouncementText('')
        setAnnouncementSuccess(true)
        setTimeout(() => setAnnouncementSuccess(false), 4000)
        // Ricarica le notifiche per mostrare l'annuncio
        const { data: notifs } = await api.fetchNotifications()
        setNotifications(notifs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAnnouncementLoading(false)
    }
  }

  // Creazione Nuovo Utente
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault()
    setUserActionError(null)
    setUserActionSuccess(null)

    if (!newUsername || !newNome || !newCognome || !newPassword) {
      setUserActionError('Inserisci tutti i campi obbligatori (*).')
      return
    }

    try {
      const userData = {
        username: newUsername.trim().toLowerCase(),
        nome: newNome.trim(),
        cognome: newCognome.trim(),
        password: newPassword,
        stato: newStato,
        qualifica: newQualifica,
        codice_fiscale: newCodiceFiscale.trim().toUpperCase(),
        email: newEmail.trim(),
        telefono: newTelefono.trim(),
        data_nascita: newDataNascita || null,
        paga_oraria: newStato === 'dipendente' ? (Number(newPagaOraria) || null) : null
      }

      const { error } = await api.adminCreateUser(userData)
      if (error) {
        setUserActionError(error.message || 'Errore durante la creazione.')
      } else {
        setUserActionSuccess(`Utente "${newUsername}" creato con successo!`)
        setShowCreateForm(false)
        setNewUsername('')
        setNewNome('')
        setNewCognome('')
        setNewPassword('')
        setNewCodiceFiscale('')
        setNewEmail('')
        setNewTelefono('')
        setNewDataNascita('')
        setNewPagaOraria('')
        loadData()
      }
    } catch (err) {
      setUserActionError(err.message)
    }
  }

  // Selezione Utente per Modifica
  const startEditingProfile = (profile) => {
    setEditingProfile(profile)
    setEditNome(profile.nome || '')
    setEditCognome(profile.cognome || '')
    setEditStato(profile.stato || 'volontario')
    setEditQualifica(profile.qualifica || 'CE')
    setEditCodiceFiscale(profile.codice_fiscale || '')
    setEditEmail(profile.email || '')
    setEditTelefono(profile.telefono || '')
    setEditDataNascita(profile.data_nascita || '')
    setEditPagaOraria(profile.paga_oraria || '')
    setEditAttivo(profile.attivo !== false)
    setEditPassword('')
  }

  // Salvataggio Modifica Profilo
  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault()
    if (!editNome || !editCognome) {
      alert('Nome e Cognome sono obbligatori.')
      return
    }

    try {
      const updates = {
        nome: editNome.trim(),
        cognome: editCognome.trim(),
        stato: editStato,
        ruolo: editStato === 'admin' ? 'admin' : 'dipendente',
        qualifica: editQualifica,
        codice_fiscale: editCodiceFiscale.trim().toUpperCase(),
        email: editEmail.trim(),
        telefono: editTelefono.trim(),
        data_nascita: editDataNascita || null,
        paga_oraria: editStato === 'dipendente' ? (Number(editPagaOraria) || null) : null,
        attivo: editAttivo
      }

      const { error: profileError } = await api.adminUpdateProfile(editingProfile.id, updates)
      if (profileError) {
        alert(profileError.message || "Errore durante l'aggiornamento del profilo.")
        return
      }

      if (editPassword) {
        if (editPassword.length < 6) {
          alert('La password deve contenere almeno 6 caratteri.')
          return
        }
        const { error: passError } = await api.adminSetPassword(editingProfile.id, editPassword)
        if (passError) {
          alert(passError.message || 'Profilo salvato, ma errore nel cambio password.')
          return
        }
      }

      alert('Profilo aggiornato con successo!')
      setEditingProfile(null)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  // Elimina Utente
  const handleDeleteUser = async (profile) => {
    const confirmDelete = window.confirm(`Sei sicuro di voler eliminare definitivamente l'utente ${profile.username}? Questa azione cancellerà tutte le sue prenotazioni.`);
    if (!confirmDelete) return

    try {
      const { error } = await api.adminDeleteUser(profile.id)
      if (error) {
        alert(error.message || "Errore durante l'eliminazione dell'utente.")
      } else {
        alert('Utente eliminato con successo!')
        if (editingProfile?.id === profile.id) {
          setEditingProfile(null)
        }
        loadData()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Aggiungi Equipaggio ad un Turno
  const handleAddCrewToShift = async (e) => {
    e.preventDefault()
    if (!crewDate || !crewSelectedId) return

    const slots = {
      1: { start: '06:00:00', end: '14:00:00' },
      2: { start: '14:00:00', end: '22:00:00' },
      3: { start: '22:00:00', end: '06:00:00' }
    }

    const slot = slots[crewShiftId]
    try {
      const { error } = await api.adminAddCrewToShift(
        crewDate,
        slot.start,
        slot.end,
        Number(crewSelectedId)
      )

      if (error) {
        alert(error.message || "Errore nell'aggiunta dell'equipaggio.")
      } else {
        alert('Equipaggio aggiunto con successo a questa fascia oraria!')
        loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Creazione Equipaggio
  const handleCreateCrew = async (e) => {
    e.preventDefault()
    if (!newCrewName.trim()) return

    try {
      const { error } = await api.createCrew(newCrewName.trim())
      if (error) {
        alert(error.message || "Errore nella creazione dell'equipaggio.")
      } else {
        setNewCrewName('')
        alert('Equipaggio creato con successo!')
        loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Eliminazione Equipaggio
  const handleDeleteCrew = async (crewId) => {
    if (!window.confirm('Vuoi davvero eliminare questo equipaggio? Verranno rimossi anche i turni ad esso collegati.')) return

    try {
      const { error } = await api.deleteCrew(crewId)
      if (error) {
        alert(error.message || "Errore nell'eliminazione dell'equipaggio.")
      } else {
        alert('Equipaggio eliminato con successo!')
        loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Gestione Dipendenti: Selezione Dipendente per Convalida
  const selectEmployeeForValidation = (emp) => {
    const updated = employees.find(e => e.id === emp.id)
    setSelectedEmployee(updated || emp)
    setSelectedShiftIds([])
  }

  // Convalida / Paga Turni
  const handleConfirmPayment = async () => {
    if (!selectedEmployee || selectedShiftIds.length === 0) return

    setEmpLoading(true)
    try {
      const { error } = await api.payShifts(
        selectedEmployee.id,
        selectedShiftIds,
        0,
        0
      )

      if (error) throw error

      alert('Ore convalidate e pagate registrate con successo!')
      
      // Ricarica e aggiorna lo stato locale
      const { data: emps } = await api.fetchEmployeesWithPayments()
      setEmployees(emps || [])
      
      const updated = emps.find(e => e.id === selectedEmployee.id)
      setSelectedEmployee(updated || null)
      setSelectedShiftIds([])
      setPaymentModalOpen(false)
    } catch (err) {
      alert("Errore nella convalida: " + err.message)
    } finally {
      setEmpLoading(false)
    }
  }

  // Modifica Orario Timbratura Singola
  const handleOpenEditShiftModal = (shift) => {
    setEditingShift(shift)
    setEditStartDate(getLocalDateString(shift.start_time))
    setEditStartTime(getLocalTimeString(shift.start_time))
    setEditEndDate(getLocalDateString(shift.end_time))
    setEditEndTime(getLocalTimeString(shift.end_time))
    setEditShiftError(null)
    setShowDeleteConfirm(false)
  }

  const handleEditShiftSubmit = async (e) => {
    e.preventDefault()
    setEditShiftLoading(true)
    setEditShiftError(null)

    try {
      if (!editStartDate || !editStartTime) {
        throw new Error('Inserisci data e ora di inizio.')
      }

      const start = new Date(`${editStartDate}T${editStartTime}`)
      if (isNaN(start.getTime())) {
        throw new Error('Data o ora di inizio non valida.')
      }

      let end = null
      if (editEndDate && editEndTime) {
        end = new Date(`${editEndDate}T${editEndTime}`)
        if (isNaN(end.getTime())) {
          throw new Error('Data o ora di fine non valida.')
        }
        if (end <= start) {
          throw new Error('La data/ora di fine deve essere successiva a quella di inizio.')
        }
      }

      const { error: apiError } = await api.updateClockedShift(
        editingShift.id,
        start.toISOString(),
        end ? end.toISOString() : null,
        0
      )

      if (apiError) throw apiError

      alert('Timbratura aggiornata con successo!')
      setEditingShift(null)
      setSelectedShiftIds([])
      
      // Aggiorna
      const { data: emps } = await api.fetchEmployeesWithPayments()
      setEmployees(emps || [])
      const updated = emps.find(e => e.id === selectedEmployee.id)
      setSelectedEmployee(updated || null)
    } catch (err) {
      setEditShiftError(err.message)
    } finally {
      setEditShiftLoading(false)
    }
  }

  const handleDeleteClockedShift = async () => {
    setEditShiftLoading(true)
    setEditShiftError(null)
    try {
      const { error: apiError } = await api.deleteClockedShift(editingShift.id)
      if (apiError) throw apiError

      alert('Timbratura eliminata con successo!')
      setEditingShift(null)
      setShowDeleteConfirm(false)
      setSelectedShiftIds([])

      // Aggiorna
      const { data: emps } = await api.fetchEmployeesWithPayments()
      setEmployees(emps || [])
      const updated = emps.find(e => e.id === selectedEmployee.id)
      setSelectedEmployee(updated || null)
    } catch (err) {
      setEditShiftError(err.message)
    } finally {
      setEditShiftLoading(false)
    }
  }

  // Toggle Selezione Shift Singolo per Pagamento
  const handleToggleShiftSelection = (shiftId) => {
    if (selectedShiftIds.includes(shiftId)) {
      setSelectedShiftIds(prev => prev.filter(id => id !== shiftId))
    } else {
      setSelectedShiftIds(prev => [...prev, shiftId])
    }
  }

  // Calcolo statistiche veloci per Dashboard
  const activeUsersCount = profiles.filter(p => p.attivo !== false).length
  const volunteerCount = profiles.filter(p => p.attivo !== false && p.stato === 'volontario').length
  const employeeCount = profiles.filter(p => p.attivo !== false && p.stato === 'dipendente').length
  
  // Calcolo ore totali da pagare a dipendenti
  const totalUnpaidHours = employees.reduce((sum, emp) => sum + (emp.unpaidHours || 0), 0)
  const totalUnpaidCost = employees.reduce((sum, emp) => {
    let empCost = 0
    if (emp.shifts) {
      emp.shifts.forEach(s => {
        if (!s.pagato && s.end_time) {
          const duration = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
          empCost += duration * (s.paga_oraria_storica || emp.paga_oraria || 0)
        }
      })
    }
    return sum + empCost
  }, 0)

  // Copertura dei turni di oggi
  const todayRequiredSlots = todayShifts.length * 2 // Assumiamo 2 ruoli per turno (es. Autore/CE e Autista)
  const todayBookedSlots = todayBookings.length
  const todayCoveragePercentage = todayRequiredSlots > 0 
    ? Math.round((todayBookedSlots / todayRequiredSlots) * 100)
    : 0

  // Filtra profili in base alle query
  const filteredProfiles = profiles.filter(p => {
    const nameMatch = `${p.nome} ${p.cognome} ${p.username}`.toLowerCase().includes(searchUserQuery.toLowerCase())
    const roleMatch = filterUserRole === 'all' || p.stato === filterUserRole
    return nameMatch && roleMatch
  })

  // Filtra storico prenotazioni in base alle query
  const filteredPastBookings = pastBookings.filter(b => {
    const matchUser = `${b.profiles?.nome} ${b.profiles?.cognome} ${b.profiles?.username}`.toLowerCase().includes(filterUser.toLowerCase()) || !filterUser
    let matchShift = true
    if (filterShift !== 'all') {
      const shiftStart = b.shifts?.ora_inizio
      if (filterShift === '1') matchShift = shiftStart ? shiftStart.startsWith('06:') : false
      if (filterShift === '2') matchShift = shiftStart ? shiftStart.startsWith('14:') : false
      if (filterShift === '3') matchShift = shiftStart ? shiftStart.startsWith('22:') : false
    }
    return matchUser && matchShift
  })

  // Filtra la ricerca dipendenti
  const filteredEmployees = employees.filter(emp => {
    return `${emp.nome} ${emp.cognome} ${emp.username}`.toLowerCase().includes(empSearch.toLowerCase())
  })

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans w-full text-left">
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0 z-20">
        <div>
          {/* Brand Logo & Name */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 shadow-md border border-slate-700">
              <img src="/logo.png" alt="GM Turni Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                GM Turni
              </h2>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1 block">
                Pannello Amministrativo
              </span>
            </div>
          </div>

          {/* Menù di Navigazione */}
          <nav className="p-4 flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Dashboard Generale</span>
            </button>

            <button
              onClick={() => setActiveTab('utenti')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'utenti'
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Gestione Utenti</span>
            </button>

            <button
              onClick={() => setActiveTab('storico')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'storico'
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Tabellone Storico</span>
            </button>

            <button
              onClick={() => setActiveTab('equipaggi')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'equipaggi'
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Gestione Equipaggi</span>
            </button>

            <button
              onClick={() => setActiveTab('ore')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'ore'
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <CircleDollarSign className="w-5 h-5" />
              <span>Convalida Ore & Paga</span>
            </button>

            <button
              onClick={() => setActiveTab('notifiche')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'notifiche'
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              <span>Audit Log & Telegram</span>
            </button>
          </nav>
        </div>

        {/* Bottom Switch / Logout */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
          {api.isDemoMode() && (
            <div className="bg-indigo-950/40 border border-indigo-800/40 px-3 py-2 rounded-xl text-center mb-1">
              <span className="text-[10px] text-indigo-400 font-mono font-bold block">✨ MODALITÀ DEMO MOCK</span>
              <span className="text-[9px] text-slate-500 block">Dati salvati in locale browser</span>
            </div>
          )}

          <button
            onClick={onBackToMobile}
            className="flex items-center justify-center gap-2.5 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700/60 shadow cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Torna all'App Mobile</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2.5 w-full bg-rose-950/25 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-rose-900/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Esci dalla sessione</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        
        {/* HEADER */}
        <header className="h-20 bg-slate-900/60 border-b border-slate-800 px-8 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold capitalize text-slate-100">
              {activeTab === 'ore' ? 'Convalida Ore & Pagamenti' : activeTab === 'notifiche' ? 'Audit Log & Telegram' : activeTab === 'storico' ? 'Tabellone Storico' : activeTab === 'equipaggi' ? 'Gestione Equipaggi' : activeTab}
            </h1>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          </div>

          <div className="flex items-center gap-4">
            {/* Pulsante refresh */}
            <button
              onClick={handleManualRefresh}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Ricarica Dati"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Profile badge */}
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 px-4 py-2 rounded-2xl">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center font-bold text-slate-100 text-sm shadow-md">
                {(adminProfile?.nome || adminProfile?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-200">
                  {adminProfile?.nome && adminProfile?.cognome ? `${adminProfile.nome} ${adminProfile.cognome}` : (adminProfile?.username || 'Amministratore')}
                </span>
                <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                  Ruolo: {adminProfile?.ruolo || 'admin'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          
          {loading && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center gap-3 shadow-2xl">
                <LoaderComponent />
                <span className="text-xs font-bold text-slate-300">Caricamento dati amministratore...</span>
              </div>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-8 animate-fade-in">
              {/* METRICS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                
                {/* Metric Card 1 */}
                <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-lg shadow-indigo-950/5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Personale Attivo</span>
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-100">{activeUsersCount}</span>
                    <span className="text-[10px] text-slate-400">Utenti totali</span>
                  </div>
                  <div className="flex gap-3 mt-3 text-[10px] text-slate-500 font-medium">
                    <span>{employeeCount} Dipendenti</span>
                    <span>•</span>
                    <span>{volunteerCount} Volontari</span>
                  </div>
                </div>

                {/* Metric Card 2 */}
                <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-cyan-500/30 transition-all shadow-lg shadow-indigo-950/5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Copertura Turni Oggi</span>
                    <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-100">{todayCoveragePercentage}%</span>
                    <span className="text-[10px] text-slate-400">posizioni coperte</span>
                  </div>
                  <div className="flex gap-2.5 mt-3 text-[10px] text-slate-500 font-medium">
                    <span className="text-cyan-400 font-bold">{todayBookedSlots} prenotazioni</span>
                    <span>su {todayRequiredSlots} slot disponibili</span>
                  </div>
                </div>

                {/* Metric Card 3 */}
                <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-lg shadow-indigo-950/5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ore da Liquidare</span>
                    <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
                      <CircleDollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-100">{totalUnpaidHours.toFixed(1)}h</span>
                    <span className="text-xs font-bold text-amber-400">~ €{totalUnpaidCost.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-3 font-medium">
                    Stima stipendi non ancora convalidati da dipendenti
                  </div>
                </div>

                {/* Metric Card 4 */}
                <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg shadow-indigo-950/5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Log ed Eventi</span>
                    <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-100">{notifications.length}</span>
                    <span className="text-[10px] text-slate-400">notifiche registrate</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-3 font-medium">
                    Audit log storico delle azioni di sistema
                  </div>
                </div>

              </div>

              {/* SECOND ROW: 2 COLUMN PANELS */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Column 1 & 2: Today's Shifts coverage detail */}
                <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">Copertura Turni Odierna</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Dettaglio degli slot operativi e volontari assegnati per oggi</p>
                    </div>
                    <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-full font-bold text-slate-300">
                      Oggi: {format(new Date(), 'dd MMMM yyyy', { locale: it })}
                    </span>
                  </div>

                  {todayShifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mb-3 border border-slate-700/40">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-400">Nessun turno programmato per oggi</span>
                      <p className="text-xs text-slate-600 max-w-xs leading-relaxed mt-1">
                        Crea o aggiungi equipaggi per questa data per far registrare i volontari.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {todayShifts.map(shift => {
                        const crewObj = crews.find(c => c.id === shift.crew_id)
                        const bookingsForShift = todayBookings.filter(b => b.shift_id === shift.id)
                        
                        // Trova i ruoli occupati
                        const autistaBooking = bookingsForShift.find(b => b.ruolo_turno === 'autista')
                        const ceBooking = bookingsForShift.find(b => b.ruolo_turno === 'CE')

                        return (
                          <div key={shift.id} className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                {crewObj?.nome || `Equipaggio ${shift.crew_id}`}
                              </span>
                              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
                                <span>Fascia: {shift.ora_inizio.slice(0, 5)} - {shift.ora_fine.slice(0, 5)}</span>
                              </div>
                            </div>

                            {/* Ruoli */}
                            <div className="flex flex-wrap items-center gap-3">
                              {/* Slot Autista */}
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border font-semibold ${
                                autistaBooking 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-rose-500/5 border-rose-500/15 text-rose-400 border-dashed animate-pulse-subtle'
                              }`}>
                                <div className={`w-2 h-2 rounded-full ${autistaBooking ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                <span className="font-bold uppercase text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Autista</span>
                                <span className="truncate max-w-[120px]">
                                  {autistaBooking 
                                    ? (autistaBooking.profiles?.nome ? `${autistaBooking.profiles.nome} ${autistaBooking.profiles.cognome.slice(0, 1)}.` : autistaBooking.profiles?.username) 
                                    : 'Vuoto'}
                                </span>
                              </div>

                              {/* Slot Capo Equipaggio */}
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border font-semibold ${
                                ceBooking 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-rose-500/5 border-rose-500/15 text-rose-400 border-dashed animate-pulse-subtle'
                              }`}>
                                <div className={`w-2 h-2 rounded-full ${ceBooking ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                <span className="font-bold uppercase text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">CE / Soccorritore</span>
                                <span className="truncate max-w-[120px]">
                                  {ceBooking 
                                    ? (ceBooking.profiles?.nome ? `${ceBooking.profiles.nome} ${ceBooking.profiles.cognome.slice(0, 1)}.` : ceBooking.profiles?.username) 
                                    : 'Vuoto'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Quick Action: Aggiungi Equipaggio a Turno */}
                  <form onSubmit={handleAddCrewToShift} className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row items-end gap-3 mt-2">
                    <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Giorno del Turno</label>
                      <input 
                        type="date"
                        value={crewDate}
                        onChange={(e) => setCrewDate(e.target.value)}
                        className="w-full bg-slate-905 bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fascia Oraria</label>
                      <select
                        value={crewShiftId}
                        onChange={(e) => setCrewShiftId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-all"
                      >
                        <option value="1">Mattina (06:00 - 14:00)</option>
                        <option value="2">Pomeriggio (14:00 - 22:00)</option>
                        <option value="3">Notte (22:00 - 06:00)</option>
                      </select>
                    </div>

                    <div className="flex-1 w-full flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Seleziona Equipaggio</label>
                      <select
                        value={crewSelectedId}
                        onChange={(e) => setCrewSelectedId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none transition-all"
                        required
                      >
                        {crews.filter(c => c.id !== 1).map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-102 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Aggiungi</span>
                    </button>
                  </form>
                </div>

                {/* Column 3: Quick Telegram Broadcaster & Recent Audit Log */}
                <div className="flex flex-col gap-6">
                  
                  {/* Telegram Broadcaster */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-3 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 font-semibold">
                      <h3 className="text-base font-bold text-slate-100">Broadcast Telegram</h3>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    </div>
                    
                    <p className="text-[11px] text-slate-500 leading-relaxed text-left">
                      Invia un annuncio flash a tutti i soccorritori. Il trigger del database pubblicherà immediatamente il messaggio nel gruppo Telegram integrato.
                    </p>

                    <form onSubmit={handleSendAnnouncement} className="flex flex-col gap-3">
                      <textarea
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        placeholder="Scrivi qui il tuo avviso ufficiale... (es: Cercasi urgente autista per stasera!)"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl p-3 text-xs font-semibold text-slate-200 outline-none transition-all h-24 placeholder:text-slate-700 resize-none font-sans"
                        required
                      />

                      {announcementSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl text-center text-[10px] font-bold">
                          ✓ Annuncio inviato e pubblicato con successo!
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={announcementLoading || !announcementText.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow cursor-pointer"
                      >
                        {announcementLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Invio in corso...</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Invia a Telegram</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Mini-Audit Log (Last 4 logs) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-3 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 font-semibold">
                      <h3 className="text-base font-bold text-slate-100">Attività Recenti</h3>
                      <button 
                        onClick={() => setActiveTab('notifiche')}
                        className="text-[10px] text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        Vedi tutti
                      </button>
                    </div>

                    <div className="flex flex-col gap-3.5">
                      {notifications.slice(0, 4).map(notif => {
                        const style = getNotificationBadgeStyle(notif.tipo)
                        return (
                          <div key={notif.id} className="flex gap-3 text-left">
                            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${style.bg} ${style.color} border ${style.border}`}>
                              {style.icon}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-xs font-semibold text-slate-200 leading-normal line-clamp-2">
                                {notif.messaggio}
                              </p>
                              <span className="text-[9px] text-slate-500 font-medium mt-1">
                                {formatItalianDateTime(notif.created_at)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      
                      {notifications.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-600">
                          Nessuna notifica registrata nel sistema
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 2: GESTIONE UTENTI */}
          {activeTab === 'utenti' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
              
              {/* List of profiles (Left / Center) */}
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4">
                
                {/* Header list with filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Cerca utente per nome o username..."
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold outline-none transition-all placeholder:text-slate-600 font-sans"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs text-slate-500 font-bold">Filtro Ruolo:</span>
                    </div>
                    <select
                      value={filterUserRole}
                      onChange={(e) => setFilterUserRole(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none"
                    >
                      <option value="all">Tutti i Ruoli</option>
                      <option value="admin">Amministratori</option>
                      <option value="dipendente">Dipendenti</option>
                      <option value="volontario">Volontari</option>
                    </select>

                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Nuovo Utente</span>
                    </button>
                  </div>
                </div>

                {/* Profiles Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Username</th>
                        <th className="py-3 px-4">Nome Completo</th>
                        <th className="py-3 px-4">Stato</th>
                        <th className="py-3 px-4">Qualifica</th>
                        <th className="py-3 px-4">Recapiti</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                      {filteredProfiles.map(p => (
                        <tr key={p.id} className="hover:bg-slate-800/25 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">{p.username}</td>
                          <td className="py-3 px-4 text-slate-200 font-bold">
                            {p.nome || p.cognome ? `${p.nome || ''} ${p.cognome || ''}`.trim() : 'N/D'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                              p.ruolo === 'admin' || p.stato === 'admin' 
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                : p.stato === 'dipendente' 
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                  : 'bg-slate-700/20 text-slate-400 border border-slate-700/30'
                            }`}>
                              {p.stato || 'volontario'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-800/60 border border-slate-700/40 px-2 py-0.5 rounded text-[10px] uppercase text-slate-400">
                              {p.qualifica || 'N/D'}
                            </span>
                          </td>
                          <td className="py-3 px-4 flex flex-col gap-0.5">
                            <span className="text-slate-300 font-bold">{p.telefono || 'Telefono N/D'}</span>
                            <span className="text-[10px] text-slate-500">{p.email || 'Email N/D'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.attivo !== false ? (
                              <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/15 text-[10px] font-bold inline-block">Attivo</span>
                            ) : (
                              <span className="text-rose-400 bg-rose-400/10 px-2 py-1 rounded-md border border-rose-400/15 text-[10px] font-bold inline-block">Disattivo</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEditingProfile(p)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-all cursor-pointer"
                                title="Modifica Profilo"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(p)}
                                className="p-2 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-900/30 transition-all cursor-pointer"
                                title="Elimina Utente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredProfiles.length === 0 && (
                    <div className="text-center py-12 text-slate-500 font-bold">
                      Nessun utente corrisponde alla ricerca corrente
                    </div>
                  )}
                </div>

              </div>

              {/* Form Side Panel (Right) */}
              <div className="flex flex-col gap-6">
                
                {/* creation form panel */}
                {showCreateForm ? (
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 animate-slide-up text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <PlusCircle className="w-4.5 h-4.5 text-indigo-400" />
                        <span>Aggiungi Nuovo Utente</span>
                      </h3>
                      <button 
                        onClick={() => setShowCreateForm(false)}
                        className="text-slate-500 hover:text-slate-300 text-xs font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        Annulla
                      </button>
                    </div>

                    {userActionError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-2xl text-[11px] font-bold text-left">
                        ⚠️ {userActionError}
                      </div>
                    )}

                    <form onSubmit={handleCreateUserSubmit} className="flex flex-col gap-3.5 text-left">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Username *</label>
                        <input
                          type="text"
                          placeholder="es. mrossi"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nome *</label>
                          <input
                            type="text"
                            placeholder="Mario"
                            value={newNome}
                            onChange={(e) => setNewNome(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cognome *</label>
                          <input
                            type="text"
                            placeholder="Rossi"
                            value={newCognome}
                            onChange={(e) => setNewCognome(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Password Iniziale *</label>
                        <input
                          type="password"
                          placeholder="Minimo 6 caratteri"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stato Roster *</label>
                          <select
                            value={newStato}
                            onChange={(e) => setNewStato(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          >
                            <option value="volontario">Volontario</option>
                            <option value="dipendente">Dipendente</option>
                            <option value="admin">Amministratore</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Qualifica *</label>
                          <select
                            value={newQualifica}
                            onChange={(e) => setNewQualifica(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          >
                            <option value="CE">Capo Equipaggio (CE)</option>
                            <option value="autista">Autista Ambulanza</option>
                          </select>
                        </div>
                      </div>

                      {newStato === 'dipendente' && (
                        <div className="flex flex-col gap-1.5 bg-amber-500/5 border border-amber-500/25 p-3 rounded-2xl animate-fade-in">
                          <label className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Paga Oraria (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="es. 12.50"
                            value={newPagaOraria}
                            onChange={(e) => setNewPagaOraria(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                            required
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Codice Fiscale</label>
                        <input
                          type="text"
                          placeholder="RSSMRA85M01H501F"
                          value={newCodiceFiscale}
                          onChange={(e) => setNewCodiceFiscale(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Telefono</label>
                          <input
                            type="text"
                            placeholder="3331234567"
                            value={newTelefono}
                            onChange={(e) => setNewTelefono(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data di Nascita</label>
                          <input
                            type="date"
                            value={newDataNascita}
                            onChange={(e) => setNewDataNascita(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none font-sans"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Email</label>
                        <input
                          type="email"
                          placeholder="mario.rossi@esempio.it"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 mt-2 cursor-pointer"
                      >
                        Crea Profilo e salva
                      </button>
                    </form>
                  </div>
                ) : editingProfile ? (
                  // Edit form panel
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 animate-slide-up text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Pencil className="w-4.5 h-4.5 text-amber-400" />
                        <span>Modifica Profilo: {editingProfile.username}</span>
                      </h3>
                      <button 
                        onClick={() => setEditingProfile(null)}
                        className="text-slate-500 hover:text-slate-300 text-xs font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        Chiudi
                      </button>
                    </div>

                    <form onSubmit={handleUpdateProfileSubmit} className="flex flex-col gap-3.5 text-left font-sans">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nome *</label>
                          <input
                            type="text"
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cognome *</label>
                          <input
                            type="text"
                            value={editCognome}
                            onChange={(e) => setEditCognome(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stato *</label>
                          <select
                            value={editStato}
                            onChange={(e) => setEditStato(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          >
                            <option value="volontario">Volontario</option>
                            <option value="dipendente">Dipendente</option>
                            <option value="admin">Amministratore</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Qualifica *</label>
                          <select
                            value={editQualifica}
                            onChange={(e) => setEditQualifica(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          >
                            <option value="CE">Capo Equipaggio (CE)</option>
                            <option value="autista">Autista Ambulanza</option>
                          </select>
                        </div>
                      </div>

                      {editStato === 'dipendente' && (
                        <div className="flex flex-col gap-1.5 bg-amber-500/5 border border-amber-500/25 p-3 rounded-2xl animate-fade-in">
                          <label className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Paga Oraria (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editPagaOraria}
                            onChange={(e) => setEditPagaOraria(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                            required
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                        <input
                          type="checkbox"
                          id="editAttivo"
                          checked={editAttivo}
                          onChange={(e) => setEditAttivo(e.target.checked)}
                          className="w-4 h-4 bg-slate-950 border border-slate-800 accent-indigo-600 rounded cursor-pointer"
                        />
                        <label htmlFor="editAttivo" className="text-xs font-bold text-slate-300 cursor-pointer">Profilo Attivo (Consente l'accesso al roster)</label>
                      </div>

                      <div className="flex flex-col gap-1 border-t border-slate-800/80 pt-3 mt-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aggiorna Password (Opzionale)</label>
                        <input
                          type="password"
                          placeholder="Lascia vuoto per non cambiarla"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Codice Fiscale</label>
                          <input
                            type="text"
                            value={editCodiceFiscale}
                            onChange={(e) => setEditCodiceFiscale(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data Nascita</label>
                          <input
                            type="date"
                            value={editDataNascita}
                            onChange={(e) => setEditDataNascita(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Telefono</label>
                          <input
                            type="text"
                            value={editTelefono}
                            onChange={(e) => setEditTelefono(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Email</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 mt-2 cursor-pointer"
                      >
                        Salva Profilo
                      </button>
                    </form>
                  </div>
                ) : (
                  // Welcome side panel
                  <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl shadow-xl text-center py-20 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-lg">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-300">Gestisci Utenti Roster</span>
                    <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
                      Seleziona un utente dalla tabella per modificarlo, disattivarlo, cambiargli la password o cancellarlo.
                    </p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-600/25 transition-all mt-2 cursor-pointer"
                    >
                      Aggiungi Nuovo
                    </button>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 3: TABELLONE STORICO PRENOTAZIONI */}
          {activeTab === 'storico' && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-6 animate-fade-in text-left">
              
              {/* Header with Search and Filter */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Storico dei Turni Passati</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Visualizza le presenze e i turni prenotati dai soccorritori nel passato</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Cerca utente */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtra per soccorritore..."
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none transition-all placeholder:text-slate-600 font-sans"
                    />
                  </div>

                  {/* Filtra fascia */}
                  <select
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none"
                  >
                    <option value="all">Tutte le Fasce</option>
                    <option value="1">Mattina (06:00 - 14:00)</option>
                    <option value="2">Pomeriggio (14:00 - 22:00)</option>
                    <option value="3">Notte (22:00 - 06:00)</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Data Turno</th>
                      <th className="py-3 px-4">Orario</th>
                      <th className="py-3 px-4">Soccorritore</th>
                      <th className="py-3 px-4">Ruolo Preso</th>
                      <th className="py-3 px-4">Tipo Prenotazione</th>
                      <th className="py-3 px-4 text-right">Data Prenotazione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                    {filteredPastBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="py-3 px-4 text-slate-200">
                          {b.shifts?.data ? format(parseISO(b.shifts.data), 'dd EEEE MMM yyyy', { locale: it }) : 'Data N/D'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {b.shifts ? `${b.shifts.ora_inizio.slice(0, 5)} - ${b.shifts.ora_fine.slice(0, 5)}` : 'N/D'}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-bold">
                          {b.profiles?.nome && b.profiles?.cognome ? `${b.profiles.nome} ${b.profiles.cognome}` : (b.profiles?.username || 'Username N/D')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                            b.ruolo_turno === 'autista' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' 
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                          }`}>
                            {b.ruolo_turno}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {b.is_partial ? (
                            <span className="text-rose-400 font-medium bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 text-[10px]" title={b.nota_parziale}>
                              Parziale (Nota: {b.nota_parziale || 'Nessuna'})
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-medium bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 text-[10px]">
                              Turno Intero
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatItalianDateTime(b.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPastBookings.length === 0 && (
                  <div className="text-center py-16 text-slate-500 font-bold">
                    Nessuna prenotazione passata registrata o corrisponde ai filtri selezionati.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: GESTIONE EQUIPAGGI */}
          {activeTab === 'equipaggi' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
              
              {/* List of Crews */}
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 text-left">
                <h3 className="text-lg font-bold text-slate-100 pb-2 border-b border-slate-800/60">Equipaggi Attivi</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {crews.map(c => (
                    <div key={c.id} className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-md group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold">
                          {c.id}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-200">{c.nome}</span>
                          <span className="text-[10px] text-slate-500">Stato: Attivo per il tabellone</span>
                        </div>
                      </div>

                      {c.id !== 1 && (
                        <button
                          onClick={() => handleDeleteCrew(c.id)}
                          className="p-2.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-900/30 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Elimina Equipaggio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {crews.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-600">
                      Nessun equipaggio caricato nel roster
                    </div>
                  )}
                </div>
              </div>

              {/* Create New Crew Form */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 text-left">
                <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-800">
                  Aggiungi Equipaggio
                </h3>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Creando un nuovo equipaggio operativo (es. "Equipaggio 3" o "Equipaggio H24"), verranno abilitati gli slot nel tabellone e le relative fasce di prenotazione per i soccorritori.
                </p>

                <form onSubmit={handleCreateCrew} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nome Equipaggio *</label>
                    <input
                      type="text"
                      placeholder="es. Equipaggio 3"
                      value={newCrewName}
                      onChange={(e) => setNewCrewName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none font-sans"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Crea Equipaggio</span>
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 5: GESTIONE ORE E PAGAMENTI DIPENDENTI */}
          {activeTab === 'ore' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
              
              {/* Employee Selection List */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 text-left">
                <div className="pb-2 border-b border-slate-800/60">
                  <h3 className="text-base font-bold text-slate-100">Personale Dipendente</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Seleziona un dipendente per convalidare le timbrature orarie</p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cerca dipendente..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none transition-all placeholder:text-slate-600 font-sans"
                  />
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-1">
                  {filteredEmployees.filter(e => e.stato === 'dipendente' || e.ruolo === 'dipendente').map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => selectEmployeeForValidation(emp)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedEmployee?.id === emp.id
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-md'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {emp.nome && emp.cognome ? `${emp.nome} ${emp.cognome}` : emp.username}
                        </span>
                        <span className="text-[10px] text-slate-500">Paga Base: €{emp.paga_oraria || '0.00'}/h</span>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {emp.unpaidHours > 0 ? (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/15 px-2 py-0.5 rounded text-[9px] font-bold">
                            {emp.unpaidHours.toFixed(1)}h da pagare
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold">
                            Liquidato
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                  {filteredEmployees.filter(e => e.stato === 'dipendente' || e.ruolo === 'dipendente').length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-600">
                      Nessun dipendente censito nel sistema
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Clocked Shifts Table (Center/Right Wide) */}
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-5 text-left min-h-[500px]">
                {selectedEmployee ? (
                  <>
                    {/* Header with totals */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                      <div>
                        <h3 className="text-lg font-bold text-slate-100">
                          Ore e Timbrature: {selectedEmployee.nome} {selectedEmployee.cognome}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">Username: <span className="font-mono text-slate-400">{selectedEmployee.username}</span></span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">Codice Fiscale: <span className="font-mono text-slate-400">{selectedEmployee.codice_fiscale || 'N/D'}</span></span>
                        </div>
                      </div>

                      {/* Print button */}
                      <button
                        onClick={() => window.print()}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700/60 shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Stampa Foglio Presenze</span>
                      </button>
                    </div>

                    {/* Stats boxes */}
                    <div className="grid grid-cols-3 gap-4 bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ore Totali Registrate</span>
                        <span className="text-xl font-extrabold text-slate-200 mt-1">{selectedEmployee.totalHours || 0}h</span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ore non liquidate</span>
                        <span className="text-xl font-extrabold text-amber-400 mt-1">{selectedEmployee.unpaidHours || 0}h</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Compenso da liquidare</span>
                        <span className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                          €{(selectedEmployee.shifts?.reduce((sum, s) => {
                            if (!s.pagato && s.end_time) {
                              const hrs = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
                              return sum + hrs * (s.paga_oraria_storica || selectedEmployee.paga_oraria || 0)
                            }
                            return sum
                          }, 0) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Action area for selected shifts */}
                    {selectedShiftIds.length > 0 && (
                      <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 animate-slide-up">
                        <span className="text-xs font-bold text-indigo-300">
                          {selectedShiftIds.length} timbrature selezionate per la convalida / pagamento
                        </span>
                        
                        <button
                          onClick={() => setPaymentModalOpen(true)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          Convalida e Paga Selezionati
                        </button>
                      </div>
                    )}

                    {/* Clocked Shifts Table */}
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-2.5 px-3 text-center w-10">
                              <input
                                type="checkbox"
                                checked={selectedShiftIds.length === (selectedEmployee.shifts?.filter(s => !s.pagato).length || 0) && (selectedEmployee.shifts?.filter(s => !s.pagato).length || 0) > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedShiftIds(selectedEmployee.shifts?.filter(s => !s.pagato).map(s => s.id) || [])
                                  } else {
                                    setSelectedShiftIds([])
                                  }
                                }}
                                className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 accent-indigo-600 rounded cursor-pointer"
                              />
                            </th>
                            <th className="py-2.5 px-3">Inizio Turno (Entrata)</th>
                            <th className="py-2.5 px-3">Fine Turno (Uscita)</th>
                            <th className="py-2.5 px-3 text-center">Durata</th>
                            <th className="py-2.5 px-3 text-center">Paga Oraria</th>
                            <th className="py-2.5 px-3 text-right font-mono">Lordo Stimato</th>
                            <th className="py-2.5 px-3 text-center">Stato</th>
                            <th className="py-2.5 px-3 text-right">Modifica</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                          {selectedEmployee.shifts?.map(shift => {
                            const duration = shift.end_time 
                              ? (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60)
                              : 0
                            
                            const rate = shift.paga_oraria_storica || selectedEmployee.paga_oraria || 0
                            const gross = duration * rate

                            return (
                              <tr key={shift.id} className="hover:bg-slate-800/25 transition-colors">
                                <td className="py-3 px-3 text-center">
                                  {!shift.pagato ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedShiftIds.includes(shift.id)}
                                      onChange={() => handleToggleShiftSelection(shift.id)}
                                      className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 accent-indigo-600 rounded cursor-pointer"
                                    />
                                  ) : (
                                    <span className="text-emerald-500 font-bold">✓</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-slate-200">
                                  {formatItalianDateTime(shift.start_time)}
                                </td>
                                <td className="py-3 px-3 text-slate-200">
                                  {shift.end_time ? formatItalianDateTime(shift.end_time) : (
                                    <span className="text-amber-400 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/15 text-[10px] animate-pulse-subtle">
                                      Attivo in corso
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center text-slate-400">
                                  {shift.end_time ? `${duration.toFixed(2)} ore` : '-'}
                                </td>
                                <td className="py-3 px-3 text-center text-slate-400 font-mono">
                                  €{rate.toFixed(2)}/h
                                </td>
                                <td className="py-3 px-3 text-right text-slate-300 font-mono">
                                  {shift.end_time ? `€${gross.toFixed(2)}` : '-'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {shift.pagato ? (
                                    <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/15 text-[9px] font-bold">PAGATO</span>
                                  ) : (
                                    <span className="text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/15 text-[9px] font-bold">DA PAGARE</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => handleOpenEditShiftModal(shift)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-all cursor-pointer"
                                    title="Modifica Turno Timbratura"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>

                      {(!selectedEmployee.shifts || selectedEmployee.shifts.length === 0) && (
                        <div className="text-center py-16 text-slate-500 font-bold">
                          Nessun turno timbrato o registrato per questo dipendente.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center gap-3">
                    <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center shadow-lg">
                      <CircleDollarSign className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-300">Seleziona un dipendente</span>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      Scegli un dipendente nella colonna di sinistra per caricarne il riepilogo orario, verificare le timbrature orarie, stampare il resoconto o effettuarne la convalida.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 6: NOTIFICHE E TELEGRAM BROADCAST COMPLETO */}
          {activeTab === 'notifiche' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in text-left">
              
              {/* Notifications Table (Left/Center Wide) */}
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4">
                <div className="pb-2 border-b border-slate-800/60">
                  <h3 className="text-lg font-bold text-slate-100">Audit Log Completo delle Notifiche</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Registro storico degli accessi, prenotazioni, disdette e timbrature</p>
                </div>

                <div className="overflow-x-auto max-h-[560px] pr-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-12 text-center">Tipo</th>
                        <th className="py-2.5 px-4">Messaggio dell'Evento</th>
                        <th className="py-2.5 px-4">Operatore</th>
                        <th className="py-2.5 px-4 text-right">Data/Ora Notifica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                      {notifications.map(notif => {
                        const style = getNotificationBadgeStyle(notif.tipo)
                        return (
                          <tr key={notif.id} className="hover:bg-slate-800/25 transition-colors">
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center justify-center p-1.5 rounded-lg ${style.bg} ${style.color} border ${style.border}`} title={notif.tipo}>
                                {style.icon}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-200 font-bold leading-normal max-w-sm">
                              {notif.messaggio}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono">
                              {notif.creato_da}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-500">
                              {formatItalianDateTime(notif.created_at)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {notifications.length === 0 && (
                    <div className="text-center py-12 text-slate-500 font-bold">
                      Nessuna notifica presente a sistema.
                    </div>
                  )}
                </div>
              </div>

              {/* Announcements Panel (Right side) */}
              <div className="flex flex-col gap-6">
                
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4">
                  <h3 className="text-base font-bold text-slate-100 pb-2 border-b border-slate-800">
                    Console Telegram Integrata
                  </h3>

                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <PlusCircle className="w-5 h-5" />
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Questo strumento comunica direttamente col bot Telegram integrato del gruppo soccorritori. Digitando un annuncio, questo verrà inserito come notifica di sistema e inoltrato istantaneamente su Telegram tramite HTTP POST (pg_net) programmato a livello di database.
                  </p>

                  <form onSubmit={handleSendAnnouncement} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Messaggio dell'Avviso *</label>
                      <textarea
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        placeholder="Digita qui il testo dell'annuncio ufficiale..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl p-3.5 text-xs font-semibold text-slate-200 outline-none transition-all h-32 placeholder:text-slate-700 resize-none font-sans"
                        required
                      />
                    </div>

                    {announcementSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2.5 rounded-xl text-center text-xs font-bold">
                        ✓ Annuncio inviato a Telegram con successo!
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={announcementLoading || !announcementText.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {announcementLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Pubblicazione...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          <span>Pubblica Annuncio</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Legend of Notification Types */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-800">Tipi di Notifica Audit</h4>
                  
                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-500/15 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/15">
                        <Users className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-slate-300">registrazione / profilo_modificato</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500/15 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/15">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-slate-300">prenotazione_effettuata</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-rose-500/15 text-rose-400 p-1.5 rounded-lg border border-rose-500/15">
                        <X className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-slate-300">prenotazione_cancellata</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/15 text-amber-400 p-1.5 rounded-lg border border-amber-500/15">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-slate-300">timbratura_inizio / timbratura_fine</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-purple-500/15 text-purple-400 p-1.5 rounded-lg border border-purple-500/15">
                        <PlusCircle className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-slate-300">annuncio (Telegram / Avviso)</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>

      </div>

      {/* MODALE DI CONVALIDA PAGAMENTO (DIPENDENTI) */}
      {paymentModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-left shadow-2xl animate-scale-up font-sans">
            <h3 className="text-base font-extrabold text-slate-100">Riconosci Liquidazione Turni</h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Stai per convalidare definitivamente <strong>{selectedShiftIds.length}</strong> timbrature per il dipendente <strong>{selectedEmployee.nome} {selectedEmployee.cognome}</strong>. 
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl flex flex-col gap-2 border border-slate-800 font-sans">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Paga Oraria:</span>
                <span className="font-bold text-slate-200">€{selectedEmployee.paga_oraria?.toFixed(2)}/h</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Timbrature Selezionate:</span>
                <span className="font-bold text-slate-200">{selectedShiftIds.length} turni</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between text-sm font-extrabold text-slate-200">
                <span>Totale Stipendio Riconosciuto:</span>
                <span className="text-emerald-400 font-mono">
                  €{(selectedEmployee.shifts?.filter(s => selectedShiftIds.includes(s.id)).reduce((sum, s) => {
                    if (s.end_time) {
                      const hrs = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
                      return sum + hrs * (s.paga_oraria_storica || selectedEmployee.paga_oraria || 0)
                    }
                    return sum
                  }, 0) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={empLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {empLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Convalida...</span>
                  </>
                ) : (
                  <span>Convalida e Paga</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DI MODIFICA TIMBRATURA SINGOLA */}
      {editingShift && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-left shadow-2xl animate-scale-up font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-slate-100">Modifica Timbratura Oraria</h3>
              <button 
                onClick={() => setEditingShift(null)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editShiftError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-[10px] font-bold">
                ⚠️ {editShiftError}
              </div>
            )}

            <form onSubmit={handleEditShiftSubmit} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data Inizio *</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ora Inizio *</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data Fine</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ora Fine</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="text-[10px] text-slate-500 italic">
                Lasciare vuoto Data/Ora Fine se il dipendente non ha ancora timbrato l'uscita (stato attivo in corso).
              </div>

              {showDeleteConfirm ? (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex flex-col gap-2 mt-2">
                  <span className="text-[10px] font-bold text-rose-300">Vuoi davvero ELIMINARE definitivamente questa timbratura? Questa azione è irreversibile.</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 bg-slate-800 text-slate-300 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteClockedShift}
                      disabled={editShiftLoading}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {editShiftLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                      <span>Sì, elimina</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                  >
                    Elimina timbratura
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingShift(null)}
                      className="bg-slate-800 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={editShiftLoading}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {editShiftLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Salva</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// Subcomponents / Helpers
function LoaderComponent() {
  return (
    <div className="w-12 h-12 relative flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin absolute" />
      <div className="w-6 h-6 border-4 border-cyan-500/10 border-b-cyan-500 rounded-full animate-spin absolute" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
    </div>
  )
}

function getNotificationBadgeStyle(tipo) {
  switch (tipo) {
    case 'registrazione':
    case 'profilo_modificato':
      return {
        bg: 'bg-indigo-500/10',
        color: 'text-indigo-400',
        border: 'border-indigo-500/15',
        icon: <Users className="w-4 h-4" />
      }
    case 'prenotazione_effettuata':
      return {
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-400',
        border: 'border-emerald-500/15',
        icon: <Check className="w-4 h-4" />
      }
    case 'prenotazione_cancellata':
      return {
        bg: 'bg-rose-500/10',
        color: 'text-rose-400',
        border: 'border-rose-500/15',
        icon: <X className="w-4 h-4" />
      }
    case 'timbratura_inizio':
    case 'timbratura_fine':
      return {
        bg: 'bg-amber-500/10',
        color: 'text-amber-400',
        border: 'border-amber-500/15',
        icon: <Clock className="w-4 h-4" />
      }
    case 'annuncio':
      return {
        bg: 'bg-purple-500/10',
        color: 'text-purple-400',
        border: 'border-purple-500/15',
        icon: <PlusCircle className="w-4 h-4" />
      }
    case 'accesso_admin':
      return {
        bg: 'bg-indigo-500/15',
        color: 'text-indigo-300',
        border: 'border-indigo-500/25',
        icon: <ShieldAlert className="w-4 h-4" />
      }
    default:
      return {
        bg: 'bg-slate-800',
        color: 'text-slate-400',
        border: 'border-slate-700/50',
        icon: <AlertCircle className="w-4 h-4" />
      }
  }
}
