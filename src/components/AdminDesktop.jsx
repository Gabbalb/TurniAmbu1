import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Users,
  Calendar,
  LogOut,
  AlertCircle,
  RefreshCw,
  Clock,
  Home,
  ShieldCheck
} from 'lucide-react'

// Import Split Components
import AdminDashboardTab from './AdminDashboardTab'
import AdminUsersTab from './AdminUsersTab'
import AdminHistoryTab from './AdminHistoryTab'
import AdminCrewsTab from './AdminCrewsTab'
import AdminHoursTab from './AdminHoursTab'
import AdminNotificationsTab from './AdminNotificationsTab'

export default function AdminDesktop({ onBackToMobile, onLogout, adminProfile }) {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'utenti' | 'storico' | 'equipaggi' | 'ore' | 'notifiche'
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState([])
  const [crews, setCrews] = useState([])
  const [pastBookings, setPastBookings] = useState([])
  const [employees, setEmployees] = useState([])
  const [notifications, setNotifications] = useState([])
  const [todayShifts, setTodayShifts] = useState([])
  const [todayBookings, setTodayBookings] = useState([])

  // State reload helper
  const [refreshKey, setRefreshKey] = useState(0)

  // Gestione Ore / Convalida (Shared for PDF printing)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedShiftIds, setSelectedShiftIds] = useState([])

  // Caricamento Dati
  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Profili
      const { data: profs } = await api.fetchProfiles()
      setProfiles(profs || [])

      // 2. Fetch Equipaggi
      const { data: crws } = await api.fetchCrews()
      setCrews(crws || [])

      // 3. Fetch Storico Prenotazioni
      const { data: pasts } = await api.fetchPastBookings()
      setPastBookings(pasts || [])

      // 4. Fetch Ore Dipendenti
      const { data: emps } = await api.fetchEmployeesWithPayments()
      setEmployees(emps || [])

      // 5. Fetch Notifiche/Audit Log
      const { data: notifs } = await api.fetchNotifications()
      setNotifications(notifs || [])

      // 6. Fetch Turni e Prenotazioni Odierni (per Copertura Dashboard)
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: todayS } = await api.fetchShifts(todayStr, todayStr)
      setTodayShifts(todayS || [])
      const { data: todayB } = await api.fetchBookings(todayStr, todayStr)
      const validTodayB = (todayB || []).filter(b => b.shifts && b.shifts.data === todayStr)
      setTodayBookings(validTodayB)

    } catch (err) {
      console.error('Errore nel caricamento dati desktop admin:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [refreshKey])

  // Sync selected employee state with latest fetched data
  useEffect(() => {
    if (selectedEmployee) {
      const updated = employees.find(e => e.id === selectedEmployee.id)
      if (updated) {
        setSelectedEmployee(updated)
      }
    }
  }, [employees])

  // Refresh manuale
  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const onRefresh = async () => {
    await loadData()
  }

  // Helpers per le Date e Ore condivisi o per il Layout di Stampa
  const formatItalianDateTime = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'dd MMM yyyy, HH:mm', { locale: it })
    } catch (e) {
      return ''
    }
  }

  const decimalToHHMM = (decimalHours) => {
    if (isNaN(decimalHours) || decimalHours < 0) return '00:00'
    const totalMinutes = Math.round(decimalHours * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  return (
    <>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans w-full text-left print:hidden">
        {/* SIDEBAR */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0 z-20">
          <div>
            {/* Brand Logo & Name */}
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 shadow-md border border-slate-700">
                <img src="/logo.png" alt="GM Turni Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                  GM Turni
                </h2>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1 block">
                  Pannello Amministrativo
                </span>
              </div>
            </div>

            {/* Menù di Navigazione */}
            <nav className="p-4 flex flex-col gap-1.5">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Dashboard Generale</span>
              </button>

              <button
                onClick={() => setActiveTab('utenti')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'utenti'
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Gestione Utenti</span>
              </button>

              <button
                onClick={() => setActiveTab('storico')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'storico'
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Tabellone Storico</span>
              </button>

              <button
                onClick={() => setActiveTab('equipaggi')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'equipaggi'
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Gestione Equipaggi</span>
              </button>

              <button
                onClick={() => setActiveTab('ore')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'ore'
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>Convalida Ore</span>
              </button>

              <button
                onClick={() => setActiveTab('notifiche')}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'notifiche'
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
                <span>Log & Telegram</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 flex flex-col gap-2">
            <button
              onClick={onBackToMobile}
              className="flex items-center justify-center gap-2.5 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700/50 cursor-pointer font-sans"
            >
              <span>Torna all'App Mobile</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-2.5 w-full bg-rose-950/25 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-rose-900/30 cursor-pointer font-sans"
            >
              <LogOut className="w-4 h-4" />
              <span>Esci dalla sessione</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
          
          {/* HEADER */}
          <header className="h-20 bg-slate-900/60 border-b border-slate-800 px-8 flex items-center justify-between flex-shrink-0 z-10 font-sans">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold capitalize text-slate-100 font-sans">
                {activeTab === 'ore' ? 'Convalida Ore' : activeTab === 'notifiche' ? 'Audit Log & Telegram' : activeTab === 'storico' ? 'Tabellone Storico' : activeTab === 'equipaggi' ? 'Gestione Equipaggi' : activeTab}
              </h1>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            </div>

            <div className="flex items-center gap-4">
              {/* Pulsante refresh */}
              <button
                onClick={handleManualRefresh}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700/50 transition-all hover:scale-105 active:scale-95 cursor-pointer font-sans"
                title="Ricarica Dati"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              {/* Profile badge */}
              <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 px-4 py-2 rounded-2xl">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center font-bold text-slate-100 text-sm shadow-md">
                  {(adminProfile?.nome || adminProfile?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-200">
                    {adminProfile?.nome && adminProfile?.cognome ? `${adminProfile.nome} ${adminProfile.cognome}` : (adminProfile?.username || 'Amministratore')}
                  </span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                    Ruolo: {adminProfile?.ruolo || 'admin'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* SCROLLABLE VIEWPORT */}
          <main className="flex-1 overflow-y-auto p-8 relative">
            
            {loading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center gap-3 shadow-2xl">
                  <LoaderComponent />
                  <span className="text-xs font-bold text-slate-300 font-sans">Caricamento dati amministratore...</span>
                </div>
              </div>
            )}

            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <AdminDashboardTab
                profiles={profiles}
                todayShifts={todayShifts}
                todayBookings={todayBookings}
                crews={crews}
                employees={employees}
                notifications={notifications}
                onRefresh={onRefresh}
                formatItalianDateTime={formatItalianDateTime}
                decimalToHHMM={decimalToHHMM}
                setActiveTab={setActiveTab}
              />
            )}

            {/* TAB 2: GESTIONE UTENTI */}
            {activeTab === 'utenti' && (
              <AdminUsersTab
                profiles={profiles}
                onRefresh={onRefresh}
              />
            )}

            {/* TAB 3: TABELLONE STORICO */}
            {activeTab === 'storico' && (
              <AdminHistoryTab
                pastBookings={pastBookings}
                formatItalianDateTime={formatItalianDateTime}
              />
            )}

            {/* TAB 4: GESTIONE EQUIPAGGI */}
            {activeTab === 'equipaggi' && (
              <AdminCrewsTab
                crews={crews}
                onRefresh={onRefresh}
              />
            )}

            {/* TAB 5: CONVALIDA ORE */}
            {activeTab === 'ore' && (
              <AdminHoursTab
                employees={employees}
                selectedEmployee={selectedEmployee}
                setSelectedEmployee={setSelectedEmployee}
                selectedShiftIds={selectedShiftIds}
                setSelectedShiftIds={setSelectedShiftIds}
                decimalToHHMM={decimalToHHMM}
                formatItalianDateTime={formatItalianDateTime}
                onRefresh={onRefresh}
              />
            )}

            {/* TAB 6: LOG & TELEGRAM */}
            {activeTab === 'notifiche' && (
              <AdminNotificationsTab
                notifications={notifications}
                formatItalianDateTime={formatItalianDateTime}
                onRefresh={onRefresh}
              />
            )}

          </main>

        </div>

      </div>

      {/* SEZIONE PER LA STAMPA PDF */}
      {selectedEmployee && (
        <div className="hidden print:block w-full text-slate-900 bg-white p-8 font-sans leading-relaxed text-left">
          {/* Header del Report */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-0.5 border border-slate-300">
                <img src="/logo.png" alt="COOP GM Pubblica Assistenza Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900">COOP GM Pubblica Assistenza</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">Foglio Presenze e Ore Lavorate</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Data Stampa: <span className="font-bold text-slate-800">{new Date().toLocaleDateString('it-IT')}</span></p>
              <p className="text-[10px] text-slate-400">Documento Amministrativo</p>
            </div>
          </div>

          {/* Dati Dipendente */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Dipendente</p>
              <p className="text-sm font-extrabold text-slate-900 font-sans">
                {selectedEmployee.nome && selectedEmployee.cognome ? `${selectedEmployee.nome} ${selectedEmployee.cognome}` : selectedEmployee.username}
              </p>
              <p className="text-xs text-slate-600 mt-1">Username: <span className="font-mono text-slate-800 font-bold">{selectedEmployee.username}</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Codice Fiscale</p>
              <p className="text-xs font-mono font-bold text-slate-800 mt-1">{selectedEmployee.codice_fiscale || 'N/D'}</p>
            </div>
          </div>

          {/* Tabella Timbrature */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2.5">Elenco Timbrature</h3>
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300">
                  <th className="py-2 px-3 border border-slate-300">Entrata (Inizio)</th>
                  <th className="py-2 px-3 border border-slate-300">Uscita (Fine)</th>
                  <th className="py-2 px-3 text-center border border-slate-300">Durata (Decimale)</th>
                  <th className="py-2 px-3 text-center border border-slate-300">Durata (HH:MM)</th>
                  <th className="py-2 px-3 text-center border border-slate-300">Stato Convalida</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 divide-y divide-slate-200">
                {(selectedEmployee.shifts || []).map(shift => {
                  const duration = shift.end_time 
                    ? (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60)
                    : 0
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 border border-slate-300 font-medium">
                        {formatItalianDateTime(shift.start_time)}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-300 font-medium">
                        {shift.end_time ? formatItalianDateTime(shift.end_time) : 'In corso / Attivo'}
                      </td>
                      <td className="py-2.5 px-3 text-center border border-slate-300 font-mono font-bold text-slate-900">
                        {shift.end_time ? `${duration.toFixed(2)} h` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center border border-slate-300 font-mono font-bold text-slate-900">
                        {shift.end_time ? decimalToHHMM(duration) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center border border-slate-300">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          shift.pagato 
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                            : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
                          {shift.pagato ? 'CONVALIDATO' : 'DA CONVALIDARE'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(!selectedEmployee.shifts || selectedEmployee.shifts.length === 0) && (
              <div className="text-center py-6 text-slate-500 font-bold border border-slate-300 border-t-0 bg-slate-50">
                Nessun turno timbrato registrato per questo dipendente.
              </div>
            )}
          </div>

          {/* Riepilogo Totali */}
          <div className="grid grid-cols-3 gap-4 mb-10 bg-slate-100 p-4 rounded-xl border border-slate-300">
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Totale Ore Registrate</span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5">
                {(selectedEmployee.totalHours || 0).toFixed(2)}h
              </span>
              <span className="text-xs text-slate-600 font-mono">
                ({decimalToHHMM(selectedEmployee.totalHours || 0)})
              </span>
            </div>
            
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ore Convalidate</span>
              <span className="text-base font-extrabold text-emerald-800 mt-0.5">
                {(selectedEmployee.totalHours - selectedEmployee.unpaidHours || 0).toFixed(2)}h
              </span>
              <span className="text-xs text-slate-600 font-mono">
                ({decimalToHHMM(selectedEmployee.totalHours - selectedEmployee.unpaidHours || 0)})
              </span>
            </div>

            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ore da Convalidare</span>
              <span className="text-base font-extrabold text-amber-800 mt-0.5">
                {(selectedEmployee.unpaidHours || 0).toFixed(2)}h
              </span>
              <span className="text-xs text-slate-600 font-mono">
                ({decimalToHHMM(selectedEmployee.unpaidHours || 0)})
              </span>
            </div>
          </div>

          {/* Firme per accettazione */}
          <div className="mt-16 grid grid-cols-2 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-4/5 border-b border-slate-900 mb-2 h-8" />
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Firma del Dipendente</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4/5 border-b border-slate-900 mb-2 h-8" />
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Firma dell'Amministratore</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function LoaderComponent() {
  return (
    <div className="w-12 h-12 relative flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin absolute" />
      <div className="w-6 h-6 border-4 border-cyan-500/10 border-b-cyan-500 rounded-full animate-spin absolute" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
    </div>
  )
}
