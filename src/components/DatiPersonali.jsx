import React, { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { User, Key, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'

export default function DatiPersonali() {
  const { profile } = useAuth()
  const [newPasswordVal, setNewPasswordVal] = useState('')
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

    setChangePassLoading(true)
    try {
      const { error } = await api.updateOwnPassword(newPasswordVal)
      if (error) {
        setChangePassError(error.message || 'Errore durante l\'aggiornamento.')
      } else {
        setChangePassSuccess('Password aggiornata con successo!')
        setNewPasswordVal('')
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
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/50 pb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" /> Dettagli Account
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Username</span>
            <span className="text-base font-bold text-slate-200">{profile?.username || 'N/D'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Stato Account</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-bold text-emerald-400">Attivo</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[10px] uppercase font-bold text-slate-500">Ruolo Operativo</span>
            <span className="text-base font-bold text-slate-200 capitalize">{profile?.ruolo || 'Operatore'}</span>
          </div>
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

          <button
            type="submit"
            disabled={changePassLoading || newPasswordVal.length === 0}
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
