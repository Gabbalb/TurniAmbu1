import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Users, History, ShieldAlert, Key, Plus, ToggleLeft, ToggleRight, Trash2, Edit2, Search, Filter, ChevronLeft, CheckCircle, CircleDollarSign, Landmark, Check, AlertCircle, Loader2 } from 'lucide-react'

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('utenti') // 'utenti' | 'storico' | 'equipaggi'
  const [profiles, setProfiles] = useState([])
  const [crews, setCrews] = useState([])
  const [pastBookings, setPastBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // Stati Form Creazione Utente
  const [newNome, setNewNome] = useState('')
  const [newCognome, setNewCognome] = useState('')
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

  // Stati Form Modifica Utente (Editing)
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
  const [editConfirmPassword, setEditConfirmPassword] = useState('')

  // Stati Form Equipaggio Aggiuntivo
  const [crewDate, setCrewDate] = useState('')
  const [crewShiftId, setCrewShiftId] = useState('1')
  const [crewSelectedId, setCrewSelectedId] = useState('')

  // Stati Filtri Storico
  const [filterUser, setFilterUser] = useState('')
  const [filterShift, setFilterShift] = useState('all')

  // Stati per Gestione Ore / Pagamenti Dipendenti
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedShiftIds, setSelectedShiftIds] = useState([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [calculatedPayment, setCalculatedPayment] = useState(0)
  const [empLoading, setEmpLoading] = useState(false)
  const [empSearch, setEmpSearch] = useState('')
  const [newCrewName, setNewCrewName] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: profs } = await api.fetchProfiles()
      setProfiles(profs || [])

      const { data: crws } = await api.fetchCrews()
      setCrews(crws || [])
      const reinforcementCrews = (crws || []).filter(c => c.id !== 1)
      if (reinforcementCrews.length > 0) {
        setCrewSelectedId(String(reinforcementCrews[0].id))
      } else {
        setCrewSelectedId('')
      }

      const { data: pasts } = await api.fetchPastBookings()
      setPastBookings(pasts || [])

      const { data: emps } = await api.fetchEmployeesWithPayments()
      setEmployees(emps || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Sincronizza il calcolo dei pagamenti
  useEffect(() => {
    if (selectedEmployee) {
      let totalCheckedCost = 0
      selectedEmployee.shifts.forEach(s => {
        if (selectedShiftIds.includes(s.id)) {
          const duration = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
          totalCheckedCost += duration * Number(s.paga_oraria_storica || selectedEmployee.paga_oraria || 0)
        }
      })
      const surplus = Number(selectedEmployee.credito_surplus || 0)
      const due = Number((totalCheckedCost - surplus).toFixed(2))
      setCalculatedPayment(due)
      setPaymentAmount(String(due >= 0 ? due : 0))
    }
  }, [selectedShiftIds, selectedEmployee])

  const handleConfirmPayment = async () => {
    if (!selectedEmployee || selectedShiftIds.length === 0) return
    
    // Calcola il costo totale dei turni selezionati
    let totalCost = 0
    selectedEmployee.shifts.forEach(s => {
      if (selectedShiftIds.includes(s.id)) {
        const duration = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
        totalCost += duration * Number(s.paga_oraria_storica || selectedEmployee.paga_oraria || 0)
      }
    })

    setEmpLoading(true)
    try {
      const { error: apiError } = await api.payShifts(
        selectedEmployee.id,
        selectedShiftIds,
        totalCost,
        Number(paymentAmount)
      )
      
      if (apiError) throw apiError
      
      // Ricarica tutti i dati
      const { data: emps } = await api.fetchEmployeesWithPayments()
      setEmployees(emps || [])
      
      // Trova l'impiegato aggiornato e riselezionalo per aggiornare la vista di dettaglio
      const updatedEmp = emps.find(e => e.id === selectedEmployee.id)
      setSelectedEmployee(updatedEmp || null)
      
      // Resetta i turni selezionati
      setSelectedShiftIds([])
      setPaymentModalOpen(false)
      
      // Mostra messaggio di successo
      setUserActionSuccess('Pagamento registrato con successo!')
      setTimeout(() => setUserActionSuccess(null), 5000)
    } catch (err) {
      console.error(err)
      setUserActionError('Errore durante la registrazione del pagamento.')
      setTimeout(() => setUserActionError(null), 5000)
    } finally {
      setEmpLoading(false)
    }
  }

  const handleCreateCrew = async (e) => {
    e.preventDefault()
    if (!newCrewName.trim()) return

    try {
      const { error } = await api.createCrew(newCrewName.trim())
      if (error) {
        alert(error.message || 'Errore nella creazione dell\'equipaggio.')
      } else {
        setNewCrewName('')
        const { data: crws } = await api.fetchCrews()
        setCrews(crws || [])
        const reinforcementCrews = (crws || []).filter(c => c.id !== 1)
        if (reinforcementCrews.length > 0) {
          setCrewSelectedId(String(reinforcementCrews[reinforcementCrews.length - 1].id))
        } else {
          setCrewSelectedId('')
        }
        alert('Equipaggio creato con successo!')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteCrew = async (crewId) => {
    if (!window.confirm('Vuoi davvero eliminare questo equipaggio? Questo eliminerà anche tutti i turni ad esso collegati.')) return

    try {
      const { error } = await api.deleteCrew(crewId)
      if (error) {
        alert(error.message || 'Errore nell\'eliminazione dell\'equipaggio.')
      } else {
        const { data: crws } = await api.fetchCrews()
        setCrews(crws || [])
        const reinforcementCrews = (crws || []).filter(c => c.id !== 1)
        if (reinforcementCrews.length > 0) {
          setCrewSelectedId(String(reinforcementCrews[0].id))
        } else {
          setCrewSelectedId('')
        }
        alert('Equipaggio eliminato con successo!')
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
    // Imposta la data di oggi come default per l'aggiunta equipaggi
    setCrewDate(new Date().toISOString().split('T')[0])
  }, [])

  // Creazione Nuovo Utente
  const handleCreateUser = async (e) => {
    e.preventDefault()
    setUserActionError(null)
    setUserActionSuccess(null)

    if (!newNome || !newCognome || !newPassword) {
      setUserActionError('Inserisci tutti i campi obbligatori (*).')
      return
    }

    try {
      const userData = {
        nome: newNome.trim(),
        cognome: newCognome.trim(),
        password: newPassword,
        stato: newStato,
        qualifica: newQualifica,
        codice_fiscale: newCodiceFiscale.trim(),
        email: newEmail.trim(),
        telefono: newTelefono.trim(),
        data_nascita: newDataNascita || null,
        paga_oraria: newStato === 'dipendente' ? (newPagaOraria || null) : null
      }

      const { data, error } = await api.adminCreateUser(userData)
      if (error) {
        setUserActionError(error.message || 'Errore durante la creazione.')
      } else {
        setUserActionSuccess(`Utente creato con successo!`)
        setShowCreateForm(false)
        setNewNome('')
        setNewCognome('')
        setNewPassword('')
        setNewStato('volontario')
        setNewQualifica('CE')
        setNewCodiceFiscale('')
        setNewEmail('')
        setNewTelefono('')
        setNewDataNascita('')
        setNewPagaOraria('')
        await loadData()
      }
    } catch (err) {
      setUserActionError(err.message)
    }
  }

  // Avvia modifica profilo
  const startEditing = (prof) => {
    setEditingProfile(prof)
    setEditNome(prof.nome || '')
    setEditCognome(prof.cognome || '')
    setEditStato(prof.stato || prof.ruolo || 'dipendente')
    setEditQualifica(prof.qualifica || 'CE')
    setEditCodiceFiscale(prof.codice_fiscale || '')
    setEditEmail(prof.email || '')
    setEditTelefono(prof.telefono || '')
    setEditDataNascita(prof.data_nascita || '')
    setEditPagaOraria(prof.paga_oraria !== null && prof.paga_oraria !== undefined ? String(prof.paga_oraria) : '')
    setEditAttivo(prof.attivo !== false)
    setEditPassword('')
    setEditConfirmPassword('')
  }

  // Salva modifiche profilo ed eventuale reset password
  const handleSaveEditProfile = async (e) => {
    e.preventDefault()

    if (editPassword && editPassword !== editConfirmPassword) {
      alert('Le nuove password inserite non coincidono.')
      return
    }

    if (editPassword && editPassword.length < 6) {
      alert('La nuova password deve contenere almeno 6 caratteri.')
      return
    }

    try {
      const updates = {
        nome: editNome.trim(),
        cognome: editCognome.trim(),
        stato: editStato,
        ruolo: editStato === 'admin' ? 'admin' : 'dipendente',
        qualifica: editQualifica,
        codice_fiscale: editCodiceFiscale.trim(),
        email: editEmail.trim(),
        telefono: editTelefono.trim(),
        data_nascita: editDataNascita || null,
        paga_oraria: editStato === 'dipendente' ? (editPagaOraria || null) : null,
        attivo: editAttivo
      }

      const { error: profileError } = await api.adminUpdateProfile(editingProfile.id, updates)
      if (profileError) {
        alert(profileError.message || 'Errore durante l\'aggiornamento del profilo.')
        return
      }

      if (editPassword) {
        const { error: passError } = await api.adminSetPassword(editingProfile.id, editPassword)
        if (passError) {
          alert(passError.message || 'Profilo salvato, ma errore nel cambio password.')
          return
        }
      }

      alert('Profilo aggiornato con successo!')
      setEditingProfile(null)
      await loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  // Elimina Utente Definitivamente
  const handleDeleteUser = async () => {
    if (!editingProfile) return
    const confirmDelete = window.confirm(`Sei sicuro di voler eliminare definitivamente l'utente ${editingProfile.username}? Questa azione è IRREVERSIBILE e cancellerà tutte le sue prenotazioni.`);
    if (!confirmDelete) return

    try {
      const { error } = await api.adminDeleteUser(editingProfile.id)
      if (error) {
        alert(error.message || 'Errore durante l\'eliminazione dell\'utente.')
      } else {
        alert('Utente eliminato con successo!')
        setEditingProfile(null)
        await loadData()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // Aggiunta Secondo Equipaggio ad un Turno
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
        alert(error.message || 'Errore nell\'aggiunta dell\'equipaggio.')
      } else {
        alert('Equipaggio aggiunto con successo a questa fascia!')
        await loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Filtra Storico Turni Passati
  const filteredPastBookings = pastBookings.filter(b => {
    const matchUser = b.profiles?.username?.toLowerCase().includes(filterUser.toLowerCase()) || !filterUser
    let matchShift = true
    if (filterShift !== 'all') {
      const shiftStart = b.shifts?.ora_inizio
      if (filterShift === '1') matchShift = shiftStart ? shiftStart.startsWith('06:') : false
      if (filterShift === '2') matchShift = shiftStart ? shiftStart.startsWith('14:') : false
      if (filterShift === '3') matchShift = shiftStart ? shiftStart.startsWith('22:') : false
    }
    return matchUser && matchShift
  })

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-12">
      {/* Header Admin */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/60">
        <div className="p-2 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Pannello Amministratore</h2>
          <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">
            {editingProfile ? `Modifica Profilo: ${editingProfile.username}` : 'Area Amministrazione'}
          </span>
        </div>
      </div>

      {editingProfile ? (
        /* VISTA MODIFICA UTENTE DEDICATA */
        <form onSubmit={handleSaveEditProfile} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 text-left animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Modifica Informazioni Utente</h3>
              <p className="text-[10px] text-slate-500">I campi contrassegnati con * sono obbligatori</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingProfile(null)}
              className="px-3 py-1 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              Annulla
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome *</label>
              <input
                type="text"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cognome *</label>
              <input
                type="text"
                value={editCognome}
                onChange={(e) => setEditCognome(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome Utente (Sola Lettura)</label>
              <input
                type="text"
                value={editingProfile.username}
                disabled
                className="bg-slate-950/40 border border-slate-900 text-slate-500 rounded-xl px-3 py-2 text-xs outline-none cursor-not-allowed font-mono"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stato *</label>
              <select
                value={editStato}
                onChange={(e) => setEditStato(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
              >
                <option value="dipendente">Dipendente</option>
                <option value="volontario">Volontario</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualifica *</label>
              <select
                value={editQualifica}
                onChange={(e) => setEditQualifica(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
              >
                <option value="CE">Capo Equipaggio (CE)</option>
                <option value="autista">Autista</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Codice Fiscale</label>
              <input
                type="text"
                placeholder="Codice Fiscale"
                value={editCodiceFiscale}
                onChange={(e) => setEditCodiceFiscale(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none uppercase"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Personale</label>
              <input
                type="email"
                placeholder="Email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefono</label>
              <input
                type="tel"
                placeholder="Telefono"
                value={editTelefono}
                onChange={(e) => setEditTelefono(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data di Nascita</label>
              <input
                type="date"
                value={editDataNascita}
                onChange={(e) => setEditDataNascita(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            {editStato === 'dipendente' && (
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paga Oraria (€/h)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Paga Oraria (facoltativo)"
                  value={editPagaOraria}
                  onChange={(e) => setEditPagaOraria(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                />
              </div>
            )}

            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stato Account</label>
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                <input
                  type="checkbox"
                  id="editAttivo"
                  checked={editAttivo}
                  onChange={(e) => setEditAttivo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="editAttivo" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  Account Attivo (se disattivato, l'utente non potrà accedere)
                </label>
              </div>
            </div>

            {/* RESET PASSWORD */}
            <div className="col-span-2 pt-2 border-t border-slate-800/40 mt-1 flex flex-col gap-2">
              <h4 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">Cambia Password (opzionale)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nuova Password</label>
                  <input
                    type="password"
                    placeholder="Nuova password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Conferma Password</label>
                  <input
                    type="password"
                    placeholder="Conferma nuova password"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-3 border-t border-slate-800/40 justify-between items-center">
            <button
              type="button"
              onClick={handleDeleteUser}
              className="py-2 px-3 bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-[11px] font-bold transition-all"
            >
              Elimina Utente
            </button>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="py-2 px-3.5 border border-slate-700 bg-slate-800/30 hover:bg-slate-800 rounded-xl text-[11px] font-semibold text-slate-300 transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold shadow-md shadow-indigo-600/20 transition-colors"
              >
                Salva Modifiche
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* VISTA TABELLA E LISTE REGOLARI */
        <>
          {/* Tabs di navigazione interna */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl gap-0.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('utenti')}
              className={`flex-shrink-0 px-2.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'utenti' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Utenti
            </button>
            <button
              onClick={() => setActiveTab('storico')}
              className={`flex-shrink-0 px-2.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'storico' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Storico
            </button>
            <button
              onClick={() => setActiveTab('equipaggi')}
              className={`flex-shrink-0 px-2.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'equipaggi' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Equipaggi
            </button>
            <button
              onClick={() => setActiveTab('dipendenti')}
              className={`flex-shrink-0 px-2.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'dipendenti' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Dipendenti
            </button>
          </div>

          {/* CONTENUTO TAB: UTENTI */}
          {activeTab === 'utenti' && (
            <div className="flex flex-col gap-6">
              {/* Notifica Successo Creazione (esterna al form) */}
              {userActionSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 font-semibold flex items-center justify-between animate-fade-in text-left">
                  <span>{userActionSuccess}</span>
                  <button 
                    onClick={() => setUserActionSuccess(null)} 
                    className="text-slate-400 hover:text-slate-200 font-bold ml-2 text-xs"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Pulsante Aggiungi Utente / Form Toggle */}
              {!showCreateForm ? (
                <button
                  onClick={() => {
                    setShowCreateForm(true)
                    setUserActionError(null)
                    setUserActionSuccess(null)
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Aggiungi Nuovo Utente
                </button>
              ) : (
                /* Form Creazione Utente */
                <form onSubmit={handleCreateUser} className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col gap-4 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Crea Nuovo Account</h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-[10px] font-bold transition-all"
                    >
                      Annulla
                    </button>
                  </div>
                  
                  {userActionError && <span className="text-xs text-rose-400 font-semibold text-left">{userActionError}</span>}

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome *</label>
                      <input
                        type="text"
                        placeholder="Nome"
                        value={newNome}
                        onChange={(e) => setNewNome(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cognome *</label>
                      <input
                        type="text"
                        placeholder="Cognome"
                        value={newCognome}
                        onChange={(e) => setNewCognome(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password *</label>
                      <input
                        type="password"
                        placeholder="Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stato *</label>
                      <select
                        value={newStato}
                        onChange={(e) => setNewStato(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
                      >
                        <option value="dipendente">Dipendente</option>
                        <option value="volontario">Volontario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualifica *</label>
                      <select
                        value={newQualifica}
                        onChange={(e) => setNewQualifica(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
                      >
                        <option value="CE">Capo Equipaggio (CE)</option>
                        <option value="autista">Autista</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Codice Fiscale</label>
                      <input
                        type="text"
                        placeholder="Codice Fiscale"
                        value={newCodiceFiscale}
                        onChange={(e) => setNewCodiceFiscale(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none uppercase"
                      />
                    </div>

                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Personale</label>
                      <input
                        type="email"
                        placeholder="Email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefono</label>
                      <input
                        type="tel"
                        placeholder="Telefono"
                        value={newTelefono}
                        onChange={(e) => setNewTelefono(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data di Nascita</label>
                      <input
                        type="date"
                        value={newDataNascita}
                        onChange={(e) => setNewDataNascita(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                      />
                    </div>

                    {newStato === 'dipendente' && (
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paga Oraria (€/h)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Paga Oraria (facoltativo)"
                          value={newPagaOraria}
                          onChange={(e) => setNewPagaOraria(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
                  >
                    Crea Account
                  </button>
                </form>
              )}

              {/* Lista Utenti */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Membri del Roster ({profiles.length})</h3>
                <p className="text-[10px] text-slate-500 italic text-left -mt-2">Clicca su un utente per modificarne i dettagli e le credenziali.</p>
                <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {profiles.map(prof => (
                    <div
                      key={prof.id}
                      onClick={() => startEditing(prof)}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all text-left cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900/30 ${
                        prof.attivo ? 'border-slate-800 bg-slate-900/20' : 'border-slate-800 bg-slate-950/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-slate-100">{prof.nome && prof.cognome ? `${prof.nome} ${prof.cognome}` : prof.username}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({prof.username})</span>
                        </div>
                        
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                          prof.attivo
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                            : 'bg-slate-800 text-slate-500 border-slate-700/50'
                        }`}>
                          {prof.attivo ? 'Attivo' : 'Disattivo'}
                        </span>
                      </div>

                      {/* Badge Ruoli / Qualifiche */}
                      <div className="flex gap-1.5 flex-wrap mt-0.5">
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                          prof.stato === 'admin'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : prof.stato === 'volontario'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {prof.stato || prof.ruolo}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                          prof.qualifica === 'autista'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700/60'
                        }`}>
                          {prof.qualifica === 'autista' ? 'Autista' : 'Capo Equipaggio (CE)'}
                        </span>
                        {prof.paga_oraria && prof.stato === 'dipendente' && (
                          <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md font-bold border border-emerald-500/20">
                            {Number(prof.paga_oraria).toFixed(2)} €/h
                          </span>
                        )}
                      </div>

                      {/* Dettagli anagrafici abbreviati */}
                      {(prof.codice_fiscale || prof.email || prof.telefono) && (
                        <div className="grid grid-cols-1 gap-y-0.5 mt-1 pt-1.5 border-t border-slate-800/40 text-[10px] text-slate-400">
                          {prof.codice_fiscale && (
                            <div>CF: <span className="font-semibold text-slate-300 uppercase">{prof.codice_fiscale}</span></div>
                          )}
                          {prof.email && (
                            <div className="truncate">Mail: <span className="font-semibold text-slate-300">{prof.email}</span></div>
                          )}
                          {prof.telefono && (
                            <div>Tel: <span className="font-semibold text-slate-300">{prof.telefono}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONTENUTO TAB: STORICO TURNI PASSATI */}
          {activeTab === 'storico' && (
            <div className="flex flex-col gap-4">
              {/* Barra dei filtri */}
              <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-2xl flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Filtra Storico
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Nome utente..."
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <select
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
                  >
                    <option value="all">Tutte le fasce</option>
                    <option value="1">Fascia 1 (06-14)</option>
                    <option value="2">Fascia 2 (14-22)</option>
                    <option value="3">Fascia 3 (22-06)</option>
                  </select>
                </div>
              </div>

              {/* Elenco Storico */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Risultati Trovati ({filteredPastBookings.length})
                </h3>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {filteredPastBookings.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">Nessun turno nello storico corrisponde ai filtri.</span>
                  ) : (
                    filteredPastBookings.map(b => (
                      <div key={b.id} className="p-3 bg-slate-900/20 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex flex-col gap-1 min-w-0 pr-3">
                          <span className="font-bold text-slate-200 capitalize">
                            {b.shifts?.data ? format(parseISO(b.shifts.data), 'dd MMMM yyyy', { locale: it }) : 'Data N/D'}
                          </span>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span className="font-mono text-[10px]">
                              {b.shifts?.ora_inizio ? b.shifts.ora_inizio.slice(0, 5) : 'N/D'}–{b.shifts?.ora_fine ? b.shifts.ora_fine.slice(0, 5) : 'N/D'}
                            </span>
                            <span>&bull;</span>
                            <span className={`font-bold uppercase ${b.ruolo_turno === 'CE' ? 'text-emerald-400' : 'text-amber-400'}`}>{b.ruolo_turno === 'autista' ? 'Autista' : b.ruolo_turno}</span>
                          </div>
                          {b.is_partial && <span className="text-[10px] text-amber-400">{b.nota_parziale}</span>}
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="font-semibold text-slate-200">
                            {b.profiles?.nome && b.profiles?.cognome ? `${b.profiles.nome} ${b.profiles.cognome}` : (b.profiles?.username || 'Collega')}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5">Assegnato</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CONTENUTO TAB: GESTIONE EQUIPAGGI */}
          {activeTab === 'equipaggi' && (
            <div className="flex flex-col gap-5">
              <form onSubmit={handleAddCrewToShift} className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Assegna Secondo Equipaggio (Rinforzo)</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Consente di creare un secondo crew nello stesso giorno ed orario. Questo genererà una nuova coppia CE + Autista nel tabellone turni.
                </p>

                <div className="flex flex-col gap-3">
                  {/* Seleziona Giorno */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="crewDate" className="text-[10px] uppercase font-bold text-slate-500">Giorno del Turno</label>
                    <input
                      id="crewDate"
                      type="date"
                      value={crewDate}
                      onChange={(e) => setCrewDate(e.target.value)}
                      required
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
                    />
                  </div>

                  {/* Seleziona Fascia */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="crewShiftSelect" className="text-[10px] uppercase font-bold text-slate-500">Seleziona Fascia Oraria</label>
                    <select
                      id="crewShiftSelect"
                      value={crewShiftId}
                      onChange={(e) => setCrewShiftId(e.target.value)}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
                    >
                      <option value="1">Mattina (06:00–14:00)</option>
                      <option value="2">Pomeriggio (14:00–22:00)</option>
                      <option value="3">Notte (22:00–06:00)</option>
                    </select>
                  </div>

                  {/* Seleziona Equipaggio da Assegnare */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="crewSelect" className="text-[10px] uppercase font-bold text-slate-500">Seleziona Equipaggio (Es. Equipaggio 2)</label>
                    <select
                      id="crewSelect"
                      value={crewSelectedId}
                      onChange={(e) => setCrewSelectedId(e.target.value)}
                      disabled={crews.filter(c => c.id !== 1).length === 0}
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold disabled:opacity-50"
                    >
                      {crews.filter(c => c.id !== 1).length === 0 ? (
                        <option value="">Nessun altro equipaggio registrato</option>
                      ) : (
                        crews.filter(c => c.id !== 1).map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))
                      )}
                    </select>
                    {crews.filter(c => c.id !== 1).length === 0 && (
                      <span className="text-[9px] text-amber-500 font-semibold leading-normal">
                        ⚠️ Registra prima un secondo equipaggio (es. Equipaggio 2) nella sezione sottostante.
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={crews.filter(c => c.id !== 1).length === 0}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Aggiungi Equipaggio a Fascia
                </button>
              </form>

              {/* Sezione Creazione Equipaggio */}
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col gap-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Gestione Equipaggi Registrati</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Registra nuovi equipaggi per poterli assegnare come rinforzo, oppure rimuovi quelli non necessari.
                </p>

                {/* Form Creazione Equipaggio */}
                <form onSubmit={handleCreateCrew} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome equipaggio (es. Equipaggio 2)"
                    value={newCrewName}
                    onChange={(e) => setNewCrewName(e.target.value)}
                    required
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer whitespace-nowrap"
                  >
                    Crea
                  </button>
                </form>

                {/* Lista Equipaggi Registrati */}
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider px-0.5">Elenco Equipaggi</span>
                  {crews.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">Nessun equipaggio presente.</span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {crews.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl text-xs">
                          <span className="font-bold text-slate-200">{c.nome}</span>
                          {c.id !== 1 && ( // Impedisci di eliminare l'equipaggio principale (default)
                            <button
                              onClick={() => handleDeleteCrew(c.id)}
                              className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg cursor-pointer"
                              title="Elimina Equipaggio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CONTENUTO TAB: DIPENDENTI */}
          {activeTab === 'dipendenti' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {!selectedEmployee ? (
                /* LISTA UTENTI DIPENDENTI */
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Cerca dipendente..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>

                  {employees.filter(emp => {
                    const fullName = `${emp.nome || ''} ${emp.cognome || ''} ${emp.username || ''}`.toLowerCase()
                    return fullName.includes(empSearch.toLowerCase())
                  }).length === 0 ? (
                    <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-2xl text-center flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <span className="text-xs text-slate-400">Nessun dipendente trovato.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {employees.filter(emp => {
                        const fullName = `${emp.nome || ''} ${emp.cognome || ''} ${emp.username || ''}`.toLowerCase()
                        return fullName.includes(empSearch.toLowerCase())
                      }).map(emp => {
                        const unpaidCount = emp.shifts.filter(s => !s.pagato && s.end_time).length
                        return (
                          <button
                            key={emp.id}
                            onClick={() => {
                              setSelectedEmployee(emp)
                              const unpaidIds = emp.shifts.filter(s => !s.pagato && s.end_time).map(s => s.id)
                              setSelectedShiftIds(unpaidIds)
                            }}
                            className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-2xl text-left hover:border-indigo-500/40 active:scale-[0.98] transition-all flex items-center justify-between gap-4 cursor-pointer"
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200 truncate">
                                  {emp.nome && emp.cognome ? `${emp.nome} ${emp.cognome}` : emp.username}
                                </span>
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                  emp.stato === 'admin' 
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                  {emp.stato === 'admin' ? 'Admin' : 'Dipendente'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold mt-0.5">
                                <span>Paga: €{Number(emp.paga_oraria || 0).toFixed(2)}/h</span>
                                {unpaidCount > 0 ? (
                                  <span className="text-indigo-400">{unpaidCount} turni non pagati ({emp.unpaidHours}h)</span>
                                ) : (
                                  <span className="text-slate-500">Tutti i turni pagati</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Da Pagare</span>
                              <span className={`text-base font-black font-mono ${emp.pendingPay > 0 ? 'text-indigo-400' : 'text-slate-400'}`}>
                                €{emp.pendingPay}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* DETTAGLIO UTENTE SELEZIONATO */
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Indietro
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        selectedEmployee.stato === 'admin' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {selectedEmployee.stato === 'admin' ? 'Admin' : 'Dipendente'}
                      </span>
                    </div>
                  </div>

                  {/* Info Dipendente */}
                  <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-3xl flex flex-col gap-3">
                    <div className="flex flex-col">
                      <h3 className="text-base font-bold text-slate-100 leading-tight">
                        {selectedEmployee.nome} {selectedEmployee.cognome}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">Username: {selectedEmployee.username}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <div className="bg-slate-950/60 border border-slate-850 p-2.5 rounded-2xl flex flex-col gap-0.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tariffa Oraria</span>
                        <span className="text-sm font-extrabold text-slate-200">€{Number(selectedEmployee.paga_oraria || 0).toFixed(2)}/h</span>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-850 p-2.5 rounded-2xl flex flex-col gap-0.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Surplus / Credito</span>
                        <span className="text-sm font-extrabold text-emerald-400">€{Number(selectedEmployee.credito_surplus || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Riepilogo Calcolo Pagamento */}
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800/80 p-4.5 rounded-3xl flex flex-col gap-4 shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Totale da pagare (selezionato)</span>
                        <span className="text-2xl font-black font-mono text-indigo-400 truncate">€{Math.max(0, calculatedPayment).toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => setPaymentModalOpen(true)}
                        disabled={selectedShiftIds.length === 0}
                        className="px-4 py-2.5 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/15 transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer whitespace-nowrap flex-shrink-0"
                      >
                        Paga Rimanenti
                      </button>
                    </div>

                    {selectedEmployee.shifts.filter(s => !s.pagato && s.end_time).length > 0 && (
                      <div className="flex items-center justify-between border-t border-slate-800/50 pt-3 mt-1 text-[11px]">
                        <span className="text-slate-400">Selezionati {selectedShiftIds.length} turni</span>
                        <button
                          onClick={() => {
                            const unpaid = selectedEmployee.shifts.filter(s => !s.pagato && s.end_time).map(s => s.id)
                            if (selectedShiftIds.length === unpaid.length) {
                              setSelectedShiftIds([])
                            } else {
                              setSelectedShiftIds(unpaid)
                            }
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                        >
                          {selectedShiftIds.length === selectedEmployee.shifts.filter(s => !s.pagato && s.end_time).length 
                            ? 'Deseleziona tutti' 
                            : 'Seleziona tutti'
                          }
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lista Turni Timbrati del Dipendente */}
                  <div className="flex flex-col gap-2.5 mt-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider px-1">Tutti i turni</span>

                    {selectedEmployee.shifts.length === 0 ? (
                      <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-center text-xs text-slate-500">
                        Nessun turno timbrato registrato per questo dipendente.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {selectedEmployee.shifts.map(shift => {
                          const isCompleted = !!shift.end_time
                          const isPagato = shift.pagato
                          const durationHrs = isCompleted 
                            ? (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60)
                            : 0
                          const importoShift = durationHrs * Number(shift.paga_oraria_storica || 0)
                          const isChecked = selectedShiftIds.includes(shift.id)

                          const formatShiftDateLocal = (dateStr) => {
                            try {
                              return format(parseISO(dateStr), 'eeee dd MMMM yyyy', { locale: it })
                            } catch (e) {
                              return dateStr
                            }
                          }

                          const formatShiftTimeLocal = (dateStr) => {
                            try {
                              return format(parseISO(dateStr), 'HH:mm')
                            } catch (e) {
                              return ''
                            }
                          }

                          return (
                            <div
                              key={shift.id}
                              className={`bg-slate-900 border transition-all p-3 rounded-2xl flex flex-col gap-2.5 ${
                                isPagato 
                                  ? 'opacity-55 border-slate-900/80' 
                                  : 'border-slate-800/80 hover:border-slate-700/60'
                              }`}
                            >
                              {/* Header Turno */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  {!isPagato && isCompleted && (
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setSelectedShiftIds(prev => prev.filter(id => id !== shift.id))
                                        } else {
                                          setSelectedShiftIds(prev => [...prev, shift.id])
                                        }
                                      }}
                                      className="mt-1 flex-shrink-0 w-4.5 h-4.5 bg-slate-950 border border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 rounded cursor-pointer"
                                    />
                                  )}
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-bold text-slate-200 truncate capitalize">
                                      {formatShiftDateLocal(shift.start_time)}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                      {formatShiftTimeLocal(shift.start_time)}
                                      {isCompleted ? ` - ${formatShiftTimeLocal(shift.end_time)}` : ' (In corso)'}
                                    </span>
                                  </div>
                                </div>

                                {isPagato ? (
                                  <span className="text-[8px] px-2 py-0.5 rounded font-extrabold uppercase bg-slate-800 text-slate-500 border border-slate-700/30">
                                    Pagato
                                  </span>
                                ) : (
                                  <span className="text-[8px] px-2 py-0.5 rounded font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    Da Pagare
                                  </span>
                                )}
                              </div>

                              {/* Dati Ore & Costo */}
                              <div className="flex justify-between border-t border-slate-850 pt-2 text-[10px] font-semibold">
                                <span className="text-slate-500 font-mono">
                                  {isCompleted ? `${durationHrs.toFixed(2)} ore (${Number(shift.paga_oraria_storica).toFixed(2)}/h)` : 'In corso'}
                                </span>
                                <span className="text-slate-300 font-mono">
                                  {isCompleted ? `€${importoShift.toFixed(2)}` : '-'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal di Conferma Pagamento */}
      {paymentModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-scale-in">
            <div className="flex flex-col gap-1 text-center">
              <h4 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">Conferma Pagamento</h4>
              <p className="text-[10px] text-slate-400">
                Stai registrando un pagamento per <b>{selectedEmployee.nome} {selectedEmployee.cognome}</b>
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-2xl flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Turni Selezionati:</span>
                <span className="text-slate-200">
                  {selectedShiftIds.length} turni ({selectedEmployee.shifts
                    .filter(s => selectedShiftIds.includes(s.id))
                    .reduce((acc, s) => acc + (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60), 0)
                    .toFixed(2)} ore)
                </span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Costo Turni:</span>
                <span className="text-slate-200">
                  €{selectedEmployee.shifts
                    .filter(s => selectedShiftIds.includes(s.id))
                    .reduce((acc, s) => acc + ((new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)) * Number(s.paga_oraria_storica || selectedEmployee.paga_oraria || 0), 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Surplus Precedente:</span>
                <span className="text-slate-200">€{Number(selectedEmployee.credito_surplus || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800/80 my-1"></div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-indigo-400">Da Pagare (Calcolato):</span>
                <span className="text-indigo-400 font-mono">€{Math.max(0, calculatedPayment).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmAmount" className="text-[10px] uppercase font-bold text-slate-400">Importo Effettivamente Pagato (€)</label>
              <input
                id="confirmAmount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-200 outline-none text-center font-mono"
              />
              <p className="text-[9px] text-slate-500 leading-normal text-center mt-1">
                {calculatedPayment < 0 ? (
                  Number(paymentAmount) > 0 ? (
                    <span className="text-emerald-400 font-semibold">
                      Il costo di €{selectedEmployee.shifts
                        .filter(s => selectedShiftIds.includes(s.id))
                        .reduce((acc, s) => acc + ((new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)) * Number(s.paga_oraria_storica || selectedEmployee.paga_oraria || 0), 0)
                        .toFixed(2)} è interamente coperto dal surplus. Pagando €{Number(paymentAmount).toFixed(2)} cash, il nuovo surplus diventerà €{(Number(selectedEmployee.credito_surplus) + Number(paymentAmount) - selectedEmployee.shifts.filter(s => selectedShiftIds.includes(s.id)).reduce((acc, s) => acc + ((new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)) * Number(s.paga_oraria_storica || selectedEmployee.paga_oraria || 0), 0)).toFixed(2)}.
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">
                      Il costo di €{selectedEmployee.shifts
                        .filter(s => selectedShiftIds.includes(s.id))
                        .reduce((acc, s) => acc + ((new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)) * Number(s.paga_oraria_storica || selectedEmployee.paga_oraria || 0), 0)
                        .toFixed(2)} verrà interamente coperto dal surplus. Residueranno €{Math.abs(calculatedPayment).toFixed(2)} di credito.
                    </span>
                  )
                ) : Number(paymentAmount) > calculatedPayment ? (
                  <span className="text-emerald-400 font-semibold">
                    Stai pagando un surplus di €{(Number(paymentAmount) - calculatedPayment).toFixed(2)} che verrà registrato come credito.
                  </span>
                ) : Number(paymentAmount) < calculatedPayment ? (
                  <span className="text-amber-400 font-semibold">
                    Rimarrà un debito residuo di €{(calculatedPayment - Number(paymentAmount)).toFixed(2)} da saldare in futuro.
                  </span>
                ) : (
                  <span>Pagamento esatto. Il saldo surplus rimarrà invariato.</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/60"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={empLoading}
                className="py-2.5 bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {empLoading ? 'Connessione...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
