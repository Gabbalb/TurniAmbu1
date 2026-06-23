import React, { useState, useEffect, useMemo } from 'react'
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
  ShieldCheck,
  Truck
} from 'lucide-react'

// Import Split Components
import AdminDashboardTab from './AdminDashboardTab'
import AdminUsersTab from './AdminUsersTab'
import AdminHistoryTab from './AdminHistoryTab'
import AdminCrewsTab from './AdminCrewsTab'
import AdminHoursTab from './AdminHoursTab'
import AdminNotificationsTab from './AdminNotificationsTab'
import AdminTransportsTab from './AdminTransportsTab'
import AdminVehiclesTab from './AdminVehiclesTab'

export default function AdminDesktop({ onBackToMobile, onLogout, adminProfile }) {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'utenti' | 'storico' | 'equipaggi' | 'ore' | 'notifiche' | 'trasporti' | 'mezzi'
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState([])
  const [crews, setCrews] = useState([])
  const [pastBookings, setPastBookings] = useState([])
  const [employees, setEmployees] = useState([])
  const [notifications, setNotifications] = useState([])
  const [todayShifts, setTodayShifts] = useState([])
  const [todayBookings, setTodayBookings] = useState([])
  const [activeTransports, setActiveTransports] = useState([])
  const [selectedTransportIdForTab, setSelectedTransportIdForTab] = useState(null)

  // State reload helper
  const [refreshKey, setRefreshKey] = useState(0)

  // Gestione Ore / Convalida (Shared for PDF printing)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedShiftIds, setSelectedShiftIds] = useState([])

  // Filtri di Stampa PDF
  const [printStartDate, setPrintStartDate] = useState('')
  const [printMaxHours, setPrintMaxHours] = useState('')
  const [printStatusFilter, setPrintStatusFilter] = useState('unconvalidated')

  // Reset print filters when selected employee changes
  useEffect(() => {
    setPrintStartDate('')
    setPrintMaxHours('')
    setPrintStatusFilter('unconvalidated')
  }, [selectedEmployee?.id])

  // Derive filtered shifts for the printable PDF
  const pdfShifts = useMemo(() => {
    if (!selectedEmployee || !selectedEmployee.shifts) return []

    // 1. Clone and sort descending (from newest) to apply cumulative max hours limit
    let shifts = [...selectedEmployee.shifts].sort((a, b) => new Date(b.start_time) - new Date(a.start_time))

    // 2. Filter by start date (start_time is an ISO string)
    if (printStartDate) {
      const startLimit = new Date(`${printStartDate}T00:00:00`)
      shifts = shifts.filter(s => new Date(s.start_time) >= startLimit)
    }

    // 3. Filter by convalidation status ('all', 'convalidated', 'unconvalidated')
    if (printStatusFilter === 'convalidated') {
      shifts = shifts.filter(s => s.pagato)
    } else if (printStatusFilter === 'unconvalidated') {
      shifts = shifts.filter(s => !s.pagato)
    }

    // 4. Cumulative max hours limit
    if (printMaxHours && !isNaN(Number(printMaxHours)) && Number(printMaxHours) > 0) {
      const limit = Number(printMaxHours)
      let cumulativeHours = 0
      const sliced = []

      for (const shift of shifts) {
        const duration = shift.end_time 
          ? (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60)
          : 0

        if (cumulativeHours + duration > limit) {
          break
        }
        sliced.push(shift)
        cumulativeHours += duration
      }
      shifts = sliced
    }

    // 5. Re-sort ascending (oldest first) for logical layout in the PDF table
    return shifts.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  }, [selectedEmployee, printStartDate, printMaxHours, printStatusFilter])

  // Derive total hours from pdfShifts
  const pdfTotalHours = useMemo(() => {
    return pdfShifts.reduce((sum, shift) => {
      const duration = shift.end_time 
        ? (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60)
        : 0
      return sum + duration
    }, 0)
  }, [pdfShifts])

  const handlePrintPDF = () => {
    if (!selectedEmployee) return
    const originalTitle = document.title

    const namePart = `${selectedEmployee.nome || ''}${selectedEmployee.cognome || ''}`.replace(/\s+/g, '') || selectedEmployee.username || 'Dipendente'

    let filename = ''
    if (printStartDate) {
      filename = `${namePart}_${printStartDate}`
    } else {
      const todayStr = new Date().toISOString().split('T')[0]
      filename = `${namePart}_DiSempre_${todayStr}`
    }

    document.title = filename
    window.print()

    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

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

      // 7. Fetch active and scheduled transports
      const { data: actTrans } = await api.fetchAllActiveAndScheduledTransports()
      setActiveTransports(actTrans || [])

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

  const getTabClass = (tabName) => {
    return `flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
      activeTab === tabName
        ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 shadow-sm font-bold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent'
    }`
  }

  return (
    <>
      <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans w-full text-left print:hidden">
        {/* SIDEBAR */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 z-20">
          <div>
            {/* Brand Logo & Name */}
            <div className="p-6 border-b border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 shadow-md border border-slate-200">
                <img src="/logo.png" alt="GM Turni Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 leading-none">
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
                className={getTabClass('dashboard')}
              >
                <Home className="w-5 h-5" />
                <span>Dashboard Generale</span>
              </button>

              <button
                onClick={() => setActiveTab('utenti')}
                className={getTabClass('utenti')}
              >
                <Users className="w-5 h-5" />
                <span>Gestione Utenti</span>
              </button>

              <button
                onClick={() => setActiveTab('storico')}
                className={getTabClass('storico')}
              >
                <Calendar className="w-5 h-5" />
                <span>Tabellone Storico</span>
              </button>

              <button
                onClick={() => setActiveTab('equipaggi')}
                className={getTabClass('equipaggi')}
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Gestione Equipaggi</span>
              </button>

              <button
                onClick={() => setActiveTab('ore')}
                className={getTabClass('ore')}
              >
                <Clock className="w-5 h-5" />
                <span>Convalida Ore</span>
              </button>

              <button
                onClick={() => setActiveTab('notifiche')}
                className={getTabClass('notifiche')}
              >
                <AlertCircle className="w-5 h-5" />
                <span>Log Eventi</span>
              </button>

              <button
                onClick={() => setActiveTab('trasporti')}
                className={getTabClass('trasporti')}
              >
                <Truck className="w-5 h-5" />
                <span>Registro Trasporti</span>
              </button>

              <button
                onClick={() => setActiveTab('mezzi')}
                className={getTabClass('mezzi')}
              >
                <Truck className="w-5 h-5" />
                <span>Gestione Mezzi</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 flex flex-col gap-2">
            <button
              onClick={onBackToMobile}
              className="flex items-center justify-center gap-2.5 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer font-sans"
            >
              <span>Torna all'App Mobile</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-2.5 w-full bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-rose-200 cursor-pointer font-sans"
            >
              <LogOut className="w-4 h-4" />
              <span>Esci dalla sessione</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
          
          {/* HEADER */}
          <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0 z-10 font-sans">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold capitalize text-slate-800 font-sans">
                {activeTab === 'ore' ? 'Convalida Ore' : activeTab === 'notifiche' ? 'Registro Eventi' : activeTab === 'storico' ? 'Tabellone Storico' : activeTab === 'equipaggi' ? 'Gestione Equipaggi' : activeTab === 'trasporti' ? 'Registro Trasporti' : activeTab === 'mezzi' ? 'Gestione Parco Mezzi' : activeTab}
              </h1>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            </div>

            <div className="flex items-center gap-4">
              {/* Pulsante refresh */}
              <button
                onClick={handleManualRefresh}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer font-sans"
                title="Ricarica Dati"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

              {/* Profile badge */}
              <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 px-4 py-2 rounded-2xl">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md">
                  {(adminProfile?.nome || adminProfile?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800">
                    {adminProfile?.nome && adminProfile?.cognome ? `${adminProfile.nome} ${adminProfile.cognome}` : (adminProfile?.username || 'Amministratore')}
                  </span>
                  <span className="text-[9px] text-slate-550 font-semibold uppercase tracking-wider">
                    Ruolo: {adminProfile?.ruolo || 'admin'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* SCROLLABLE VIEWPORT */}
          <main className="flex-1 overflow-y-auto p-8 relative">
            
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col items-center gap-3 shadow-2xl">
                  <LoaderComponent />
                  <span className="text-xs font-bold text-slate-600 font-sans">Caricamento dati amministratore...</span>
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
                activeTransports={activeTransports}
                onViewTransportDetails={(id) => {
                  setSelectedTransportIdForTab(id)
                  setActiveTab('trasporti')
                }}
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
                profiles={profiles}
                crews={crews}
                onRefresh={onRefresh}
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
                printStartDate={printStartDate}
                setPrintStartDate={setPrintStartDate}
                printMaxHours={printMaxHours}
                setPrintMaxHours={setPrintMaxHours}
                printStatusFilter={printStatusFilter}
                setPrintStatusFilter={setPrintStatusFilter}
                handlePrintPDF={handlePrintPDF}
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

            {/* TAB 7: REGISTRO TRASPORTI */}
            {activeTab === 'trasporti' && (
              <AdminTransportsTab 
                initialSelectedId={selectedTransportIdForTab}
                onClearInitialId={() => setSelectedTransportIdForTab(null)}
                profile={adminProfile}
              />
            )}

            {/* TAB 8: GESTIONE MEZZI */}
            {activeTab === 'mezzi' && (
              <AdminVehiclesTab />
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
                {pdfShifts.map(shift => {
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
            {pdfShifts.length === 0 && (
              <div className="text-center py-6 text-slate-500 font-bold border border-slate-300 border-t-0 bg-slate-50">
                Nessun turno registrato soddisfa i filtri selezionati.
              </div>
            )}
          </div>

          {/* Riepilogo Totali */}
          <div className="mb-10 bg-slate-100 p-4 rounded-xl border border-slate-300 max-w-xs">
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {printStartDate 
                  ? `Totale Ore (Dal ${printStartDate.split('-').reverse().join('/')})` 
                  : 'Totale Ore (Di sempre)'}
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-0.5">
                {pdfTotalHours.toFixed(2)}h
              </span>
              <span className="text-xs text-slate-600 font-mono">
                ({decimalToHHMM(pdfTotalHours)})
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
