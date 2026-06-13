import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Users, History, ShieldAlert, Key, Plus, ToggleLeft, ToggleRight, Trash2, Edit2, Search, Filter } from 'lucide-react'

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

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: profs } = await api.fetchProfiles()
      setProfiles(profs || [])

      const { data: crws } = await api.fetchCrews()
      setCrews(crws || [])
      if (crws && crws.length > 0 && !crewSelectedId) {
        setCrewSelectedId(String(crws[0].id))
      }

      const { data: pasts } = await api.fetchPastBookings()
      setPastBookings(pasts || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('utenti')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'utenti' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Utenti
            </button>
            <button
              onClick={() => setActiveTab('storico')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'storico' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Storico
            </button>
            <button
              onClick={() => setActiveTab('equipaggi')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'equipaggi' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Equipaggi
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
                          <span className="font-semibold text-slate-200">{b.profiles?.username || 'Collega'}</span>
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
            <div className="flex flex-col gap-4">
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
                      className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
                    >
                      {crews.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
                >
                  Aggiungi Equipaggio a Fascia
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
