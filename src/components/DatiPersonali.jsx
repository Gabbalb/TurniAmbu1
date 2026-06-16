import React, { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { User, Key, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'

export default function DatiPersonali() {
  const { profile, deviceUniqueId } = useAuth()
  const [newPasswordVal, setNewPasswordVal] = useState('')
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('')
  const [changePassLoading, setChangePassLoading] = useState(false)
  const [changePassError, setChangePassError] = useState(null)
  const [changePassSuccess, setChangePassSuccess] = useState(null)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setChangePassError(null)
    setChangePassSuccess(null)

    if (newPasswordVal.length < 6) {
      setChangePassError('La password deve contenere almeno 6 caratteri.')
      return
    }

    if (newPasswordVal !== confirmPasswordVal) {
      setChangePassError('Le password inserite non coincidono.')
      return
    }

    setChangePassLoading(true)
    try {
      const { error } = await api.updateOwnPassword(newPasswordVal)
      if (error) {
        setChangePassError(error.message || 'Errore durante l\'aggiornamento.')
      } else {
        setChangePassSuccess('Password aggiornata con successo!')
        setNewPasswordVal('')
        setConfirmPasswordVal('')
      }
    } catch (err) {
      setChangePassError(err.message || 'Errore imprevisto.')
    } finally {
      setChangePassLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in text-left">
      {/* Header Sezione */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Dati Personali</h2>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Profilo utente e sicurezza</span>
          </div>
        </div>
      </div>

      {/* Info Profilo Card */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-3xl shadow-premium flex flex-col gap-4">
        <div className="border-b border-slate-800/50 pb-3 flex flex-col gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base font-black text-slate-100">
              {profile?.nome && profile?.cognome ? `${profile.nome} ${profile.cognome}` : profile?.username || 'Soccorritore'}
            </span>
            
            {/* Badge Stato */}
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
              profile?.stato === 'admin'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : profile?.stato === 'volontario'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {profile?.stato || profile?.ruolo || 'Dipendente'}
            </span>

            {/* Badge Qualifica */}
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
              profile?.qualifica === 'autista'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700/60'
            }`}>
              {profile?.qualifica === 'autista' ? 'Autista' : 'Capo Equipaggio (CE)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Nome Utente</span>
            <span className="text-sm font-semibold text-slate-300 font-mono">{profile?.username || 'N/D'}</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Stato Account</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${profile?.attivo !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className={`text-sm font-bold ${profile?.attivo !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                {profile?.attivo !== false ? 'Attivo' : 'Disabilitato'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">ID Dispositivo</span>
            <span className="text-sm font-semibold text-slate-300 font-mono">
              {deviceUniqueId || 'N/D'}
            </span>
          </div>

          {profile?.codice_fiscale && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Codice Fiscale</span>
              <span className="text-sm font-semibold text-slate-300 uppercase">{profile.codice_fiscale}</span>
            </div>
          )}

          {profile?.email && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Email di Contatto</span>
              <span className="text-sm font-semibold text-slate-300 break-all">{profile.email}</span>
            </div>
          )}

          {profile?.telefono && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Telefono</span>
              <span className="text-sm font-semibold text-slate-300">{profile.telefono}</span>
            </div>
          )}

          {profile?.data_nascita && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Data di Nascita</span>
              <span className="text-sm font-semibold text-slate-300">
                {new Date(profile.data_nascita).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          )}


        </div>
      </div>

      {/* Password Change Card */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-3xl shadow-premium flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/50 pb-2 flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" /> Sicurezza Account
        </h3>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Per motivi di sicurezza, ti consigliamo di aggiornare periodicamente la tua password. La nuova password deve essere lunga almeno 6 caratteri.
          </p>

          {changePassError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="font-semibold">{changePassError}</span>
            </div>
          )}

          {changePassSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-2xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-bold">{changePassSuccess}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="text-[10px] uppercase font-bold text-slate-500">Nuova Password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Inserisci nuova password"
              value={newPasswordVal}
              onChange={(e) => setNewPasswordVal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-3 text-sm text-slate-200 outline-none transition-colors"
              required
              disabled={changePassLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-[10px] uppercase font-bold text-slate-500">Conferma Nuova Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Conferma nuova password"
              value={confirmPasswordVal}
              onChange={(e) => setConfirmPasswordVal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-3 text-sm text-slate-200 outline-none transition-colors"
              required
              disabled={changePassLoading}
            />
          </div>

          <button
            type="submit"
            disabled={changePassLoading || newPasswordVal.length === 0 || confirmPasswordVal.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {changePassLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Key className="w-4 h-4" />
                Aggiorna Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
