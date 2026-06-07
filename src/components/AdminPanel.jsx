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
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('dipendente')
  const [userActionError, setUserActionError] = useState(null)
  const [userActionSuccess, setUserActionSuccess] = useState(null)

  // Stati Reset Password Modal
  const [resetPassUser, setResetPassUser] = useState(null) // profile object
  const [resetPasswordVal, setResetPasswordVal] = useState('')

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

    if (!newUsername || !newPassword) {
      setUserActionError('Inserisci tutti i campi richiesti.')
      return
    }

    try {
      const cleanName = newUsername.trim().toLowerCase()
      const { error } = await api.adminCreateUser(cleanName, newPassword, newRole)
      if (error) {
        setUserActionError(error.message || 'Errore durante la creazione.')
      } else {
        setUserActionSuccess(`Utente '${cleanName}' creato con successo!`)
        setNewUsername('')
        setNewPassword('')
        setNewRole('dipendente')
        await loadData()
      }
    } catch (err) {
      setUserActionError(err.message)
    }
  }

  // Abilita/Disabilita Account
  const handleToggleUserStatus = async (userProfile) => {
    const newStatus = !userProfile.attivo
    try {
      const { error } = await api.adminUpdateProfile(userProfile.id, { attivo: newStatus })
      if (error) {
        alert(error.message)
      } else {
        await loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Cambio Ruolo
  const handleChangeRole = async (userId, newRuolo) => {
    try {
      const { error } = await api.adminUpdateProfile(userId, { ruolo: newRuolo })
      if (error) {
        alert(error.message)
      } else {
        await loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Modifica Password Utente
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!resetPasswordVal) return

    try {
      const { error } = await api.adminSetPassword(resetPassUser.id, resetPasswordVal)
      if (error) {
        alert(error.message || 'Errore nel cambio password.')
      } else {
        alert(`Password di ${resetPassUser.username} aggiornata con successo.`)
        setResetPassUser(null)
        setResetPasswordVal('')
      }
    } catch (err) {
      console.error(err)
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
          <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">Area Amministrazione</span>
        </div>
      </div>

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
          {/* Form Creazione Utente */}
          <form onSubmit={handleCreateUser} className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Crea Nuovo Account</h3>
            
            {userActionError && <span className="text-xs text-rose-400 font-semibold">{userActionError}</span>}
            {userActionSuccess && <span className="text-xs text-emerald-400 font-semibold">{userActionSuccess}</span>}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Username (es. mrossi)"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
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
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-semibold"
                >
                  <option value="dipendente">Dipendente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
            >
              Crea Account
            </button>
          </form>

          {/* Lista Utenti */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Membri del Roster ({profiles.length})</h3>
            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {profiles.map(prof => (
                <div
                  key={prof.id}
                  className={`p-3.5 rounded-2xl border flex flex-col gap-3 transition-colors ${
                    prof.attivo ? 'border-slate-800 bg-slate-900/20' : 'border-slate-800 bg-slate-950/60 opacity-60'
                  }`}
                >
                  {/* Nome utente [ruolo] - Ben visibile */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-100 break-all">{prof.username}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          prof.ruolo === 'admin' 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700/30'
                        }`}>
                          {prof.ruolo}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">{prof.username.toLowerCase()}@app.internal</span>
                    </div>
                  </div>

                  {/* Pulsanti vari - A capo */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-slate-800/40 justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Pulsante Reset Password */}
                      <button
                        onClick={() => setResetPassUser(prof)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-indigo-400 rounded-xl hover:border-indigo-500/20 transition-all text-[11px] font-semibold flex-1"
                        title="Reimposta Password"
                      >
                        <Key className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Password</span>
                      </button>

                      {/* Toggle Ruolo */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={prof.ruolo}
                          onChange={(e) => handleChangeRole(prof.id, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-bold px-2 py-2 rounded-xl outline-none cursor-pointer"
                        >
                          <option value="dipendente">Dipendente</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>

                    {/* Toggle Attivo/Inattivo */}
                    <button
                      onClick={() => handleToggleUserStatus(prof)}
                      className="p-1 rounded-xl hover:bg-slate-800/20 transition-colors flex-shrink-0"
                      title={prof.attivo ? 'Disattiva Account' : 'Attiva Account'}
                    >
                      {prof.attivo ? (
                        <ToggleRight className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-600" />
                      )}
                    </button>
                  </div>
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
                        <span className="font-bold text-indigo-400 uppercase">{b.ruolo_turno}</span>
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

      {/* RESET PASSWORD MODAL (SUB-POPUP) */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleResetPassword} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-xs flex flex-col gap-4 shadow-premium">
            <h3 className="text-base font-bold text-slate-100">Aggiorna Password</h3>
            <p className="text-xs text-slate-400">
              Imposta una nuova password per l'utente <strong>{resetPassUser.username}</strong>:
            </p>
            <input
              type="text"
              placeholder="Nuova password..."
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none font-mono"
              required
              minLength={6}
            />
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setResetPassUser(null)
                  setResetPasswordVal('')
                }}
                className="flex-1 py-2 px-3 border border-slate-700 bg-slate-800/30 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors"
              >
                Salva
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
