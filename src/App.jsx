import { useState, useEffect } from 'react'
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
import { ShieldAlert, RefreshCw, Check } from 'lucide-react'
import TransportDrawer from './components/TransportDrawer'
import TransportTab from './components/TransportTab'
import Login from './components/Login'
import { api } from './lib/api'

function AppContent() {
  const { user, profile, loading, login, logout, error: authError } = useAuth()
  const [view, setView] = useState('my-shifts') // 'board' | 'my-shifts' | 'admin'
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  const [activeTransport, setActiveTransport] = useState(null)
  const [isTransportDrawerOpen, setIsTransportDrawerOpen] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [viewOnlyTransport, setViewOnlyTransport] = useState(null)

  const [activeShift, setActiveShift] = useState(null)
  const [activeShiftLoading, setActiveShiftLoading] = useState(false)

  const refreshActiveTransport = async () => {
    if (!profile?.id) return
    try {
      const { data } = await api.fetchActiveTransport(profile.id)
      setActiveTransport(data || null)
    } catch (e) {
      console.error(e)
    }
  }

  const checkActiveShift = async () => {
    if (!profile?.id) return
    setActiveShiftLoading(true)
    try {
      const { data, error } = await api.fetchActiveShift(profile.id)
      if (!error) {
        setActiveShift(data || null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setActiveShiftLoading(false)
    }
  }

  // Gestione Notifica Lockscreen / Promemoria quando lo schermo si spegne o la tab si nasconde
  useEffect(() => {
    if (!('Notification' in window)) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const hasActiveShift = !!activeShift
        const hasActiveTransport = !!activeTransport

        if ((hasActiveShift || hasActiveTransport) && Notification.permission === 'granted') {
          let title = ""
          let body = ""

          if (hasActiveTransport) {
            title = "🔵 Trasporto in Corso"
            body = "Hai una scheda attiva. Ricordati di completarla e chiuderla!"
          } else if (hasActiveShift) {
            title = "🟢 Turno Attivo"
            body = "Ricordati di terminarlo prima di andare via!"
          }

          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification(title, {
                body: body,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'active-session-reminder',
                requireInteraction: true
              });
            });
          } else {
            new Notification(title, {
              body: body,
              icon: '/logo.png',
              tag: 'active-session-reminder',
              requireInteraction: true
            });
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeShift, activeTransport])

  useEffect(() => {
    if (profile?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshActiveTransport()
    } else {
      setActiveTransport(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    if (view === 'transport' && profile?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      checkActiveShift()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, profile?.id])

  // Poll active transport and active shift every 5 seconds to sync state between admin closures and operators
  useEffect(() => {
    if (!profile?.id) return

    const interval = setInterval(() => {
      refreshActiveTransport()
      if (view === 'transport') {
        checkActiveShift()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [profile?.id, view])

  const handleStartNewTransport = async () => {
    if (!profile?.id) return
    
    // Richiedi permessi notifiche
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => console.error(err));
    }

    setStartLoading(true)
    try {
      const { data, error } = await api.createTransport(profile.id)
      if (error) throw error
      setActiveTransport(data)
      setIsTransportDrawerOpen(true)
      setBoardRefreshKey(prev => prev + 1)
    } catch (err) {
      console.error('Error starting transport:', err)
      alert(err.message || 'Errore durante l\'avvio del trasporto.')
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

  useEffect(() => {
    setBoardRefreshKey(prev => prev + 1)
  }, [activeTransport?.id])

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
  // Schermata di Login (Desktop o Mobile) se l'utente non è autenticato
  if (!user) {
    return (
      <Login
        isDesktop={currentPath.startsWith('/admin')}
        login={login}
        authError={authError}
        onSuccess={() => setView('my-shifts')}
        navigateTo={navigateTo}
      />
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
  const userActiveTransport = (profile?.ruolo === 'admin' || activeShift) ? activeTransport : null

  return (
    <Layout
      currentView={view}
      setView={setView}
      onOpenBulkModal={() => setIsBulkOpen(true)}
      onNavigateToAdmin={() => navigateTo('/admin')}
      activeTransport={userActiveTransport}
      isDrawerOpen={isTransportDrawerOpen}
      onExpandDrawer={() => setIsTransportDrawerOpen(true)}
      activeShift={activeShift}
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
        <TransportTab
          activeTransport={userActiveTransport}
          profile={profile}
          activeShift={activeShift}
          activeShiftLoading={activeShiftLoading}
          setView={setView}
          setIsTransportDrawerOpen={setIsTransportDrawerOpen}
          startLoading={startLoading}
          onStartNewTransport={handleStartNewTransport}
          onViewOnlyOpen={setViewOnlyTransport}
          refreshKey={boardRefreshKey}
        />
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
        activeTransport={userActiveTransport}
        setActiveTransport={setActiveTransport}
        isOpen={isTransportDrawerOpen}
        onClose={() => {
          setIsTransportDrawerOpen(false)
          refreshActiveTransport()
          setBoardRefreshKey(prev => prev + 1)
        }}
        onRefresh={() => {
          refreshActiveTransport()
          setBoardRefreshKey(prev => prev + 1)
        }}
        profile={profile}
        onTerminateSuccess={() => {
          setShowSuccessModal(true)
          refreshActiveTransport()
          setBoardRefreshKey(prev => prev + 1)
        }}
        activeShift={activeShift}
      />
      <TransportDrawer
        activeTransport={viewOnlyTransport}
        setActiveTransport={setViewOnlyTransport}
        isOpen={!!viewOnlyTransport}
        onClose={() => {
          setViewOnlyTransport(null)
          refreshActiveTransport()
          setBoardRefreshKey(prev => prev + 1)
        }}
        profile={profile}
        readOnly={viewOnlyTransport?.stato === 'programmato' ? (profile?.ruolo === 'admin' ? false : true) : true}
        onRefresh={() => {
          refreshActiveTransport()
          setBoardRefreshKey(prev => prev + 1)
        }}
        onActivate={async () => {
          setViewOnlyTransport(null)
          await refreshActiveTransport()
          setBoardRefreshKey(prev => prev + 1)
          setIsTransportDrawerOpen(true)
        }}
        activeShift={activeShift}
        onGoToClockIn={() => {
          setViewOnlyTransport(null)
          setView('clock-shift')
        }}
      />

      {/* Success Modal – trasporto chiuso correttamente */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-md animate-fade-in"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl px-10 py-10 flex flex-col items-center gap-5 max-w-xs w-full mx-4 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-3xl bg-emerald-500/5 pointer-events-none" />

            {/* Animated checkmark circle */}
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: '1.8s' }} />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">Servizio Chiuso</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Il trasporto è stato chiuso e registrato correttamente.
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-1 w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl text-sm font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Ottimo!
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default function App() {
  return (
    <AppContent />
  )
}
