import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Calendar, User, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react'

export default function Layout({ children, currentView, setView, onOpenBulkModal }) {
  const { profile, logout } = useAuth()

  const formatItalianDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' }
    return new Date().toLocaleDateString('it-IT', options)
  }

  return (
    <div className="flex flex-col h-dvh max-h-dvh overflow-hidden bg-slate-950 text-slate-100 font-sans max-w-md mx-auto shadow-2xl border-x border-slate-800/50 relative">
      {/* TopBar */}
      <header className="flex-shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-2.5 sm:px-5 flex items-center justify-between shadow-md">
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

        <div className="flex items-center gap-2">
          {/* Admin panel access button - only visible to admins */}
          {profile?.ruolo === 'admin' && (
            <button
              onClick={() => setView(currentView === 'admin' ? 'board' : 'admin')}
              className={`p-2 rounded-xl transition-all duration-300 ${
                currentView === 'admin'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
              title="Pannello Amministratore"
              aria-label="Pannello Amministratore"
            >
              {currentView === 'admin' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </button>
          )}

          {/* User profile username pill */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs font-medium max-w-[120px] truncate">
            <User className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="truncate text-slate-300">{profile?.username || 'Utente'}</span>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="p-2 bg-slate-800 border border-slate-700/60 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Sconnetti"
            aria-label="Sconnetti"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 scroll-smooth pb-28">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="absolute bottom-0 left-0 right-0 max-w-md mx-auto glass-nav py-2.5 px-4 sm:px-8 flex justify-between items-center z-40 rounded-t-2xl shadow-xl flex-shrink-0">
        {/* Tabellone Link */}
        <button
          onClick={() => setView('board')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
            currentView === 'board'
              ? 'text-indigo-400 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Tabellone</span>
        </button>

        {/* Central Add (+) button for bulk scheduling */}
        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
          <button
            onClick={onOpenBulkModal}
            className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 hover:scale-110 hover:shadow-cyan-500/30 active:scale-95 transition-all duration-200 border-4 border-slate-950"
            title="Aggiungi Disponibilità"
            aria-label="Aggiungi Disponibilità"
          >
            <span className="text-3xl font-light leading-none -mt-1">+</span>
          </button>
        </div>

        {/* Space for the middle button */}
        <div className="w-12 h-6 pointer-events-none" />

        {/* I Miei Turni Link */}
        <button
          onClick={() => setView('my-shifts')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
            currentView === 'my-shifts'
              ? 'text-indigo-400 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-semibold">I Miei Turni</span>
        </button>
      </nav>
    </div>
  )
}
