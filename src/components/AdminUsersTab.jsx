import React, { useState } from 'react'
import { api } from '../lib/api'
import {
  Search,
  Filter,
  PlusCircle,
  Pencil,
  Trash2
} from 'lucide-react'

export default function AdminUsersTab({ profiles, onRefresh }) {
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [filterUserRole, setFilterUserRole] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [userActionError, setUserActionError] = useState(null)

  // Creazione Nuovo Utente Form States
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newNome, setNewNome] = useState('')
  const [newCognome, setNewCognome] = useState('')
  const [newStato, setNewStato] = useState('volontario')
  const [newQualifica, setNewQualifica] = useState('CE')
  const [newCodiceFiscale, setNewCodiceFiscale] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newDataNascita, setNewDataNascita] = useState('')
  const [newPagaOraria, setNewPagaOraria] = useState('')

  // Modifica Profilo Form States
  const [editNome, setEditNome] = useState('')
  const [editCognome, setEditCognome] = useState('')
  const [editStato, setEditStato] = useState('volontario')
  const [editQualifica, setEditQualifica] = useState('CE')
  const [editCodiceFiscale, setEditCodiceFiscale] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editDataNascita, setEditDataNascita] = useState('')
  const [editPagaOraria, setEditPagaOraria] = useState('')
  const [editAttivo, setEditAttivo] = useState(true)
  const [editPassword, setEditPassword] = useState('')

  // Filtra profili
  const filteredProfiles = profiles.filter(p => {
    const nameMatch = `${p.nome} ${p.cognome} ${p.username}`.toLowerCase().includes(searchUserQuery.toLowerCase())
    const roleMatch = filterUserRole === 'all' || p.stato === filterUserRole
    return nameMatch && roleMatch
  })

  // Creazione Nuovo Utente
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault()
    setUserActionError(null)

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
        alert(`Utente "${newUsername}" creato con successo!`)
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
        onRefresh()
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
    setShowCreateForm(false)
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
      onRefresh()
    } catch (err) {
      alert(err.message)
    }
  }

  // Elimina Utente
  const handleDeleteUser = async (profile) => {
    const confirmDelete = window.confirm(`Sei sicuro di voler eliminare definitivamente l'utente ${profile.username}? Questa azione cancellerà tutte le sue prenotazioni.`)
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
        onRefresh()
      }
    } catch (err) {
      alert(err.message)
    }
  }

  return (
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

          <div className="flex items-center gap-3 font-sans">
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
              onClick={() => {
                setShowCreateForm(true)
                setEditingProfile(null)
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nuovo Utente</span>
            </button>
          </div>
        </div>

        {/* Profiles Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
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

            <form onSubmit={handleCreateUserSubmit} className="flex flex-col gap-3.5 text-left font-sans">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Username *</label>
                <input
                  type="text"
                  placeholder="es. mrossi"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stato Roster *</label>
                  <select
                    value={newStato}
                    onChange={(e) => setNewStato(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data di Nascita</label>
                  <input
                    type="date"
                    value={newDataNascita}
                    onChange={(e) => setNewDataNascita(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none"
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
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 mt-2 cursor-pointer font-sans"
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
                <span>Modifica: {editingProfile.username}</span>
              </h3>
              <button 
                onClick={() => setEditingProfile(null)}
                className="text-slate-500 hover:text-slate-300 text-xs font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                Chiudi
              </button>
            </div>

            <form onSubmit={handleUpdateProfileSubmit} className="flex flex-col gap-3.5 text-left font-sans font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nome *</label>
                  <input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cognome *</label>
                  <input
                    type="text"
                    value={editCognome}
                    onChange={(e) => setEditCognome(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                <label htmlFor="editAttivo" className="text-xs font-bold text-slate-300 cursor-pointer">Profilo Attivo (Consente l'accesso)</label>
              </div>

              <div className="flex flex-col gap-1 border-t border-slate-800/80 pt-3 mt-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aggiorna Password (Opzionale)</label>
                <input
                  type="password"
                  placeholder="Lascia vuoto per non cambiarla"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Codice Fiscale</label>
                  <input
                    type="text"
                    value={editCodiceFiscale}
                    onChange={(e) => setEditCodiceFiscale(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
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
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 mt-2 cursor-pointer font-sans"
              >
                Salva Profilo
              </button>
            </form>
          </div>
        ) : (
          // Welcome side panel
          <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl shadow-xl text-center py-20 flex flex-col items-center gap-3 font-sans">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-lg animate-pulse-subtle">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-300">Gestisci Utenti Roster</span>
            <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
              Seleziona un utente dalla tabella per modificarlo, disattivarlo, cambiargli la password o cancellarlo.
            </p>
            <button
              onClick={() => {
                setShowCreateForm(true)
                setEditingProfile(null)
              }}
              className="bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-600/25 transition-all mt-2 cursor-pointer font-sans"
            >
              Aggiungi Nuovo
            </button>
          </div>
        )}

      </div>

    </div>
  )
}
