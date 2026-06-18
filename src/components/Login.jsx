import { useState } from 'react'
import { RefreshCw, User, Key } from 'lucide-react'

export default function Login({
  isDesktop,
  login,
  authError,
  onSuccess,
  navigateTo
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) return

    setLoginLoading(true)
    const res = await login(username, password)
    setLoginLoading(false)

    if (res?.success) {
      onSuccess()
    }
  }

  // 1. Desktop Admin Login Screen
  if (isDesktop) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans w-full">
        {/* Left side: branding/visuals */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-900 border-r border-slate-800 p-12 flex-col justify-between relative overflow-hidden">
          {/* Decorative glow elements */}
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 z-10">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-0.5 shadow border border-slate-700">
              <img src="/logo.png" alt="GM Turni Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                GM Turni
              </h1>
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1 block">Gestione Turni Soccorso</span>
            </div>
          </div>

          <div className="max-w-md z-10 text-left">
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
              Pannello Amministrativo
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Accedi con il tuo account amministratore per gestire turni, coperture, dipendenti, compensi orari e per pubblicare annunci direttamente sul gruppo Telegram.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-medium z-10 text-left">
            © 2026 GM Turni. Tutti i diritti riservati.
          </div>
        </div>

        {/* Right side: login card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950 relative overflow-hidden">
          {/* Glow ambient background effects for small screens */}
          <div className="lg:hidden absolute top-1/4 left-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-full max-w-md flex flex-col gap-8 z-10">
            <div className="flex flex-col gap-2 text-center lg:text-left">
              <div className="lg:hidden w-16 h-16 bg-white rounded-full flex items-center justify-center p-0.5 shadow border border-slate-700 mx-auto mb-4">
                <img src="/logo.png" alt="GM Turni Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100 tracking-tight">Accedi all'area PC Admin</h3>
              <p className="text-xs text-slate-500">Usa le tue credenziali di amministratore</p>
            </div>

            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-xs font-semibold text-center leading-normal">
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl flex flex-col gap-5 shadow-2xl backdrop-blur-md text-left">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="adminUsername" className="text-xs font-semibold text-slate-400">Username Amministratore</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    id="adminUsername"
                    type="text"
                    placeholder="es. admin.system"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-750 font-sans"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="adminPassword" className="text-xs font-semibold text-slate-400">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    id="adminPassword"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-750 font-sans"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/15 transition-all duration-200 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connessione in corso...</span>
                  </>
                ) : (
                  'Accedi al Pannello PC'
                )}
              </button>
            </form>

            <button
              onClick={() => navigateTo('/')}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-center lg:text-left font-sans"
            >
              ← Torna all'App Mobile
            </button>

            {/* Demo Notice */}
            {import.meta.env.VITE_SUPABASE_URL?.includes('your-project-id') && (
              <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-2xl flex flex-col gap-1 text-center font-mono text-[10px] text-slate-500">
                <span className="font-bold text-slate-400">✨ MODALITÀ DEMO</span>
                <span>Credenziali di prova Admin:</span>
                <div className="flex justify-center mt-1 text-indigo-400/90 font-bold">
                  <span>admin.system / admin12345</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 2. Mobile Login Screen
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-6 py-12 max-w-md mx-auto shadow-2xl border-x border-slate-900 relative overflow-hidden">
      {/* Glow ambient background effects */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full flex flex-col gap-8 z-10">
        {/* Logo e Titolo */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/10 p-1 border border-slate-700/30">
            <img 
              src="/logo.png" 
              alt="GM Turni Logo" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              GM Turni
            </h2>
            <span className="text-xs text-slate-400 font-semibold tracking-widest uppercase mt-1 block">
              Gestione Turni Soccorso
            </span>
          </div>
        </div>

        {/* Form Box */}
        <form
          onSubmit={handleLoginSubmit}
          className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl flex flex-col gap-5 shadow-2xl backdrop-blur-md text-left"
        >
          <div className="flex flex-col gap-1.5 text-center mb-1">
            <h3 className="text-base font-bold text-slate-100">Accedi al Roster</h3>
            <p className="text-xs text-slate-500">Usa le tue credenziali fornite dall'amministratore</p>
          </div>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-center leading-normal">
              {authError}
            </div>
          )}

          {/* Input Username */}
          <div className="flex flex-col gap-1.5 relative">
            <label htmlFor="loginUsername" className="text-xs font-semibold text-slate-400">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="loginUsername"
                type="text"
                placeholder="es. mrossi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-600 font-sans"
                required
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="flex flex-col gap-1.5 relative">
            <label htmlFor="loginPassword" className="text-xs font-semibold text-slate-400">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="loginPassword"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-600 font-sans"
                required
              />
            </div>
          </div>

          {/* Pulsante Entra */}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3.5 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/15 transition-all duration-200 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loginLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connessione...
              </>
            ) : (
              'Accedi'
            )}
          </button>
        </form>

        {/* Footer Demo Label */}
        {import.meta.env.VITE_SUPABASE_URL?.includes('your-project-id') && (
          <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-2xl flex flex-col gap-1 text-center font-mono text-[10px] text-slate-500">
            <span className="font-bold text-slate-400">✨ MODALITÀ DEMO RILEVATA</span>
            <span>Credenziali predefinite per provare l'app:</span>
            <div className="flex justify-center gap-3 mt-1 text-indigo-400/90 font-bold">
              <span>admin.system / admin12345</span>
              <span>mario.rossi / password</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
