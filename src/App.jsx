import React, { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import TurniBoard from './components/TurniBoard'
import IMieiTurni from './components/IMieiTurni'
import AdminPanel from './components/AdminPanel'
import AdminDesktop from './components/AdminDesktop'
import DatiPersonali from './components/DatiPersonali'
import DisponibilitaModal from './components/DisponibilitaModal'
import TimbraTurno from './components/TimbraTurno'
import StoricoOre from './components/StoricoOre'
import { ShieldCheck, ShieldAlert, RefreshCw, Key, User, Truck } from 'lucide-react'
import TransportDrawer from './components/TransportDrawer'
import { api } from './lib/api'

function AppContent() {
  const { user, profile, loading, login, logout, error: authError } = useAuth()
  const [view, setView] = useState('my-shifts') // 'board' | 'my-shifts' | 'admin'
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  const [activeTransport, setActiveTransport] = useState(null)
  const [isTransportDrawerOpen, setIsTransportDrawerOpen] = useState(false)
  const [isConfirmingStart, setIsConfirmingStart] = useState(false)
  const [startLoading, setStartLoading] = useState(false)

  const refreshActiveTransport = async () => {
    if (!profile?.id) return
    try {
      const { data } = await api.fetchActiveTransport(profile.id)
      setActiveTransport(data || null)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (profile?.id) {
      refreshActiveTransport()
    } else {
      setActiveTransport(null)
    }
  }, [profile?.id])

  const handleStartNewTransport = async () => {
    if (!profile?.id) return
    setStartLoading(true)
    try {
      const { data, error } = await api.createTransport(profile.id)
      if (error) throw error
      setActiveTransport(data)
      setIsConfirmingStart(false)
      setIsTransportDrawerOpen(true)
    } catch (err) {
      console.error('Error starting transport:', err)
    } finally {
      setStartLoading(false)
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateTo = (path) => {
    window.history.pushState(null, '', path)
    setCurrentPath(path)
  }
  const [selectedBoardDate, setSelectedBoardDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedBoardSlot, setSelectedBoardSlot] = useState(null)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [boardRefreshKey, setBoardRefreshKey] = useState(0)

  // Login form state
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
      setView('my-shifts')
    }
  }

  // Se l'applicazione sta caricando lo stato iniziale della sessione
  if (loading) {
    const isDesktop = currentPath.startsWith('/admin')
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 ${isDesktop ? 'w-full' : 'max-w-md mx-auto shadow-2xl border-x border-slate-800/50'}`}>
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <span className="text-sm italic font-semibold text-slate-400">Verifica sessione in corso...</span>
      </div>
    )
  }

  // Schermata di Login Desktop se si è su /admin e l'utente non è autenticato
  if (currentPath.startsWith('/admin') && !user) {
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-700 font-sans"
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-700 font-sans"
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

  // Schermata di Login Mobile se l'utente non è autenticato
  if (!user) {
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

  // Renderizza l'interfaccia PC Desktop per gli amministratori se si è su /admin
  if (currentPath.startsWith('/admin')) {
    if (profile?.ruolo === 'admin') {
      return (
        <AdminDesktop
          adminProfile={profile}
          onBackToMobile={() => navigateTo('/')}
          onLogout={logout}
        />
      )
    } else {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-6 text-center gap-4 w-full font-sans">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Accesso PC Admin Negato</h2>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Questa area amministrativa da PC è riservata esclusivamente agli amministratori autorizzati del sistema.
          </p>
          <button
            onClick={() => navigateTo('/')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-750 cursor-pointer shadow"
          >
            Vai all'App Mobile Soccorritori
          </button>
        </div>
      )
    }
  }

  // Schermata principale per gli utenti autenticati (Mobile layout)
  return (
    <Layout
      currentView={view}
      setView={setView}
      onOpenBulkModal={() => setIsBulkOpen(true)}
      onNavigateToAdmin={() => navigateTo('/admin')}
      activeTransport={activeTransport}
      isDrawerOpen={isTransportDrawerOpen}
      onExpandDrawer={() => setIsTransportDrawerOpen(true)}
    >
      {view === 'board' && (
        <TurniBoard
          key={boardRefreshKey}
          initialDate={selectedBoardDate}
          initialSlot={selectedBoardSlot}
          onDateChange={setSelectedBoardDate}
          onClearSlotHighlight={() => setSelectedBoardSlot(null)}
        />
      )}
      {view === 'my-shifts' && (
        <IMieiTurni
          onJumpToShift={(date, slotId) => {
            setSelectedBoardDate(date)
            setSelectedBoardSlot(slotId)
            setView('board')
          }}
          setView={setView}
        />
      )}
      {view === 'profile' && (
        <DatiPersonali />
      )}
      {view === 'clock-shift' && (
        <TimbraTurno />
      )}
      {view === 'hours-history' && (
        <StoricoOre />
      )}
      {view === 'transport' && (
        <div className="flex flex-col gap-6 animate-fade-in pb-6 text-left">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-400" />
              Servizio Trasporti
            </h2>
            <p className="text-xs text-slate-400 font-sans">Gestisci i trasporti sanitari e assistenziali</p>
          </div>
          
          {!activeTransport ? (
            <div className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl flex flex-col items-center gap-6 shadow-lg text-center mt-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <Truck className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-100 font-sans">Nessun trasporto attivo</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-sans">
                  Non hai schede di trasporto attive al momento. Per iniziare a compilarne una nuova, premi il pulsante sottostante.
                </p>
              </div>
              
              <button
                onClick={() => setIsConfirmingStart(true)}
                className="w-full py-4 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base font-sans"
              >
                INIZIA NUOVO TRASPORTO
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl flex flex-col gap-4 shadow-lg text-center mt-4 animate-fade-in">
              <div className="flex items-center justify-center w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl mx-auto">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100 font-sans">Scheda di trasporto attiva</h3>
                <p className="text-xs text-slate-400 font-sans">
                  Hai un trasporto in corso (Scheda #{activeTransport.id}). Clicca qui sotto per riaprire e completare la compilazione.
                </p>
              </div>
              
              <button
                onClick={() => setIsTransportDrawerOpen(true)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
              >
                Apri Scheda
              </button>
            </div>
          )}

          {isConfirmingStart && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in text-center">
              <div className="bg-slate-900/90 border border-slate-800/80 p-6 rounded-3xl w-full max-w-sm space-y-5 shadow-2xl relative overflow-hidden animate-slide-up">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-100 font-sans">Nuovo Trasporto</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-sans">
                      Confermi di voler attivare una nuova scheda di trasporto?
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setIsConfirmingStart(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleStartNewTransport}
                    disabled={startLoading}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 font-sans flex items-center justify-center gap-1.5"
                  >
                    {startLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Creazione...
                      </>
                    ) : (
                      'Sì, Attiva'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {view.startsWith('admin') && (
        profile?.ruolo === 'admin' ? (
          <AdminPanel activeTab={view === 'admin' ? 'utenti' : view.replace('admin-', '')} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 animate-fade-in">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-2">Accesso Negato</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Questa sezione è riservata esclusivamente agli amministratori del sistema. Contatta un responsabile per richiedere i permessi.
            </p>
          </div>
        )
      )}

      {/* Modal Disponibilità Bulk */}
      <DisponibilitaModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={() => {
          setBoardRefreshKey(prev => prev + 1)
        }}
      />
      <TransportDrawer
        activeTransport={activeTransport}
        setActiveTransport={setActiveTransport}
        isOpen={isTransportDrawerOpen}
        onClose={() => setIsTransportDrawerOpen(false)}
        onRefresh={refreshActiveTransport}
        profile={profile}
      />
    </Layout>
  )
}

export default function App() {
  return (
    <AppContent />
  )
}
