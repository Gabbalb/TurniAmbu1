import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Calendar, User, LogOut, ShieldAlert, ShieldCheck, Home, Menu, X, PlusCircle, Clock, History, Users, Plus, Monitor, Truck, ChevronUp } from 'lucide-react'

export default function Layout({ children, currentView, setView, onOpenBulkModal, onNavigateToAdmin, activeTransport, isDrawerOpen, onExpandDrawer }) {
  const { profile, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const formatItalianDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' }
    return new Date().toLocaleDateString('it-IT', options)
  }

  return (
    <div className="flex flex-col h-dvh max-h-dvh overflow-hidden bg-slate-950 text-slate-100 font-sans max-w-md mx-auto shadow-2xl border-x border-slate-800/50 relative">
      {/* TopBar */}
      <header className="flex-shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm border border-slate-800/40">
            <img 
              src="/logo.png" 
              alt="GM Turni Logo" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 leading-tight capitalize">{formatItalianDate()}</span>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent leading-none mt-0.5">
              GM Turni
            </h1>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-1.5 bg-slate-800/45 border border-slate-800/80 px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 hover:border-indigo-500/30 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
        >
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>Ciao, {profile?.nome || profile?.username || 'Utente'}</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 scroll-smooth pb-28">
        {children}
      </main>

      {/* Sidebar Overlay */}
      <div 
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[80] transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Drawer */}
      <div className={`absolute top-0 right-0 bottom-0 w-[280px] max-w-[85vw] bg-slate-900 border-l border-slate-800/80 shadow-2xl z-[90] flex flex-col transition-transform duration-300 ease-out transform ${
        isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm border border-slate-800/40">
              <img 
                src="/logo.png" 
                alt="GM Turni Logo" 
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <span className="text-base font-extrabold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              GM Turni
            </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1.5 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/40 transition-colors"
            aria-label="Chiudi menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profilo utente */}
        <button
          onClick={() => {
            setView('profile')
            setIsSidebarOpen(false)
          }}
          className="w-full p-4 border-b border-slate-800/80 bg-slate-900/50 text-left hover:bg-slate-800/20 transition-colors block"
        >
          <div className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/80 p-3 rounded-2xl flex flex-col gap-2 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/20 font-bold text-sm">
                {(profile?.nome ? profile.nome : (profile?.username || 'U')).charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-200 truncate">
                  {profile?.nome && profile?.cognome ? `${profile.nome} ${profile.cognome}` : (profile?.username || 'Utente')}
                </span>
                <span className="text-[10px] text-slate-400 capitalize truncate">
                  {profile?.ruolo === 'admin' ? 'Amministratore' : (profile?.stato || profile?.ruolo || 'Dipendente')}
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Navigazione */}
        <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-1 text-left">
          {/* Home */}
          <button
            onClick={() => {
              setView('my-shifts')
              setIsSidebarOpen(false)
            }}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'my-shifts'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
            }`}
          >
            <Home className="w-4.5 h-4.5" />
            <span>Home</span>
          </button>

          {/* Tabellone */}
          <button
            onClick={() => {
              setView('board')
              setIsSidebarOpen(false)
            }}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'board'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
            }`}
          >
            <Calendar className="w-4.5 h-4.5" />
            <span>Tabellone</span>
          </button>

          {/* Dati personali */}
          <button
            onClick={() => {
              setView('profile')
              setIsSidebarOpen(false)
            }}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'profile'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
            }`}
          >
            <User className="w-4.5 h-4.5" />
            <span>Dati Personali</span>
          </button>

          {/* Timbra Turno */}
          <button
            onClick={() => {
              setView('clock-shift')
              setIsSidebarOpen(false)
            }}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'clock-shift'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
            }`}
          >
            <Clock className="w-4.5 h-4.5" />
            <span>Timbra Turno</span>
          </button>

          {/* Storico Ore */}
          <button
            onClick={() => {
              setView('hours-history')
              setIsSidebarOpen(false)
            }}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'hours-history'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
            }`}
          >
            <History className="w-4.5 h-4.5" />
            <span>Storico Ore</span>
          </button>

          {/* Trasporti */}
          <button
            onClick={() => {
              setView('transport')
              setIsSidebarOpen(false)
            }}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentView === 'transport'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
            }`}
          >
            <Truck className="w-4.5 h-4.5" />
            <span>Trasporti</span>
          </button>

          {/* Sezione Amministrazione (Riquadro) */}
          {profile?.ruolo === 'admin' && (
            <div className="mt-2 mb-1 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-2.5 flex flex-col gap-1 shadow-inner">
              <div className="flex items-center gap-2 px-2 pb-1.5 mb-1 border-b border-slate-800/40">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Amministrazione
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {/* Gestione Utenti */}
                <button
                  onClick={() => {
                    setView('admin-utenti')
                    setIsSidebarOpen(false)
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    currentView === 'admin-utenti' || currentView === 'admin'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/15'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>Gestione Utenti</span>
                </button>

                {/* Tabellone Storico */}
                <button
                  onClick={() => {
                    setView('admin-storico')
                    setIsSidebarOpen(false)
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    currentView === 'admin-storico'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/15'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <History className="w-4 h-4 flex-shrink-0" />
                  <span>Tabellone Storico</span>
                </button>

                {/* Gestione Equipaggi */}
                <button
                  onClick={() => {
                    setView('admin-equipaggi')
                    setIsSidebarOpen(false)
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    currentView === 'admin-equipaggi'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/15'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Gestione Equipaggi</span>
                </button>

                {/* Gestione Dipendenti (Convalida Turni) */}
                <button
                  onClick={() => {
                    setView('admin-dipendenti')
                    setIsSidebarOpen(false)
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    currentView === 'admin-dipendenti'
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/15'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>Convalida Ore</span>
                </button>

                {/* Interfaccia Desktop PC */}
                <button
                  onClick={() => {
                    if (onNavigateToAdmin) onNavigateToAdmin()
                    setIsSidebarOpen(false)
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-indigo-400 bg-indigo-950/45 border border-indigo-800/40 hover:bg-indigo-900/40 hover:text-indigo-300 transition-all mt-1.5 cursor-pointer"
                >
                  <Monitor className="w-4 h-4 flex-shrink-0" />
                  <span>Apri Interfaccia PC Admin</span>
                </button>
              </div>
            </div>
          )}

          {/* Inserisci Disponibilità (Bulk Modal) */}
          <button
            onClick={() => {
              setIsSidebarOpen(false)
              setTimeout(() => {
                onOpenBulkModal()
              }, 150)
            }}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent transition-all"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            <span>Inserisci Disponibilità</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <button
            onClick={() => {
              setIsSidebarOpen(false)
              logout()
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-rose-950/30 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-900/50 rounded-2xl text-xs font-bold transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Effettua Log Out</span>
          </button>
        </div>
      </div>

      {/* Minimized Active Transport Bar */}
      {activeTransport && !isDrawerOpen && currentView !== 'transport' && (
        <div 
          onClick={onExpandDrawer}
          className="absolute bottom-[80px] left-4 right-4 bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-2xl flex items-center justify-between shadow-2xl z-30 cursor-pointer animate-fade-in backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-200">Scheda attiva in corso</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            <span>Espandi</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="absolute bottom-0 left-0 right-0 max-w-md mx-auto glass-nav py-2.5 px-4 z-40 rounded-t-2xl shadow-xl flex-shrink-0 flex justify-around items-center">
        {/* Home Link */}
        <button
          onClick={() => setView('my-shifts')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
            currentView === 'my-shifts'
              ? 'text-indigo-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        {/* Tabellone Link */}
        <button
          onClick={() => setView('board')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
            currentView === 'board'
              ? 'text-indigo-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Tabellone</span>
        </button>

        {/* Trasporti Link */}
        <button
          onClick={() => setView('transport')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
            currentView === 'transport'
              ? 'text-indigo-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Trasporti</span>
        </button>

        {/* Aggiungi Link */}
        <button
          onClick={onOpenBulkModal}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-200"
          title="Aggiungi Disponibilità"
          aria-label="Aggiungi Disponibilità"
        >
          <PlusCircle className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Aggiungi</span>
        </button>

        {/* Hamburger Menu */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
            isSidebarOpen
              ? 'text-indigo-400 scale-105 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Menu</span>
        </button>
      </nav>
    </div>
  )
}
